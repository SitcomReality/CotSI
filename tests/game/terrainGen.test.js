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
import { computeRainShadow } from '../../src/game/rules/terrainGen/classification/moistureAdjustment.js';
import { assignRiverFlows } from '../../src/game/rules/terrainGen/postProcess/waterRules.js';
import { applyRiverTerrain } from '../../src/game/rules/terrainGen/rivers/riverTerrain.js';
import { TERRAIN } from '../../src/game/rules/terrainTypes.js';
import { TERRAIN_ELEVATION } from '../../src/params/render/terrainParams.js';
import { WATER_LAND_GAP } from '../../src/params/game/worldParams.js';
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
    assert.deepEqual(ta.riverFlow ?? null, tb.riverFlow ?? null, `riverFlow differs at ${key}`);
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
  // Wide ranges from dev/futureWork.md §4.8 — tight ranges
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
    if (tile.terrain === 'water') {
      // Water elevation is governed by the water-system rules pass (uniform
      // component heights — see the 'water rule 2' tests), which flattens each
      // stationary body to its lowest member, so it can only sit at or below
      // its static table value.
      const expectedElev = biome.terrainElevation?.water ?? TERRAIN_ELEVATION.water;
      assert.ok(tile.elevation <= expectedElev, `water elevation raised above table at ${coordKey(tile)}`);
    } else if (tile.terrain === 'river') {
      // River elevation is owned by carveRiverBeds (carved below the banks —
      // see the 'river carve' test); the static table value is only a
      // transient and does not bound the final channel height.
      assert.ok(TERRAIN[tile.terrain].passable, `river tile ${coordKey(tile)} must be passable`);
    } else {
      const expectedElev = biome.terrainElevation?.[tile.terrain] ?? TERRAIN_ELEVATION[tile.terrain];
      assert.equal(tile.elevation, expectedElev, `display elevation mismatch at ${coordKey(tile)}`);
    }
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
  // Frequencies scale with map radius (§4.6 of dev/futureWork.md), so cross-radius
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

// ---------------------------------------------------------------------------
// Water system height rules (postProcess/waterRules.js)
// ---------------------------------------------------------------------------

test('water rule 2: adjacent stationary water tiles always share one height', () => {
  const tiles = generateTiles('water-uniform-seed', RADIUS);
  let waterSeen = false;
  for (const tile of Object.values(tiles)) {
    if (tile.terrain !== 'water') continue;
    waterSeen = true;
    for (const n of neighbors({ q: tile.q, r: tile.r })) {
      const nb = tiles[coordKey(n)];
      if (!nb || nb.terrain !== 'water') continue;
      assert.equal(nb.elevation, tile.elevation,
        `adjacent stationary water heights differ at ${coordKey(tile)} (${tile.elevation}) ↔ ${coordKey(n)} (${nb.elevation})`);
    }
  }
  assert.ok(waterSeen, 'expected at least one stationary water tile');
});

test('water rule 1: every water tile sits below any adjacent non-river land', () => {
  const tiles = generateTiles('water-below-land-seed', RADIUS);
  let waterSeen = false;
  for (const tile of Object.values(tiles)) {
    if (tile.terrain !== 'water') continue;
    waterSeen = true;
    for (const n of neighbors({ q: tile.q, r: tile.r })) {
      const nb = tiles[coordKey(n)];
      if (!nb || nb.terrain === 'water' || nb.terrain === 'river') continue;
      assert.ok(nb.elevation > tile.elevation + WATER_LAND_GAP - 1e-9,
        `water ${coordKey(tile)} (${tile.elevation}) not below land ${coordKey(n)} (${nb.elevation})`);
    }
  }
  assert.ok(waterSeen, 'expected at least one water tile');
});

test('river carve: river tiles recessed below banks, never below adjacent water', () => {
  const tiles = generateTiles('river-carve-seed', RADIUS);
  const rivers = Object.values(tiles).filter((t) => t.terrain === 'river');
  assert.ok(rivers.length > 0, 'expected at least one river tile');

  for (const r of rivers) {
    let minBank = Infinity;
    let hasBank = false;
    let minAdjWater = Infinity;
    let hasAdjWater = false;
    for (const n of neighbors({ q: r.q, r: r.r })) {
      const nb = tiles[coordKey(n)];
      if (!nb) continue;
      if (nb.terrain === 'water') {
        if (nb.elevation < minAdjWater) minAdjWater = nb.elevation;
        hasAdjWater = true;
      } else if (nb.terrain !== 'river') {
        if (nb.elevation < minBank) minBank = nb.elevation;
        hasBank = true;
      }
    }

    // A tile with no qualifying bank falls back to the downstream level — the
    // carve has nothing to dig against, so there is nothing to assert.
    if (!hasBank) continue;

    assert.ok(r.elevation < minBank,
      `river tile ${coordKey(r)} (${r.elevation}) not below its banks (${minBank})`);
    if (hasAdjWater) {
      assert.ok(r.elevation >= minAdjWater - 1e-9,
        `river tile ${coordKey(r)} (${r.elevation}) dug below adjacent water (${minAdjWater})`);
    }
  }
});

test('river terrain: channels are passable and feature-free', () => {
  const tiles = generateTiles('river-terrain-seed', RADIUS);
  const rivers = Object.values(tiles).filter((t) => t.terrain === 'river');
  assert.ok(rivers.length > 0, 'expected at least one river tile');

  for (const r of rivers) {
    assert.ok(TERRAIN[r.terrain].passable, `river tile ${coordKey(r)} must be passable`);
    assert.equal(r.feature, null, `river tile ${coordKey(r)} must be feature-free (no trees/hills in the water)`);
    assert.equal(r.riverCarved, undefined, `legacy riverCarved flag absent at ${coordKey(r)}`);
    assert.equal(r.isRiver, undefined, `legacy isRiver flag absent at ${coordKey(r)}`);
  }
});

test('river flow: river tiles carry a downstream hex delta along the path', () => {
  const tiles = generateTiles('river-flow-seed', RADIUS);
  const flowing = Object.values(tiles).filter((t) => t.riverFlow);
  assert.ok(flowing.length > 0, 'expected at least one tile with riverFlow');

  for (const t of flowing) {
    assert.equal(t.terrain, 'river', `flow only on river tiles (${coordKey(t)})`);
    const { dq, dr } = t.riverFlow;
    assert.ok(
      neighbors({ q: t.q, r: t.r }).some((n) => n.q === t.q + dq && n.r === t.r + dr),
      `flow at ${coordKey(t)} must point at an immediate neighbor (${dq},${dr})`
    );
    const next = tiles[coordKey({ q: t.q + dq, r: t.r + dr })];
    assert.ok(next, `downstream neighbor missing for ${coordKey(t)}`);
    assert.ok(next.terrain === 'water' || next.terrain === 'river',
      `downstream of ${coordKey(t)} must be water-ish (${next.terrain})`);
  }

  // A path can end at a local minimum with no water mouth, so its terminal
  // river tile is flowless; the converse (flow only on river tiles) is already
  // asserted in the loop above.
});

test('assignRiverFlows: hex delta points at the next path tile; tail gets none', () => {
  const tiles = {
    '0,0': { q: 0, r: 0, terrain: 'plains' },
    '1,0': { q: 1, r: 0, terrain: 'forest' },
    '2,0': { q: 2, r: 0, terrain: 'plains' },
    '3,0': { q: 3, r: 0, terrain: 'water' },
  };
  const paths = [[
    { q: 0, r: 0 },
    { q: 1, r: 0 },
    { q: 2, r: 0 },
    { q: 3, r: 0 },
  ]];
  assignRiverFlows(tiles, paths);
  assert.deepEqual(tiles['0,0'].riverFlow, { dq: 1, dr: 0 });
  assert.deepEqual(tiles['1,0'].riverFlow, { dq: 1, dr: 0 });
  assert.deepEqual(tiles['2,0'].riverFlow, { dq: 1, dr: 0 });
  // The water tail (the mouth) is part of a stationary body — no flow field.
  assert.equal(tiles['3,0'].riverFlow, undefined);

  // A path that never reaches water: the final river tile has no downstream
  // next, so it gets no flow (traceRiver can stop at a local minimum).
  const noMouth = {
    '0,0': { q: 0, r: 0, terrain: 'river' },
    '1,0': { q: 1, r: 0, terrain: 'river' },
  };
  assignRiverFlows(noMouth, [[{ q: 0, r: 0 }, { q: 1, r: 0 }]]);
  assert.deepEqual(noMouth['0,0'].riverFlow, { dq: 1, dr: 0 });
  assert.equal(noMouth['1,0'].riverFlow, undefined, 'terminal river tile (no mouth) gets no flow');
});

test('applyRiverTerrain: path tiles become river and lose features; water mouths stay', () => {
  const tiles = {
    '0,0': { q: 0, r: 0, terrain: 'plains', feature: { kind: 'tree' } },
    '1,0': { q: 1, r: 0, terrain: 'forest', feature: { kind: 'fruitTree' } },
    '2,0': { q: 2, r: 0, terrain: 'mountain', feature: null },
    '3,0': { q: 3, r: 0, terrain: 'water', feature: null },
    '4,0': { q: 4, r: 0, terrain: 'plains', feature: { kind: 'tree' } },
  };
  applyRiverTerrain(tiles, [[
    { q: 0, r: 0 },
    { q: 1, r: 0 },
    { q: 2, r: 0 },
    { q: 3, r: 0 },
  ]]);

  // Rivers replace everything on their path, features included.
  assert.equal(tiles['0,0'].terrain, 'river');
  assert.equal(tiles['0,0'].feature, null);
  assert.equal(tiles['1,0'].terrain, 'river');
  assert.equal(tiles['1,0'].feature, null);
  // Rivers replace impassable terrain too (a river through a mountain is a canyon).
  assert.equal(tiles['2,0'].terrain, 'river');
  // The water mouth stays part of its body.
  assert.equal(tiles['3,0'].terrain, 'water');
  // Tiles off the path are untouched.
  assert.equal(tiles['4,0'].terrain, 'plains');
  assert.equal(tiles['4,0'].feature.kind, 'tree');
});

// ---------------------------------------------------------------------------
// Rain shadow (classification/moistureAdjustment.js — futureWork.md §4.4)
// ---------------------------------------------------------------------------

test('rain shadow: upwind ridge ≥0.2 higher dries the leeward tile', () => {
  // Local elevation 0.5; upwind q<0 ridge at 0.8 → diff 0.3 → (0.3−0.2)×0.3 = 0.03.
  const elevationAt = (q) => (q < 0 ? 0.8 : 0.5);
  const drying = computeRainShadow(0, 0, elevationAt);
  assert.ok(Math.abs(drying - 0.03) < 1e-9, `expected ~0.03 drying, got ${drying}`);
});

test('rain shadow: upwind rise under the 0.2 threshold casts no shadow', () => {
  const elevationAt = (q) => (q < 0 ? 0.6 : 0.5);
  assert.equal(computeRainShadow(0, 0, elevationAt), 0);
});

test('rain shadow: shadow depends on the upwind average over distances 1–3', () => {
  // A ridge only at distance 1 averages down to 0.63 with sea-level neighbors
  // at distances 2–3 → diff 0.13 < 0.2 → no shadow from a single near peak.
  const elevationAt = (q) => (q === -1 ? 0.9 : 0.5);
  assert.equal(computeRainShadow(0, 0, elevationAt), 0);
});
