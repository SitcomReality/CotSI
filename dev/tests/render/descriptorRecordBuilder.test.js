/**
 * descriptorRecordBuilder.test.js — Pure record generation from descriptors
 * (src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js).
 * Covers determinism, cluster/size math, placement, and emphasis behavior.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDescriptor, shapeBaseOffset } from '../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import {
  recordsForDescriptor,
  recordsForEntity,
  nodeWorldFrames,
  nodeWorldFramesForEntity,
} from '../../../src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js';
import { biomeTintForTile } from '../../../src/render/hexmap3d/worldObjects/biomeTint.js';
import { DISPERSED_SCALE, sunkTransform, dispersedSingleOffset } from '../../../src/render/hexmap3d/worldObjects/decorEmphasis.js';
import { mat4RotationY, mat4Translation, mat4Multiply, mat4TranslationOf } from '../../../src/engine/rules/mat4.js';
import { treeHash, frac, itemHash } from '../../../src/render/hexmap3d/worldObjects/tileHash.js';

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
  schemaVersion: 3, // current convention — lift/transform values are bottom-height
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
  schemaVersion: 3, // current convention — lift/transform values are bottom-height
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
  // Ring items lean, so the trunk carries the base bake (cylinder h 0.4 → base
  // 0.2 × scaleY) plus the authored lift, which still pre-scales by itemScale
  // (itemScale = lerp(1.3..1.5, hash) — GROVE has no `scale`, so scale = 1).
  const authored = trunk.lift - 0.2 * trunk.scaleY;
  assert.ok(authored >= 0.16 * 1.3 - 1e-9 && authored <= 0.16 * 1.5 + 1e-9, `authored lift ${authored}`);
  // Grounded pivot: the tilted trunk's y is the bottom height, flush on the
  // surface (the base bake rides as lift, so bottom = y + lift − 0.2·scaleY).
  assert.ok(Math.abs(trunk.y - POS.y) < 1e-9, `pivot y ${trunk.y}`);
});

test('liftRange anchors the canopy bottom to the per-tree trunk stretch', () => {
  // Synthetic center-placement tree: the trunk stretches on Y from the seed-6
  // draw and the canopy draws its lift from the SAME seed — so the canopy
  // bottom = 0.5·trunkStretch − 0.3 (legacy canopyY·trunkStretch − halfHeight)
  // tracks the trunk exactly on every tile.
  const anchored = normalizeDescriptor({
    id: 'anchored-canopy',
    kind: 'feature',
    displayName: 'Anchored Canopy',
    placement: { mode: 'center' },
    size: { min: 1, max: 1 },
    parts: [
      { id: 'trunk', shape: 'cylinder', stretch: { y: { min: 0.9, max: 1.2, seed: 6 }, x: false, z: false } },
      { id: 'canopy', shape: 'sphere', transform: { liftRange: { min: 0.15, max: 0.3, seed: 6 } } },
    ],
  });
  for (let q = 0; q <= 30; q++) {
    const tile = { q, r: -2, terrain: 'plains' };
    const records = recordsForDescriptor(anchored, tile, POS);
    const trunk = records.find((r) => r.partId === 'trunk');
    const canopy = records.find((r) => r.partId === 'canopy');
    // Center placement: itemScale = 1, no jitter/biome factors — the canopy
    // lift is the raw draw and trunk.scaleY the raw seed-6 stretch.
    assert.ok(Math.abs(canopy.lift - (0.5 * trunk.scaleY - 0.3)) < 1e-9,
      `q=${q} canopy lift ${canopy.lift} vs 0.5·${trunk.scaleY}−0.3`);
    // The legacy draw is lerp(min, max, frac(treeHash(tileH, 6))). JS negative
    // modulo lets frac go negative on some tiles, so the reachable band is
    // lerp(range, ±0.88) — the same quirk the trunk stretch always had. The
    // anchor identity above holds regardless; check both draws independently
    // and honor the authored [min, max] band where the draw is non-negative.
    const f = frac(treeHash(((q * 7 + -2 * 13) * 31) % 17, 6));
    assert.ok(Math.abs(trunk.scaleY - (0.9 + 0.3 * f)) < 1e-9, `q=${q} trunk scaleY ${trunk.scaleY} vs ${0.9 + 0.3 * f}`);
    assert.ok(Math.abs(canopy.lift - (0.15 + 0.15 * f)) < 1e-9, `q=${q} lift ${canopy.lift} vs ${0.15 + 0.15 * f}`);
    if (f >= 0) {
      assert.ok(canopy.lift >= 0.15 - 1e-9 && canopy.lift <= 0.3 + 1e-9, `q=${q} lift ${canopy.lift} out of [0.15, 0.3]`);
      assert.ok(trunk.scaleY >= 0.9 - 1e-9 && trunk.scaleY <= 1.2 + 1e-9, `q=${q} trunk scaleY ${trunk.scaleY}`);
    }
  }
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

// ── Placement separation ────────────────────────────────────────────────────

/** A multi-item scatter cluster — the cactus case (overlaps without separation). */
const SEP_RAW = {
  id: 'sep-cluster',
  kind: 'feature',
  displayName: 'Separated Cluster',
  schemaVersion: 3,
  scale: 1.5,
  cluster: { min: 2, max: 4 },
  placement: { mode: 'scatter', offsetMin: 0.16, offsetMax: 0.42 },
  parts: [
    { id: 'tuft', shape: 'cone', params: { bottomR: 0.04, height: 0.06, radialSegs: 3, heightSegs: 1 } },
  ],
};
const SEP_BUSH = normalizeDescriptor({ ...SEP_RAW, placement: { ...SEP_RAW.placement, separation: 0.35 } });
const SEP_JITTER = normalizeDescriptor({
  ...SEP_RAW,
  placement: { mode: 'jitter', offset: 0.12, separation: 0.25 },
});

/** The minimum pairwise distance between one tile's item origins. */
function minPairDistance(records, pos) {
  const origins = records.map((r) => ({ x: r.x - pos.x, z: r.z - pos.z }));
  let min = Infinity;
  for (let i = 0; i < origins.length; i++) {
    for (let j = i + 1; j < origins.length; j++) {
      min = Math.min(min, Math.hypot(origins[i].x - origins[j].x, origins[i].z - origins[j].z));
    }
  }
  return min;
}

test('separation keeps cluster members at least `separation` apart (scatter)', () => {
  for (let q = 0; q < 60; q++) {
    const records = recordsForDescriptor(SEP_BUSH, { q, r: 7, terrain: 'plains' }, POS);
    assert.ok(records.length >= 2, `q=${q}: cluster count ${records.length} < 2`);
    // The relaxation converges asymptotically — pairs land within ~1e-3 of the target.
    assert.ok(minPairDistance(records, POS) >= 0.35 - 1e-3, `q=${q}: a pair sits closer than the separation`);
  }
});

test('separation keeps cluster members at least `separation` apart (jitter)', () => {
  for (let q = 0; q < 60; q++) {
    const records = recordsForDescriptor(SEP_JITTER, { q, r: 7, terrain: 'plains' }, POS);
    assert.ok(records.length >= 2, `q=${q}: cluster count ${records.length} < 2`);
    assert.ok(minPairDistance(records, POS) >= 0.25 - 1e-3, `q=${q}: a pair sits closer than the separation`);
  }
});

test('separation 0 (or absent) keeps the legacy cluster layout', () => {
  const none = normalizeDescriptor(SEP_RAW);
  const zero = normalizeDescriptor({ ...SEP_RAW, placement: { ...SEP_RAW.placement, separation: 0 } });
  for (let q = 0; q < 20; q++) {
    const tile = { q, r: 7, terrain: 'plains' };
    assert.deepEqual(recordsForDescriptor(zero, tile, POS), recordsForDescriptor(none, tile, POS));
  }
});

test('nodeWorldFrames matches the separated record layout (gizmo/records in sync)', () => {
  const tile = { q: 5, r: 3, terrain: 'plains' };
  const records = recordsForDescriptor(SEP_BUSH, tile, POS);
  const frames = nodeWorldFrames(SEP_BUSH, tile, POS);
  // Cluster frames collapse to the last item (later items overwrite earlier).
  const last = records[records.length - 1];
  assert.deepEqual(frames.get('tuft').origin, { x: last.x, y: last.y, z: last.z });
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
    id: 'example',
    kind: 'feature',
    displayName: 'Example',
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

// ── Biome tint (M5: per-part biome color influence) ─────────────────────────

/** Center-placed part with a half-strength primary tint (no color jitter). */
const TINTED = normalizeDescriptor({
  id: 'tinted',
  kind: 'decor',
  displayName: 'Tinted',
  placement: { mode: 'center' },
  parts: [
    { id: 'p', shape: 'sphere', color: 0xffffff, biomeColor: { source: 'primary', influence: 0.5 } },
  ],
});

const EDEN_TILE = { q: 3, r: -2, terrain: 'forest', biomeId: 'biome_edenfall' };
const RED_TINT = { primary: [1, 0, 0], accent: [0, 1, 0] };

test('biome tint mixes the default color toward the tint by influence', () => {
  // 0xffffff pulled halfway to pure red: r stays 255, g and b halve → 0xff8080.
  const [record] = recordsForDescriptor(TINTED, EDEN_TILE, POS, undefined, {}, RED_TINT);
  assert.equal(record.color, 0xff8080);

  const full = normalizeDescriptor({
    id: 'tinted-full',
    kind: 'decor',
    displayName: 'Tinted Full',
    placement: { mode: 'center' },
    parts: [{ id: 'p', shape: 'sphere', color: 0xffffff, biomeColor: { source: 'primary', influence: 1 } }],
  });
  assert.equal(recordsForDescriptor(full, EDEN_TILE, POS, undefined, {}, RED_TINT)[0].color, 0xff0000);

  // Influence 0 is the "default color" strength.
  const none = normalizeDescriptor({
    id: 'tinted-none',
    kind: 'decor',
    displayName: 'Tinted None',
    placement: { mode: 'center' },
    parts: [{ id: 'p', shape: 'sphere', color: 0xffffff, biomeColor: { source: 'primary', influence: 0 } }],
  });
  assert.equal(recordsForDescriptor(none, EDEN_TILE, POS, undefined, {}, RED_TINT)[0].color, 0xffffff);
});

test('biome tint uses the accent source when named', () => {
  const accent = normalizeDescriptor({
    id: 'tinted-accent',
    kind: 'decor',
    displayName: 'Tinted Accent',
    placement: { mode: 'center' },
    parts: [{ id: 'p', shape: 'sphere', color: 0xffffff, biomeColor: { source: 'accent', influence: 1 } }],
  });
  const [record] = recordsForDescriptor(accent, EDEN_TILE, POS, undefined, {}, RED_TINT);
  assert.equal(record.color, 0x00ff00);
});

test('no biomeTint keeps the default color', () => {
  const [record] = recordsForDescriptor(TINTED, EDEN_TILE, POS);
  assert.equal(record.color, 0xffffff);
});

test('Untouched/Painforest tiles keep default colors end to end', () => {
  // biomeTintForTile returns null for Painforest tiles, so the record keeps
  // the default part color even with biome colors present.
  const pain = { q: 3, r: -2, terrain: 'forest', biomeId: 'biome_painforest' };
  const tiles = new Map([['3,-2', pain]]);
  const colors = new Map([['biome_painforest', { primary: [0.38, 0.62, 0.28], accent: [0.16, 0.42, 0.38] }]]);
  assert.equal(biomeTintForTile(pain, tiles, colors), null);
  const [record] = recordsForDescriptor(TINTED, pain, POS, undefined, {}, biomeTintForTile(pain, tiles, colors));
  assert.equal(record.color, 0xffffff);
});

// ── Per-biome size (M5: biomeScale) ─────────────────────────────────────────

const SCALED = normalizeDescriptor({
  id: 'biome-scaled',
  kind: 'decor',
  displayName: 'Biome Scaled',
  placement: { mode: 'center' },
  size: { min: 1, max: 1 },
  parts: [
    { id: 'p', shape: 'sphere', biomeScale: { biome_tundra: 0.85 } },
  ],
});

test('biomeScale multiplies the part scale on matching tiles only', () => {
  const tundra = recordsForDescriptor(SCALED, { q: 3, r: -2, terrain: 'plains', biomeId: 'biome_tundra' }, POS);
  assert.ok(Math.abs(tundra[0].scale - 0.85) < 1e-9, `tundra scale ${tundra[0].scale}`);
  assert.ok(Math.abs(tundra[0].scaleY - 0.85) < 1e-9, `tundra scaleY ${tundra[0].scaleY}`);

  for (const tile of [
    { q: 3, r: -2, terrain: 'plains', biomeId: 'biome_edenfall' },
    { q: 3, r: -2, terrain: 'plains' },
  ]) {
    const [record] = recordsForDescriptor(SCALED, tile, POS);
    assert.equal(record.scale, 1, `scale for ${tile.biomeId ?? 'no biome'}`);
    assert.equal(record.scaleY, 1);
  }
});

test('biomeScale composes with the item scale and per-axis stretch', () => {
  const composed = normalizeDescriptor({
    id: 'biome-composed',
    kind: 'decor',
    displayName: 'Biome Composed',
    scale: 1.5,
    placement: { mode: 'center' },
    variation: { stretchY: [1.1, 1.1] },
    size: { min: 1, max: 1 },
    parts: [{ id: 'p', shape: 'sphere', biomeScale: { biome_tundra: 0.85 } }],
  });
  const [record] = recordsForDescriptor(composed, { q: 3, r: -2, terrain: 'plains', biomeId: 'biome_tundra' }, POS);
  // XZ: 1.5 × 1 × 0.85; Y: 1.5 × 1.1 × 0.85.
  assert.ok(Math.abs(record.scale - 1.5 * 0.85) < 1e-9, `x scale ${record.scale}`);
  assert.ok(Math.abs(record.scaleY - 1.5 * 1.1 * 0.85) < 1e-9, `y scale ${record.scaleY}`);
});

test('biomeScale scales localPos and lift rigidly (the gnarled painforest stack)', () => {
  const stack = normalizeDescriptor({
    id: 'biome-stack',
    kind: 'decor',
    displayName: 'Biome Stack',
    placement: { mode: 'center' },
    size: { min: 1, max: 1 },
    parts: [
      { id: 'trunk', shape: 'cylinder' },
      { id: 'ball', shape: 'sphere', transform: { lift: 0.5, localPos: { x: 0.02, y: 0.4, z: 0.05 } }, biomeScale: { biome_painforest: 0.55 } },
    ],
  });
  // Painforest: every local offset scales with the part (× 0.55), so the
  // branch/canopy stack stays rigid at the smaller member size.
  const [, painBall] = recordsForDescriptor(stack, { q: 3, r: -2, terrain: 'forest', biomeId: 'biome_painforest' }, POS);
  assert.ok(Math.abs(painBall.localPos.y - 0.4 * 0.55) < 1e-9, `painforest localPos.y ${painBall.localPos.y}`);
  assert.ok(Math.abs(painBall.localPos.x - 0.02 * 0.55) < 1e-9, `painforest localPos.x ${painBall.localPos.x}`);
  assert.ok(Math.abs(painBall.lift - 0.5 * 0.55) < 1e-9, `painforest lift ${painBall.lift}`);
  // Without the biome the stack keeps its authored offsets.
  const [, plainBall] = recordsForDescriptor(stack, { q: 3, r: -2, terrain: 'forest' }, POS);
  assert.ok(Math.abs(plainBall.localPos.y - 0.4) < 1e-9, `plain localPos.y ${plainBall.localPos.y}`);
  assert.ok(Math.abs(plainBall.lift - 0.5) < 1e-9, `plain lift ${plainBall.lift}`);
});

// ── Scatter placement (M4: simple-feature migration) ───────────────────────

test('scatter offset honors placement.offsetMin/offsetMax (defaults 0.15..0.3)', () => {
  // Hand-compute the scatter jitter the way recordBuilder does: the legacy
  // 30-step hash roll from simpleFeatureMeshes.js, rescaled onto the
  // descriptor's ring bounds. rotY and scaleMul keep the legacy formulas
  // exactly — only the ring width became authorable (previously the
  // offsetMin/offsetMax fields were silently ignored).
  const jitterFor = (tile, min, max) => {
    const hash = ((tile.q * 17 + tile.r * 11) * 13) % 100;
    const angle = (hash * 0.618) % (Math.PI * 2);
    const dist = min + ((hash % 30) / 29) * (max - min);
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
    // BUSH normalizes to the schema defaults offsetMin 0.15 / offsetMax 0.3.
    const { dx, dz, rotY, scaleMul } = jitterFor(tile, 0.15, 0.3);
    assert.ok(Math.abs(record.x - (POS.x + dx)) < 1e-9, `tile ${tile.q},${tile.r} x`);
    assert.ok(Math.abs(record.z - (POS.z + dz)) < 1e-9, `tile ${tile.q},${tile.r} z`);
    // rotY is omitted from the record when 0 (identity rotation).
    assert.ok(Math.abs((record.rotY ?? 0) - rotY) < 1e-9, `tile ${tile.q},${tile.r} rotY`);
    assert.ok(Math.abs(record.scale - 1.5 * scaleMul) < 1e-9, `tile ${tile.q},${tile.r} scale`);
  }

  // Explicit bounds reshape the ring (the chests use offsetMin 0 / 0.1 to hug
  // the hex center). The hand-computed roll lands exactly on the new bounds.
  const narrow = normalizeDescriptor({
    id: 'narrow-scatter',
    kind: 'feature',
    displayName: 'Narrow Scatter',
    schemaVersion: 3,
    placement: { mode: 'scatter', offsetMin: 0.02, offsetMax: 0.06 },
    parts: [{ id: 'p', shape: 'box' }],
  });
  for (const tile of [
    { q: 3, r: -2, terrain: 'plains' },
    { q: 27, r: 8, terrain: 'plains' },
  ]) {
    const [record] = recordsForDescriptor(narrow, tile, POS);
    const { dx, dz } = jitterFor(tile, 0.02, 0.06);
    assert.ok(Math.abs(record.x - (POS.x + dx)) < 1e-9, `tile ${tile.q},${tile.r} x`);
    assert.ok(Math.abs(record.z - (POS.z + dz)) < 1e-9, `tile ${tile.q},${tile.r} z`);
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

// ── Scatter rigidity (the open-chest distortion) ───────────────────────────

test('scatter scales the whole item rigidly (geometry, offsets, and groups)', () => {
  // Scatter's per-tile size jitter must shrink the ENTIRE item — geometry,
  // root localPos/lift, group hinges, and nested leaf offsets alike — and the
  // per-tile rotY must spin the item about its OWN origin. Two regressions
  // once broke this for grouped objects: the scatter size jitter shrank the
  // chest base but left the lid hinge at full size (lid floated off the
  // body), nested geometry was scaled twice (itemScale²), and the placement
  // rotY rotated the ring offset about the WORLD origin instead of the item.
  const scatter = normalizeDescriptor({
    id: 'scatter-rigid',
    kind: 'feature',
    displayName: 'Scatter Rigid',
    schemaVersion: 3,
    scale: 1.2,
    placement: { mode: 'scatter' },
    size: { min: 1, max: 1 },
    parts: [
      { id: 'base', shape: 'box', params: { width: 0.3, height: 0.1, depth: 0.2 }, transform: { localPos: { x: 0.1, y: 0.2, z: 0 } } },
      {
        id: 'hinge',
        transform: { localPos: { x: 0, y: 0.15, z: 0.125 }, localAxis: { x: 1, y: 0, z: 0 }, localAngle: 1 },
        children: [
          { id: 'lid', shape: 'box', transform: { localPos: { x: 0, y: 0, z: -0.125 } } },
        ],
      },
    ],
  });
  const tile = { q: 3, r: -2, terrain: 'plains' }; // hash 77 → scaleMul 0.97
  const records = recordsForDescriptor(scatter, tile, POS);
  const base = records.find((r) => r.partId === 'base');
  const lid = records.find((r) => r.partId === 'lid');

  // Recover the per-tile scatter jitter from the root leaf (itemScale = 1.2,
  // no stretch/biome factors in this fixture).
  const dx = base.x - POS.x;
  const dz = base.z - POS.z;
  const rotY = base.rotY ?? 0;
  const scaleMul = base.scale / 1.2;

  // Root-leaf localPos pre-scales by scaleMul like lift and the geometry — the
  // vertical slot rides the shrunken item instead of staying at full size.
  assert.ok(Math.abs(base.localPos.x - 0.1 * 1.2 * scaleMul) < 1e-9, `base localPos.x ${base.localPos.x}`);
  assert.ok(Math.abs(base.localPos.y - 0.2 * 1.2 * scaleMul) < 1e-9, `base localPos.y ${base.localPos.y}`);
  assert.equal(base.localPos.z, 0);

  // Nested geometry scales by itemScale × scaleMul exactly ONCE — a group must
  // not fold the rigid factor in again, which would square it (1.44·scaleMul²).
  const lidScale = Math.hypot(lid.matrix[0], lid.matrix[1], lid.matrix[2]);
  assert.ok(Math.abs(lidScale - 1.2 * scaleMul) < 1e-9, `lid geometry scale ${lidScale}`);

  // The whole nested item equals the center-mode item scaled by scaleMul,
  // placed at the ring offset and spun about its own origin — T(dx,dz) ·
  // R_y(rotY) · (shrunk center matrix). Composing the rotation the other way
  // round (R·T) would swing the ring offset around the hex center and
  // misplace every nested part. Compared at a zero world origin so the
  // placement rotation never touches the world position.
  const ORIGIN = { x: 0, y: 0, z: 0 };
  const shrunk = { ...scatter, scale: base.scale, placement: { mode: 'center' } };
  const shrunkLid = recordsForDescriptor(shrunk, tile, ORIGIN).find((r) => r.partId === 'lid').matrix;
  const scatterLid = recordsForDescriptor(scatter, tile, ORIGIN).find((r) => r.partId === 'lid').matrix;
  const expected = mat4Multiply(mat4Translation(dx, 0, dz), mat4Multiply(mat4RotationY(rotY), shrunkLid));
  expectMatrix(scatterLid, expected);

  // The group hinge (gizmo origin) rides the same rigid relationship.
  const frames = nodeWorldFrames(scatter, tile, ORIGIN);
  const shrunkFrames = nodeWorldFrames(shrunk, tile, ORIGIN);
  const origin = frames.get('hinge').origin;
  const shrunkOrigin = shrunkFrames.get('hinge').origin;
  const expectedOrigin = mat4TranslationOf(mat4Multiply(
    mat4Translation(dx, 0, dz),
    mat4Multiply(mat4RotationY(rotY), mat4Translation(shrunkOrigin.x, shrunkOrigin.y, shrunkOrigin.z)),
  ));
  assert.ok(Math.abs(origin.x - expectedOrigin.x) < 1e-9, `hinge x ${origin.x} vs ${expectedOrigin.x}`);
  assert.ok(Math.abs(origin.y - expectedOrigin.y) < 1e-9, `hinge y ${origin.y} vs ${expectedOrigin.y}`);
  assert.ok(Math.abs(origin.z - expectedOrigin.z) < 1e-9, `hinge z ${origin.z} vs ${expectedOrigin.z}`);
});

// ── Moisture-driven cluster (M4: grove migration) ──────────────────────────

/** Grove with the legacy moisture rule (the old cluster-grove builder). */
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

// ── Variant rules ───────────────────────────────────────────────────────────

test('variantRule cluster picks tall for denseForest, round otherwise; biome overrides', () => {
  const grove = normalizeDescriptor({
    id: 'grove-variants',
    kind: 'decor',
    displayName: 'Grove',
    variantRule: 'cluster',
    biomeVariants: { biome_painforest: 'painforest' },
    cluster: { min: 2, max: 2 },
    placement: { mode: 'ring' },
    parts: [{ id: 'trunk', shape: 'cylinder' }],
    variants: [
      { id: 'round', parts: [{ id: 'trunk', shape: 'cylinder' }, { id: 'canopy-round', shape: 'sphere' }] },
      { id: 'tall', parts: [{ id: 'trunk', shape: 'cylinder' }, { id: 'canopy-tall', shape: 'cone' }] },
      { id: 'painforest', parts: [{ id: 'trunk-gnarled', shape: 'cylinder' }, { id: 'canopy-gnarled', shape: 'sphere' }] },
    ],
  });
  const idsFor = (tile) => new Set(recordsForDescriptor(grove, tile, POS).map((r) => r.partId));
  assert.ok(idsFor({ q: 4, r: 4, terrain: 'denseForest' }).has('canopy-tall') && !idsFor({ q: 4, r: 4, terrain: 'denseForest' }).has('canopy-round'));
  assert.ok(idsFor({ q: 4, r: 4, terrain: 'forest' }).has('canopy-round') && !idsFor({ q: 4, r: 4, terrain: 'forest' }).has('canopy-tall'));
  // Painforest woods always grow the gnarled variant — on forest AND denseForest.
  for (const terrain of ['forest', 'denseForest']) {
    const ids = idsFor({ q: 4, r: 4, terrain, biomeId: 'biome_painforest' });
    assert.ok(ids.has('canopy-gnarled'), `${terrain} painforest picks the gnarled variant`);
    assert.ok(!ids.has('canopy-round') && !ids.has('canopy-tall'));
  }
});

test('an explicit variant id forces the variant (the editor variant picker)', () => {
  const grove = normalizeDescriptor({
    id: 'grove-override',
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
  const tile = { q: 4, r: 4, terrain: 'forest' }; // would pick 'round' by rule
  const forced = new Set(recordsForDescriptor(grove, tile, POS, undefined, {}, null, 'tall').map((r) => r.partId));
  assert.ok(forced.has('canopy-tall') && !forced.has('canopy-round'), 'explicit id wins over the rule');
  // A stale id (variant removed while editing) falls through to the rule.
  const fallback = new Set(recordsForDescriptor(grove, tile, POS, undefined, {}, null, 'nope').map((r) => r.partId));
  assert.ok(fallback.has('canopy-round') && !fallback.has('canopy-tall'));
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

// ── Jitter placement ────────────────────────────────────────────────────────

test('jitter placement replicates deterministic offsets and lean', () => {
  const tree = normalizeDescriptor({
    id: 'jitter-placement',
    kind: 'feature',
    displayName: 'Jitter',
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

// ── Cluster distribution (M4: scatter/jitter spread cluster members) ────────

test('scatter distributes cluster members across the hex (item 0 keeps the legacy roll)', () => {
  const scattered = normalizeDescriptor({
    id: 'scatter-cluster',
    kind: 'feature',
    displayName: 'Scatter Cluster',
    schemaVersion: 3,
    cluster: { min: 4, max: 4 },
    placement: { mode: 'scatter', offsetMin: 0.2, offsetMax: 0.6 },
    parts: [{ id: 'p', shape: 'box' }],
  });
  const records = recordsForDescriptor(scattered, TILE, POS);
  assert.equal(records.length, 4);
  // Distinct positions — members no longer stack at one point.
  assert.equal(new Set(records.map((r) => `${r.x},${r.z}`)).size, 4);
  for (const r of records) {
    const dist = Math.hypot(r.x - POS.x, r.z - POS.z);
    assert.ok(dist >= 0.2 - 1e-9 && dist <= 0.6 + 1e-9, `dist ${dist} out of scatter bounds`);
  }
  // Item 0 keeps the legacy single-item roll verbatim (same hand-computed
  // formula as the offset-honoring test above).
  const hash = ((TILE.q * 17 + TILE.r * 11) * 13) % 100;
  const angle = (hash * 0.618) % (Math.PI * 2);
  const dist = 0.2 + ((hash % 30) / 29) * (0.6 - 0.2);
  const [first] = records;
  assert.ok(Math.abs(first.x - (POS.x + Math.cos(angle) * dist)) < 1e-9, `item 0 x ${first.x}`);
  assert.ok(Math.abs(first.z - (POS.z + Math.sin(angle) * dist)) < 1e-9, `item 0 z ${first.z}`);
  assert.ok(Math.abs((first.rotY ?? 0) - (hash * 0.723) % (Math.PI * 2)) < 1e-9);
  assert.ok(Math.abs(first.scale - (0.8 + (hash % 20) / 100)) < 1e-9);
});

test('scatter cluster members spread apart (no every-third clumping)', () => {
  // Regression: treeHash is linear in i (step 29 mod 89) and 3·29 ≡ −2
  // (mod 89), so every third member nearly repeated — clusters piled into
  // the same 3 spots. Members now draw from the decorrelated itemHash.
  const scattered = normalizeDescriptor({
    id: 'scatter-spread',
    kind: 'feature',
    displayName: 'Scatter Spread',
    schemaVersion: 3,
    cluster: { min: 6, max: 6 },
    placement: { mode: 'scatter', offsetMin: 0.2, offsetMax: 0.6 },
    parts: [{ id: 'p', shape: 'box' }],
  });
  const records = recordsForDescriptor(scattered, TILE, POS);
  assert.equal(records.length, 6);
  const pts = records.map((r) => ({ x: r.x - POS.x, z: r.z - POS.z }));
  let minDist = Infinity;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      minDist = Math.min(minDist, Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z));
    }
  }
  // The old treeHash clump left members ~0.03 apart (~5° at these radii);
  // decorrelated draws keep them comfortably clear of each other.
  assert.ok(minDist > 0.05, `closest members only ${minDist} apart`);
});

test('jitter spreads cluster members into a clump (item 0 keeps the legacy anchor)', () => {
  const clump = normalizeDescriptor({
    id: 'jitter-clump',
    kind: 'feature',
    displayName: 'Jitter Clump',
    schemaVersion: 3,
    cluster: { min: 4, max: 4 },
    placement: { mode: 'jitter', offset: 0.12, tiltMin: 0.02, tiltMax: 0.08 },
    parts: [{ id: 'p', shape: 'box' }],
  });
  const records = recordsForDescriptor(clump, TILE, POS);
  assert.equal(records.length, 4);
  // Distinct positions — members no longer share one base point (the teepee).
  assert.equal(new Set(records.map((r) => `${r.x},${r.z}`)).size, 4);
  for (const r of records) {
    const dist = Math.hypot(r.x - POS.x, r.z - POS.z);
    assert.ok(dist >= 0.12 * 0.5 - 1e-9 && dist <= 0.12 * 1.5 + 1e-9, `dist ${dist} outside clump`);
  }
  // Item 0 keeps the legacy anchor: angle = frac(tileH)·2π, radius = offset.
  const tileH = ((TILE.q * 7 + TILE.r * 13) * 31) % 17;
  const angle = ((tileH % 100) / 100) * Math.PI * 2;
  assert.ok(Math.abs(records[0].x - (POS.x + Math.cos(angle) * 0.12)) < 1e-9);
  assert.ok(Math.abs(records[0].z - (POS.z + Math.sin(angle) * 0.12)) < 1e-9);
});

test('tilt pivots at the part base; untilted parts keep the base bake in y', () => {
  // A ring-mode cone with no authored lift: the lean moves the pivot DOWN to
  // the cone's base — y is the bottom height (flush on the surface) and the
  // base bake (h/2 × scaleY) rides inside the rotation as lift, so the tilt
  // spins the cone about its ground contact, not its geometry center.
  const tilting = normalizeDescriptor({
    id: 'tilting',
    kind: 'feature',
    displayName: 'Tilting',
    schemaVersion: 3,
    cluster: { min: 2, max: 2 },
    placement: { mode: 'ring', ringMin: 0.3, ringMax: 0.3, leanMin: 0.05, leanMax: 0.05 },
    parts: [{ id: 'p', shape: 'cone', params: { bottomR: 0.028, height: 0.55, radialSegs: 4 } }],
  });
  for (const r of recordsForDescriptor(tilting, TILE, POS)) {
    assert.ok(r.tilt !== undefined && r.tilt !== 0, 'ring item leans');
    assert.ok(Math.abs(r.y - POS.y) < 1e-9, `pivot y ${r.y} vs ${POS.y}`);
    assert.ok(Math.abs(r.lift - 0.275 * r.scaleY) < 1e-9, `lift ${r.lift} vs base bake`);
    // The cone's lowest vertex is exactly the pivot (bottom = y + lift − base).
    const bottom = r.y + r.lift - 0.275 * r.scaleY;
    assert.ok(Math.abs(bottom - POS.y) < 1e-9, `bottom ${bottom} vs ${POS.y}`);
  }
  // An untilted part keeps the base bake in y (cone h 0.55 → base 0.275) and
  // emits no lift.
  const untilted = normalizeDescriptor({
    id: 'untilted',
    kind: 'feature',
    displayName: 'Untilted',
    schemaVersion: 3,
    placement: { mode: 'center' },
    parts: [{ id: 'p', shape: 'cone', params: { bottomR: 0.028, height: 0.55, radialSegs: 4 } }],
  });
  const [rec] = recordsForDescriptor(untilted, TILE, POS);
  assert.equal(rec.lift, undefined);
  assert.ok(Math.abs(rec.y - (POS.y + 0.275 * rec.scaleY)) < 1e-9);
});

// ── Per-item size draws (M4: cluster member variation) ─────────────────────

test('cluster members draw their own size from itemHash (item 0 keeps the legacy roll)', () => {
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
  sizes.forEach((s, i) => {
    // Item 0 keeps the legacy treeHash draw (lone-object stability); members
    // draw the decorrelated itemHash so every-third-index correlation can't
    // clone their sizes.
    const expected = 1 + (i === 0 ? frac(treeHash(tileH, 3)) : itemHash(tileH, i + 3));
    assert.ok(Math.abs(s - expected) < 1e-9, `item ${i} scale ${s} vs ${expected}`);
  });
});

// ── Nested part groups (schema v5) ──────────────────────────────────────────

/**
 * Center-placed grouped object: a root leaf + a group with one nested leaf.
 * All offsets are powers of two (0.5, 0.25) and the world position uses exact
 * fractions, so the baked matrix entries are exact (no FP drift to chase).
 */
const GROUPED = normalizeDescriptor({
  id: 'grouped',
  kind: 'feature',
  displayName: 'Grouped',
  schemaVersion: 3,
  placement: { mode: 'center' },
  size: { min: 1, max: 1 },
  parts: [
    { id: 'base', shape: 'sphere' }, // radius 0.3 → base offset 0.3
    {
      id: 'lid',
      transform: { localPos: { x: 0, y: 0.5, z: 0 } },
      children: [
        { id: 'lid-board', shape: 'box', transform: { localPos: { x: 0, y: 0, z: 0.25 } } },
      ],
    },
  ],
});

const IDENTITY_MATRIX = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** Element-wise matrix comparison — rotation entries carry ~1e-16 trig drift. */
function expectMatrix(actual, expected, eps = 1e-9) {
  assert.equal(actual.length, 16, `matrix has ${actual.length} elements`);
  for (let i = 0; i < 16; i++) {
    assert.ok(Math.abs(actual[i] - expected[i]) < eps, `matrix[${i}] = ${actual[i]} vs ${expected[i]}`);
  }
}

test('groups emit no records; nested leaves emit a baked world matrix', () => {
  const records = recordsForDescriptor(GROUPED, TILE, POS);
  assert.equal(records.length, 2);
  assert.deepEqual(records.map((r) => r.partId), ['base', 'lid-board'], 'groups never appear in records');
  // Root leaf: the flat record path — byte-identical to the un-grouped model.
  assert.deepEqual(Object.keys(records[0]).sort(), ['partId', 'scale', 'scaleY', 'x', 'y', 'z']);
  // Nested leaf: a full world matrix instead of the flat fields.
  const child = records[1];
  assert.ok(!('x' in child) && !('y' in child) && !('z' in child), 'no flat position on nested records');
  assert.ok(!('rotY' in child) && !('scale' in child) && !('scaleY' in child), 'no flat rotation/scale on nested records');
  // Bottom-anchored: T(worldPos) · T(0, 0.5, 0) · T(0, 0, 0.25) · T(0, 0.025, 0)
  // (the box's base offset, height 0.05 / 2) = T(1.732, 1.775, -2.75).
  assert.deepEqual(child.matrix, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1.732, 1.775, -2.75, 1]);
});

test('nested leaf under a rotated group inherits the hinge rotation', () => {
  const rotated = normalizeDescriptor({
    id: 'rotated',
    kind: 'feature',
    displayName: 'Rotated',
    schemaVersion: 3,
    placement: { mode: 'center' },
    size: { min: 1, max: 1 },
    parts: [
      {
        id: 'lid',
        transform: { localPos: { x: 0, y: 0.5, z: 0 }, localAxis: { x: 1, y: 0, z: 0 }, localAngle: Math.PI / 2 },
        children: [{ id: 'board', shape: 'box', transform: { localPos: { x: 0, y: 0, z: 0.25 } } }],
      },
    ],
  });
  const [board] = recordsForDescriptor(rotated, TILE, POS);
  // R_x(π/2) swings the child's +z offset to −y, and the base baking follows
  // the rotated frame: the box bottom lands at the group's origin +
  // child localPos. Origin T(1.732, 1.5, −2.975) (1.25 + 0.5 − 0.25 = 1.5;
  // −3 + 0.025 = −2.975).
  expectMatrix(board.matrix, [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 1.732, 1.5, -2.975, 1]);
});

test('group scale composes with the child scale (affine shear-free case)', () => {
  const scaled = normalizeDescriptor({
    id: 'scaled',
    kind: 'feature',
    displayName: 'Scaled',
    schemaVersion: 3,
    placement: { mode: 'center' },
    size: { min: 1, max: 1 },
    parts: [
      {
        id: 'g',
        transform: { localPos: { x: 0, y: 0.5, z: 0 }, scaleY: 2 },
        children: [{ id: 'leaf', shape: 'box', transform: { localPos: { x: 0, y: 0.25, z: 0 }, scaleX: 3 } }],
      },
    ],
  });
  const [leaf] = recordsForDescriptor(scaled, TILE, POS);
  // Group S(1,2,1) stretches the child's localPos.y AND its base bake (0.25 →
  // 0.5, 0.025 → 0.05), so the child lands at group origin + (0, 1.05, 0) —
  // and the scales compose into a final S(3,2,1) at T(1.732, 2.3, −3).
  expectMatrix(leaf.matrix, [3, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1, 0, 1.732, 2.3, -3, 1]);
});

test('nodeWorldFrames exposes every leaf AND group origin plus parent rotation', () => {
  const frames = nodeWorldFrames(GROUPED, TILE, POS);
  assert.deepEqual([...frames.keys()].sort(), ['base', 'lid', 'lid-board']);
  // Group origin: the hinge point in world space (worldPos + group localPos).
  assert.deepEqual(frames.get('lid').origin, { x: 1.732, y: 1.75, z: -3 });
  assert.deepEqual(frames.get('lid').parentRot, IDENTITY_MATRIX, 'center placement rotates nothing');
  // Nested leaf origin = its baked matrix translation (bottom-anchored: the
  // box's base 0.025 rides on top of localPos.y 0).
  assert.deepEqual(frames.get('lid-board').origin, { x: 1.732, y: 1.775, z: -2.75 });
  assert.deepEqual(frames.get('lid-board').parentRot, IDENTITY_MATRIX);
  // Root leaf origin = its flat record position (bottom-anchored: + 0.3 base).
  assert.deepEqual(frames.get('base').origin, { x: 1.732, y: 1.55, z: -3 });
});

test('root node origin rides the lift + localPos.y vertical slot (gizmo at the part, not the ground)', () => {
  const lifted = normalizeDescriptor({
    id: 'lifted',
    kind: 'feature',
    displayName: 'Lifted',
    schemaVersion: 3,
    placement: { mode: 'center' },
    size: { min: 1, max: 1 },
    parts: [
      // box default height 0.05 → base 0.025; y raises the bottom, lift and
      // localPos.y stack as the extra vertical offset (the render stacks too).
      { id: 'block', shape: 'box', transform: { y: 0.1, lift: 0.2, localPos: { x: 0, y: 0.3, z: 0 } } },
    ],
  });
  const frames = nodeWorldFrames(lifted, TILE, POS);
  // record y = 1.25 + 0.1 + 0.025 = 1.375; vertical slot = 0.3 + 0.2 = 0.5.
  assert.deepEqual(frames.get('block').origin, { x: 1.732, y: 1.875, z: -3 });
  // Entity path: same rule (recordForEntityPart scales lift/localPos by itemScale).
  const framesE = nodeWorldFramesForEntity(lifted, { color: 0xffffff }, POS);
  assert.deepEqual(framesE.get('block').origin, { x: 1.732, y: 1.875, z: -3 });
  // A lift-only root sits at its lift height too (the snowperson case).
  const liftOnly = normalizeDescriptor({
    id: 'lift-only',
    kind: 'feature',
    displayName: 'Lift Only',
    schemaVersion: 3,
    placement: { mode: 'center' },
    size: { min: 1, max: 1 },
    parts: [{ id: 'orb', shape: 'sphere', transform: { lift: 0.45 } }],
  });
  const framesL = nodeWorldFrames(liftOnly, TILE, POS);
  // sphere radius 0.3 → base 0.3 → record y = 1.55; + lift 0.45 → 2.0.
  assert.deepEqual(framesL.get('orb').origin, { x: 1.732, y: 2.0, z: -3 });
});

test('parentRot carries the accumulated ancestor rotation (gizmo delta conversion)', () => {
  const rotated = normalizeDescriptor({
    id: 'rotated-frame',
    kind: 'feature',
    displayName: 'Rotated Frame',
    schemaVersion: 3,
    placement: { mode: 'center' },
    size: { min: 1, max: 1 },
    parts: [
      {
        id: 'g',
        transform: { localPos: { x: 0, y: 0.5, z: 0 }, rotY: Math.PI / 2 },
        children: [{ id: 'leaf', shape: 'box' }],
      },
    ],
  });
  const frames = nodeWorldFrames(rotated, TILE, POS);
  // R_y(π/2), col-major: [0,0,-1; 0,1,0; 1,0,0] — the group's own rotation,
  // so a drag delta converts as deltaLocal = R_parentᵀ · deltaWorld.
  expectMatrix(frames.get('leaf').parentRot, [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1]);
  expectMatrix(frames.get('g').parentRot, IDENTITY_MATRIX);
});

test('entity path: groups compose baked matrices with the same frame math', () => {
  const entity = { color: 0xffffff }; // no entity.scale → itemScale = descriptor.scale = 1
  const records = recordsForEntity(GROUPED, entity, POS);
  assert.equal(records.length, 2);
  assert.deepEqual(records.map((r) => r.partId), ['base', 'lid-board']);
  assert.deepEqual(records[1].matrix, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1.732, 1.775, -2.75, 1]);
  // nodeWorldFramesForEntity exposes the group hinge for the editor too.
  const frames = nodeWorldFramesForEntity(GROUPED, entity, POS);
  assert.deepEqual([...frames.keys()].sort(), ['base', 'lid', 'lid-board']);
  assert.deepEqual(frames.get('lid').origin, { x: 1.732, y: 1.75, z: -3 });
});
