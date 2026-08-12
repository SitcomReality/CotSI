/**
 * featureRewards.js — Reward logic for interactive map features.
 *
 * Handles everything a champion gains by arriving on a reward-bearing feature:
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
import { coordKey } from '../../engine/rules/hexGrid.js';
import { addLogEntry } from './gameLog.js';
import { LOG_CATEGORY } from '../rules/logGrammar.js';
import { buildChampionFactionMap, championSegment, factionAccentVar } from '../rules/logHelpers.js';
import { recordLedgerEntry } from './dispatchLedger.js';
import { getArchetype } from '../rules/archetypes.js';
import { FACTIONS } from '../rules/factionData.js';
import { markChunkDirty } from './chunkDirtyTracking.js';
import { FACTION_COUNT } from '../../params/game/factionParams.js';
import { BOT_FEATURE_SCORES, BOT_FEATURE_HEAL_BONUS, BOT_TREE_HP_THRESHOLD } from '../../params/game/aiParams.js';
import {
  FEATURE_REGROW_DAYS,
  FEATURE_RELIC_AMOUNT,
  FEATURE_CRYSTAL_GOLD,
  FEATURE_KNOTS_AMOUNT,
  FEATURE_LAMB_HEAL,
  FEATURE_COPYIST_DEFENSE,
  FEATURE_WAXBLOOM_HEAL,
  FEATURE_CINDERBLOOM_HEAL,
  FEATURE_EDEN_MUSHROOM_HEAL,
  FEATURE_EDEN_SHROOMLET_HEAL,
  FEATURE_PERIDEXION_HEAL,
  FEATURE_PERIDEXION_DEFENSE,
  FEATURE_SCORIA_KNOTS,
  FEATURE_SNOWPERSON_MOVEMENT,
  FEATURE_RIBS_DEFENSE,
  FEATURE_INITIAL_BUFF,
  FEATURE_CENSER_ATTACK,
  FEATURE_CENSER_HP_COST,
  FEATURE_CHOICE_GOLD_STANDARD,
  FEATURE_CHOICE_GOLD_RICH,
  FEATURE_CHOICE_GOLD_WITNESS,
  FEATURE_SCREAMROOT_RISK_KNOTS,
  FEATURE_SCREAMROOT_HP_COST,
  FEATURE_SCREAMROOT_SAFE_KNOTS,
  FEATURE_CHOICE_MOVEMENT,
} from '../../params/game/economyParams.js';

// ── Canonical names ───────────────────────────────────────────────────────────
// Every feature's display name comes from the archetype registry so UI text and
// code use the same vocabulary (namingConventions.md §6).

function featureName(kind) {
  return getArchetype(`feature_${kind}`)?.name || kind;
}

// ── Choice card builders ──────────────────────────────────────────────────────
// Cards are pure data: { id, label, type, effects, grant, claim }.
// `grant` is what applyFeatureChoice applies; `claim` feeds the log line
// ("<name> claims <claim>") and the ledger suffix.

function choiceCard({ id, label, type, effects, grant, claim }) {
  return { id, label, type, effects, grant, claim };
}

function goldCard(amount) {
  return choiceCard({
    id: 'gold',
    label: `${amount} gold`,
    type: 'gold',
    effects: [{ icon: 'i-gold', label: `+${amount} gold` }],
    grant: { kind: 'gold', amount },
    claim: `a pouch of ${amount} gold`,
  });
}

function relicCard(source) {
  return choiceCard({
    id: 'relic',
    label: 'Relic',
    type: 'relic',
    effects: [{ icon: 'i-relic', label: `+${FEATURE_RELIC_AMOUNT} relic` }],
    grant: { kind: 'relic', amount: FEATURE_RELIC_AMOUNT },
    claim: `a relic from the ${source}`,
  });
}

function movementCard(source) {
  return choiceCard({
    id: 'movement',
    label: `+${FEATURE_CHOICE_MOVEMENT} AP this turn`,
    type: 'ap',
    effects: [{ icon: 'i-move', label: `+${FEATURE_CHOICE_MOVEMENT} AP this turn` }],
    grant: { kind: 'movement', amount: FEATURE_CHOICE_MOVEMENT },
    claim: `a surge of ${FEATURE_CHOICE_MOVEMENT} steps from the ${source}`,
  });
}

function potencyCard(source) {
  return choiceCard({
    id: 'potency',
    label: '+1 potency',
    type: 'potency',
    effects: [{ icon: 'i-potency', label: '+1 random potency' }],
    grant: { kind: 'potency-random', amount: 1 },
    claim: `a potency from the ${source}`,
  });
}

// ── Feature reward table ──────────────────────────────────────────────────────
// class: 'direct' (consume on arrival) | 'choice' (modal for humans) |
//        'potency-pick' (choice of which faction) | 'regrow' (timer-based).
// log:  { verb, object, category } for the arrival log line.
// grants: [{ kind, amount, faction?, damage? }] — see _applyGrant.

const FEATURES = {
  // ── Direct finite grants ─────────────────────────────────────────────────
  palimpsestSlab: {
    class: 'direct',
    log: { verb: 'unearths', object: 'a relic from the Palimpsest Slab', category: LOG_CATEGORY.ECONOMY },
    grants: [{ kind: 'relic', amount: FEATURE_RELIC_AMOUNT }],
  },
  vegetableLamb: {
    class: 'direct',
    log: { verb: 'harvests', object: 'the Vegetable Lamb of Tartary', category: LOG_CATEGORY.ECONOMY },
    grants: [
      { kind: 'knots', amount: FEATURE_KNOTS_AMOUNT },
      { kind: 'heal', amount: FEATURE_LAMB_HEAL },
    ],
  },
  dustbleedCrystal: {
    class: 'direct',
    log: { verb: 'gathers', object: 'a Dustbleed Crystal', category: LOG_CATEGORY.ECONOMY },
    grants: [
      { kind: 'gold', amount: FEATURE_CRYSTAL_GOLD },
      { kind: 'potency-random', amount: 1 },
    ],
  },
  drownedCopyist: {
    class: 'direct',
    log: { verb: 'reads', object: 'the Drowned Copyist', category: LOG_CATEGORY.ECONOMY },
    grants: [
      { kind: 'knots', amount: FEATURE_KNOTS_AMOUNT },
      { kind: 'defense', amount: FEATURE_COPYIST_DEFENSE },
    ],
  },

  // ── Choice rewards (finite) ──────────────────────────────────────────────
  witnessStone: {
    class: 'choice',
    body: 'The Witness-Stone murmurs of what was, and what is owed.',
    choices: [relicCard('Witness-Stone'), goldCard(FEATURE_CHOICE_GOLD_WITNESS)],
  },
  screamroot: {
    class: 'choice',
    body: 'The roots writhe. A bargain with the buried voice?',
    choices: [
      choiceCard({
        id: 'savor',
        label: `Savor the roots (+${FEATURE_SCREAMROOT_RISK_KNOTS} God's Knots, -${FEATURE_SCREAMROOT_HP_COST} HP)`,
        type: 'knot',
        effects: [
          { icon: 'd-knot', label: `+${FEATURE_SCREAMROOT_RISK_KNOTS} God's Knots` },
          { icon: 'i-attack', label: `-${FEATURE_SCREAMROOT_HP_COST} HP` },
        ],
        grant: { kind: 'knots', amount: FEATURE_SCREAMROOT_RISK_KNOTS, damage: FEATURE_SCREAMROOT_HP_COST },
        claim: `${FEATURE_SCREAMROOT_RISK_KNOTS} God's Knots from the Screamroot`,
      }),
      choiceCard({
        id: 'clip',
        label: `Clip a sprig (+${FEATURE_SCREAMROOT_SAFE_KNOTS} God's Knots)`,
        type: 'knot',
        effects: [{ icon: 'd-knot', label: `+${FEATURE_SCREAMROOT_SAFE_KNOTS} God's Knots` }],
        grant: { kind: 'knots', amount: FEATURE_SCREAMROOT_SAFE_KNOTS },
        claim: `${FEATURE_SCREAMROOT_SAFE_KNOTS} God's Knots from the Screamroot`,
      }),
    ],
  },
  nullLily: {
    class: 'potency-pick',
    body: 'Seven petals, seven hollow blooms. Each tastes of a different absence.',
  },
  volvelle: {
    class: 'potency-pick',
    body: 'The brass wheel spins to a faction of its own choosing.',
  },
  foolsFire: {
    class: 'choice',
    body: "A will-o'-wisp dances. Follow it, or take what it offers?",
    choices: [movementCard("Fool's-Fire"), goldCard(FEATURE_CHOICE_GOLD_STANDARD)],
  },
  halfDrawnObelisk: {
    class: 'choice',
    body: 'The unfinished obelisk leans toward a destination that was never drawn.',
    choices: [movementCard('Half-Drawn Obelisk'), goldCard(FEATURE_CHOICE_GOLD_STANDARD)],
  },
  ouroborosLoop: {
    class: 'choice',
    body: 'The loop coils back on itself, offering to end where it began.',
    choices: [relicCard('Ouroboros Loop'), goldCard(FEATURE_CHOICE_GOLD_RICH)],
  },
  errataSlip: {
    class: 'choice',
    body: 'A scribbled correction flutters loose.',
    choices: [potencyCard('Errata Slip'), goldCard(FEATURE_CHOICE_GOLD_RICH)],
  },
  listenerLichen: {
    class: 'choice',
    body: 'The lichen leans in, listening.',
    choices: [potencyCard('Listener Lichen'), goldCard(FEATURE_CHOICE_GOLD_STANDARD)],
  },
  gildedInitial: {
    class: 'choice',
    body: 'A gilded flourish, opening the first line of a duel.',
    choices: [
      choiceCard({
        id: 'attack',
        label: `+${FEATURE_INITIAL_BUFF} attack this turn`,
        type: 'attack',
        effects: [{ icon: 'i-attack', label: `+${FEATURE_INITIAL_BUFF} attack this turn` }],
        grant: { kind: 'attack', amount: FEATURE_INITIAL_BUFF },
        claim: `${FEATURE_INITIAL_BUFF} attack from the Gilded Initial`,
      }),
      choiceCard({
        id: 'defense',
        label: `+${FEATURE_INITIAL_BUFF} defense this turn`,
        type: 'defense',
        effects: [{ icon: 'i-armor', label: `+${FEATURE_INITIAL_BUFF} defense this turn` }],
        grant: { kind: 'defense', amount: FEATURE_INITIAL_BUFF },
        claim: `${FEATURE_INITIAL_BUFF} defense from the Gilded Initial`,
      }),
    ],
  },
  censerSaint: {
    class: 'choice',
    body: "The censer swings. A saint's blessing — or its price?",
    choices: [
      choiceCard({
        id: 'blessing',
        label: `+${FEATURE_CENSER_ATTACK} attack, -${FEATURE_CENSER_HP_COST} HP`,
        type: 'attack',
        effects: [
          { icon: 'i-attack', label: `+${FEATURE_CENSER_ATTACK} attack this turn` },
          { icon: 'i-attack', label: `-${FEATURE_CENSER_HP_COST} HP` },
        ],
        grant: { kind: 'attack', amount: FEATURE_CENSER_ATTACK, damage: FEATURE_CENSER_HP_COST },
        claim: "the Censer Saint's blessing",
      }),
      goldCard(FEATURE_CHOICE_GOLD_STANDARD),
    ],
  },

  // ── Replenishable (regrow) ───────────────────────────────────────────────
  waxbloom: {
    class: 'regrow',
    log: { verb: 'gathers', object: 'a Waxbloom', category: LOG_CATEGORY.HEAL },
    grants: [{ kind: 'heal', amount: FEATURE_WAXBLOOM_HEAL }],
  },
  cinderbloom: {
    class: 'regrow',
    log: { verb: 'gathers', object: 'a Cinderbloom', category: LOG_CATEGORY.HEAL },
    grants: [{ kind: 'heal', amount: FEATURE_CINDERBLOOM_HEAL }],
  },
  edenMushroom: {
    class: 'regrow',
    log: { verb: 'gathers', object: 'an Eden Mushroom', category: LOG_CATEGORY.HEAL },
    grants: [{ kind: 'heal', amount: FEATURE_EDEN_MUSHROOM_HEAL }],
  },
  edenShroomlet: {
    class: 'regrow',
    log: { verb: 'gathers', object: 'a Shroomlet', category: LOG_CATEGORY.HEAL },
    grants: [{ kind: 'heal', amount: FEATURE_EDEN_SHROOMLET_HEAL }],
  },
  scoriaRose: {
    class: 'regrow',
    log: { verb: 'plucks', object: 'a Scoria Rose', category: LOG_CATEGORY.ECONOMY },
    grants: [{ kind: 'knots', amount: FEATURE_SCORIA_KNOTS }],
  },
  peridexionTree: {
    class: 'regrow',
    log: { verb: 'harvests', object: 'the Peridexion Tree', category: LOG_CATEGORY.HEAL },
    grants: [
      { kind: 'heal', amount: FEATURE_PERIDEXION_HEAL },
      { kind: 'defense', amount: FEATURE_PERIDEXION_DEFENSE },
    ],
  },
  snowperson: {
    class: 'regrow',
    log: { verb: 'meets', object: 'the Snowperson', category: LOG_CATEGORY.SYSTEM },
    grants: [{ kind: 'movement', amount: FEATURE_SNOWPERSON_MOVEMENT }],
  },
  saintsRib: {
    class: 'regrow',
    log: { verb: 'passes beneath', object: "the Saint's Rib", category: LOG_CATEGORY.SYSTEM },
    grants: [{ kind: 'defense', amount: FEATURE_RIBS_DEFENSE }],
  },
};

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
    _setRegrow(state, champ, tile);
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
    tile.feature = null;
    markChunkDirty(state, tile.q, tile.r);
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
  if (HEAL_KINDS.has(feature.kind) && champ.hp < BOT_TREE_HP_THRESHOLD) {
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

/** Mark a replenishable feature as spent and schedule its regrow. */
function _setRegrow(state, champ, tile) {
  tile.feature.nextRewardDay = state.day + FEATURE_REGROW_DAYS;
  tile.feature.ripe = false;
  state._regrowingFeatures.add(coordKey(champ.pos));
  markChunkDirty(state, tile.q, tile.r);
}

/** Consume a finite feature (de-emphasis restores the decor). */
function _consumeFeature(state, tile) {
  tile.feature = null;
  markChunkDirty(state, tile.q, tile.r);
}
