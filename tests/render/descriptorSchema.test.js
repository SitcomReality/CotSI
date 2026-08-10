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
  shapeBaseOffset,
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
  parts: [
    {
      id: 'tuft',
      shape: 'cone',
      params: { bottomR: 0.04, height: 0.06, radialSegs: 3, heightSegs: 1 },
      transform: { y: 0, lift: 0.03, scaleXZ: 1, scaleY: 1 },
      color: 0x4a7a3a,
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
    schemaVersion: 3, // current convention — no legacy grounding migration
    parts: [{ id: 'p', shape: 'sphere' }],
  });
  assert.equal(normalized.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(normalized.cluster, { min: 1, max: 1, rule: 'uniform' }); // default = single item
  assert.deepEqual(normalized.size, { min: 1, max: 1 });    // default = no size variation
  assert.deepEqual(normalized.emphasis, { behavior: 'none' });
  assert.deepEqual(normalized.material, {}); // v4: no object-level base color
  assert.equal(normalized.scale, 1);
  // Shape params seeded from the registry defaults.
  assert.deepEqual(normalized.parts[0].params, {
    radius: 0.3, wSegs: 6, hSegs: 4,
    phiStart: 0, phiLength: Math.PI * 2, thetaStart: 0, thetaLength: Math.PI,
  });
  // Transform defaults filled.
  assert.deepEqual(normalized.parts[0].transform, { y: 0, lift: 0, rotY: 0, scaleX: 1, scaleY: 1, scaleZ: 1 });
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
  // x/y/z are the canonical axes (xz is the accepted legacy alias).
  assert.ok(validateDescriptor({ ...ok, parts: [{ id: 'p', shape: 'sphere', stretch: { z: { min: 1, max: 2 } } }] }).length === 0);
  assert.ok(validateDescriptor({ ...ok, parts: [{ id: 'p', shape: 'sphere', stretch: { x: false } }] }).length === 0);
  assert.ok(validateDescriptor({ ...ok, parts: [{ id: 'p', shape: 'sphere', stretch: { w: false } }] }).length > 0);
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

test('normalizeDescriptor resolves legacy scaleXZ/stretchXZ into independent axes', () => {
  const legacy = normalizeDescriptor({
    id: 'legacy-scaled',
    kind: 'feature',
    displayName: 'Legacy Scaled',
    schemaVersion: 3, // scaleXZ resolution is unconditional; skip the v3 grounding migration
    variation: { stretchY: [0.85, 1.3], stretchXZ: [0.9, 1.15] },
    parts: [
      { id: 'p', shape: 'box', transform: { scaleXZ: 1.6 } },
      { id: 'q', shape: 'box', transform: { scaleXZ: 1.6, scaleX: 2 }, stretch: { y: { min: 0.9, max: 1.2 }, xz: false } },
    ],
  });
  // transform.scaleXZ → scaleX + scaleZ; an explicit scaleX wins.
  assert.deepEqual(legacy.parts[0].transform, { y: 0, lift: 0, rotY: 0, scaleX: 1.6, scaleY: 1, scaleZ: 1.6 });
  assert.equal(legacy.parts[1].transform.scaleX, 2);
  assert.equal(legacy.parts[1].transform.scaleZ, 1.6);
  assert.ok(!('scaleXZ' in legacy.parts[0].transform));
  // variation.stretchXZ → stretchX + stretchZ (explicit per-axis ranges win).
  assert.deepEqual(legacy.variation, { stretchY: [0.85, 1.3], stretchX: [0.9, 1.15], stretchZ: [0.9, 1.15], colorJitter: 0 });
  // part.stretch.xz → x + z (false pins both).
  assert.deepEqual(legacy.parts[1].stretch, { y: { min: 0.9, max: 1.2 }, x: false, z: false });
  assert.deepEqual(validateDescriptor(legacy), []);
});

test('independent per-axis transform scales validate', () => {
  const d = normalizeDescriptor({
    id: 'stretched',
    kind: 'feature',
    displayName: 'Stretched',
    parts: [{ id: 'p', shape: 'cube', transform: { scaleX: 2, scaleZ: 0.5 } }],
  });
  assert.deepEqual(validateDescriptor(d), []);
  assert.equal(d.parts[0].transform.scaleX, 2);
  assert.equal(d.parts[0].transform.scaleZ, 0.5);
  assert.ok(validateDescriptor({ ...d, parts: [{ id: 'p', shape: 'cube', transform: { scaleX: 0 } }] }).length > 0);
});

// ── Bottom-anchored grounding (v3): shapeBaseOffset + legacy migration ───────

test('shapeBaseOffset is half the vertical extent for centered primitives', () => {
  // cylinder / cone / box / cube: half the vertical dimension.
  assert.equal(shapeBaseOffset('cylinder', { height: 0.4 }), 0.2);
  assert.equal(shapeBaseOffset('cone', { height: 0.72 }), 0.36);
  assert.equal(shapeBaseOffset('box', { height: 0.05 }), 0.025);
  assert.equal(shapeBaseOffset('cube', { size: 0.3 }), 0.15);
  // torus / polyhedra: lowest vertex below the origin at the tube / radius.
  assert.equal(shapeBaseOffset('torus', { tube: 0.02 }), 0.02);
  assert.equal(shapeBaseOffset('dodecahedron', { radius: 0.08 }), 0.08);
  assert.equal(shapeBaseOffset('octahedron', { radius: 0.2 }), 0.2);
  // Bottom-anchored bespoke geometries sit on y=0 already.
  assert.equal(shapeBaseOffset('mountain', { variant: 'classic' }), 0);
  assert.equal(shapeBaseOffset('lathe', {}), 0);
});

test('shapeBaseOffset is theta-aware for spheres', () => {
  // Full sphere: lowest vertex at the south pole (y = -r).
  assert.equal(shapeBaseOffset('sphere', { radius: 0.3 }), 0.3);
  // Top hemisphere (the hill mound): lowest vertex at the equator (y = 0 —
  // cos(π/2) is 6e-17, so compare within float tolerance).
  assert.ok(Math.abs(shapeBaseOffset('sphere', { radius: 0.42, thetaLength: Math.PI / 2 })) < 1e-9);
  // Partial sweep stopping short of the south pole: lowest vertex at
  // r·cos(thetaEnd) — positive when thetaEnd < π/2, negative below it.
  const partial = shapeBaseOffset('sphere', { radius: 0.16, thetaLength: 0.55 * Math.PI });
  assert.ok(Math.abs(partial - 0.16 * -Math.cos(0.55 * Math.PI)) < 1e-9);
  // Spheroid is a stretchable sphere — same rule (full sphere here).
  assert.equal(shapeBaseOffset('spheroid', { radius: 0.3 }), 0.3);
});

test('pre-v3 descriptors migrate transform.y to the bottom-anchored convention', () => {
  // v1 cylinder (default height 0.4): transform y encoded the part's CENTER
  // height. Migration subtracts base (0.2) × scaleY — the exact term the record
  // path bakes back in — so y=0.3 → 0.1, position-preserving at scale 1.
  const legacy = normalizeDescriptor({
    id: 'legacy-grounding',
    kind: 'feature',
    displayName: 'Legacy Grounding',
    parts: [
      { id: 'p', shape: 'cylinder', transform: { y: 0.3, lift: 0.1, scaleY: 1 } },
    ],
  });
  assert.equal(legacy.schemaVersion, SCHEMA_VERSION);
  assert.ok(Math.abs(legacy.parts[0].transform.y - 0.1) < 1e-9);
  // lift / localPos are pure offsets in the bottom-anchored convention — untouched.
  assert.equal(legacy.parts[0].transform.lift, 0.1);
  // A per-part scaleY scales the base offset with it (the tall trunk rule).
  const scaled = normalizeDescriptor({
    id: 'legacy-scaled-grounding',
    kind: 'feature',
    displayName: 'Legacy Scaled Grounding',
    parts: [
      { id: 'p', shape: 'sphere', params: { radius: 0.3 }, transform: { y: 0.7, scaleY: 2 } },
    ],
  });
  assert.ok(Math.abs(scaled.parts[0].transform.y - (0.7 - 0.3 * 2)) < 1e-9);
  // localPos.y stays as authored.
  const local = normalizeDescriptor({
    id: 'legacy-local-grounding',
    kind: 'feature',
    displayName: 'Legacy Local Grounding',
    parts: [
      { id: 'p', shape: 'cone', transform: { localPos: { x: 0.5, y: 0.4, z: 0.25 } } },
    ],
  });
  assert.equal(local.parts[0].transform.localPos.x, 0.5);
  assert.equal(local.parts[0].transform.localPos.y, 0.4);
  assert.equal(local.parts[0].transform.localPos.z, 0.25);
});

test('grounding migration is idempotent and never re-runs on v3 documents', () => {
  const legacy = {
    id: 'legacy-grove',
    kind: 'decor',
    displayName: 'Legacy Grove',
    parts: [
      { id: 'trunk', shape: 'cylinder', transform: { lift: 0.16 } },
      { id: 'canopy', shape: 'sphere', params: { radius: 0.3 }, transform: { lift: 0.5 } },
    ],
  };
  const once = normalizeDescriptor(legacy);
  // The authored center height (lift only) becomes a negative bottom y equal to
  // the shape base, with lift preserved — so the render is unchanged at scale 1.
  assert.equal(once.parts[0].transform.y, -0.2);
  assert.equal(once.parts[0].transform.lift, 0.16);
  assert.equal(once.parts[1].transform.y, -0.3);
  assert.equal(once.parts[1].transform.lift, 0.5);
  // Re-normalizing the migrated document (now schemaVersion 3) changes nothing.
  assert.deepEqual(normalizeDescriptor(once), once);
});

// ── v4: per-part colors ─────────────────────────────────────────────────────

test('v3 material.color is pushed into parts lacking a color and dropped', () => {
  const v3 = {
    schemaVersion: 3,
    id: 'v3color',
    kind: 'feature',
    displayName: 'V3 Color',
    material: { color: 0x8b5e3c },
    parts: [
      { id: 'trunk', shape: 'cylinder' },
      { id: 'canopy', shape: 'sphere', color: 0x3cb371 }, // explicit color wins
    ],
    variants: [
      { id: 'tall', parts: [{ id: 'trunk', shape: 'cylinder' }] },
    ],
  };
  const n = normalizeDescriptor(v3);
  assert.equal(n.schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(n.material, {}, 'object material keeps no base color');
  assert.equal(n.parts[0].color, 0x8b5e3c, 'colorless part inherits the material color');
  assert.equal(n.parts[1].color, 0x3cb371, 'explicit part color wins over the push');
  assert.equal(n.variants[0].parts[0].color, 0x8b5e3c, 'variant parts get the push too');
  assert.deepEqual(validateDescriptor(n), []);
});

test('v3 materialColor merges into color; a literal color wins', () => {
  const v3 = {
    schemaVersion: 3,
    id: 'v3mat',
    kind: 'feature',
    displayName: 'V3 Material Color',
    parts: [
      { id: 'head', shape: 'sphere', materialColor: 0xffe8c8 },
      { id: 'body', shape: 'cylinder', materialColor: 0x224466, color: 0x112233 },
    ],
  };
  const n = normalizeDescriptor(v3);
  assert.equal(n.parts[0].color, 0xffe8c8, 'materialColor migrates into color');
  assert.equal(n.parts[1].color, 0x112233, 'an explicit color beats materialColor');
  assert.ok(!('materialColor' in n.parts[0]), 'materialColor is gone from normalized parts');
  assert.deepEqual(validateDescriptor(n), []);
});

test('v4 color migration is idempotent', () => {
  const v3 = {
    schemaVersion: 3,
    id: 'v3idem',
    kind: 'feature',
    displayName: 'V3 Idempotent',
    material: { color: 0x7c3fb1 },
    parts: [{ id: 'knot', shape: 'octahedron', materialColor: 0x7c3fb1 }],
  };
  const once = normalizeDescriptor(v3);
  assert.equal(once.parts[0].color, 0x7c3fb1);
  assert.deepEqual(normalizeDescriptor(once), once, 're-normalizing a v4 document is a no-op');
});

test('entity kinds skip the material-color push (entity color fallback stays)', () => {
  const v3 = {
    schemaVersion: 3,
    id: 'v3entity',
    kind: 'mob',
    displayName: 'V3 Entity',
    material: { color: 0xffffff },
    parts: [{ id: 'body', shape: 'sphere' }], // colorless — falls back to entity.color
  };
  const n = normalizeDescriptor(v3);
  assert.deepEqual(n.material, {});
  assert.equal(n.parts[0].color, undefined, 'entity parts never inherit the material color');
});

// ── M5 schema extensions: biomeColor + biomeScale ───────────────────────────

test('part.biomeColor validates and passes through normalization', () => {
  const ok = {
    id: 't',
    kind: 'decor',
    displayName: 'T',
    parts: [{ id: 'p', shape: 'sphere', color: 0xffffff, biomeColor: { source: 'primary', influence: 0.8 } }],
  };
  assert.deepEqual(validateDescriptor(ok), []);
  const normalized = normalizeDescriptor(ok);
  assert.deepEqual(normalized.parts[0].biomeColor, { source: 'primary', influence: 0.8 });
  assert.deepEqual(validateDescriptor(normalized), []);
  // Accent source and the influence edges (0 = default color, 1 = full tint)
  // are valid.
  assert.deepEqual(validateDescriptor({ ...ok, parts: [{ id: 'p', shape: 'sphere', biomeColor: { source: 'accent', influence: 0 } }] }), []);
  assert.deepEqual(validateDescriptor({ ...ok, parts: [{ id: 'p', shape: 'sphere', biomeColor: { source: 'accent', influence: 1 } }] }), []);
});

test('part.biomeColor rejects bad sources, out-of-range influence, and bad shapes', () => {
  const base = { id: 't', kind: 'decor', displayName: 'T', parts: [{ id: 'p', shape: 'sphere' }] };
  for (const bad of ['lime', '', 'Primary']) {
    const errors = validateDescriptor({ ...base, parts: [{ id: 'p', shape: 'sphere', biomeColor: { source: bad, influence: 0.5 } }] });
    assert.ok(errors.some((e) => e.includes('source')), `source ${JSON.stringify(bad)}`);
  }
  for (const inf of [-0.1, 1.5, 'half']) {
    const errors = validateDescriptor({ ...base, parts: [{ id: 'p', shape: 'sphere', biomeColor: { source: 'primary', influence: inf } }] });
    assert.ok(errors.length > 0, `influence ${JSON.stringify(inf)}`);
  }
  assert.ok(validateDescriptor({ ...base, parts: [{ id: 'p', shape: 'sphere', biomeColor: { source: 'primary', influence: 0.5, colour: 1 } }] })
    .some((e) => e.includes('unknown field "colour"')));
  assert.ok(validateDescriptor({ ...base, parts: [{ id: 'p', shape: 'sphere', biomeColor: 'purple' }] }).length > 0);
});

test('part.biomeScale validates per-biome factors and passes through', () => {
  const ok = {
    id: 's',
    kind: 'decor',
    displayName: 'S',
    parts: [{ id: 'p', shape: 'sphere', biomeScale: { biome_tundra: 0.85, biome_edenfall: 1.1 } }],
  };
  assert.deepEqual(validateDescriptor(ok), []);
  assert.deepEqual(normalizeDescriptor(ok).parts[0].biomeScale, { biome_tundra: 0.85, biome_edenfall: 1.1 });
  for (const bad of [0, -1, 'big']) {
    const errors = validateDescriptor({ ...ok, parts: [{ id: 'p', shape: 'sphere', biomeScale: { biome_tundra: bad } }] });
    assert.ok(errors.length > 0, `factor ${JSON.stringify(bad)}`);
  }
  assert.ok(validateDescriptor({ ...ok, parts: [{ id: 'p', shape: 'sphere', biomeScale: 'all' }] }).length > 0);
});

// ── Nested part groups (schema v5) ──────────────────────────────────────────

/** A minimal grouped descriptor: a root leaf + a group with two nested leaves. */
const GROUPED = {
  id: 'grouped',
  kind: 'feature',
  displayName: 'Grouped',
  schemaVersion: 3,
  parts: [
    { id: 'base', shape: 'box' },
    {
      id: 'lid',
      transform: {
        localPos: { x: 0, y: 0.15, z: 0.125 },
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: -1.4,
      },
      children: [
        { id: 'lid-board', shape: 'box', params: { width: 0.35, height: 0.08, depth: 0.25 }, transform: { localPos: { x: 0, y: 0, z: -0.125 } } },
        { id: 'lid-strap', shape: 'box', transform: { localPos: { x: -0.12, y: 0, z: -0.125 } } },
      ],
    },
  ],
};

test('a group descriptor validates clean', () => {
  assert.deepEqual(validateDescriptor(GROUPED), []);
  assert.deepEqual(validateDescriptor(normalizeDescriptor(GROUPED)), []);
});

test('a node is a leaf OR a group: shape+children, empty children, non-array children rejected', () => {
  const withShape = { ...GROUPED, parts: [{ id: 'g', shape: 'box', children: [{ id: 'c', shape: 'sphere' }] }] };
  assert.ok(validateDescriptor(withShape).some((e) => e.includes('groups have no shape')), 'group with shape rejected');
  const withParams = { ...GROUPED, parts: [{ id: 'g', params: { width: 1 }, children: [{ id: 'c', shape: 'sphere' }] }] };
  assert.ok(validateDescriptor(withParams).some((e) => e.includes('groups have no params')), 'group with params rejected');
  const badChildren = { ...GROUPED, parts: [{ id: 'g', shape: 'box', children: 'nope' }] };
  assert.ok(validateDescriptor(badChildren).some((e) => e.includes('children must be an array')), 'leaf with children array rejected');
  const empty = { ...GROUPED, parts: [{ id: 'g', children: [] }] };
  assert.ok(validateDescriptor(empty).some((e) => e.includes('at least one child')), 'empty group rejected');
});

test('nested y/lift/tilt fields are rejected (root-only grounding)', () => {
  for (const bad of [
    { id: 'g', children: [{ id: 'c', shape: 'sphere', transform: { y: 1 } }] },
    { id: 'g', children: [{ id: 'c', shape: 'sphere', transform: { lift: 0.2 } }] },
    { id: 'g', children: [{ id: 'c', shape: 'sphere', transform: { tiltAxis: { x: 1, z: 0 }, tilt: 0.1 } }] },
    { id: 'g', transform: { lift: 0.2 }, children: [{ id: 'c', shape: 'sphere' }] }, // groups are never grounded either
  ]) {
    const errors = validateDescriptor({ ...GROUPED, parts: [bad] });
    assert.ok(errors.some((e) => e.includes('only root parts may set')), JSON.stringify(bad));
  }
  // The same fields stay valid on a root leaf.
  const rootLeaf = { ...GROUPED, parts: [{ id: 'root', shape: 'sphere', transform: { y: 1, lift: 0.2, tiltAxis: { x: 1, z: 0 }, tilt: 0.1 } }] };
  assert.deepEqual(validateDescriptor(rootLeaf), []);
});

test('groups reject color/stretch/biome fields (no geometry of their own)', () => {
  for (const extra of [
    { color: 0xff0000 },
    { stretch: { y: { min: 1, max: 1 } } },
    { biomeColor: { source: 'primary', influence: 0.5 } },
    { biomeScale: { biome_tundra: 0.85 } },
  ]) {
    const bad = { ...GROUPED, parts: [{ id: 'g', ...extra, children: [{ id: 'c', shape: 'sphere' }] }] };
    const errors = validateDescriptor(bad);
    assert.ok(errors.some((e) => e.includes('groups have no')), JSON.stringify(extra));
  }
});

test('duplicate part ids are rejected across nesting depth', () => {
  const dup = {
    ...GROUPED,
    parts: [
      { id: 'base', shape: 'box' },
      { id: 'lid', children: [{ id: 'base', shape: 'sphere' }] }, // collides with the root leaf
    ],
  };
  assert.ok(validateDescriptor(dup).some((e) => e.includes('duplicate part id "base"')));
  // Two leaves in different sibling groups also collide (records key by partId).
  const dupSiblings = {
    ...GROUPED,
    parts: [
      { id: 'a', children: [{ id: 'shared', shape: 'sphere' }] },
      { id: 'b', children: [{ id: 'shared', shape: 'box' }] },
    ],
  };
  assert.ok(validateDescriptor(dupSiblings).some((e) => e.includes('duplicate part id "shared"')));
});

test('normalize fills nested defaults recursively (nested set: no y/lift)', () => {
  const d = normalizeDescriptor(GROUPED);
  const [base, lid] = d.parts;
  const [board, strap] = lid.children;
  // Root leaf keeps the full root transform defaults.
  assert.deepEqual(base.transform, { y: 0, lift: 0, rotY: 0, scaleX: 1, scaleY: 1, scaleZ: 1 });
  // The group itself uses the nested set (groups are never grounded).
  assert.deepEqual(lid.transform, {
    rotY: 0, scaleX: 1, scaleY: 1, scaleZ: 1,
    localPos: { x: 0, y: 0.15, z: 0.125 },
    localAxis: { x: 1, y: 0, z: 0 },
    localAngle: -1.4,
  });
  // Nested leaves get the nested defaults — no y/lift appear.
  assert.deepEqual(strap.transform, {
    rotY: 0, scaleX: 1, scaleY: 1, scaleZ: 1,
    localPos: { x: -0.12, y: 0, z: -0.125 },
  });
  assert.deepEqual(board.transform, { rotY: 0, scaleX: 1, scaleY: 1, scaleZ: 1, localPos: { x: 0, y: 0, z: -0.125 } });
  assert.equal(d.schemaVersion, SCHEMA_VERSION);
  // Idempotence and JSON roundtrip keep the tree.
  assert.deepEqual(normalizeDescriptor(d), d, 'normalize is idempotent with groups');
  assert.deepEqual(normalizeDescriptor(JSON.parse(JSON.stringify(d))), d, 'JSON roundtrip keeps groups');
});

test('normalize folds stale root-only fields off groups and nested nodes', () => {
  // A root group carrying y/lift/tilt (written by a pre-fix editor session
  // that exposed the root-only fields on groups) folds into the nested field
  // set: y + lift land in localPos.y (the render never read them on a group,
  // so the folded localPos carries the intended height), the lean is dropped
  // (no nested expression), and the result validates clean.
  const stale = normalizeDescriptor({
    ...GROUPED,
    parts: [
      { id: 'base', shape: 'box' },
      {
        id: 'lid',
        transform: {
          y: 0.5,
          lift: 0.25,
          localPos: { x: 0, y: 0.125, z: 0.125 },
          tiltAxis: { x: 1, z: 0 },
          tilt: 0.3,
        },
        children: [{ id: 'c', shape: 'sphere' }],
      },
    ],
  });
  const lid = stale.parts[1];
  assert.equal(lid.transform.y, undefined);
  assert.equal(lid.transform.lift, undefined);
  assert.equal(lid.transform.tilt, undefined);
  assert.equal(lid.transform.tiltAxis, undefined);
  assert.deepEqual(lid.transform.localPos, { x: 0, y: 0.875, z: 0.125 });
  assert.deepEqual(validateDescriptor(stale), []);

  // Nested leaves fold the same way — their bottom (y + lift + localPos.y)
  // stays put in the parent frame.
  const nested = normalizeDescriptor({
    ...GROUPED,
    parts: [{ id: 'g', children: [{ id: 'c', shape: 'sphere', transform: { y: 0.5, lift: 0.25 } }] }],
  });
  assert.deepEqual(nested.parts[0].children[0].transform.localPos, { x: 0, y: 0.75, z: 0 });
  assert.deepEqual(validateDescriptor(nested), []);

  // Idempotent: re-normalizing the folded result is a no-op.
  assert.deepEqual(normalizeDescriptor(stale), stale);
  assert.deepEqual(normalizeDescriptor(nested), nested);
});
