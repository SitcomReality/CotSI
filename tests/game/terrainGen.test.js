/**
 * terrainGen.test.js — Full terrain-generation pipeline invariants
 * (src/game/rules/terrainGen/).
 *
 * Uses small radii for speed: r=7 → 169 tiles, r=14 → 631 tiles.
 * All tests are deterministic (seeded) and take no I/O.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateTiles } from '../../src/game/rules/terrainGen/flatGeneration.js';
import { generateChunkTiles } from '../../src/game/rules/terrainGen/chunkGeneration.js';
import { TERRAIN } from '../../src/game/rules/terrainTypes.js';
import { TERRAIN_ELEVATION } from '../../src/params/render/terrainParams.js';
import { getArchetype } from '../../src/game/rules/archetypes.js';
import '../../src/game/rules/archetypeData/index.js';
import { coordKey, neighbors, distance } from '../../src/engine/rules/hexGrid.js';

const RADIUS = 14; // 631 tiles — fast, big enough for multi-chunk + budgets

function tileCounts(tiles) {
  const counts = {};
  for (const tile of Object.values(tiles)) {
    counts[tile.terrain] = (counts[tile.terrain] || 0) + 1;
  }
  return counts;
}

function pct(tiles, terrain) {
  const counts = tileCounts(tiles);
  return (counts[terrain] || 0) / Object.keys(tiles).length;
}

test('determinism: same seed → identical tile maps', () => {
  const a = generateTiles('determinism-seed', RADIUS);
  const b = generateTiles('determinism-seed', RADIUS);
  assert.equal(Object.keys(a).length, Object.keys(b).length);
  for (const key of Object.keys(a)) {
    const ta = a[key];
    const tb = b[key];
    assert.ok(tb, `tile ${key} missing in second generation`);
    assert.equal(ta.terrain, tb.terrain, `terrain differs at ${key}`);
    assert.equal(ta.feature?.kind ?? null, tb.feature?.kind ?? null, `feature differs at ${key}`);
    assert.equal(ta.biomeId, tb.biomeId, `biome differs at ${key}`);
    assert.equal(ta.elevation, tb.elevation, `elevation differs at ${key}`);
    assert.equal(ta.moisture, tb.moisture, `moisture differs at ${key}`);
  }
});

test('seed variance: different seeds produce different maps', () => {
  const a = generateTiles('seed-alpha', RADIUS);
  const b = generateTiles('seed-beta', RADIUS);
  let diffs = 0;
  for (const key of Object.keys(a)) {
    if (a[key].terrain !== b[key].terrain) diffs++;
  }
  assert.ok(diffs > 0, 'two different seeds should not produce identical terrain');
});

test('terrain budget: wide snapshot ranges hold at r=14', () => {
  // Wide ranges from dev/mapgen_update/remaining_work.md §11 — tight ranges
  // come later once thresholds are recalibrated.
  for (const seed of ['budget-a', 'budget-b', 'budget-c']) {
    const tiles = generateTiles(seed, RADIUS);
    const total = Object.keys(tiles).length;
    assert.ok(total > 0);

    const water = pct(tiles, 'water');
    assert.ok(water >= 0.06 && water <= 0.20, `seed ${seed} water ${water.toFixed(3)} out of [6%,20%]`);

    const mountain = pct(tiles, 'mountain');
    assert.ok(mountain >= 0.03 && mountain <= 0.15, `seed ${seed} mountain ${mountain.toFixed(3)} out of [3%,15%]`);

    const peak = pct(tiles, 'peak');
    assert.ok(peak >= 0 && peak <= 0.05, `seed ${seed} peak ${peak.toFixed(3)} out of [0%,5%]`);

    const island = pct(tiles, 'floatingIsland');
    assert.ok(island >= 0 && island <= 0.02, `seed ${seed} floatingIsland ${island.toFixed(3)} out of [0%,2%]`);
  }
});

test('passable connectivity: every passable tile reachable from the main component', () => {
  // Multi-biome generation (biomeDef = null) runs ensurePassableConnectivity.
  const tiles = generateTiles('connectivity-seed', RADIUS);

  const passableKeys = Object.keys(tiles).filter((k) => TERRAIN[tiles[k].terrain]?.passable);
  assert.ok(passableKeys.length > 0, 'map should contain passable tiles');

  // Flood fill from the center (0,0) — must be passable or we seed from
  // the first passable tile, matching connectivityEnforcement.js behavior.
  const start = passableKeys.includes('0,0') ? '0,0' : passableKeys[0];
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    const [q, r] = cur.split(',').map(Number);
    for (const n of neighbors({ q, r })) {
      const k = coordKey(n);
      if (seen.has(k)) continue;
      if (passableKeys.includes(k)) {
        seen.add(k);
        queue.push(k);
      }
    }
  }

  assert.equal(seen.size, passableKeys.length,
    `only ${seen.size}/${passableKeys.length} passable tiles reachable — connectivity broken`);
});

test('per-tile invariants: known terrain, registered biome, fields in [0,1]', () => {
  const tiles = generateTiles('invariants-seed', RADIUS);
  for (const tile of Object.values(tiles)) {
    assert.ok(TERRAIN[tile.terrain], `unknown terrain ${tile.terrain} at ${coordKey(tile)}`);
    const biome = getArchetype(tile.biomeId);
    assert.ok(biome, `unregistered biome ${tile.biomeId} at ${coordKey(tile)}`);
    // elevationField is the continuous [0,1] field; elevation is the display
    // Y-offset — a biome terrainElevation override wins, else the global
    // TERRAIN_ELEVATION lookup (mirrors resolveElevation).
    assert.ok(tile.elevationField >= 0 && tile.elevationField <= 1, `elevationField out of range at ${coordKey(tile)}`);
    const expectedElev = biome.terrainElevation?.[tile.terrain] ?? TERRAIN_ELEVATION[tile.terrain];
    assert.equal(tile.elevation, expectedElev, `display elevation mismatch at ${coordKey(tile)}`);
    assert.ok(tile.moisture >= 0 && tile.moisture <= 1, `moisture out of range at ${coordKey(tile)}`);
    assert.ok(tile.temperature >= 0 && tile.temperature <= 1, `temperature out of range at ${coordKey(tile)}`);
    assert.ok(tile.slope >= 0 && tile.slope <= 1, `slope out of range at ${coordKey(tile)}`);
  }
});

test('map covers the full radius disc', () => {
  const tiles = generateTiles('disc-seed', RADIUS);
  const expected = 1 + 3 * RADIUS * (RADIUS + 1);
  assert.equal(Object.keys(tiles).length, expected,
    `expected ${expected} tiles, got ${Object.keys(tiles).length}`);
});

test('chunk generation is deterministic per chunk (seam invariant)', () => {
  // Frequencies scale with map radius (§9 of remaining_work.md), so cross-radius
  // tile equality is not an invariant. The real invariant is per-chunk
  // determinism at a fixed radius — the basis for seamless chunked generation.
  const a = generateChunkTiles('chunk-seed', 1, -1, RADIUS).tileMap;
  const b = generateChunkTiles('chunk-seed', 1, -1, RADIUS).tileMap;
  assert.equal(a.size, b.size);
  for (const [lk, ta] of a) {
    const tb = b.get(lk);
    assert.ok(tb, `chunk tile ${lk} missing on second generation`);
    assert.equal(ta.terrain, tb.terrain, `terrain differs in chunk at ${lk}`);
    assert.equal(ta.elevationField, tb.elevationField, `elevationField differs in chunk at ${lk}`);
    assert.equal(ta.moisture, tb.moisture, `moisture differs in chunk at ${lk}`);
  }
});

test('fruit-tree climate gate falls through to lower-priority rules', () => {
  // Regression: a fruitTree rule that matches the roll but fails the climate
  // gate (treeLineMax 0 → `elevation < treeLineMax` never true) used to kill
  // the whole roll with `feature: null`. Now the same roll is retried against
  // the remaining rules, so 'tree' wins on every tile with roll > 0.
  const biomeDef = {
    id: 'test_gateFallthrough',
    terrainRules: { treeLineMax: 0 },
    features: [
      { kind: 'fruitTree', threshold: 0, compare: 'gt' },
      { kind: 'tree', threshold: 0, compare: 'gt' },
    ],
  };
  const { tileMap } = generateChunkTiles('gate-fallthrough-seed', 0, 0, RADIUS, biomeDef);

  let trees = 0;
  for (const [, tile] of tileMap) {
    if (tile.feature === null) continue; // roll exactly 0 — neither rule matched
    assert.equal(tile.feature.kind, 'tree',
      `gate-failed fruitTree must fall through to tree at ${tile.q},${tile.r} (got ${tile.feature.kind})`);
    trees++;
  }
  assert.ok(trees > 0, 'expected at least one fallback tree in the chunk');
});

test('spawn-range hexes are all within the disc', () => {
  const tiles = generateTiles('bounds-seed', RADIUS);
  for (const key of Object.keys(tiles)) {
    const [q, r] = key.split(',').map(Number);
    assert.ok(distance({ q, r }, { q: 0, r: 0 }) <= RADIUS, `tile ${key} outside radius`);
  }
});
