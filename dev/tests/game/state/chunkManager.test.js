/**
 * chunkManager.test.js — Lazy chunk lifecycle: on-demand generation, eviction
 * with delta extraction, and deterministic regeneration (src/game/state/world/chunkManager.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ensureChunk, ensureChunkForTile, ensureChunksAround, missingChunksAround,
  evictChunks, generateBaseChunk,
} from '../../../../src/game/state/world/chunkManager.js';
import { getTile, setTile } from '../../../../src/game/state/world/tileAccess.js';
import { createTileProxy } from '../../../../src/game/state/world/tileProxy.js';
import { coordKey } from '../../../../src/engine/rules/hexGrid.js';
import { tileToChunk, chunkKey, chunkKeyFromTile, localCoord, hexesInChunk } from '../../../../src/engine/rules/chunkGrid.js';
import { CHUNK_EVICTION_GRACE_DAYS } from '../../../../src/params/game/chunkParams.js';

function makeState({ seed = 'chunk-test', radius = 60, biome = 'multi_biome', day = 1 } = {}) {
  const state = {
    seed, radius, biome, day,
    champions: [], mobs: [], traders: [],
    chunks: new Map(), chunkDeltas: new Map(),
  };
  state.tiles = createTileProxy(state);
  return state;
}

const human = (q, r) => ({ pos: { q, r }, controller: 'human', alive: true });
const mob = (q, r) => ({ pos: { q, r }, alive: true });

test('ensureChunk: generates a full deterministic chunk and is idempotent', () => {
  const state = makeState();
  const chunk = ensureChunk(state, 0, 0);
  assert.ok(chunk, 'chunk exists');
  assert.equal(chunk.tiles.size, 576, 'full 24×24 chunk');
  assert.equal(state.chunks.get('0,0'), chunk, 'stored in state');
  assert.equal(ensureChunk(state, 0, 0), chunk, 'idempotent — same object');
  // Determinism against a fresh base generation
  const fresh = generateBaseChunk(state, 0, 0);
  assert.equal(fresh.tiles.size, 576);
  assert.equal(
    JSON.stringify(fresh.tiles.get('0,0')),
    JSON.stringify(chunk.tiles.get('0,0')),
    'regenerated base tile identical'
  );
});

test('ensureChunk: skips chunks with no in-map hexes', () => {
  const state = makeState({ radius: 60 });
  assert.equal(ensureChunk(state, 10, 10), undefined, 'chunk far outside the disc');
  assert.ok(!state.chunks.has(chunkKey(10, 10)));
});

test('ensureChunkForTile: generates only in-map tiles', () => {
  const state = makeState();
  assert.ok(ensureChunkForTile(state, 10, -5), 'in-map tile materializes its chunk');
  assert.ok(state.chunks.has(chunkKeyFromTile(10, -5)));
  assert.equal(ensureChunkForTile(state, 1000, 1000), undefined, 'out-of-map never generates');
  assert.equal(state.chunks.size, 1);
});

test('getTile: lazily generates the containing chunk on read', () => {
  const state = makeState();
  assert.equal(state.chunks.size, 0, 'nothing generated yet');
  const tile = state.tiles[coordKey({ q: 12, r: 7 })]; // proxy read
  assert.ok(tile, 'read materialized the tile');
  assert.equal(tile.q, 12);
  assert.equal(state.chunks.size, 1, 'only the read chunk generated');
  // Out-of-map reads stay undefined and never generate
  assert.equal(state.tiles['900,900'], undefined);
  assert.equal(state.chunks.size, 1);
});

test('setTile: materializes the base chunk before mutating a tile', () => {
  const state = makeState();
  setTile(state, 30, -5, { q: 30, r: -5, terrain: 'plains', feature: { kind: 'dig' } });
  const ck = chunkKeyFromTile(30, -5);
  const chunk = state.chunks.get(ck);
  assert.ok(chunk, 'chunk created');
  assert.equal(chunk.tiles.size, 576, 'full base chunk, not a lone tile');
  assert.equal(chunk.dirty, true);
  const { cq, cr } = tileToChunk(30, -5);
  const { lq, lr } = localCoord(cq, cr, 30, -5);
  assert.equal(chunk.tiles.get(`${lq},${lr}`).feature.kind, 'dig');
  assert.equal(getTile(state, 30, -5).feature.kind, 'dig');
});

test('missingChunksAround / ensureChunksAround: buffer bookkeeping', () => {
  const state = makeState();
  const missing = missingChunksAround(state, 0, 0, 1);
  assert.equal(missing.length, 9, '3×3 buffer all missing initially');
  ensureChunksAround(state, 0, 0, 1);
  assert.equal(missingChunksAround(state, 0, 0, 1).length, 0, 'all ensured');
});

test('evictChunks: pristine chunk evicts to nothing and regenerates identically', () => {
  const state = makeState({ day: 20 });
  state.champions = [human(0, 0)]; // cull disc keeps only chunk (0,0)
  ensureChunksAround(state, 0, 0, 1); // chunks (-1..1)²

  const ck = '1,0';
  const before = {};
  for (const [lk, tile] of state.chunks.get(ck).tiles) {
    before[lk] = JSON.parse(JSON.stringify(tile));
  }
  state.chunks.get(ck).lastEntityDay = -100; // ancient, no entities

  const evicted = evictChunks(state);
  assert.ok(evicted >= 1, `evicted at least one chunk (got ${evicted})`);
  assert.ok(!state.chunks.has(ck), 'chunk dropped');
  assert.ok(!state.chunkDeltas.has(ck), 'pristine chunk stores no deltas');

  // A read regenerates the chunk with byte-identical tiles
  const [cq, cr] = ck.split(',').map(Number);
  const someHex = hexesInChunk(cq, cr).find(({ q, r }) => Math.abs(-q - r) <= 60);
  assert.ok(getTile(state, someHex.q, someHex.r), 'regenerated on read');
  const after = state.chunks.get(ck);
  assert.ok(after, 'chunk back');
  for (const [lk, tile] of after.tiles) {
    assert.deepEqual(tile, before[lk], `tile ${lk} regenerated identically`);
  }
});

test('evictChunks: modified tiles survive as deltas and are re-applied', () => {
  const state = makeState({ day: 20 });
  state.champions = [human(0, 0)];
  ensureChunk(state, 2, 0);
  const ck = '2,0';
  state.chunks.get(ck).lastEntityDay = -100;

  // Dig a tile in the chunk (gameplay modification)
  const target = { q: 50, r: -5 };
  setTile(state, target.q, target.r, { ...getTile(state, target.q, target.r), terrain: 'plains', feature: { kind: 'dig' } });

  evictChunks(state);
  assert.ok(!state.chunks.has(ck), 'evicted');
  const deltas = state.chunkDeltas.get(ck);
  assert.ok(deltas && deltas.size >= 1, 'deltas stored');
  const { lq, lr } = localCoord(2, 0, target.q, target.r);
  assert.equal(deltas.get(`${lq},${lr}`).feature.kind, 'dig', 'modification recorded');

  // Regeneration re-applies the dig
  assert.ok(getTile(state, target.q, target.r), 'regenerated on read');
  assert.equal(getTile(state, target.q, target.r).feature.kind, 'dig', 'delta re-applied');
  assert.ok(!state.chunkDeltas.has(ck), 'deltas consumed on regeneration');
});

test('evictChunks: respects occupancy, grace period, and the cull disc', () => {
  const state = makeState({ day: 20 });
  state.champions = [human(0, 0)];
  state.mobs = [mob(24, 0)]; // chunk (1,0)

  ensureChunksAround(state, 0, 0, 1);
  ensureChunk(state, 2, 0);   // in-map: q ∈ [36, 60)
  ensureChunk(state, 2, -2);  // in-map: q ∈ [36, 60), r ∈ [-60, -36)
  state.chunks.get('2,0').lastEntityDay = 20 - 5;        // within grace
  state.chunks.get('2,-2').lastEntityDay = -100;          // ancient, empty

  const evicted = evictChunks(state);
  assert.equal(evicted, 1, 'only the ancient empty chunk evicts');
  assert.ok(state.chunks.has('0,0'), 'cull-disc chunk kept');
  assert.ok(state.chunks.has('1,0'), 'occupied chunk kept');
  assert.ok(state.chunks.has('2,0'), 'recently-touched chunk kept');
  assert.ok(!state.chunks.has('2,-2'), 'ancient empty chunk evicted');
});

test('evictChunks: nothing evicts with no living humans (spectator)', () => {
  const state = makeState({ day: 20 });
  ensureChunksAround(state, 0, 0, 1);
  state.chunks.get('1,0').lastEntityDay = -100;
  assert.equal(evictChunks(state), 0, 'spectator keeps the world resident');
  assert.ok(state.chunks.has('1,0'));
});

test('evictChunks: occupant chunks are re-touched to the current day', () => {
  const state = makeState({ day: 20 });
  state.mobs = [mob(24, 0)];
  ensureChunk(state, 1, 0);
  state.chunks.get('1,0').lastEntityDay = -100;
  evictChunks(state); // touches occupants first
  assert.equal(state.chunks.get('1,0').lastEntityDay, 20, 'occupant chunk re-touched');
});
