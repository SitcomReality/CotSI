/**
 * saveDocument.test.js — Save/load round trip through the serializer.
 *
 * Pins the persistence contract: a save document is JSON-safe, survives a
 * storage round-trip, and deserializeGame rebuilds a state whose simulation
 * (entities, orders, mutated tiles, RNG stream) continues exactly where the
 * original left off.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../../../../src/game/state/gameFactory.js';
import {
  SAVE_FORMAT_VERSION,
  serializeGame,
  deserializeGame,
} from '../../../../../src/game/state/persistence/saveDocument.js';

const CHAMPIONS = [
  { faction: 0, controller: 'human' },
  { faction: 1, controller: 'bot' },
  { faction: 2, controller: 'bot' },
];
const OBJECTIVES = { relicRace: true, relicTarget: 7, lastStanding: true };

/** Build a small game and mutate it meaningfully so the round trip has teeth. */
function makeMutatedGame() {
  const G = createGame({ seed: 'glut-test', radius: 7, champions: CHAMPIONS, objectives: OBJECTIVES });

  // Advance the clock.
  G.day = 6;

  // Mutate resident tiles (chunk size 24 → all of a radius-7 map sits in
  // chunk "0,0"): clear features on a few known in-map hexes.
  for (const key of ['0,0', '1,0', '0,1']) {
    G.tiles[key] = { ...G.tiles[key], feature: null };
  }

  // Hand-write an eviction delta for an out-of-region chunk, as evictChunks
  // would leave behind after a far chunk aged out.
  G.chunkDeltas.set('2,-3', new Map([
    ['5,7', { terrain: 'plains', q: 53, r: -65, feature: null, biomeId: null }],
  ]));

  // Entity mutations: wound a mob, kill another, enrich a champion.
  if (G.mobs[0]) { G.mobs[0].hp = 1; }
  if (G.mobs[1]) { G.mobs[1].alive = false; }
  G.champions[0].gold += 50;
  G.logs.push({
    plainText: 'Test log entry.',
    segments: [{ text: 'Test log entry.' }],
    type: 'system',
    isDeath: false,
    isDayMarker: false,
  });

  // Consume some RNG draws so the saved counter matters.
  for (let i = 0; i < 12; i++) G._rng();
  return G;
}

test('round trip preserves entities, orders, tiles, keys, and objectives', () => {
  const G = makeMutatedGame();
  const doc = serializeGame(G);
  const restored = deserializeGame(doc);

  assert.equal(restored.seed, 'glut-test');
  assert.equal(restored.radius, 7);
  assert.equal(restored.day, 6);
  assert.deepEqual(restored.weather, G.weather);
  assert.deepEqual(restored.champions, structuredClone(G.champions));
  assert.deepEqual(restored.mobs, structuredClone(G.mobs));
  assert.deepEqual(restored.traders, structuredClone(G.traders));
  assert.deepEqual(restored.currentOrder, G.currentOrder);
  assert.deepEqual(restored.globalOrder, G.globalOrder);
  assert.equal(restored.activeChampionId, G.activeChampionId);
  assert.deepEqual(restored.objectives, OBJECTIVES);
  assert.deepEqual(restored.logs, structuredClone(G.logs));
  assert.equal(restored.winnerId, G.winnerId);
  assert.equal(restored.victoryReason, G.victoryReason);
  assert.equal(restored.champions[0].gold, G.champions[0].gold);

  // Mutated resident tiles read back identically through the tile proxy.
  for (const key of ['0,0', '1,0', '0,1']) {
    assert.equal(restored.tiles[key].feature, null, `feature cleared on ${key}`);
  }
  // Pristine tiles still regenerate from the seed.
  assert.equal(restored.tiles['2,2'].terrain, G.tiles['2,2'].terrain);

  // The hand-written eviction delta survived for its far chunk...
  const delta = restored.chunkDeltas.get('2,-3');
  assert.ok(delta, 'far-chunk delta persisted');
  assert.deepEqual(delta.get('5,7'), { terrain: 'plains', q: 53, r: -65, feature: null, biomeId: null });

  // ...and key sets round-trip.
  assert.deepEqual([...restored._dungeonKeys].sort(), [...G._dungeonKeys].sort());
  assert.deepEqual([...restored._baseKeys].sort(), [...G._baseKeys].sort());

  // Transient fields are reset, not carried over.
  assert.equal(restored.turnLock, false);
  assert.equal(restored.screen, 'world');
  assert.equal(restored.selectedTile, null);
  assert.equal(restored.deathEvent, null);
});

test('RNG continuation matches after restore', () => {
  const G = makeMutatedGame();
  const doc = serializeGame(G);

  const originalDraws = Array.from({ length: 20 }, () => G._rng());
  const restored = deserializeGame(JSON.parse(JSON.stringify(doc)));
  const restoredDraws = Array.from({ length: 20 }, () => restored._rng());

  assert.deepEqual(restoredDraws, originalDraws);
});

test('document survives a JSON storage round-trip', () => {
  const G = makeMutatedGame();
  const doc = serializeGame(G);
  const restored = deserializeGame(JSON.parse(JSON.stringify(doc)));

  assert.equal(restored.day, 6);
  assert.deepEqual(restored.champions, structuredClone(G.champions));
  assert.equal(restored.tiles['1,0'].feature, null);
});

test('version guard rejects foreign documents and future versions', () => {
  const doc = serializeGame(makeMutatedGame());

  assert.throws(() => deserializeGame({ ...doc, format: 'other-save' }), /Not a CotSI save/);
  assert.throws(() => deserializeGame(null), /Not a CotSI save/);
  assert.throws(
    () => deserializeGame({ ...doc, version: SAVE_FORMAT_VERSION + 1 }),
    /Unsupported save format version/,
  );
});
