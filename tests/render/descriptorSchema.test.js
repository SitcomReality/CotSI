/**
 * descriptorSchema.test.js — Descriptor schema: validation, normalization,
 * and JSON roundtrip (src/render/hexmap3d/features/descriptors/schema.js).
 * Pure data + pure functions, no THREE.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHAPE_TYPES,
  OBJECT_KINDS,
  EMPHASIS_BEHAVIORS,
  PLACEMENT_MODES,
  VARIANT_RULES,
  SCHEMA_VERSION,
  validateDescriptor,
  validateShapeParams,
  normalizeDescriptor,
} from '../../src/render/hexmap3d/features/descriptors/schema.js';

// ── Fixtures ───────────────────────────────────────────────────────────────

/** A simple single-shape feature (mirrors the Scrub Bush / FEATURE_VISUALS). */
const BUSH = {
  id: 'bush',
  kind: 'feature',
  displayName: 'Scrub Bush',
  scale: 1.5,
  size: { min: 0.8, max: 1.0 },
  placement: { mode: 'scatter', offsetMin: 0.15, offsetMax: 0.3 },
  emphasis: { behavior: 'dispersed' },
  material: { color: 0x4a7a3a },
  parts: [
    {
      id: 'tuft',
      shape: 'cone',
      params: { bottomR: 0.04, height: 0.06, radialSegs: 3, heightSegs: 1 },
      transform: { y: 0, lift: 0.03, scaleXZ: 1, scaleY: 1 },
    },
  ],
};

/** A multi-part cluster decor (mirrors the forest grove treatment). */
const GROVE = {
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
    {
      id: 'trunk',
      shape: 'cylinder',
      params: { bottomR: 0.08, topR: 0.1, height: 0.4, segments: 6 },
      transform: { lift: 0.16 },
    },
    {
      id: 'canopy',
      shape: 'sphere',
      params: { radius: 0.3, wSegs: 6, hSegs: 4 },
      transform: { lift: 0.5 },
      color: 0x3cb371,
    },
  ],
};

// ── Shape registry ─────────────────────────────────────────────────────────

test('shape registry covers the shapes the game currently builds', () => {
  for (const type of [
    'cylinder', 'cone', 'sphere', 'spheroid', 'torus', 'box', 'cube',
    'dodecahedron', 'octahedron', 'mountain', 'lathe',
  ]) {
    assert.ok(SHAPE_TYPES[type], `missing shape type "${type}"`);
  }
  // Bespoke shapes with no editable params must still validate.
  assert.equal(validateShapeParams('mountain', { variant: 'offpeak' }).length, 0);
  assert.equal(validateShapeParams('mountain', { variant: 'flat' }).length, 1);
  assert.equal(validateShapeParams('lathe', {}).length, 0);
  // The stretchable primitives validate their params.
  assert.equal(validateShapeParams('cube', { size: 0.5 }).length, 0);
  assert.equal(validateShapeParams('cube', { size: 0 }).length, 1);
  assert.equal(validateShapeParams('spheroid', { radius: 0.4, wSegs: 8, hSegs: 4 }).length, 0);
  assert.equal(validateShapeParams('spheroid', { radius: -1 }).length, 1);
  // Legacy shape names are gone from the registry — normalizeDescriptor
  // remaps them for old JSON (see the normalization test below).
  assert.ok(!SHAPE_TYPES.knot);
  assert.ok(!SHAPE_TYPES.snowperson);
});

test('enumerations are exhaustive and frozen', () => {
  assert.deepEqual(OBJECT_KINDS, ['feature', 'decor', 'mountain', 'base', 'champion', 'mob', 'trader']);
  assert.deepEqual(EMPHASIS_BEHAVIORS, ['none', 'dispersed', 'sunk', 'hidden']);
  assert.deepEqual(PLACEMENT_MODES, ['center', 'scatter', 'ring', 'jitter']);
  assert.deepEqual(VARIANT_RULES, ['hash', 'solitary', 'cluster', 'faction', 'archetype']);
  assert.ok(Number.isInteger(SCHEMA_VERSION) && SCHEMA_VERSION >= 1);
});

// ── Validation: valid descriptors ──────────────────────────────────────────

test('valid simple feature descriptor passes', () => {
  assert.deepEqual(validateDescriptor(BUSH), []);
});

test('valid multi-part cluster decor descriptor passes', () => {
  assert.deepEqual(validateDescriptor(GROVE), []);
});

test('minimal descriptor (parts only) is valid', () => {
  const minimal = {
    id: 'foo',
    kind: 'feature',
    displayName: 'Foo',
    parts: [{ id: 'p', shape: 'sphere' }],
  };
  assert.deepEqual(validateDescriptor(minimal), []);
});

// ── Validation: error cases ────────────────────────────────────────────────

test('rejects an unknown shape', () => {
  const errors = validateDescriptor({ ...BUSH, parts: [{ id: 'p', shape: 'blob' }] });
  assert.ok(errors.some((e) => e.includes('unknown shape "blob"')));
});

test('rejects an unknown shape param', () => {
  const errors = validateDescriptor({
    ...BUSH,
    parts: [{ id: 'p', shape: 'cylinder', params: { bottomR: 1, width: 5 } }],
  });
  assert.ok(errors.some((e) => e.includes('unknown param "width"')));
});

test('rejects out-of-range shape params', () => {
  const errors = validateDescriptor({
    ...BUSH,
    parts: [{ id: 'p', shape: 'cylinder', params: { segments: 2 } }],
  });
  assert.ok(errors.some((e) => e.includes('segments') && e.includes('>= 3')));
});

test('rejects cluster min > max', () => {
  const errors = validateDescriptor({ ...BUSH, cluster: { min: 4, max: 2 } });
  assert.ok(errors.some((e) => e.includes('cluster') && e.includes('min must be <= max')));
});

test('rejects duplicate part ids', () => {
  const errors = validateDescriptor({
    ...BUSH,
    parts: [
      { id: 'dup', shape: 'sphere' },
      { id: 'dup', shape: 'sphere' },
    ],
  });
  assert.ok(errors.some((e) => e.includes('duplicate part id "dup"')));
});

test('rejects an invalid color', () => {
  for (const bad of [-1, 0x1000000, 3.5]) {
    const errors = validateDescriptor({
      ...BUSH,
      parts: [{ id: 'p', shape: 'sphere', color: bad }],
    });
    assert.ok(errors.some((e) => e.includes('color')), `expected color error for ${bad}`);
  }
});

test('rejects malformed named-color tokens and accepts well-formed ones', () => {
  for (const bad of ['has space', 'has-dash', '', '☃']) {
    const errors = validateDescriptor({
      ...BUSH,
      parts: [{ id: 'p', shape: 'sphere', color: bad }],
    });
    assert.ok(errors.some((e) => e.includes('color')), `expected color error for ${JSON.stringify(bad)}`);
  }
  // A well-formed token is valid — the entity record path resolves it from the
  // entity's `colors` map.
  assert.deepEqual(validateDescriptor({ ...BUSH, parts: [{ id: 'p', shape: 'sphere', color: 'factionBase' }] }), []);
});

test('rejects an invalid kind, missing parts, and unknown top-level fields', () => {
  assert.ok(validateDescriptor({ ...BUSH, kind: 'tree' }).some((e) => e.includes('descriptor.kind')));
  assert.ok(validateDescriptor({ ...BUSH, parts: [] }).some((e) => e.includes('parts: required')));
  assert.ok(validateDescriptor({ ...BUSH, clustre: { min: 2 } }).some((e) => e.includes('unknown field "clustre"')));
});

test('rejects bad transforms', () => {
  const bad = {
    ...BUSH,
    parts: [{ id: 'p', shape: 'sphere', transform: { scaleXZ: 0, bogus: 1 } }],
  };
  const errors = validateDescriptor(bad);
  assert.ok(errors.some((e) => e.includes('scaleXZ: must be a positive number')));
  assert.ok(errors.some((e) => e.includes('unknown field "bogus"')));
});

test('rejects duplicate variant ids', () => {
  const errors = validateDescriptor({
    ...BUSH,
    variants: [
      { id: 'a', parts: [{ id: 'p', shape: 'sphere' }] },
      { id: 'a', parts: [{ id: 'p', shape: 'cone' }] },
    ],
  });
  assert.ok(errors.some((e) => e.includes('duplicate variant id "a"')));
});

// ── Normalization ──────────────────────────────────────────────────────────

test('normalizeDescriptor fills every optional default', () => {
  const normalized = normalizeDescriptor({
    id: 'foo',
    kind: 'feature',
    displayName: 'Foo',
    parts: [{ id: 'p', shape: 'sphere' }],
  });
  assert.equal(normalized.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(normalized.cluster, { min: 1, max: 1, rule: 'uniform' }); // default = single item
  assert.deepEqual(normalized.size, { min: 1, max: 1 });    // default = no size variation
  assert.deepEqual(normalized.emphasis, { behavior: 'none' });
  assert.deepEqual(normalized.material, { color: 0xffffff });
  assert.equal(normalized.scale, 1);
  // Shape params seeded from the registry defaults.
  assert.deepEqual(normalized.parts[0].params, {
    radius: 0.3, wSegs: 6, hSegs: 4,
    phiStart: 0, phiLength: Math.PI * 2, thetaStart: 0, thetaLength: Math.PI,
  });
  // Transform defaults filled.
  assert.deepEqual(normalized.parts[0].transform, { y: 0, lift: 0, rotY: 0, scaleXZ: 1, scaleY: 1 });
});

test('normalizeDescriptor fills per-mode placement fields', () => {
  assert.deepEqual(
    normalizeDescriptor({ ...BUSH, placement: { mode: 'scatter' } }).placement,
    { mode: 'scatter', offsetMin: 0.15, offsetMax: 0.3 },
  );
  assert.deepEqual(
    normalizeDescriptor({ ...GROVE, placement: { mode: 'ring' } }).placement,
    { mode: 'ring', ringMin: 0.18, ringMax: 0.55, leanMin: 0.045, leanMax: 0.12 },
  );
  assert.deepEqual(
    normalizeDescriptor({ ...BUSH, placement: { mode: 'center' } }).placement,
    { mode: 'center' },
  );
});

test('normalizeDescriptor is idempotent', () => {
  const once = normalizeDescriptor(BUSH);
  assert.deepEqual(normalizeDescriptor(once), once);
  const groveOnce = normalizeDescriptor(GROVE);
  assert.deepEqual(normalizeDescriptor(groveOnce), groveOnce);
});

test('normalized valid descriptors validate clean', () => {
  assert.deepEqual(validateDescriptor(normalizeDescriptor(BUSH)), []);
  assert.deepEqual(validateDescriptor(normalizeDescriptor(GROVE)), []);
});

test('JSON roundtrip preserves the normalized descriptor', () => {
  for (const fixture of [BUSH, GROVE]) {
    const normalized = normalizeDescriptor(fixture);
    const roundtrip = normalizeDescriptor(JSON.parse(JSON.stringify(normalized)));
    assert.deepEqual(roundtrip, normalized, `roundtrip mismatch for ${fixture.id}`);
  }
});

// ── M4 schema extensions: moisture cluster, jitter placement, stretch ───────

test('moisture cluster validates and normalizes its defaults', () => {
  const grove = normalizeDescriptor({
    id: 'grove-m',
    kind: 'decor',
    displayName: 'Grove',
    cluster: { rule: 'moisture' },
    parts: [{ id: 'trunk', shape: 'cylinder' }],
  });
  assert.deepEqual(validateDescriptor(grove), []);
  assert.equal(grove.cluster.rule, 'moisture');
  assert.deepEqual(grove.cluster.countsByTerrain, { forest: [3, 5], denseForest: [4, 7] });
  assert.deepEqual(grove.cluster.densityRange, [0.55, 0.85]);
  assert.equal(grove.cluster.jitter, 1);
});

test('moisture cluster rejects bad counts and ranges', () => {
  const base = { id: 'g', kind: 'decor', displayName: 'G', cluster: { rule: 'moisture' }, parts: [{ id: 'p', shape: 'sphere' }] };
  assert.ok(validateDescriptor({ ...base, cluster: { rule: 'moisture', countsByTerrain: { forest: [5, 3] } } }).length > 0);
  assert.ok(validateDescriptor({ ...base, cluster: { rule: 'moisture', countsByTerrain: { forest: [0, 4] } } }).length > 0);
  assert.ok(validateDescriptor({ ...base, cluster: { rule: 'moisture', countsByTerrain: { forest: 'many' } } }).length > 0);
  assert.ok(validateDescriptor({ ...base, cluster: { rule: 'moisture', densityRange: [0.8, 0.5] } }).length > 0);
  assert.ok(validateDescriptor({ ...base, cluster: { rule: 'moisture', jitter: -1 } }).length > 0);
  assert.ok(validateDescriptor({ ...base, cluster: { rule: 'weird' } }).length > 0);
});

test('jitter placement validates and normalizes its defaults', () => {
  const tree = normalizeDescriptor({
    id: 'tree-j',
    kind: 'feature',
    displayName: 'Tree',
    placement: { mode: 'jitter' },
    parts: [{ id: 'p', shape: 'sphere' }],
  });
  assert.deepEqual(validateDescriptor(tree), []);
  assert.equal(tree.placement.offset, 0.08);
  assert.equal(tree.placement.tiltSeed, 1);
  const bad = { id: 't', kind: 'feature', displayName: 'T', placement: { mode: 'jitter', offset: -1 }, parts: [{ id: 'p', shape: 'sphere' }] };
  assert.ok(validateDescriptor(bad).length > 0);
});

test('part.stretch validates ranges and axes', () => {
  const ok = {
    id: 's',
    kind: 'feature',
    displayName: 'S',
    parts: [{ id: 'p', shape: 'sphere', stretch: { y: { min: 0.9, max: 1.2, seed: 6 }, xz: false } }],
  };
  assert.deepEqual(validateDescriptor(ok), []);
  assert.ok(validateDescriptor({ ...ok, parts: [{ id: 'p', shape: 'sphere', stretch: { y: { min: 1.2, max: 0.9 } } }] }).length > 0);
  assert.ok(validateDescriptor({ ...ok, parts: [{ id: 'p', shape: 'sphere', stretch: { z: false } }] }).length > 0);
  assert.ok(validateDescriptor({ ...ok, parts: [{ id: 'p', shape: 'sphere', stretch: { y: { min: 1, max: 2, seed: -1 } } }] }).length > 0);
  assert.ok(validateDescriptor({ ...ok, parts: [{ id: 'p', shape: 'sphere', materialColor: 0xffffff }] }).length === 0);
  assert.ok(validateDescriptor({ ...ok, parts: [{ id: 'p', shape: 'sphere', materialColor: 0x1000000 }] }).length > 0);
});

test('variantRule accepts only known rules and normalizes to hash', () => {
  const d = normalizeDescriptor({
    id: 'v',
    kind: 'feature',
    displayName: 'V',
    parts: [{ id: 'p', shape: 'sphere' }],
    variants: [{ id: 'a', parts: [{ id: 'p', shape: 'sphere' }] }],
  });
  assert.equal(d.variantRule, 'hash');
  assert.ok(validateDescriptor({ ...d, variantRule: 'solitary' }).length === 0);
  assert.ok(validateDescriptor({ ...d, variantRule: 'cluster' }).length === 0);
  assert.ok(validateDescriptor({ ...d, variantRule: 'terrain' }).length > 0);
});

test('normalizeDescriptor remaps legacy shape names (knot → octahedron, snowperson → lathe)', () => {
  const legacy = {
    id: 'legacy',
    kind: 'feature',
    displayName: 'Legacy',
    parts: [{ id: 'a', shape: 'knot', params: {} }],
    variants: [{ id: 'v', parts: [{ id: 'b', shape: 'snowperson', params: {} }] }],
  };
  const normalized = normalizeDescriptor(legacy);
  assert.equal(normalized.parts[0].shape, 'octahedron');
  // Params seeded from the octahedron registry defaults (the knot shape was
  // always an octahedron at KNOT_RADIUS = 0.2).
  assert.deepEqual(normalized.parts[0].params, { radius: 0.2, detail: 0 });
  assert.equal(normalized.variants[0].parts[0].shape, 'lathe');
  assert.deepEqual(validateDescriptor(normalized), []);
  // The strict validator still rejects the legacy names — remapping happens
  // only in normalizeDescriptor (old JSON is normalized before validation).
  assert.ok(validateDescriptor({ ...BUSH, parts: [{ id: 'p', shape: 'knot' }] }).some((e) => e.includes('unknown shape "knot"')));
  assert.ok(validateDescriptor({ ...BUSH, parts: [{ id: 'p', shape: 'snowperson' }] }).some((e) => e.includes('unknown shape "snowperson"')));
});
