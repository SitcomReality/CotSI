/**
 * descriptorGameBuilder.test.js — Game-side descriptor resolution + assembly
 * (src/render/hexmap3d/features/descriptors/gameBuilder.js): tile dispatch
 * parity with the superseded per-kind builders, occupancy de-emphasis, and the
 * legacy paths that stay on the tree builder (fruitTree, Painforest groves).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../src/vendor/three.module.js';
import {
  buildDescriptorFeatureMeshes,
  buildChunkDescriptorFeatureMeshes,
  resolveDescriptorForTile,
} from '../../src/render/hexmap3d/features/descriptors/gameBuilder.js';
import { buildChunkFeatureMeshes } from '../../src/render/hexmap3d/features/featureMeshes.js';
import { tileSurfaceY } from '../../src/render/hexmap3d/terrain/index.js';
import { hexCenter3D } from '../../src/render/hexmap3d/hexWorldSpace.js';
import {
  DISPERSED_SCALE, sunkTransform, dispersedSingleOffset,
} from '../../src/render/hexmap3d/features/decorEmphasis.js';
import {
  SCATTER_HASH_SEEDS, SCATTER_SCALE_BASE, SCATTER_SCALE_RANGE,
} from '../../src/params/render/geometryParams.js';
import { treeRecordsForTile } from '../../src/render/hexmap3d/features/trees/treeRecordsForTile.js';

// ── Fixtures ───────────────────────────────────────────────────────────────

const TILES = [
  // Simple feature (plains), normal.
  { q: 0, r: 0, terrain: 'plains', feature: { kind: 'bush' } },
  // Simple feature with an occupant — displaced to the shared corner anchor.
  { q: 2, r: 1, terrain: 'plains', feature: { kind: 'bush' } },
  // Plain grove (forest, moisture 0.8).
  { q: 4, r: -3, terrain: 'forest', moisture: 0.8 },
  // Knot claims a forest tile — knot + dispersed grove.
  { q: -2, r: 5, terrain: 'forest', moisture: 0.3, feature: { kind: 'knot' } },
  // Mined knot — no knot mesh (grove still disperses, as before).
  { q: 6, r: 2, terrain: 'forest', moisture: 0.5, feature: { kind: 'knot', mined: true } },
  // Mountain terrain with a peak tag.
  { q: -5, r: 3, terrain: 'mountain', mountainType: 'peak' },
  // Hill with an occupant — mound sinks below the surface.
  { q: 8, r: -1, terrain: 'hill' },
  // Hill + feature + occupant — mound hidden, feature displaced.
  { q: -3, r: -4, terrain: 'hill', feature: { kind: 'chest' } },
  // Painforest grove — legacy gnarled builder, NOT descriptor data.
  { q: 10, r: 4, terrain: 'forest', biomeId: 'biome_painforest', moisture: 0.6 },
  // Fruit tree on plains — legacy builder, NOT descriptor data.
  { q: -7, r: 2, terrain: 'plains', feature: { kind: 'fruitTree' } },
  // Solitary tree on open terrain.
  { q: 12, r: 6, terrain: 'plains', feature: { kind: 'tree' } },
  // `tree` on woods IS the grove (no solitary tree mesh).
  { q: 14, r: -8, terrain: 'forest', moisture: 0.7, feature: { kind: 'tree' } },
];

const OCCUPIED = new Set(['2,1', '8,-1', '-3,-4']);

const VISIBLE = new Set(TILES.map((t) => `${t.q},${t.r}`));

const centerOf = (tile) => hexCenter3D(tile.q, tile.r, tileSurfaceY(tile));

/** Read an instance's position + scale from its matrix. */
function instInfo(mesh, i) {
  const m = new THREE.Matrix4();
  mesh.getMatrixAt(i, m);
  const e = m.elements;
  // e[0]/e[2] are cos(rotY)·s and -sin(rotY)·s for a Y rotation — their
  // hypot is the true scale when the instance rotates.
  return { x: e[12], y: e[13], z: e[14], sx: e[0], sy: e[5], rz: e[2], scale: Math.hypot(e[0], e[2]) };
}

const meshNamed = (meshes, name) => meshes.find((m) => m.name === name) ?? null;
const meshesStarting = (meshes, prefix) => meshes.filter((m) => m.name.startsWith(prefix));

// ── Tile resolution ─────────────────────────────────────────────────────────

test('resolveDescriptorForTile: feature vs decor vs legacy dispatch', () => {
  const bush = TILES[0];
  const res = resolveDescriptorForTile(bush, OCCUPIED);
  assert.deepEqual(res.map((r) => r.descriptor.id), ['bush']);
  assert.deepEqual(res[0].displacement, { displaced: false });

  // Occupied simple feature is displaced.
  const resOcc = resolveDescriptorForTile(TILES[1], OCCUPIED);
  assert.deepEqual(resOcc[0].displacement, { displaced: true });

  // Knot on forest resolves to BOTH the knot and the dispersed grove.
  const knot = resolveDescriptorForTile(TILES[3], OCCUPIED);
  assert.deepEqual(knot.map((r) => r.descriptor.id), ['knot', 'grove']);
  assert.deepEqual(knot[0].displacement, { displaced: false });
  assert.deepEqual(knot[1].displacement, { hidden: false, displaced: true });

  // Mined knot: no knot, but the grove still disperses.
  const mined = resolveDescriptorForTile(TILES[4], OCCUPIED);
  assert.deepEqual(mined.map((r) => r.descriptor.id), ['grove']);
  assert.deepEqual(mined[0].displacement, { hidden: false, displaced: true });

  // Mountain: no displacement (emphasis 'none').
  const mountain = resolveDescriptorForTile(TILES[5], OCCUPIED);
  assert.deepEqual(mountain.map((r) => r.descriptor.id), ['mountain']);
  assert.deepEqual(mountain[0].displacement, {});

  // Occupied hill sinks; hidden hill (occupant + feature) still resolves but
  // the hidden flag suppresses records.
  const hill = resolveDescriptorForTile(TILES[6], OCCUPIED);
  assert.deepEqual(hill[0].displacement, { hidden: false, displaced: true });
  const hiddenHill = resolveDescriptorForTile(TILES[7], OCCUPIED);
  assert.deepEqual(hiddenHill.map((r) => r.descriptor.id), ['chest', 'hill']);
  assert.deepEqual(hiddenHill[1].displacement, { hidden: true, displaced: false });

  // `tree` on woods is the grove — no solitary tree descriptor.
  const treeWoods = resolveDescriptorForTile(TILES[11], OCCUPIED);
  assert.deepEqual(treeWoods.map((r) => r.descriptor.id), ['grove']);
  assert.deepEqual(treeWoods[0].displacement, { hidden: false, displaced: false });

  // Painforest grove and fruitTree resolve to nothing (legacy builders).
  assert.deepEqual(resolveDescriptorForTile(TILES[8], OCCUPIED), []);
  assert.deepEqual(resolveDescriptorForTile(TILES[9], OCCUPIED), []);
});

// ── Mesh assembly ───────────────────────────────────────────────────────────

// InstancedMesh matrices are stored as Float32, so instance transforms carry
// ~1e-7 rounding vs float64 reference values — compare with a small tolerance.
const closeTo = (a, b, eps = 1e-4) => Math.abs(a - b) < eps;

test('buildDescriptorFeatureMeshes: one mesh group per descriptor, correct content', () => {
  const meshes = buildDescriptorFeatureMeshes({ tiles: new Map(TILES.map((t) => [`${t.q},${t.r}`, t])) }, VISIBLE, OCCUPIED);

  // Simple features: bush ×2 (one displaced), chest ×1 (displaced).
  const bush = meshNamed(meshes, 'bush-body');
  assert.ok(bush, 'bush-body mesh present');
  assert.equal(bush.count, 2);

  // Exactly one bush instance is displaced to the corner anchor and shrunk.
  const anchor = dispersedSingleOffset();
  const bushCenter = centerOf(TILES[1]);
  const displaced = [0, 1].map((i) => instInfo(bush, i))
    .filter((p) => closeTo(p.x, bushCenter.x + anchor.dx)
      && closeTo(p.z, bushCenter.z + anchor.dz));
  assert.equal(displaced.length, 1, 'one bush displaced to the corner anchor');
  // Displaced simple features keep their scatter size jitter — the legacy
  // builder multiplied DISPERSED_SCALE onto the already-jittered scale
  // (simpleFeatureMeshes.js). Tile (2,1) has scatter hash 85 → scaleVar 0.85.
  const scatterHash = ((2 * SCATTER_HASH_SEEDS[0] + 1 * SCATTER_HASH_SEEDS[1]) * SCATTER_HASH_SEEDS[2]) % SCATTER_HASH_SEEDS[3];
  const scaleVar = SCATTER_SCALE_BASE + (scatterHash % SCATTER_SCALE_RANGE[0]) / SCATTER_SCALE_RANGE[1];
  assert.ok(closeTo(displaced[0].scale, 1.5 * DISPERSED_SCALE * scaleVar), 'displaced bush shrunk by DISPERSED_SCALE over its jittered size');
  // The other bush stays near its hex center (scatter jitter, not the anchor).
  const other = [0, 1].map((i) => instInfo(bush, i)).find((p) => p !== displaced[0]);
  const b0 = centerOf(TILES[0]);
  assert.ok(Math.hypot(other.x - b0.x, other.z - b0.z) < 0.6, 'normal bush near its hex center');

  // Chest on the hidden-hill tile is present and displaced (hill mound is not).
  const chest = meshNamed(meshes, 'chest-body');
  assert.ok(chest && chest.count === 1, 'chest-body present with one instance');
  const cCenter = centerOf(TILES[7]);
  const cPos = instInfo(chest, 0);
  assert.ok(closeTo(cPos.x, cCenter.x + anchor.dx) && closeTo(cPos.z, cCenter.z + anchor.dz), 'chest displaced');

  // Grove: trunk/canopy counts match (one pair per tree).
  const groveTrunk = meshNamed(meshes, 'grove-trunk');
  const groveCanopy = meshNamed(meshes, 'grove-canopy');
  assert.ok(groveTrunk && groveCanopy, 'grove trunk + canopy meshes');
  assert.equal(groveTrunk.count, groveCanopy.count, 'one canopy per trunk');
  assert.ok(groveTrunk.count >= 4, `grove covers 4 woods tiles (got ${groveTrunk.count})`);

  // Knot: exactly one (the mined one is skipped), hovering at KNOT_Y_OFFSET.
  const knots = meshesStarting(meshes, 'knot-');
  assert.equal(knots.length, 1);
  assert.equal(knots[0].count, 1);
  const knotPos = instInfo(knots[0], 0);
  assert.ok(closeTo(knotPos.y, tileSurfaceY(TILES[3]) + 0.3), 'knot hovers at KNOT_Y_OFFSET');

  // Mountain: one instance, peak height bucket, XZ scale 1 (hex-tiling base).
  const mountains = meshesStarting(meshes, 'mountain-');
  assert.equal(mountains.length, 1);
  assert.equal(mountains[0].count, 1);
  const peak = instInfo(mountains[0], 0);
  assert.ok(peak.sy >= 1.3 && peak.sy <= 1.45, `peak scaleY in [1.3,1.45] (got ${peak.sy})`);
  assert.ok(closeTo(peak.sx, 1), 'mountain XZ scale 1');

  // Hill mound: only the sunk instance (the hidden one contributes nothing).
  const hill = meshNamed(meshes, 'hill-mound');
  assert.ok(hill && hill.count === 1, 'hill-mound has exactly the sunk instance');
  const sunk = sunkTransform();
  const hillPos = instInfo(hill, 0);
  assert.ok(closeTo(hillPos.y, tileSurfaceY(TILES[6]) + sunk.yOffset), 'sunk hill descends below the surface');
  assert.ok(closeTo(hillPos.sx, sunk.scale), 'sunk hill shrinks');

  // Solitary tree on open terrain.
  assert.equal(meshNamed(meshes, 'tree-trunk')?.count, 1);
  assert.equal(meshNamed(meshes, 'tree-canopy')?.count, 1);

  // `tree` on woods produced no solitary tree mesh: the two tree- meshes are
  // the open-terrain lone tree, and each holds exactly one instance.
  assert.equal(meshesStarting(meshes, 'tree-').length, 2, 'only the open-terrain tree has tree- meshes');

  // No legacy-only content leaks into descriptor meshes.
  assert.equal(meshesStarting(meshes, 'grove-').length, 2, 'only trunk + canopy grove meshes');
  assert.equal(meshesStarting(meshes, 'fruit').length, 0);
});

test('chunk entry point produces the same meshes as the state entry point', () => {
  const chunk = buildChunkDescriptorFeatureMeshes(TILES, VISIBLE, OCCUPIED);
  const state = buildDescriptorFeatureMeshes({ tiles: new Map(TILES.map((t) => [`${t.q},${t.r}`, t])) }, VISIBLE, OCCUPIED);
  assert.deepEqual(chunk.map((m) => m.name).sort(), state.map((m) => m.name).sort());
});

test('painforest and fruitTree tiles produce no descriptor meshes, but keep legacy records', () => {
  const painforest = TILES[8];
  const fruit = TILES[9];

  const meshes = buildDescriptorFeatureMeshes({ tiles: new Map([[`${painforest.q},${painforest.r}`, painforest], [`${fruit.q},${fruit.r}`, fruit]]) }, new Set([`${painforest.q},${painforest.r}`, `${fruit.q},${fruit.r}`]), new Set());
  assert.equal(meshes.length, 0, 'no descriptor meshes for legacy-only tiles');

  // Legacy paths still produce records (gnarled grove + fruit tree).
  const gnarled = treeRecordsForTile(painforest, centerOf(painforest), new Set());
  assert.ok(gnarled.length > 0, 'painforest gnarled grove still emits records');
  for (const r of gnarled) assert.ok(r.geo, 'legacy records carry geo keys');

  const fruitRecords = treeRecordsForTile(fruit, centerOf(fruit), new Set());
  assert.ok(fruitRecords.some((r) => r.geo === 'fruit-apple'), 'fruit tree still emits fruit');
});

// ── Explored-but-out-of-sight terrain decoration ───────────────────────────

test('resolveDescriptorForTile: decor is unoccupied while out of sight', () => {
  // Occupied hill out of sight: full mound — no sinking.
  const hill = resolveDescriptorForTile(TILES[6], OCCUPIED, false);
  assert.deepEqual(hill[0].displacement, { hidden: false, displaced: false });

  // Occupant + feature hill out of sight: full mound, not hidden.
  const hiddenHill = resolveDescriptorForTile(TILES[7], OCCUPIED, false);
  assert.deepEqual(hiddenHill.map((r) => r.descriptor.id), ['chest', 'hill']);
  assert.deepEqual(hiddenHill[1].displacement, { hidden: false, displaced: false });

  // Knot on forest out of sight: the knot still resolves (collect-time gating
  // hides it), but the grove is unoccupied instead of dispersed.
  const knot = resolveDescriptorForTile(TILES[3], OCCUPIED, false);
  assert.deepEqual(knot.map((r) => r.descriptor.id), ['knot', 'grove']);
  assert.deepEqual(knot[1].displacement, { hidden: false, displaced: false });

  // Mountain out of sight resolves as always (emphasis 'none').
  const mountain = resolveDescriptorForTile(TILES[5], OCCUPIED, false);
  assert.deepEqual(mountain.map((r) => r.descriptor.id), ['mountain']);

  // Default (visible) behavior unchanged: occupied hill still sinks.
  const visibleHill = resolveDescriptorForTile(TILES[6], OCCUPIED);
  assert.deepEqual(visibleHill[0].displacement, { hidden: false, displaced: true });
});

test('descriptor decor renders on explored-but-out-of-sight tiles, unoccupied', () => {
  // Only the (0,0) bush and (4,-3) plain grove are visible; every other tile
  // is explored but out of sight.
  const explored = new Set(TILES.map((t) => `${t.q},${t.r}`));
  const visible = new Set(['0,0', '4,-3']);
  const decor = new Set([...visible, ...explored]);
  const meshes = buildChunkDescriptorFeatureMeshes(TILES, visible, OCCUPIED, decor);

  // Features stay invisible out of sight: the second bush, the knot, the chest,
  // the solitary tree, and the fruit tree all disappear.
  assert.equal(meshNamed(meshes, 'bush-body').count, 1, 'only the visible bush renders');
  assert.equal(meshesStarting(meshes, 'knot-').length, 0, 'knot hidden out of sight');
  assert.equal(meshNamed(meshes, 'chest-body'), null, 'chest hidden out of sight');
  assert.equal(meshNamed(meshes, 'tree-trunk'), null, 'solitary tree hidden out of sight');
  assert.equal(meshesStarting(meshes, 'fruit').length, 0, 'fruit tree hidden out of sight');

  // Terrain decorations render out of sight: the mountain ...
  const mountains = meshesStarting(meshes, 'mountain-');
  assert.equal(mountains.length, 1);
  assert.equal(mountains[0].count, 1);

  // ... and both hill mounds, at full size — even though (8,-1) has an
  // occupant and (-3,-4) an occupant + feature (unoccupied = full mound).
  const hill = meshNamed(meshes, 'hill-mound');
  assert.equal(hill.count, 2, 'both hill mounds render out of sight');
  for (let i = 0; i < hill.count; i++) {
    const p = instInfo(hill, i);
    assert.ok(closeTo(p.sx, 1), `hill mound ${i} at full scale (got ${p.sx})`);
    assert.ok(closeTo(p.y, tileSurfaceY(TILES[6])), `hill mound ${i} at the surface (got ${p.y})`);
  }

  // All four non-Painforest woods tiles render their grove (the visible plain
  // grove, the two knot tiles, and the `tree`-on-woods tile).
  const groveTrunk = meshNamed(meshes, 'grove-trunk');
  assert.ok(groveTrunk, 'grove meshes present');
  assert.ok(groveTrunk.count >= 4, `grove covers the explored woods tiles (got ${groveTrunk.count})`);
});

test('legacy painforest grove renders out of sight; fruit trees stay hidden', () => {
  const painforest = TILES[8];
  const fruit = TILES[9];
  const explored = new Set([`${painforest.q},${painforest.r}`, `${fruit.q},${fruit.r}`]);
  const visible = new Set();
  const state = { tiles: new Map(), champions: [], mobs: [], traders: [] };

  // The gnarled grove is terrain decoration — it renders out of sight.
  const painMeshes = buildChunkFeatureMeshes([painforest], state, visible, explored);
  assert.ok(painMeshes.some((m) => m.name.startsWith('tree-')), 'painforest grove renders out of sight');

  // The fruit tree (a feature) alone, out of sight, produces nothing.
  const fruitMeshes = buildChunkFeatureMeshes([fruit], state, visible, explored);
  assert.equal(fruitMeshes.length, 0, 'fruit tree hidden out of sight');

  // Out-of-sight grove records ignore occupants: identical with or without one.
  const occupied = new Set([`${painforest.q},${painforest.r}`]);
  const plain = treeRecordsForTile(painforest, centerOf(painforest), new Set(), false);
  const withOccupant = treeRecordsForTile(painforest, centerOf(painforest), occupied, false);
  assert.deepEqual(plain, withOccupant, 'out-of-sight grove records ignore occupants');
});

// ── Barrel smoke (featureMeshes.js wiring) ─────────────────────────────────

test('buildChunkFeatureMeshes still wires tree + descriptor + base + outlines', () => {
  const state = {
    tiles: new Map(TILES.map((t) => [`${t.q},${t.r}`, t])),
    champions: [], mobs: [], traders: [],
  };
  const meshes = buildChunkFeatureMeshes(TILES, state, VISIBLE);

  // Every source InstancedMesh gains an outline twin.
  assert.ok(meshes.length >= 2, 'barrel returns sources + outlines');
  assert.ok(meshes.some((m) => m.name === 'bush-body'), 'descriptor content reaches the barrel');
  assert.ok(meshes.some((m) => m.name === 'bush-body-outline'), 'outline twins included');
  assert.ok(meshes.some((m) => m.name.startsWith('tree-')), 'legacy tree builder still wired');
});
