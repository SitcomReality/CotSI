/**
 * featureRegrowth.js — Unified regrowth/replenishment lifecycle for features.
 *
 * One module owns the ripe/unripe timer for replenishable features. Every
 * consumer goes through here so there is a single source of truth:
 *
 *   - the generic reward engine (featureRewards.js) — regrow-class rewards,
 *   - the Blessed Font path (arrivalInteractions.js) — the font heal,
 *   - the world turn (worldSimulation.js) — the daily regrowth advance.
 *
 * Feature state shape on a tile:
 *   nextRewardDay — the day the feature becomes ripe again (1 = ripe at spawn)
 *   ripe          — false while spent, true when the reward is available
 *
 * `state._regrowingFeatures` is a Set of "q,r" keys currently counting down
 * (initialized in initialGameState.js).
 *
 * Layer: game/state — mutates state; imports engine, game/state, params.
 */
import { coordKey } from '../../engine/rules/hexGrid.js';
import { markChunkDirty } from './chunkDirtyTracking.js';
import { FEATURE_REGROW_DAYS } from '../../params/game/economyParams.js';

/**
 * Mark a replenishable feature as spent and schedule its regrow after `days`.
 * @param {object} state — live game state
 * @param {object} tile  — the tile ({ q, r, feature }) whose feature is spent
 * @param {number} [days=FEATURE_REGROW_DAYS]
 */
export function depleteFeature(state, tile, days = FEATURE_REGROW_DAYS) {
  tile.feature.nextRewardDay = state.day + days;
  tile.feature.ripe = false;
  state._regrowingFeatures.add(coordKey({ q: tile.q, r: tile.r }));
  markChunkDirty(state, tile.q, tile.r);
}

/**
 * Advance every regrowing feature on the world turn: a feature becomes ripe
 * once the current day reaches its nextRewardDay.
 * @param {object} state — live game state
 */
export function advanceRegrowth(state) {
  for (const key of state._regrowingFeatures) {
    const t = state.tiles[key];
    if (t?.feature && t.feature.nextRewardDay != null && state.day >= t.feature.nextRewardDay) {
      t.feature.ripe = true;
      state._regrowingFeatures.delete(key);
      // Feature state changed — rebuild the chunk so the ready feature shows.
      markChunkDirty(state, t.q, t.r);
    }
  }
}

/**
 * Refill replenishable features that the weather tops up at day start.
 *
 * A Blessed Font refills to full on any rainy day, independent of its
 * nextRewardDay timer. `rainy` comes from the current day's weather entry
 * (weatherScript.js `rainy` flag).
 * @param {object} state — live game state
 * @param {boolean} rainy — whether the new day's weather is rainy
 */
export function refillOnRain(state, rainy) {
  if (!rainy) return;
  for (const key of state._regrowingFeatures) {
    const t = state.tiles[key];
    if (t?.feature?.kind === 'blessedFont') {
      t.feature.ripe = true;
      state._regrowingFeatures.delete(key);
      // Feature state changed — rebuild the chunk so the refilled font shows.
      markChunkDirty(state, t.q, t.r);
    }
  }
}
