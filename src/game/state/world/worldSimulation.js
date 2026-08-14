/**
 * worldSimulation.js — End-of-round world simulation and turn advancement.
 * Depends on entityQueries, turnActions, fogOfWar, and victoryChecks.
 *
 * Mob harassment and trader movement have been extracted to
 * mobHarassment.js and traderMovement.js respectively.
 */
import { coordKey } from '../../../engine/rules/hexGrid.js';
import { weatherForDay } from '../../rules/weatherScript.js';
import { getChampion } from '../entities/entityQueries.js';
import { beginTurn, isDigEligible } from '../turnActions.js';
import { interactOnArrival } from '../features/arrivalInteractions.js';
import { addLogEntry } from './gameLog.js';
import { LOG_CATEGORY } from '../../rules/logGrammar.js';
import { buildChampionFactionMap, championSegment } from '../../rules/logHelpers.js';
import { checkVictory } from './victoryChecks.js';
import { startMeasure, endMeasure } from '../../../shared/measurements.js';
import { runMobHarassment } from '../movement/mobHarassment.js';
import { runTraderMovement } from '../movement/traderMovement.js';
import { traderStock } from '../../rules/traderStock.js';
import { DAYS_PER_WEEK } from '../../../params/game/worldParams.js';
import { advanceRegrowth, refillOnRain } from '../features/featureRegrowth.js';

export function finishTurn(state) {
  const champ = getChampion(state, state.activeChampionId);
  if (champ && champ.alive) {
    const tile = state.tiles[coordKey(champ.pos)];
    if (tile?.feature?.kind === 'knot' && !tile.feature.mined) {
      interactOnArrival(state, champ);
    } else if (isDigEligible(state, champ)) {
      champ.pendingDig = true;
      const factionMap = buildChampionFactionMap(state.champions);
      addLogEntry(state, {
        category: LOG_CATEGORY.ECONOMY,
        subject: championSegment(champ.name, factionMap),
        verb: 'spends the night digging in blank parchment',
        object: null,
        detail: null,
      });
    }
  }
  advanceTurn(state);
}

export function advanceTurn(state) {
  if (checkVictory(state)) return;
  const livingOrder = state.currentOrder.filter(id => getChampion(state, id)?.alive);
  const idx = livingOrder.indexOf(state.activeChampionId);

  if (idx >= 0 && idx + 1 < livingOrder.length) {
    // Normal case: advance to the next champion in the living order
    state.activeChampionId = livingOrder[idx + 1];
  } else if (idx >= 0) {
    // All living champions have played — world turn + next day
    _runWorldTurn(state);
  } else {
    // Active champion died during their own turn (e.g. bot lost combat).
    // Find the next living champion after the dead one's position in currentOrder.
    const deadPos = state.currentOrder.indexOf(state.activeChampionId);
    const nextAlive = state.currentOrder
      .slice(deadPos + 1)
      .find(id => getChampion(state, id)?.alive);
    if (nextAlive) {
      state.activeChampionId = nextAlive;
    } else {
      // No living champions remain after this position — world turn
      _runWorldTurn(state);
    }
  }

  if (state.activeChampionId) {
    beginTurn(state, state.activeChampionId);
    // Clear turn lock so the new champion's turn can proceed.
    // The lock is set by runBot/onEndTurn as a re-entry guard, but each
    // fresh champion — human or bot — starts unlocked. runBot sets it
    // again before doing work, and onEndTurn checks it.
    state.turnLock = false;
  }
}

/** World-turn logic extracted to avoid duplication. */
function _runWorldTurn(state) {
  runWorldTurn(state);
  state.day += 1;
  state.weather = weatherForDay(state.day);
  // Blessed Fonts (and any feature with a rainy-day rule) refill at day start
  // when the new day's weather is rainy.
  refillOnRain(state, state.weather.rainy);
  addLogEntry(state, {
    category: LOG_CATEGORY.MARKER,
    subject: { text: `Day ${state.day}: ${state.weather.name} — ${state.weather.text}`, color: 'var(--ink-mid)' },
    verb: '',
    object: null,
    detail: null,
  });
  state.currentOrder = state.globalOrder.filter(id => getChampion(state, id)?.alive);
  state.herald = {
    day: state.day,
    weather: { name: state.weather.name, text: state.weather.text, tint: state.weather.tint },
    order: [...state.currentOrder],
    champions: state.champions,
    deathOrder: [...state.deathOrder],
  };
  state.activeChampionId = state.currentOrder[0] || null;
}

function runWorldTurn(state) {
  startMeasure('worldTurn');

  // mob harass
  runMobHarassment(state);

  // regrow features (blessed fonts, waxbloom, snowperson, ...)
  advanceRegrowth(state);

  // traders move
  runTraderMovement(state);

  // weekly trader inventory reset — fresh 7-slot stock for the coming week
  if (state.day % DAYS_PER_WEEK === 0) {
    for (const tr of state.traders) tr.stock = traderStock(state._rng);
  }

  endMeasure('worldTurn');
}
