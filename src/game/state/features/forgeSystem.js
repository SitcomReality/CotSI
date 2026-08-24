/**
 * forgeSystem.js — Equipment upgrades at Forge hexes.
 *
 * A Forge is a permanent map feature (never consumed) present in every biome.
 * On arrival, a champion with an equipped item and enough God's Knots is
 * offered an upgrade choice (weapon / armor); applying it clones the equipped
 * item with its bonus raised by FORGE_BONUS_STEP. God's Knots remain the
 * tier-2 currency — purchases happen at traders, upgrades happen here, never
 * at knot hexes.
 *
 * Human champions get the reward-choice modal; bots ignore forges entirely
 * (like dungeons).
 *
 * Layer: game/state — mutates state; may import engine, game/rules, itself.
 */
import { coordKey } from '../../../engine/rules/hexGrid.js';
import { addLogEntry } from '../world/gameLog.js';
import { LOG_CATEGORY } from '../../rules/logGrammar.js';
import { buildChampionFactionMap, championSegment } from '../../rules/logHelpers.js';
import { choiceCard } from './featureRewardTable.js';
import { EQUIPMENT_SLOTS } from '../../rules/equipment.js';
import { FORGE_KNOT_COST, FORGE_BONUS_STEP } from '../../../params/game/economyParams.js';

/** The stat an upgrade step improves on a slot's item ('attack' or 'defense'). */
function upgradedStat(item) {
  if (!item?.bonus) return null;
  if (item.bonus.attack) return 'attack';
  if (item.bonus.defense) return 'defense';
  return null;
}

/**
 * Choice cards for every slot the champion can upgrade right now: an item in
 * the slot, an improvable bonus stat, and enough God's Knots.
 */
export function forgeUpgradeChoices(champ) {
  const cards = [];
  for (const slot of EQUIPMENT_SLOTS) {
    const item = champ[slot];
    const stat = upgradedStat(item);
    if (!stat || champ.knot < FORGE_KNOT_COST) continue;
    cards.push(choiceCard({
      id: `forge-${slot}`,
      label: `${item.name} +${(item.upgradeLevel || 0) + 1} (+${FORGE_BONUS_STEP} ${stat})`,
      type: slot,
      effects: [
        { icon: slot === 'weapon' ? 'i-weapon' : 'i-armor', label: `${item.name} +${FORGE_BONUS_STEP} ${stat}` },
        { icon: 'd-knot', label: `-${FORGE_KNOT_COST} God's Knots` },
      ],
      grant: { kind: 'upgrade-equipment', slot },
      claim: `a forge upgrade (${item.name} +${FORGE_BONUS_STEP} ${stat})`,
    }));
  }
  return cards;
}

/**
 * Offer the forge upgrade on arrival at a Forge hex. Humans with at least one
 * eligible slot get the reward-choice modal; everyone else (bots, or nothing
 * to upgrade) just passes through. The Forge itself is never consumed.
 */
export function offerForgeUpgrade(state, champ) {
  const choices = forgeUpgradeChoices(champ);
  if (!choices.length || champ.controller !== 'human' || state.reward) return;

  state.reward = {
    championId: champ.id,
    type: 'feature',
    title: 'Forge',
    body: `The coals breathe. Reforge a piece for ${FORGE_KNOT_COST} God's Knots?`,
    tileKey: coordKey(champ.pos),
    guaranteed: [],
    choices,
  };
}

/**
 * Apply a forge upgrade grant (from applyFeatureChoice). Returns descriptive
 * text for the log line, or '' when the upgrade cannot apply (spent knots,
 * empty slot since the offer).
 */
export function applyForgeUpgrade(state, champ, grant) {
  const item = champ[grant.slot];
  const stat = upgradedStat(item);
  if (!stat || champ.knot < FORGE_KNOT_COST) return '';

  champ.knot -= FORGE_KNOT_COST;
  // Clone so the shared catalog item is never mutated; track the level for UI.
  const upgraded = {
    ...item,
    bonus: { ...item.bonus, [stat]: item.bonus[stat] + FORGE_BONUS_STEP },
    upgradeLevel: (item.upgradeLevel || 0) + 1,
  };
  champ[grant.slot] = upgraded;

  const factionMap = buildChampionFactionMap(state.champions);
  addLogEntry(state, {
    category: LOG_CATEGORY.ECONOMY,
    subject: championSegment(champ.name, factionMap),
    verb: 'reforges',
    object: { text: `${upgraded.name} at the Forge` },
    detail: { text: `+${FORGE_BONUS_STEP} ${stat}, -${FORGE_KNOT_COST} God's Knots`, color: 'var(--gold)' },
  });
  return `+${FORGE_BONUS_STEP} ${stat} (${upgraded.name})`;
}
