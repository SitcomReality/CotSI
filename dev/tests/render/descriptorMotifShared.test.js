/**
 * descriptorMotifShared.test.js — The shared motif library reference model
 * (data/motifs + `motif: '<id>'` decor references).
 *
 * Pins the behaviors that make "author geometry once, reference from many
 * terrains" safe:
 *   - a `{ motif: 'log', ... }` ref normalizes to geometry EQUAL to the library;
 *   - an untouched ref denormalizes BACK to reference form (dedupe preserved);
 *   - a ref whose geometry is edited in a decor denormalizes to a LOCAL
 *     override (still tagged `motif`, parts kept — no silent data loss);
 *   - forest & deepWood render the SAME painforest part ids (dedupe proven);
 *   - per-terrain weight/biomeWeight/size overrides survive the round-trip;
 *   - validation accepts refs, rejects an unknown library id, and still
 *     requires inline motifs to carry parts.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeDescriptor,
  denormalizeDescriptor,
  validateDescriptor,
} from '../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { sharedPartsFor } from '../../../src/render/hexmap3d/worldObjects/descriptors/descriptorNormalize.js';
import { motifById } from '../../../src/render/hexmap3d/worldObjects/descriptors/data/motifs/index.js';
import { ALL_DESCRIPTORS } from '../../../src/render/hexmap3d/worldObjects/descriptors/data/index.js';

const POS = { x: 0, y: 0, z: 0 };

/** A tiny decor that references the shared `log` motif. */
const LOG_DECOR = {
  schemaVersion: 7,
  id: 'shared-log-decor',
  kind: 'decor',
  displayName: 'Shared Log Decor',
  cluster: { min: 1, max: 1 },
  motifs: [
    { motif: 'log', weight: 0.06, biomeWeight: { biome_tundra: 0.8 } },
  ],
};

test('library is registered and each motif has an id + parts', () => {
  for (const id of ['log', 'gnarledTree']) {
    const m = motifById(id);
    assert.ok(m, `motif "${id}" missing from library`);
    assert.equal(m.id, id);
    assert.ok(Array.isArray(m.parts) && m.parts.length > 0, `${id} has parts`);
  }
});

test('a motif ref normalizes to geometry equal to the library parts', () => {
  const d = normalizeDescriptor(LOG_DECOR);
  const [entry] = d.motifs;
  assert.equal(entry.motif, 'log', 'ref marker retained');
  assert.equal(entry.id, 'log', 'normalized ref carries the library id');
  assert.deepEqual(entry.parts, sharedPartsFor('log').parts, 'materialized parts == library');
  // The library size/placement defaults are inherited when the ref omits them.
  assert.deepEqual(entry.size, motifById('log').size, 'inherits library size default');
  assert.deepEqual(entry.placement, motifById('log').placement, 'inherits library placement default');
});

test('an untouched ref denormalizes BACK to reference form (dedupe preserved)', () => {
  const d = normalizeDescriptor(LOG_DECOR);
  const minimal = denormalizeDescriptor(d);
  const [entry] = minimal.motifs;
  assert.equal(entry.motif, 'log', 'stays a reference');
  assert.equal(entry.id, undefined, 'no redundant id on a reference');
  assert.equal(entry.parts, undefined, 'library geometry collapsed away');
  assert.deepEqual(entry.size, undefined, 'library-inherited size stripped');
  assert.deepEqual(entry.placement, undefined, 'library-inherited placement stripped');
  assert.equal(entry.weight, 0.06, 'per-terrain weight preserved');
  assert.deepEqual(entry.biomeWeight, { biome_tundra: 0.8 }, 'per-terrain biomeWeight preserved');
  // Round-trip invariant: normalize(denormalize(normalize(raw))) === normalize(raw).
  assert.deepEqual(normalizeDescriptor(minimal), d, 'reference round-trip invariant broken');
});

test('a ref whose geometry is edited in a decor denormalizes to a local override', () => {
  const d = normalizeDescriptor(LOG_DECOR);
  // "Edit" the shared geometry: recolor the first part.
  d.motifs[0].parts = d.motifs[0].parts.map((p, i) => (i === 0 ? { ...p, color: 0xff00ff } : p));
  const minimal = denormalizeDescriptor(d);
  const [entry] = minimal.motifs;
  assert.equal(entry.motif, 'log', 'origin still tagged');
  assert.ok(Array.isArray(entry.parts) && entry.parts.length > 0, 'local geometry kept, not dropped');
  assert.equal(entry.parts[0].color, 0xff00ff, 'the edit survives');
  // And it still round-trips (normalize of the override re-materializes the rest).
  assert.deepEqual(normalizeDescriptor(minimal).motifs[0].parts[0].color, 0xff00ff);
});

test('forest & deepWood both render the SAME gnarledTree part ids (dedupe)', () => {
  const forest = normalizeDescriptor(ALL_DESCRIPTORS.find((d) => d.id === 'forest'));
  const deepWood = normalizeDescriptor(ALL_DESCRIPTORS.find((d) => d.id === 'deepWood'));
  const forestP = forest.motifs.find((m) => m.motif === 'gnarledTree');
  const deepP = deepWood.motifs.find((m) => m.motif === 'gnarledTree');
  assert.ok(forestP && deepP, 'both decors reference the shared gnarledTree motif');
  assert.deepEqual(
    forestP.parts.map((p) => p.id),
    deepP.parts.map((p) => p.id),
    'both terrains resolve the same shared gnarledTree geometry',
  );
});

test('per-terrain size override survives and overrides the library default', () => {
  const withSize = normalizeDescriptor({
    ...LOG_DECOR,
    motifs: [{ motif: 'log', weight: 1, size: { min: 1.0, max: 1.4 } }],
  });
  assert.deepEqual(withSize.motifs[0].size, { min: 1.0, max: 1.4 }, 'terrain size beats library default');
  const minimal = denormalizeDescriptor(withSize);
  assert.deepEqual(minimal.motifs[0].size, { min: 1.0, max: 1.4 }, 'explicit override kept on the reference');
});

test('two decors referencing one motif do not share a mutable parts tree', () => {
  const a = normalizeDescriptor(LOG_DECOR);
  const b = normalizeDescriptor(LOG_DECOR);
  assert.notEqual(a.motifs[0].parts, b.motifs[0].parts, 'different arrays');
  a.motifs[0].parts[0].color = 0x123456;
  assert.notEqual(b.motifs[0].parts[0].color, 0x123456, 'editing one decor must not leak into another');
  assert.notEqual(a.motifs[0].parts[0], b.motifs[0].parts[0], 'no shared part nodes');
});

test('validation accepts refs; rejects unknown library ids; inline still needs parts', () => {
  assert.deepEqual(validateDescriptor(LOG_DECOR), [], 'a valid reference decor passes');
  const badRef = normalizeDescriptor({ ...LOG_DECOR, motifs: [{ motif: 'nope', weight: 1 }] });
  assert.ok(validateDescriptor(badRef).some((e) => /unknown shared motif/.test(e)), 'unknown id rejected');
  const inlineNoParts = normalizeDescriptor({ ...LOG_DECOR, motifs: [{ id: 'x', weight: 1 }] });
  assert.ok(validateDescriptor(inlineNoParts).some((e) => /parts: required/.test(e)), 'inline still requires parts');
});
