/**
 * stateFixture.js — Shared test fixtures for game/state unit tests.
 *
 * NOT a test file (no .test.js suffix), so `node --test` never executes it.
 * Provides minimal champion/mob/state factories with the shape expected by
 * src/game/state/combat/* and its dependencies (gameLog, fogOfWar,
 * victoryChecks, spatialIndex, dispatchLedger).
 */

/**
 * Build a champion-shaped entity.
 * Defaults give every faction potency ≥ 1 (all 7 picks available).
 */
export function makeChampion(overrides = {}) {
  return {
    id: 'c0',
    name: 'Test Champion',
    faction: 0,
    hp: 10,
    maxHp: 10,
    alive: true,
    pos: { q: 0, r: 0 },
    potencies: [1, 1, 1, 1, 1, 1, 1],
    controller: 'bot',
    artifact: null,
    gold: 0,
    relics: 0,
    knot: 0,
    moves: 0,
    baseMove: 5,
    weapon: 'ash staff',
    armor: 'worn linen',
    lastActionCombat: false,
    sight: 0,
    explored: [],
    pendingDig: false,
    ...overrides,
  };
}

/**
 * Build a mob-shaped entity.
 * Mobs have no `controller` and no `potencies` — the combat code uses
 * `!!entity.potencies` to distinguish champions from mobs.
 */
export function makeMob(overrides = {}) {
  return {
    id: 'm0',
    name: 'Test Mob',
    faction: 0,
    hp: 6,
    maxHp: 6,
    alive: true,
    pos: { q: 1, r: 0 },
    gold: 0,
    moves: 0,
    lastActionCombat: false,
    ...overrides,
  };
}

/**
 * Build a minimal tile with the shape state code expects:
 * terrain key (looked up in TERRAIN for passability) + feature slot.
 */
export function makeTile(terrain = 'plains', overrides = {}) {
  return { terrain, feature: null, ...overrides };
}

/**
 * Build a minimal live-game state (G) with the fields combat modules touch:
 * logs, spatialIndex, deathOrder/deathEvent, objectives, weather, day, _rng.
 */
export function makeState(overrides = {}) {
  const champions = overrides.champions ?? [];
  const mobs = overrides.mobs ?? [];
  return {
    globalOrder: overrides.globalOrder ?? champions.filter((c) => c.alive).map((c) => c.id),
    currentOrder: overrides.currentOrder ?? [],
    champions,
    mobs,
    traders: [],
    spatialIndex: new Map(),
    chunks: new Map(),
    logs: [],
    deathOrder: [],
    deathEvent: null,
    objectives: { relicRace: false, lastStanding: false },
    weather: { potency: Array(7).fill(0), score: Array(7).fill(0), dayLength: 1 },
    day: 1,
    _rng: () => 0.5,
    _regrowingFeatures: new Set(),
    winnerId: null,
    victoryReason: '',
    reward: null,
    tiles: { '0,0': {}, '1,0': {}, '2,0': {} },
    ...overrides,
  };
}
