/**
 * featureRegrowth.js — Unified regrowth/replenishment lifecycle for features.
 *
 * One module owns the regrow timer for replenishable features. Every
 * consumer goes through here so there is a single source of truth:
 *
 *   - the generic reward engine (featureRewards.js) — regrow-class rewards,
 *   - the Blessed Font path (arrivalInteractions.js) — the font heal,
 *   - the world turn (worldSimulation.js) — the daily regrowth advance.
 *
 * Feature state shape on a tile:
 *   nextRewardDay — the day the feature becomes ripe again (1 = ripe at spawn)
 *   ripe          — false while spent, true when the reward is available
 *   growth        — continuous 0..1 visual state: 0 = depleted/empty,
 *                   1 = full/ripe. Advances one step (1/regrowDays) per world
 *                   turn so the render can show the feature filling/ripening
 *                   day by day (see the descriptor `states` keyframes).
 *                   Absent = full (fresh spawns are ripe).
 *   regrowDays    — the regrow duration this depletion cycle runs on (the
 *                   per-day growth step is 1/regrowDays)
 *
 * `state._regrowingFeatures` is a Set of "q,r" keys currently counting down
 * (initialized in initialGameState.js).
 *
 * Layer: game/state — mutates state; imports engine, game/state, params.
 */
import { coordKey } from '../../../engine/rules/hexGrid.js';
import { markChunkDirty } from '../world/chunkDirtyTracking.js';
import { FEATURE_REGROW_DAYS } from '../../../params/game/economyParams.js';

/**
 * Mark a replenishable feature as spent and schedule its regrow after `days`.
 * The feature's growth resets to 0 (depleted look) and steps up 1/`days` per
 * world turn until it is full again.
 * @param {object} state — live game state
 * @param {object} tile  — the tile ({ q, r, feature }) whose feature is spent
 * @param {number} [days=FEATURE_REGROW_DAYS]
 */
export function depleteFeature(state, tile, days = FEATURE_REGROW_DAYS) {
  tile.feature.nextRewardDay = state.day + days;
  tile.feature.ripe = false;
  tile.feature.growth = 0;
  tile.feature.regrowDays = days;
  state._regrowingFeatures.add(coordKey({ q: tile.q, r: tile.r }));
  markChunkDirty(state, tile.q, tile.r);
}

/**
 * Advance every regrowing feature on the world turn: each feature's growth
 * steps 1/regrowDays toward full; once the current day reaches its
 * nextRewardDay the feature is ripe (growth = 1) and leaves the timer. The
 * chunk is marked dirty on every step so the render rebuilds and shows the
 * feature one step closer to its full state each day.
 * @param {object} state — live game state
 */
export function advanceRegrowth(state) {
  for (const key of state._regrowingFeatures) {
    const t = state.tiles[key];
    if (!t?.feature || t.feature.nextRewardDay == null) continue;
    const step = 1 / (t.feature.regrowDays ?? FEATURE_REGROW_DAYS);
    t.feature.growth = Math.min(1, (t.feature.growth ?? 0) + step);
    if (state.day >= t.feature.nextRewardDay) {
      t.feature.growth = 1;
      t.feature.ripe = true;
      state._regrowingFeatures.delete(key);
    }
    // Feature state changed — rebuild the chunk so the new growth level shows.
    markChunkDirty(state, t.q, t.r);
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
      t.feature.growth = 1;
      t.feature.ripe = true;
      state._regrowingFeatures.delete(key);
      // Feature state changed — rebuild the chunk so the refilled font shows.
      markChunkDirty(state, t.q, t.r);
    }
  }
}
