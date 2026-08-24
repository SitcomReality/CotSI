/**
 * featureRewards.js — Reward engine for interactive map features.
 *
 * The data half (the FEATURES reward table, canonical names, choice-card
 * builders) lives in featureRewardTable.js; this module applies it:
 *
 *   - **Direct finite grants** (relics, gold, God's Knots, potencies): applied
 *     silently with a log + ledger entry, then the feature is consumed.
 *   - **Choice rewards** (relic vs gold, risk-reward, potency pick): human
 *     champions get the artifact-draft-style modal (`state.reward`); bots apply
 *     a deterministic policy immediately (they never see modals).
 *   - **Replenishable rewards** (heal, temp buffs): granted once, then the
 *     feature regrows after FEATURE_REGROW_DAYS and re-offers its reward.
 *
 * Temporary buffs last until the start of the champion's next turn:
 *   - `attack` / `defense` are stored on `champ.buffs`, reset in `beginTurn`
 *     (turnActions.js) and read per combat round in `applyFinalBonuses`
 *     (combatScoring.js);
 *   - `movement` is granted directly to `champ.actionPoints`, which is per-turn by
 *     construction.
 *
 * Choice payloads are pure data (no functions) so they can live on
 * `state.reward` safely.
 *
 * Layer: game/state — mutates state; may import engine, game/rules, itself.
 */
import { coordKey } from '../../../engine/rules/hexGrid.js';
import { addLogEntry } from '../world/gameLog.js';
import { LOG_CATEGORY } from '../../rules/logGrammar.js';
import { buildChampionFactionMap, championSegment, factionAccentVar } from '../../rules/logHelpers.js';
import { recordLedgerEntry } from '../world/dispatchLedger.js';
import { FACTIONS } from '../../rules/factionData.js';
import { markChunkDirty } from '../world/chunkDirtyTracking.js';
import { depleteFeature } from './featureRegrowth.js';
import { FACTION_COUNT } from '../../../params/game/factionParams.js';
import { BOT_FEATURE_SCORES, BOT_FEATURE_HEAL_BONUS, BOT_FONT_HP_THRESHOLD } from '../../../params/game/aiParams.js';
import { FEATURES, featureName, choiceCard } from './featureRewardTable.js';
import { applyForgeUpgrade } from './forgeSystem.js';
import { EQUIPMENT_CATALOG, pickEquipment } from '../../rules/equipment.js';
import { equipItem } from './trading.js';

// ── Entry point ───────────────────────────────────────────────────────────────

/** Feature kinds whose rewards include healing (bot injury bonus). */
const HEAL_KINDS = new Set(['waxbloom', 'cinderbloom', 'edenMushroom', 'edenShroomlet', 'peridexionTree', 'vegetableLamb']);

/**
 * Resolve the reward of the feature under the champion, if any.
 * Scenery kinds (tree, bush) and unknown kinds no-op.
 * Called from interactOnArrival (arrivalInteractions.js) for all non-legacy kinds.
 */
export function interactWithFeature(state, champ, tile) {
  const feature = tile?.feature;
  if (!feature) return;
  const spec = FEATURES[feature.kind];
  if (!spec) return;
  // Replenishable feature already spent this cycle.
  if (feature.ripe === false) return;

  if (spec.class === 'regrow') {
    _grantRewards(state, champ, tile, spec);
    depleteFeature(state, tile);
    return;
  }
  if (spec.class === 'direct') {
    _grantRewards(state, champ, tile, spec);
    _consumeFeature(state, tile);
    return;
  }
  if (spec.class === 'choice' || spec.class === 'potency-pick') {
    const choices = spec.class === 'potency-pick' ? potencyPickChoices(featureName(feature.kind)) : spec.choices;
    if (champ.controller === 'human' && !state.reward) {
      state.reward = {
        championId: champ.id,
        type: 'feature',
        title: featureName(feature.kind),
        body: spec.body,
        tileKey: coordKey(champ.pos),
        guaranteed: [],
        choices,
      };
    } else if (spec.class === 'potency-pick') {
      // Bots roll a faction, mirroring the dig system's potency roll.
      const pick = Math.floor(state._rng() * choices.length);
      applyFeatureChoice(state, champ, choices[pick], coordKey(champ.pos));
    } else {
      const pick = botFeatureChoice(state, champ, tile, spec);
      applyFeatureChoice(state, champ, choices[pick], coordKey(champ.pos));
    }
  }
}

/**
 * Apply a chosen feature reward (from the choice modal or a bot policy) and
 * consume the tile feature. `tileKey` matches the key stored on `state.reward`
 * when the choice was offered.
 */
export function applyFeatureChoice(state, champ, choice, tileKey) {
  if (!choice?.grant) return;
  const tile = state.tiles[tileKey];
  const suffix = tile?.feature?.kind ? featureName(tile.feature.kind) : choice.claim;
  const factionMap = buildChampionFactionMap(state.champions);
  const result = _applyGrant(state, champ, choice.grant, suffix);
  addLogEntry(state, {
    category: LOG_CATEGORY.ECONOMY,
    subject: championSegment(champ.name, factionMap),
    verb: 'claims',
    object: { text: choice.claim },
    detail: result.text ? { text: result.text, color: result.color } : null,
  });
  if (tile?.feature) {
    // Permanent infrastructure (the Forge) is never consumed by a choice.
    if (tile.feature.kind !== 'forge') {
      tile.feature = null;
      markChunkDirty(state, tile.q, tile.r);
    }
  }
}

/**
 * Bot pick policy for choice rewards: never opens a modal, always returns a
 * choice index deterministically (the only randomness is the potency-pick
 * faction roll inside _applyGrant, mirroring the dig system).
 *
 * The uniform policy: when hurt, take the conservative side (safe knots, gold,
 * defense); when healthy, take the premium side (risky knots, relics,
 * potencies, movement, attack).
 */
export function botFeatureChoice(state, champ, tile, spec) {
  const choices = spec?.choices;
  if (!choices?.length) return 0;
  const lowHp = champ.hp <= champ.maxHp * 0.6;
  return lowHp ? 1 : 0;
}

/**
 * Bot target-scoring value for a reward-bearing feature tile: the kind's
 * BOT_FEATURE_SCORES base, plus an injury bonus for heal-bearing kinds.
 * Returns 0 for scenery, spent (unripe) features, and unknown kinds so bots
 * never path toward them.
 */
export function featureValueForBot(state, champ, tile) {
  const feature = tile?.feature;
  if (!feature || feature.ripe === false) return 0;
  const base = BOT_FEATURE_SCORES[feature.kind];
  if (!base) return 0;
  if (HEAL_KINDS.has(feature.kind) && champ.hp < BOT_FONT_HP_THRESHOLD) {
    return base + BOT_FEATURE_HEAL_BONUS;
  }
  return base;
}

// ── Reward application ────────────────────────────────────────────────────────

/** Build the 7-faction potency-pick cards (Null Lily, Volvelle). */
function potencyPickChoices(source) {
  return FACTIONS.map((f) => choiceCard({
    id: `potency-${f.id}`,
    label: `${f.name}`,
    type: 'potency',
    effects: [{ icon: 'i-potency', label: `+1 ${f.name} potency` }],
    grant: { kind: 'potency', faction: f.id, amount: 1 },
    claim: `a ${f.name} potency from the ${source}`,
  }));
}

/** Apply a direct/regrow spec's grants, then log one combined line. */
function _grantRewards(state, champ, tile, spec) {
  const factionMap = buildChampionFactionMap(state.champions);
  const detailTexts = [];
  const detailColors = [];
  const suffix = featureName(tile.feature.kind);
  for (const grant of spec.grants) {
    const result = _applyGrant(state, champ, grant, suffix);
    if (result.text) detailTexts.push(result.text);
    if (result.color) detailColors.push(result.color);
  }
  addLogEntry(state, {
    category: spec.log.category,
    subject: championSegment(champ.name, factionMap),
    verb: spec.log.verb,
    object: { text: spec.log.object },
    detail: detailTexts.length
      ? { text: detailTexts.join(', '), color: detailColors[0] || 'var(--gold)' }
      : null,
  });
}

/**
 * Apply one grant to the champion. Returns { text, color } describing the gain
 * for the combined log detail line ('' when the grant has no visible gain).
 * `claimText` is the ledger suffix (the canonical feature name).
 * A grant's `damage` is a cost that can never reduce HP below 1.
 */
function _applyGrant(state, champ, grant, claimText) {
  const amount = grant.amount;
  let text = '';
  let color = '';
  switch (grant.kind) {
    case 'relic':
      champ.relics += amount;
      recordLedgerEntry(champ, `+${amount} relic — ${claimText}`, 'gain', 'relic');
      text = `+${amount} relic`;
      color = 'var(--gold)';
      break;
    case 'gold':
      champ.gold += amount;
      recordLedgerEntry(champ, `+${amount} gold — ${claimText}`, 'gain', 'gold');
      text = `+${amount} gold`;
      color = 'var(--gold)';
      break;
    case 'knots':
      champ.knot += amount;
      recordLedgerEntry(champ, `+${amount} God's Knot — ${claimText}`, 'gain', 'knot');
      text = `+${amount} God's Knot`;
      color = 'var(--gold)';
      break;
    case 'potency': {
      champ.potencies[grant.faction] += amount;
      recordLedgerEntry(champ, `+${amount} ${FACTIONS[grant.faction].name} potency — ${claimText}`, 'gain', 'potency');
      text = `+${amount} ${FACTIONS[grant.faction].name} potency`;
      color = factionAccentVar(grant.faction);
      break;
    }
    case 'potency-random': {
      const f = Math.floor(state._rng() * FACTION_COUNT);
      champ.potencies[f] += amount;
      recordLedgerEntry(champ, `+${amount} ${FACTIONS[f].name} potency — ${claimText}`, 'gain', 'potency');
      text = `+${amount} ${FACTIONS[f].name} potency`;
      color = factionAccentVar(f);
      break;
    }
    case 'heal': {
      const healed = Math.min(champ.maxHp, champ.hp + amount) - champ.hp;
      champ.hp += healed;
      if (healed > 0) recordLedgerEntry(champ, `+${healed} HP — ${claimText}`, 'gain', 'hp');
      text = healed > 0 ? `+${healed} HP` : '';
      color = 'var(--verdigris)';
      break;
    }
    case 'attack':
      _grantBuff(champ, 'attack', amount);
      recordLedgerEntry(champ, `+${amount} attack this turn — ${claimText}`, 'gain', 'info');
      text = `+${amount} attack this turn`;
      color = 'var(--ink-mid)';
      break;
    case 'defense':
      _grantBuff(champ, 'defense', amount);
      recordLedgerEntry(champ, `+${amount} defense this turn — ${claimText}`, 'gain', 'info');
      text = `+${amount} defense this turn`;
      color = 'var(--ink-mid)';
      break;
    case 'movement':
      champ.actionPoints += amount;
      recordLedgerEntry(champ, `+${amount} AP this turn — ${claimText}`, 'gain', 'ap');
      text = `+${amount} AP this turn`;
      color = 'var(--ink-mid)';
      break;
    case 'equipment': {
      const item = grant.itemId
        ? EQUIPMENT_CATALOG.find((i) => i.id === grant.itemId)
        : pickEquipment(state._rng);
      if (!item) break;
      const refund = equipItem(champ, item);
      recordLedgerEntry(
        champ,
        `${item.name} equipped — ${claimText}${refund ? ` (+${refund} gold refund)` : ''}`,
        'gain',
        'gold'
      );
      text = item.name;
      color = 'var(--gold)';
      break;
    }
    case 'upgrade-equipment':
      // Forge upgrades (forgeSystem.js) — handled there; the Forge tile is
      // never consumed.
      text = applyForgeUpgrade(state, champ, grant);
      color = 'var(--gold)';
      break;
    default:
      break;
  }
  if (grant.damage) {
    champ.hp = Math.max(1, champ.hp - grant.damage);
    recordLedgerEntry(champ, `-${grant.damage} HP — ${claimText}`, 'loss', 'hp');
    text = text ? `${text}, -${grant.damage} HP` : `-${grant.damage} HP`;
    color = color || 'var(--verdigris)';
  }
  return { text, color };
}

function _grantBuff(champ, name, amount) {
  if (!champ.buffs) champ.buffs = { attack: 0, defense: 0 };
  champ.buffs[name] += amount;
}

/** Consume a finite feature (de-emphasis restores the decor). */
function _consumeFeature(state, tile) {
  tile.feature = null;
  markChunkDirty(state, tile.q, tile.r);
}
