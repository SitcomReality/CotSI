/**
 * digSystem.js — Pending dig resolution and dig eligibility checks.
 *
 * A dig rolls one outcome (relic / potency / gold); human champions choose
 * between that outcome and a random equipment item, bots take the rolled
 * outcome. The Everknown racial potency applies regardless of the choice.
 */
import { FACTIONS } from '../../rules/factionData.js';
import { coordKey } from '../../../engine/rules/hexGrid.js';
import { TERRAIN } from '../../rules/terrainTypes.js';
import { occupiedByMob } from '../entities/entityQueries.js';
import { pickEquipment } from '../../rules/equipment.js';
import { addLogEntry } from '../world/gameLog.js';
import { LOG_CATEGORY } from '../../rules/logGrammar.js';
import { buildChampionFactionMap, championSegment, factionAccentVar } from '../../rules/logHelpers.js';
import { recordLedgerEntry } from '../world/dispatchLedger.js';
import { applyFeatureChoice } from './featureRewards.js';
import { choiceCard, equipmentCard } from './featureRewardTable.js';
import {
  DIG_RELIC_CHANCE,
  DIG_POTENCY_CHANCE,
  DIG_GOLD_BASE,
  DIG_GOLD_RANDOM,
  DIG_GOLD_DAY_DIVISOR,
} from '../../../params/game/economyParams.js';
import { FACTION_EVERKNOWN, FACTION_COUNT } from '../../../params/game/factionParams.js';

export function resolvePendingDig(state, ch) {
  ch.pendingDig = false;
  const roll = state._rng();
  const factionMap = buildChampionFactionMap(state.champions);
  const key = coordKey(ch.pos);

  // Roll the dug-up outcome into a choice card.
  let outcome;
  if (roll < DIG_RELIC_CHANCE) {
    outcome = choiceCard({
      id: 'dug-relic',
      label: 'Relic',
      type: 'relic',
      effects: [{ icon: 'i-relic', label: '+1 relic' }],
      grant: { kind: 'relic', amount: 1 },
      claim: 'a relic from the night dig',
    });
  } else if (roll < DIG_POTENCY_CHANCE) {
    const f = Math.floor(state._rng() * FACTION_COUNT);
    outcome = choiceCard({
      id: 'dug-potency',
      label: `+1 ${FACTIONS[f].name} potency`,
      type: 'potency',
      effects: [{ icon: 'i-potency', label: `+1 ${FACTIONS[f].name} potency` }],
      grant: { kind: 'potency', faction: f, amount: 1 },
      claim: `a ${FACTIONS[f].name} potency from the night dig`,
    });
  } else {
    const gold = DIG_GOLD_BASE + Math.floor(state._rng() * DIG_GOLD_RANDOM) + Math.floor(state.day / DIG_GOLD_DAY_DIVISOR);
    outcome = choiceCard({
      id: 'dug-gold',
      label: `${gold} gold`,
      type: 'gold',
      effects: [{ icon: 'i-gold', label: `+${gold} gold` }],
      grant: { kind: 'gold', amount: gold },
      claim: `${gold} gold from the night dig`,
    });
  }

  // Archive racial — independent of the chosen reward.
  if (ch.faction === FACTION_EVERKNOWN && roll < DIG_RELIC_CHANCE) {
    const rf = Math.floor(state._rng() * FACTION_COUNT);
    ch.potencies[rf]++;
    recordLedgerEntry(ch, `+1 ${FACTIONS[rf].name} potency — Everknown`, 'gain', 'potency');
  }

  const choices = [outcome, equipmentCard(pickEquipment(state._rng), 'night dig')];
  if (ch.controller === 'human' && !state.reward) {
    state.reward = {
      championId: ch.id,
      type: 'feature',
      title: 'Night dig',
      body: 'Something glints beneath the dust.',
      tileKey: key,
      guaranteed: [],
      choices,
    };
  } else {
    applyFeatureChoice(state, ch, choices[0], key);
  }
}

export function isDigEligible(state, champ) {
  const key = coordKey(champ.pos);
  const tile = state.tiles[key];
  return TERRAIN[tile.terrain].passable && !tile.feature && !occupiedByMob(state, key) && !champ.lastActionCombat;
}
