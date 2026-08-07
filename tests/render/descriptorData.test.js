/**
 * descriptorData.test.js — Migrated descriptor data coverage and golden
 * snapshots (src/render/hexmap3d/features/descriptors/data/).
 *
 * Every migrated object must validate, round-trip through JSON, and produce
 * deterministic records that exactly match the committed golden snapshot
 * (tests/render/fixtures/descriptorData.snap.json) — the descriptor→record
 * determinism guarantee the completion criteria require.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeDescriptor, validateDescriptor } from '../../src/render/hexmap3d/features/descriptors/schema.js';
import { recordsForDescriptor } from '../../src/render/hexmap3d/features/descriptors/recordBuilder.js';
import { ALL_DESCRIPTORS } from '../../src/render/hexmap3d/features/descriptors/data/index.js';
import { DISPERSED_SCALE, dispersedRingOffsets, dispersedSingleOffset } from '../../src/render/hexmap3d/features/decorEmphasis.js';

const POS = { x: 1.732, y: 1.25, z: -3.0 };
const TILES = {
  grove: { q: 3, r: -2, terrain: 'forest', moisture: 0.8 },
  hill: { q: 3, r: -2, terrain: 'hill' },
  mountain: { q: 3, r: -2, terrain: 'mountain', mountainType: 'peak' },
};
const tileFor = (d) => TILES[d.id] ?? { q: 3, r: -2, terrain: 'plains' };

// ── Coverage ────────────────────────────────────────────────────────────────

test('data covers every FEATURE_VISUALS kind plus decor/mountain/knot content', () => {
  const ids = new Set(ALL_DESCRIPTORS.map((d) => d.id));
  const expectedSimple = [
    'chest', 'bush', 'palimpsestSlab', 'errataSlip', 'volvelle',
    'foolsFire', 'ouroborosLoop', 'saintsRib', 'vegetableLamb', 'scoriaRose',
    'waxbloom', 'screamroot', 'nullLily', 'cinderbloom', 'gildedInitial',
    'peridexionTree', 'edenMushroom', 'listenerLichen', 'edenShroomlet',
    'witnessStone', 'drownedCopyist', 'censerSaint', 'halfDrawnObelisk',
    'snowperson',
  ];
  for (const id of expectedSimple) assert.ok(ids.has(id), `missing simple feature "${id}"`);
  for (const id of ['grove', 'tree', 'hill', 'mountain', 'knot']) {
    assert.ok(ids.has(id), `missing migrated object "${id}"`);
  }
  const kinds = new Set(ALL_DESCRIPTORS.map((d) => d.kind));
  assert.ok(kinds.has('feature') && kinds.has('decor') && kinds.has('mountain'));
});

// ── Validation + roundtrip ─────────────────────────────────────────────────

test('every migrated descriptor validates and survives a JSON roundtrip', () => {
  for (const raw of ALL_DESCRIPTORS) {
    const normalized = normalizeDescriptor(raw);
    assert.deepEqual(validateDescriptor(normalized), [], `${raw.id} invalid after normalize`);
    const roundtrip = normalizeDescriptor(JSON.parse(JSON.stringify(normalized)));
    assert.deepEqual(roundtrip, normalized, `${raw.id} roundtrip mismatch`);
    assert.equal(roundtrip.schemaVersion, normalized.schemaVersion);
  }
});

// ── Golden snapshots ───────────────────────────────────────────────────────

const SNAPSHOT = JSON.parse(readFileSync(new URL('./fixtures/descriptorData.snap.json', import.meta.url), 'utf8'));

// Entity descriptors (kind base/champion/mob/trader) are entity-driven — they
// record via recordsForEntity, not the tile path — and are snapshot-tested in
// descriptorEntity.test.js / descriptorBase.test.js.
const ENTITY_KINDS = new Set(['base', 'champion', 'mob', 'trader']);

test('descriptor→record output matches the committed golden snapshot', () => {
  const ids = new Set(ALL_DESCRIPTORS.map((d) => d.id));
  for (const id of Object.keys(SNAPSHOT)) assert.ok(ids.has(id), `snapshot has unknown id "${id}"`);
  for (const raw of ALL_DESCRIPTORS) {
    if (ENTITY_KINDS.has(raw.kind)) continue;
    const d = normalizeDescriptor(raw);
    const records = recordsForDescriptor(d, tileFor(d), POS);
    assert.deepEqual(records, SNAPSHOT[raw.id].records, `${raw.id} drifted from golden snapshot`);
  }
});

test('records are deterministic across calls', () => {
  for (const raw of ALL_DESCRIPTORS) {
    if (ENTITY_KINDS.has(raw.kind)) continue;
    const d = normalizeDescriptor(raw);
    const tile = tileFor(d);
    assert.deepEqual(recordsForDescriptor(d, tile, POS), recordsForDescriptor(d, tile, POS), `${raw.id} non-deterministic`);
  }
});

// ── Per-object sanity beyond the snapshot ──────────────────────────────────

test('simple features: one record, legacy scatter bounds', () => {
  for (const raw of ALL_DESCRIPTORS) {
    if (ENTITY_KINDS.has(raw.kind)) continue; // entity descriptors have no placement
    if (raw.placement?.mode !== 'scatter') continue; // trees use jitter placement
    const d = normalizeDescriptor(raw);
    const [record] = recordsForDescriptor(d, { q: 3, r: -2, terrain: 'plains' }, POS);
    assert.ok(record, `${raw.id} produced no records`);
    // Legacy scatter size jitter: scale = descriptor.scale × [0.8, 0.99].
    assert.ok(record.scale >= raw.scale * 0.8 - 1e-9, `${raw.id} scale ${record.scale} < ${raw.scale}*0.8`);
    assert.ok(record.scale <= raw.scale * 0.99 + 1e-9, `${raw.id} scale ${record.scale} > ${raw.scale}*0.99`);
    // Scatter offset stays within the hex (≤ 0.3).
    const dist = Math.hypot(record.x - POS.x, record.z - POS.z);
    assert.ok(dist <= 0.3 + 1e-9, `${raw.id} scatter dist ${dist}`);
  }
});

test('simple feature displacement lands on the corner anchor and shrinks', () => {
  const bush = normalizeDescriptor(ALL_DESCRIPTORS.find((d) => d.id === 'bush'));
  const { dx, dz } = dispersedSingleOffset();
  const [record] = recordsForDescriptor(bush, { q: 3, r: -2, terrain: 'plains' }, POS, undefined, { displaced: true });
  assert.ok(Math.abs(record.x - (POS.x + dx)) < 1e-9);
  assert.ok(Math.abs(record.z - (POS.z + dz)) < 1e-9);
  assert.ok(record.scale <= bush.scale * DISPERSED_SCALE + 1e-9);
});

test('grove: moisture-driven count, ring placement, dispersed ring + shrink', () => {
  const grove = normalizeDescriptor(ALL_DESCRIPTORS.find((d) => d.id === 'grove'));
  const tile = { q: 3, r: -2, terrain: 'forest', moisture: 0.8 };
  const normal = recordsForDescriptor(grove, tile, POS);
  const count = normal.filter((r) => r.partId === 'trunk').length;
  assert.ok(count >= 3 && count <= 5, `grove count ${count} outside [3,5]`);

  const displaced = recordsForDescriptor(grove, tile, POS, undefined, { displaced: true });
  const dCount = displaced.filter((r) => r.partId === 'trunk').length;
  assert.equal(dCount, count, 'dispersal keeps the same member count');
  for (const record of displaced) {
    const dist = Math.hypot(record.x - POS.x, record.z - POS.z);
    assert.ok(dist >= 0.68 - 1e-9 && dist <= 0.88 + 1e-9, `dispersed dist ${dist}`);
    assert.ok(record.scale <= 1.5 * DISPERSED_SCALE + 1e-9);
  }
  // Sanity: dispersed ring offsets match decorEmphasis' own function (within
  // float tolerance — `record.x = POS.x + dx` loses one ulp on round-trip).
  const expected = dispersedRingOffsets(count, ((3 * 7 + -2 * 13) * 31) % 17);
  displaced.filter((r) => r.partId === 'trunk').forEach((record, i) => {
    assert.ok(Math.abs(record.x - POS.x - expected[i].dx) < 1e-9, `item ${i} dx`);
    assert.ok(Math.abs(record.z - POS.z - expected[i].dz) < 1e-9, `item ${i} dz`);
  });
});

test('solitary tree: canopy variant parts + jitter placement + per-kind lean', () => {
  const tree = normalizeDescriptor(ALL_DESCRIPTORS.find((d) => d.id === 'tree'));
  const [record, canopy] = recordsForDescriptor(tree, { q: 3, r: -2, terrain: 'plains' }, POS);
  assert.ok(record.partId === 'trunk' && canopy.partId === 'canopy-round');
  assert.equal(canopy.color, 0x3cb371, 'plains (3,-2) rolls the round variant');
  assert.ok(Math.abs(record.tilt - 0.02) < 1e-9, 'solitary lean 0.02');
});

test('mountain: per-variant part ids and mountainType-driven scaleY', () => {
  const mountain = normalizeDescriptor(ALL_DESCRIPTORS.find((d) => d.id === 'mountain'));
  for (const [type, bucket] of Object.entries(mountain.size.byMountainType)) {
    const tile = { q: 3, r: -2, terrain: 'mountain', mountainType: type };
    const [record] = recordsForDescriptor(mountain, tile, POS);
    assert.ok(record.scaleY >= bucket.min && record.scaleY <= bucket.max, `${type} scaleY ${record.scaleY}`);
    assert.equal(record.scale, 1, 'mountain XZ scale stays 1 (hex-tiling base)');
    assert.ok(['peak-classic', 'peak-offpeak'].includes(record.partId));
  }
});

test('knot hovers at KNOT_Y_OFFSET and hill mound is a flattened hemisphere', () => {
  const knot = normalizeDescriptor(ALL_DESCRIPTORS.find((d) => d.id === 'knot'));
  const [knotRecord] = recordsForDescriptor(knot, { q: 3, r: -2, terrain: 'plains' }, POS);
  assert.equal(knotRecord.y, POS.y + 0.3);
  assert.ok(knotRecord.partId === 'knot');

  const hill = normalizeDescriptor(ALL_DESCRIPTORS.find((d) => d.id === 'hill'));
  const [mound] = recordsForDescriptor(hill, { q: 3, r: -2, terrain: 'hill' }, POS);
  assert.equal(mound.scale, 1);
  assert.ok(Math.abs(mound.scaleY - 0.28 / 0.42) < 1e-9, 'hemisphere flattening');
  // Sunk: descends below the surface and shrinks.
  const sunk = recordsForDescriptor(hill, { q: 3, r: -2, terrain: 'hill' }, POS, undefined, { displaced: true });
  assert.equal(sunk.length, 1);
  assert.ok(sunk[0].y < POS.y);
  assert.ok(sunk[0].scale < 1);
});

// ── Per-axis scale ─────────────────────────────────────────────────────────

test('independent scaleX/scaleZ flow into records (scaleZ only when different)', () => {
  const d = normalizeDescriptor({
    id: 'axisscaled',
    kind: 'feature',
    displayName: 'Axis Scaled',
    parts: [{ id: 'p', shape: 'cube', transform: { scaleX: 2, scaleY: 3, scaleZ: 0.5 } }],
  });
  const [record] = recordsForDescriptor(d, { q: 3, r: -2, terrain: 'plains' }, POS);
  assert.equal(record.scale, 2);      // X scale stays in `scale`
  assert.equal(record.scaleY, 3);
  assert.equal(record.scaleZ, 0.5);
});

test('symmetric parts emit no scaleZ (record shape unchanged)', () => {
  const d = normalizeDescriptor({
    id: 'symmetric',
    kind: 'feature',
    displayName: 'Symmetric',
    parts: [{ id: 'p', shape: 'sphere' }],
  });
  const [record] = recordsForDescriptor(d, { q: 3, r: -2, terrain: 'plains' }, POS);
  assert.deepEqual(Object.keys(record).sort(), ['partId', 'scale', 'scaleY', 'x', 'y', 'z']);
});

test('per-axis stretch variation applies to x/y/z with legacy-identical seeds', () => {
  const d = normalizeDescriptor({
    id: 'stretch-axes',
    kind: 'feature',
    displayName: 'Stretch Axes',
    variation: { stretchY: [1.1, 1.1], stretchX: [1.2, 1.2], stretchZ: [0.9, 0.9] },
    parts: [{ id: 'p', shape: 'cube' }],
  });
  const [record] = recordsForDescriptor(d, { q: 3, r: -2, terrain: 'plains' }, POS);
  assert.equal(record.scale, 1.2);
  assert.equal(record.scaleY, 1.1);
  assert.equal(record.scaleZ, 0.9);
});

test('part.stretch pins axes at 1 via false (x/y/z)', () => {
  const d = normalizeDescriptor({
    id: 'pin',
    kind: 'feature',
    displayName: 'Pin',
    parts: [{ id: 'p', shape: 'sphere', stretch: { y: { min: 1.5, max: 1.5 }, x: false, z: false } }],
  });
  const [record] = recordsForDescriptor(d, { q: 3, r: -2, terrain: 'plains' }, POS);
  assert.equal(record.scale, 1);
  assert.equal(record.scaleY, 1.5);
  assert.equal(record.scaleZ, undefined);
});
