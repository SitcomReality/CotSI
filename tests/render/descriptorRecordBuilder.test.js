/**
 * descriptorRecordBuilder.test.js — Pure record generation from descriptors
 * (src/render/hexmap3d/features/descriptors/recordBuilder.js).
 * Covers determinism, cluster/size math, placement, and emphasis behavior.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDescriptor } from '../../src/render/hexmap3d/features/descriptors/schema.js';
import { recordsForDescriptor } from '../../src/render/hexmap3d/features/descriptors/recordBuilder.js';
import { DISPERSED_SCALE, sunkTransform, dispersedSingleOffset } from '../../src/render/hexmap3d/features/decorEmphasis.js';

// ── Fixtures ───────────────────────────────────────────────────────────────

const TILE = { q: 3, r: -2, terrain: 'forest' };
const POS = { x: 1.732, y: 1.25, z: -3.0 };

/** A simple single-shape feature (bush-like). Scatter placement carries its
 *  own per-tile size jitter (the legacy jitterForTile scaleVar), so the
 *  descriptor's size range stays 1..1 — exactly like the migrated content. */
const BUSH = normalizeDescriptor({
  id: 'bush',
  kind: 'feature',
  displayName: 'Scrub Bush',
  scale: 1.5,
  placement: { mode: 'scatter' },
  emphasis: { behavior: 'dispersed' },
  material: { color: 0x4a7a3a },
  parts: [
    { id: 'tuft', shape: 'cone', params: { bottomR: 0.04, height: 0.06, radialSegs: 3, heightSegs: 1 } },
  ],
});

/** A multi-part ring cluster (forest grove-like). */
const GROVE = normalizeDescriptor({
  id: 'grove-forest',
  kind: 'decor',
  displayName: 'Forest Grove',
  cluster: { min: 3, max: 5 },
  size: { min: 1.3, max: 1.5 },
  variation: { stretchY: [0.85, 1.3], stretchXZ: [0.9, 1.15], colorJitter: 0.05 },
  placement: { mode: 'ring', ringMin: 0.18, ringMax: 0.55, leanMin: 0.045, leanMax: 0.12 },
  emphasis: { behavior: 'dispersed' },
  material: { color: 0xffffff },
  parts: [
    { id: 'trunk', shape: 'cylinder', params: { bottomR: 0.08, topR: 0.1, height: 0.4, segments: 6 }, transform: { lift: 0.16 } },
    { id: 'canopy', shape: 'sphere', params: { radius: 0.3, wSegs: 6, hSegs: 4 }, transform: { lift: 0.5 }, color: 0x3cb371 },
  ],
});

// ── Determinism ────────────────────────────────────────────────────────────

test('records are deterministic: same tile always yields identical records', () => {
  const a = recordsForDescriptor(BUSH, TILE, POS);
  const b = recordsForDescriptor(BUSH, TILE, POS);
  assert.deepEqual(b, a);
});

test('different tiles yield different records (hash-driven)', () => {
  const a = recordsForDescriptor(BUSH, TILE, POS);
  const b = recordsForDescriptor(BUSH, { ...TILE, q: 9, r: 4 }, POS);
  assert.notDeepEqual(b, a);
});

// ── Cluster math ───────────────────────────────────────────────────────────

test('cluster count stays within [min, max] and is deterministic', () => {
  const seen = new Set();
  for (let q = 0; q < 40; q++) {
    const records = recordsForDescriptor(GROVE, { q, r: 7, terrain: 'forest' }, POS);
    const count = records.filter((r) => r.partId === 'trunk').length;
    assert.ok(count >= 3 && count <= 5, `count ${count} out of [3,5]`);
    seen.add(count);
  }
  // With 40 distinct hashes the full range should appear.
  assert.deepEqual([...seen].sort(), [3, 4, 5]);
});

test('default cluster is a single item', () => {
  const records = recordsForDescriptor(BUSH, TILE, POS);
  assert.equal(records.length, 1);
});

// ── Size math ──────────────────────────────────────────────────────────────

test('item scale stays within scale × [size.min, size.max]', () => {
  // Center placement isolates the size draw from scatter's own size jitter.
  const sized = normalizeDescriptor({
    id: 'sized',
    kind: 'feature',
    displayName: 'Sized',
    scale: 1.5,
    size: { min: 0.8, max: 1.0 },
    placement: { mode: 'center' },
    parts: [{ id: 'p', shape: 'sphere' }],
  });
  for (let q = 0; q < 40; q++) {
    const [record] = recordsForDescriptor(sized, { q, r: 1, terrain: 'plains' }, POS);
    assert.ok(record.scale >= 1.5 * 0.8 - 1e-9, `scale ${record.scale} below min`);
    assert.ok(record.scale <= 1.5 * 1.0 + 1e-9, `scale ${record.scale} above max`);
  }
});

test('lift and localPos pre-scale with the item scale', () => {
  const records = recordsForDescriptor(GROVE, TILE, POS);
  const trunk = records.find((r) => r.partId === 'trunk');
  // lift = transform.lift × itemScale (itemScale = 1.5 × lerp(1.3..1.5, hash)).
  assert.ok(trunk.lift > 0.16 && trunk.lift <= 0.16 * 1.5 * 1.5);
});

// ── Placement ──────────────────────────────────────────────────────────────

test('scatter placement stays within the offset range', () => {
  for (let q = 0; q < 40; q++) {
    const [record] = recordsForDescriptor(BUSH, { q, r: 3, terrain: 'plains' }, POS);
    const dx = record.x - POS.x;
    const dz = record.z - POS.z;
    const dist = Math.hypot(dx, dz);
    assert.ok(dist >= 0.15 - 1e-9, `dist ${dist} below offsetMin`);
    assert.ok(dist <= 0.3 + 1e-9, `dist ${dist} above offsetMax`);
  }
});

test('ring placement sits inside the ring radii with outward lean', () => {
  const records = recordsForDescriptor(GROVE, TILE, POS);
  for (const record of records) {
    const dx = record.x - POS.x;
    const dz = record.z - POS.z;
    const dist = Math.hypot(dx, dz);
    assert.ok(dist >= 0.18 - 1e-9 && dist <= 0.55 + 1e-9, `dist ${dist} out of ring`);
    assert.ok(record.tiltAxis && record.tilt !== undefined, 'ring items lean outward');
  }
});

// ── Emphasis ───────────────────────────────────────────────────────────────

test('dispersed single item steps to the shared corner anchor and shrinks', () => {
  const { dx, dz } = dispersedSingleOffset();
  const [record] = recordsForDescriptor(BUSH, TILE, POS, undefined, { displaced: true });
  assert.ok(Math.abs(record.x - (POS.x + dx)) < 1e-9, 'single item at corner anchor');
  assert.ok(Math.abs(record.z - (POS.z + dz)) < 1e-9);
  // scale = 1.5 × scatter size-jitter × DISPERSED_SCALE — the base multiplier is visible.
  assert.ok(record.scale >= 1.5 * 0.8 * DISPERSED_SCALE - 1e-9);
  assert.ok(record.scale <= 1.5 * 1.0 * DISPERSED_SCALE + 1e-9);
});

test('dispersed cluster spreads to a ring near the hex edge and shrinks', () => {
  const records = recordsForDescriptor(GROVE, TILE, POS, undefined, { displaced: true });
  const count = records.filter((r) => r.partId === 'trunk').length;
  assert.ok(count >= 3 && count <= 5);
  for (const record of records) {
    const dist = Math.hypot(record.x - POS.x, record.z - POS.z);
    assert.ok(dist >= 0.68 - 1e-9, `dispersed dist ${dist} inside ringMin`);
    assert.ok(dist <= 0.88 + 1e-9, `dispersed dist ${dist} outside ringMax`);
    assert.ok(record.scale <= 1.5 * 1.5 * DISPERSED_SCALE + 1e-9);
  }
});

test('sunk decoration descends below the surface and shrinks', () => {
  const hill = normalizeDescriptor({
    id: 'hill-decor',
    kind: 'decor',
    displayName: 'Hill Mound',
    emphasis: { behavior: 'sunk' },
    placement: { mode: 'center' },
    parts: [{ id: 'mound', shape: 'sphere', params: { radius: 0.42, wSegs: 10, hSegs: 5, thetaLength: Math.PI / 2 } }],
  });
  const { scale, yOffset } = sunkTransform();
  const [record] = recordsForDescriptor(hill, { q: 1, r: 1, terrain: 'hill' }, POS, undefined, { displaced: true });
  assert.equal(record.y, POS.y + yOffset);
  assert.equal(record.scale, scale);
});

test('hidden behavior drops the records entirely', () => {
  const hidden = normalizeDescriptor({
    id: 'hidden-decor',
    kind: 'decor',
    displayName: 'Hidden Decor',
    emphasis: { behavior: 'hidden' },
    parts: [{ id: 'p', shape: 'sphere' }],
  });
  assert.deepEqual(recordsForDescriptor(hidden, TILE, POS, undefined, { displaced: true }), []);
  // Undisplaced, it still renders.
  assert.equal(recordsForDescriptor(hidden, TILE, POS).length, 1);
});

test('behavior none ignores displacement', () => {
  const mountain = normalizeDescriptor({
    id: 'mountain',
    kind: 'mountain',
    displayName: 'Mountain',
    emphasis: { behavior: 'none' },
    parts: [{ id: 'peak', shape: 'mountain', params: { variant: 'classic' } }],
  });
  const normal = recordsForDescriptor(mountain, TILE, POS);
  const displaced = recordsForDescriptor(mountain, TILE, POS, undefined, { displaced: true });
  assert.deepEqual(displaced, normal);
});

test('undisplaced object ignores its dispersed behavior', () => {
  const [record] = recordsForDescriptor(BUSH, TILE, POS);
  // Not displaced: no corner anchor, no dispersal shrink.
  assert.notEqual(record.scale, record.scale * DISPERSED_SCALE);
  assert.ok(record.scale > 1.5 * 0.8 * DISPERSED_SCALE);
});

// ── Variants ───────────────────────────────────────────────────────────────

test('variant selection picks one part set deterministically by hash', () => {
  const tree = normalizeDescriptor({
    id: 'tree',
    kind: 'feature',
    displayName: 'Tree',
    parts: [{ id: 'trunk', shape: 'cylinder' }],
    variants: [
      { id: 'round', parts: [{ id: 'trunk', shape: 'cylinder' }, { id: 'canopy-round', shape: 'sphere' }] },
      { id: 'tall', parts: [{ id: 'trunk', shape: 'cylinder' }, { id: 'canopy-tall', shape: 'cone' }] },
    ],
  });
  const records = recordsForDescriptor(tree, TILE, POS);
  const partIds = new Set(records.map((r) => r.partId));
  assert.ok(
    (partIds.has('canopy-round') && !partIds.has('canopy-tall')) ||
    (!partIds.has('canopy-round') && partIds.has('canopy-tall')),
    'exactly one variant composes the item',
  );
  const again = recordsForDescriptor(tree, TILE, POS);
  assert.deepEqual(again, records);
});

// ── Color ──────────────────────────────────────────────────────────────────

test('color jitter produces per-instance colors; zero jitter keeps the base', () => {
  const noJitter = normalizeDescriptor({
    id: 'plain',
    kind: 'feature',
    displayName: 'Plain',
    parts: [{ id: 'p', shape: 'sphere', color: 0x3cb371 }],
  });
  const [a] = recordsForDescriptor(noJitter, TILE, POS);
  assert.equal(a.color, 0x3cb371);

  const jittered = normalizeDescriptor({
    id: 'jittered',
    kind: 'feature',
    displayName: 'Jittered',
    variation: { colorJitter: 0.05 },
    parts: [{ id: 'p', shape: 'sphere', color: 0x3cb371 }],
  });
  const [b] = recordsForDescriptor(jittered, TILE, POS);
  assert.notEqual(b.color, 0x3cb371);
  // Jitter stays within ±5% per channel.
  for (const ch of [16, 8, 0]) {
    const baseCh = (0x3cb371 >> ch) & 0xff;
    const jCh = (b.color >> ch) & 0xff;
    assert.ok(Math.abs(jCh - baseCh) <= Math.ceil(baseCh * 0.05), `channel ${ch} out of jitter band`);
  }
});

// ── Legacy scatter parity (M4: simple-feature migration) ───────────────────

test('scatter placement replicates jitterForTile() exactly', () => {
  // Hand-compute the legacy formula from simpleFeatureMeshes.js.
  const jitterFor = (tile) => {
    const hash = ((tile.q * 17 + tile.r * 11) * 13) % 100;
    const angle = (hash * 0.618) % (Math.PI * 2);
    const dist = 0.15 + (hash % 30) / 200;
    return {
      dx: Math.cos(angle) * dist,
      dz: Math.sin(angle) * dist,
      rotY: (hash * 0.723) % (Math.PI * 2),
      scaleMul: 0.8 + (hash % 20) / 100,
    };
  };
  for (const tile of [
    { q: 3, r: -2, terrain: 'plains' },
    { q: 0, r: 0, terrain: 'plains' },
    { q: -5, r: 11, terrain: 'plains' },
    { q: 27, r: 8, terrain: 'plains' },
  ]) {
    const [record] = recordsForDescriptor(BUSH, tile, POS);
    const { dx, dz, rotY, scaleMul } = jitterFor(tile);
    assert.ok(Math.abs(record.x - (POS.x + dx)) < 1e-9, `tile ${tile.q},${tile.r} x`);
    assert.ok(Math.abs(record.z - (POS.z + dz)) < 1e-9, `tile ${tile.q},${tile.r} z`);
    // rotY is omitted from the record when 0 (identity rotation).
    assert.ok(Math.abs((record.rotY ?? 0) - rotY) < 1e-9, `tile ${tile.q},${tile.r} rotY`);
    assert.ok(Math.abs(record.scale - 1.5 * scaleMul) < 1e-9, `tile ${tile.q},${tile.r} scale`);
  }
});

test('scatter scale keeps the displaced feature readable (× DISPERSED_SCALE)', () => {
  const { dx, dz } = dispersedSingleOffset();
  const [record] = recordsForDescriptor(BUSH, { q: 3, r: -2, terrain: 'plains' }, POS, undefined, { displaced: true });
  // The scatter size jitter (0.8..0.99) multiplies on top of DISPERSED_SCALE,
  // and the item still lands on the shared corner anchor.
  assert.ok(Math.abs(record.x - (POS.x + dx)) < 1e-9);
  assert.ok(record.scale >= 1.5 * 0.8 * DISPERSED_SCALE - 1e-9);
  assert.ok(record.scale <= 1.5 * DISPERSED_SCALE + 1e-9);
});

// ── Moisture-driven cluster (M4: grove migration) ──────────────────────────

/** Grove with the legacy moisture rule (clusterTreeRecords.js). */
const GROVE_MOIST = normalizeDescriptor({
  id: 'grove-moist',
  kind: 'decor',
  displayName: 'Moist Grove',
  cluster: { rule: 'moisture', countsByTerrain: { forest: [3, 5], denseForest: [4, 7] }, densityRange: [0.55, 0.85] },
  size: { min: 1.3, max: 1.5 },
  variation: { stretchY: [0.85, 1.3], stretchXZ: [0.9, 1.15], colorJitter: 0.05 },
  placement: { mode: 'ring', ringMin: 0.18, ringMax: 0.55, leanMin: 0.045, leanMax: 0.12 },
  emphasis: { behavior: 'dispersed' },
  parts: [{ id: 'trunk', shape: 'cylinder' }],
});

test('moisture cluster count matches clusterCount() and stays in [min, max]', () => {
  const countFor = (tile) => recordsForDescriptor(GROVE_MOIST, tile, POS).filter((r) => r.partId === 'trunk').length;
  // Hand-computed clusterCount(): density → round(lerp(min,max,d)) ± hash jitter.
  // Density uses the descriptor's densityRange endpoints; the legacy builder
  // hard-coded (m − 0.55) / 0.3, which can differ by one ulp (0.85 − 0.55 ≠
  // 0.3 in floats) — that only flips Math.round at exact .5 densities, so the
  // grove size never visibly changes.
  const expected = (terrain, moisture, q, r) => {
    const [min, max] = terrain === 'denseForest' ? [4, 7] : [3, 5];
    const [a, b] = GROVE_MOIST.cluster.densityRange;
    const m = Number.isFinite(moisture) ? Math.min(1, Math.max(0, (moisture - a) / (b - a))) : 0.5;
    const count = Math.round(min + (max - min) * m);
    const tileH = ((q * 7 + r * 13) * 31) % 17;
    return Math.min(max, Math.max(min, count + (tileH % 3) - 1));
  };
  const cases = [
    { terrain: 'forest', moisture: 0.5, q: 2, r: 3 },
    { terrain: 'forest', moisture: 0.8, q: 7, r: -1 },
    { terrain: 'forest', moisture: 1.0, q: -4, r: 9 },
    { terrain: 'denseForest', moisture: 0.7, q: 11, r: 5 },
    { terrain: 'denseForest', moisture: 0.55, q: 0, r: 0 },
    { terrain: 'forest', moisture: NaN, q: 3, r: 3 },
  ];
  for (const c of cases) {
    assert.equal(countFor(c), expected(c.terrain, c.moisture, c.q, c.r), JSON.stringify(c));
  }
  // Range sanity across many tiles.
  for (let q = 0; q < 60; q++) {
    const c = countFor({ q, r: 5, terrain: 'forest', moisture: 0.8 });
    assert.ok(c >= 3 && c <= 5, `forest count ${c}`);
  }
  for (let q = 0; q < 60; q++) {
    const c = countFor({ q, r: 5, terrain: 'denseForest', moisture: 0.8 });
    assert.ok(c >= 4 && c <= 7, `denseForest count ${c}`);
  }
});

// ── Variant rules (M4: tree migration) ─────────────────────────────────────

/** Solitary tree with round/tall/wide canopy variants. */
const SOLITARY_TREE = normalizeDescriptor({
  id: 'tree-solitary',
  kind: 'feature',
  displayName: 'Tree',
  variantRule: 'solitary',
  placement: { mode: 'jitter' },
  emphasis: { behavior: 'dispersed' },
  material: { color: 0x8b5e3c },
  parts: [{ id: 'trunk', shape: 'cylinder' }],
  variants: [
    { id: 'round', parts: [{ id: 'trunk', shape: 'cylinder' }, { id: 'canopy-round', shape: 'sphere', color: 0x3cb371 }] },
    { id: 'tall', parts: [{ id: 'trunk', shape: 'cylinder' }, { id: 'canopy-tall', shape: 'cone', color: 0x2e8b57 }] },
    { id: 'wide', parts: [{ id: 'trunk', shape: 'cylinder' }, { id: 'canopy-wide', shape: 'cone', color: 0x66cdaa }] },
  ],
});

test('variantRule solitary matches treeVariant(terrain, q, r)', () => {
  const treeVariant = (terrain, q, r) => {
    const hash = ((q * 7 + r * 13) * 31) % 17;
    if (terrain === 'forest') return hash < 10 ? 'tall' : 'round';
    if (hash < 6) return 'round';
    if (hash < 11) return 'tall';
    return 'wide';
  };
  const selected = (tile) => {
    const ids = recordsForDescriptor(SOLITARY_TREE, tile, POS).map((r) => r.partId);
    return ids.includes('canopy-round') ? 'round' : ids.includes('canopy-tall') ? 'tall' : 'wide';
  };
  for (const terrain of ['plains', 'hill', 'marsh', 'forest']) {
    for (const [q, r] of [[1, 1], [3, -2], [-7, 5], [12, 0], [0, 0], [-3, -9]]) {
      assert.equal(selected({ q, r, terrain }), treeVariant(terrain, q, r), `${terrain} ${q},${r}`);
    }
  }
});

test('variantRule cluster picks tall for denseForest, round otherwise', () => {
  const grove = normalizeDescriptor({
    id: 'grove-variants',
    kind: 'decor',
    displayName: 'Grove',
    variantRule: 'cluster',
    cluster: { min: 2, max: 2 },
    placement: { mode: 'ring' },
    parts: [{ id: 'trunk', shape: 'cylinder' }],
    variants: [
      { id: 'round', parts: [{ id: 'trunk', shape: 'cylinder' }, { id: 'canopy-round', shape: 'sphere' }] },
      { id: 'tall', parts: [{ id: 'trunk', shape: 'cylinder' }, { id: 'canopy-tall', shape: 'cone' }] },
    ],
  });
  const idsFor = (terrain) => new Set(recordsForDescriptor(grove, { q: 4, r: 4, terrain }, POS).map((r) => r.partId));
  assert.ok(idsFor('denseForest').has('canopy-tall') && !idsFor('denseForest').has('canopy-round'));
  assert.ok(idsFor('forest').has('canopy-round') && !idsFor('forest').has('canopy-tall'));
});

// ── Per-part stretch (M4: trunk vs canopy stretch ranges) ──────────────────

test('part.stretch overrides the object variation; false pins the axis at 1', () => {
  const tree = normalizeDescriptor({
    id: 'stretch-tree',
    kind: 'feature',
    displayName: 'Stretch Tree',
    placement: { mode: 'center' },
    variation: { stretchY: [0.85, 1.3], stretchXZ: [0.9, 1.15] },
    parts: [
      // Trunk: stretches on Y from 0.9..1.2 (seed 6), XZ pinned.
      { id: 'trunk', shape: 'cylinder', stretch: { y: { min: 0.9, max: 1.2, seed: 6 }, xz: false } },
      // Canopy: uses the object-level ranges (default seeds 4 / 5).
      { id: 'canopy', shape: 'sphere' },
    ],
  });
  const records = recordsForDescriptor(tree, TILE, POS);
  const trunk = records.find((r) => r.partId === 'trunk');
  const canopy = records.find((r) => r.partId === 'canopy');

  // Trunk XZ pinned: scaleXZ = 1 → scale equals itemScale (1.0 here).
  assert.equal(trunk.scale, 1);
  // Trunk Y stretch = lerp(0.9, 1.2, frac(treeHash(tileH, 6))).
  const tileH = ((3 * 7 + -2 * 13) * 31) % 17;
  const h6 = ((tileH * 17 + 6 * 29 + 5) % 89 + 89) % 89;
  const yStretch = 0.9 + 0.3 * ((h6 % 100) / 100);
  assert.ok(Math.abs(trunk.scaleY - yStretch) < 1e-9, `trunk scaleY ${trunk.scaleY} vs ${yStretch}`);
  // Canopy still stretches from the object variation (its XZ varies, trunk's doesn't).
  assert.notEqual(canopy.scale, 1);
  assert.notEqual(canopy.scale, trunk.scale);
});

// ── Jitter placement (M4: solitary tree migration) ─────────────────────────

test('jitter placement replicates solitaryTreeRecords offsets and lean', () => {
  const tree = normalizeDescriptor({
    id: 'tree-solitary-placement',
    kind: 'feature',
    displayName: 'Tree',
    scale: 1.15,
    variation: { stretchY: [1.1, 1.1], stretchXZ: [1.05, 1.05] },
    placement: { mode: 'jitter', offset: 0.08, tiltMin: 0.02, tiltMax: 0.02, tiltSeed: 1 },
    parts: [{ id: 'trunk', shape: 'cylinder' }],
  });
  const tile = { q: 3, r: -2, terrain: 'plains' };
  const tileH = ((3 * 7 + -2 * 13) * 31) % 17;
  const off = ((tileH % 100) / 100) * Math.PI * 2;
  const tiltDir = ((((tileH * 17 + 1 * 29 + 5) % 89) % 100 + 100) % 100) / 100 * Math.PI * 2;
  const [record] = recordsForDescriptor(tree, tile, POS);
  assert.ok(Math.abs(record.x - (POS.x + Math.cos(off) * 0.08)) < 1e-9);
  assert.ok(Math.abs(record.z - (POS.z + Math.sin(off) * 0.08)) < 1e-9);
  assert.ok(Math.abs(record.rotY - off) < 1e-9);
  assert.ok(Math.abs(record.tilt - 0.02) < 1e-9);
  assert.ok(Math.abs(record.tiltAxis.x - Math.sin(tiltDir)) < 1e-9);
  assert.ok(Math.abs(record.tiltAxis.z + Math.cos(tiltDir)) < 1e-9);
  // scale = 1.15 (no stretch variation since ranges are flat).
  assert.ok(Math.abs(record.scale - 1.15 * 1.05) < 1e-9);
  assert.ok(Math.abs(record.scaleY - 1.15 * 1.1) < 1e-9);
});

// ── Per-item size draws (M4: cluster member variation) ─────────────────────

test('cluster members draw their own size from hash i+3', () => {
  const multi = normalizeDescriptor({
    id: 'multi-size',
    kind: 'feature',
    displayName: 'Multi',
    cluster: { min: 3, max: 3 },
    size: { min: 1.0, max: 2.0 },
    placement: { mode: 'center' },
    parts: [{ id: 'p', shape: 'sphere' }],
  });
  const tileH = ((3 * 7 + -2 * 13) * 31) % 17;
  const records = recordsForDescriptor(multi, TILE, POS);
  assert.equal(records.length, 3);
  const sizes = records.map((r) => r.scale);
  assert.equal(new Set(sizes).size, 3, 'three members, three distinct size draws');
  const h = (i) => ((tileH * 17 + i * 29 + 5) % 89 + 89) % 89;
  sizes.forEach((s, i) => {
    const expected = 1 + (h(i + 3) % 100) / 100;
    assert.ok(Math.abs(s - expected) < 1e-9, `item ${i} scale ${s} vs ${expected}`);
  });
});
