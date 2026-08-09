/**
 * descriptorEntity.test.js — Entity-driven schema extensions and records.
 *
 * Covers the M1 schema additions (kind base/champion/mob/trader, variantRule
 * 'faction'/'archetype', named-color tokens on part.color) and the entity
 * record path (recordBuilder.recordsForEntity): single item at the hex center,
 * variant picked from entity state, colors resolved from the entity palette,
 * and a golden snapshot per entity descriptor.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeDescriptor, validateDescriptor,
  OBJECT_KINDS, VARIANT_RULES, COLOR_TOKEN_PATTERN,
} from '../../src/render/hexmap3d/features/descriptors/schema.js';
import { recordsForEntity } from '../../src/render/hexmap3d/features/descriptors/recordBuilder.js';

const POS = { x: 5, y: 1.0, z: -2 };

// Synthetic base: variants are complete part sets — tower + cap shared across
// factions, plus the faction's decoration (replacement semantics, like tree
// variants; the top-level `parts` are the fallback when no variant matches).
const BASE_DESCRIPTOR = {
  schemaVersion: 3,
  id: 'base',
  kind: 'base',
  displayName: 'Faction Base',
  variantRule: 'faction',
  parts: [
    { id: 'tower', shape: 'cylinder', params: { bottomR: 0.16, topR: 0.14, height: 0.5, segments: 6 }, color: 'factionBase' },
    { id: 'cap', shape: 'cylinder', params: { bottomR: 0.18, topR: 0.18, height: 0.08, segments: 6 }, transform: { lift: 0.46 }, color: 'factionBase' },
    { id: 'deco', shape: 'cone', params: { bottomR: 0.1, height: 0.2, radialSegs: 5, heightSegs: 1 }, transform: { lift: 0.4 }, color: 'factionAccent' },
  ],
  variants: [
    {
      id: 'CRU',
      parts: [
        { id: 'tower', shape: 'cylinder', params: { bottomR: 0.16, topR: 0.14, height: 0.5, segments: 6 }, color: 'factionBase' },
        { id: 'cap', shape: 'cylinder', params: { bottomR: 0.18, topR: 0.18, height: 0.08, segments: 6 }, transform: { lift: 0.46 }, color: 'factionBase' },
        { id: 'deco', shape: 'cone', params: { bottomR: 0.1, height: 0.2, radialSegs: 5, heightSegs: 1 }, transform: { lift: 0.4 }, color: 'factionAccent' },
      ],
    },
    {
      id: 'VER',
      parts: [
        { id: 'tower', shape: 'cylinder', params: { bottomR: 0.16, topR: 0.14, height: 0.5, segments: 6 }, color: 'factionBase' },
        { id: 'cap', shape: 'cylinder', params: { bottomR: 0.18, topR: 0.18, height: 0.08, segments: 6 }, transform: { lift: 0.46 }, color: 'factionBase' },
        { id: 'deco', shape: 'torus', params: { radius: 0.1, tube: 0.02, radialSegs: 4, tubularSegs: 8, arc: Math.PI * 2 }, transform: { lift: 0.46, rotY: Math.PI / 4 }, color: 'factionAccent' },
      ],
    },
  ],
};

// Synthetic mob: shared fallback body, per-archetype body variant. Vertical
// offsets are bottom heights (v3 convention): no transform = flush on the ground.
const MOB_DESCRIPTOR = {
  schemaVersion: 3,
  id: 'mob',
  kind: 'mob',
  displayName: 'Mob',
  variantRule: 'archetype',
  parts: [
    { id: 'body', shape: 'cylinder', params: { bottomR: 0.14, topR: 0.1, height: 0.22, segments: 5 }, color: 'factionBase' },
  ],
  variants: [
    { id: 'bear', parts: [{ id: 'body', shape: 'cylinder', params: { bottomR: 0.14, topR: 0.1, height: 0.22, segments: 5 }, color: 0x8a6a4a }] },
    { id: 'snail', parts: [{ id: 'body', shape: 'sphere', params: { radius: 0.12, wSegs: 6, hSegs: 4 }, color: 0xc0d8a0 }] },
  ],
};

const CRU_ENTITY = {
  faction: 'CRU',
  scale: 1,
  color: 0x111111, // unused — every part carries a token or literal
  colors: { factionBase: 0x224466, factionAccent: 0xd8b830 },
};

// ── Schema extensions ───────────────────────────────────────────────────────

test('schema accepts the entity kinds and the new variant rules', () => {
  for (const kind of ['base', 'champion', 'mob', 'trader']) {
    assert.ok(OBJECT_KINDS.includes(kind), `missing kind "${kind}"`);
  }
  for (const rule of ['faction', 'archetype']) {
    assert.ok(VARIANT_RULES.includes(rule), `missing variant rule "${rule}"`);
  }
  assert.deepEqual(validateDescriptor(BASE_DESCRIPTOR), []);
  assert.deepEqual(validateDescriptor(MOB_DESCRIPTOR), []);
});

test('named-color tokens are valid on part.color only', () => {
  assert.ok(COLOR_TOKEN_PATTERN.test('factionBase'));
  assert.ok(COLOR_TOKEN_PATTERN.test('faction_accents'));
  assert.ok(!COLOR_TOKEN_PATTERN.test('bad token'));
  assert.ok(!COLOR_TOKEN_PATTERN.test('bad-token'));

  // Token on the instance-color path (part.color) is fine.
  const ok = normalizeDescriptor(BASE_DESCRIPTOR);
  assert.deepEqual(validateDescriptor(ok), []);

  // Token on the material path is rejected; bad tokens rejected everywhere.
  const badMaterial = {
    ...BASE_DESCRIPTOR, parts: [{ ...BASE_DESCRIPTOR.parts[0], materialColor: 'factionBase' }],
  };
  assert.ok(validateDescriptor(badMaterial).some((e) => e.includes('materialColor')));
  const badToken = {
    ...BASE_DESCRIPTOR, parts: [{ ...BASE_DESCRIPTOR.parts[0], color: 'faction base' }],
  };
  assert.ok(validateDescriptor(badToken).some((e) => e.includes('color')));
});

test('normalize keeps entity kinds and color tokens through a JSON roundtrip', () => {
  for (const raw of [BASE_DESCRIPTOR, MOB_DESCRIPTOR]) {
    const normalized = normalizeDescriptor(raw);
    assert.equal(normalized.kind === 'base' || normalized.kind === 'mob', true);
    const roundtrip = normalizeDescriptor(JSON.parse(JSON.stringify(normalized)));
    assert.deepEqual(roundtrip, normalized);
    assert.deepEqual(validateDescriptor(roundtrip), []);
  }
});

// ── recordsForEntity ────────────────────────────────────────────────────────

test('recordsForEntity is a single center-placed item with variant parts', () => {
  const records = recordsForEntity(normalizeDescriptor(BASE_DESCRIPTOR), CRU_ENTITY, POS);
  assert.equal(records.length, 3);
  const ids = records.map((r) => r.partId);
  assert.deepEqual(ids, ['tower', 'cap', 'deco']);
  for (const r of records) {
    assert.equal(r.x, POS.x);
    assert.equal(r.z, POS.z);
  }
  // Cap and deco sit on the tower via lift; the tower's bottom sits at the
  // surface — its record y carries the baked base offset (height 0.5 / 2).
  assert.equal(records[0].y, POS.y + 0.25);
  assert.equal(records[0].lift, undefined);
  assert.equal(records[1].lift, 0.46);
});

test('variant rule "faction" picks the variant matching entity.faction', () => {
  const normalized = normalizeDescriptor(BASE_DESCRIPTOR);
  const cru = recordsForEntity(normalized, CRU_ENTITY, POS);
  const ver = recordsForEntity(normalized, { ...CRU_ENTITY, faction: 'VER' }, POS);
  // Distinguish variants by their rotY: CRU cone has none, VER torus has PI/4.
  assert.equal(cru[2].rotY, undefined);
  assert.equal(ver[2].rotY, Math.PI / 4);
});

test('variant rule "archetype" picks the variant matching entity.archetype', () => {
  const normalized = normalizeDescriptor(MOB_DESCRIPTOR);
  const snail = recordsForEntity(normalized, { archetype: 'snail', scale: 0.9 }, POS);
  assert.equal(snail.length, 1);
  assert.equal(snail[0].scale, 0.9);
  assert.equal(snail[0].scaleY, 0.9);
  assert.equal(snail[0].color, 0xc0d8a0);
});

test('unknown faction or archetype falls back to the first variant', () => {
  const normalized = normalizeDescriptor(BASE_DESCRIPTOR);
  const fallback = recordsForEntity(normalized, { ...CRU_ENTITY, faction: 'ZZZ' }, POS);
  assert.deepEqual(fallback.map((r) => r.partId), ['tower', 'cap', 'deco']);
  assert.equal(fallback[2].rotY, undefined); // CRU cone — first variant
});

test('colors resolve from entity.colors tokens, literals, and entity.color', () => {
  const normalized = normalizeDescriptor(BASE_DESCRIPTOR);
  const records = recordsForEntity(normalized, CRU_ENTITY, POS);
  assert.equal(records[0].color, 0x224466); // 'factionBase' → entity.colors
  assert.equal(records[2].color, 0xd8b830); // 'factionAccent' → entity.colors

  // A part with no color falls back to entity.color (no variants here, so the
  // top-level parts are used).
  const { variants: _variants, ...plainBase } = BASE_DESCRIPTOR;
  const plain = { ...plainBase, parts: [{ id: 'tower', shape: 'cylinder', params: { bottomR: 0.16, topR: 0.14, height: 0.5, segments: 6 } }] };
  const plainRecords = recordsForEntity(normalizeDescriptor(plain), { ...CRU_ENTITY, color: 0x990000 }, POS);
  assert.equal(plainRecords[0].color, 0x990000);

  // A part with no color and no entity.color carries no instance color.
  const noColor = recordsForEntity(normalizeDescriptor(plain), { faction: 'CRU' }, POS);
  assert.equal(noColor[0].color, undefined);
});

test('recordsForEntity is deterministic and honors hidden displacement', () => {
  const normalized = normalizeDescriptor(BASE_DESCRIPTOR);
  const a = recordsForEntity(normalized, CRU_ENTITY, POS);
  const b = recordsForEntity(normalized, CRU_ENTITY, POS);
  assert.deepEqual(a, b);
  assert.deepEqual(recordsForEntity(normalized, CRU_ENTITY, POS, { hidden: true }), []);
});

// ── Golden snapshots ────────────────────────────────────────────────────────

test('golden snapshot: CRU base records match exactly', () => {
  const records = recordsForEntity(normalizeDescriptor(BASE_DESCRIPTOR), CRU_ENTITY, POS);
  assert.deepEqual(records, [
    { partId: 'tower', x: 5, y: 1.25, z: -2, scale: 1, scaleY: 1, color: 0x224466 },
    { partId: 'cap', x: 5, y: 1.04, z: -2, scale: 1, scaleY: 1, lift: 0.46, color: 0x224466 },
    { partId: 'deco', x: 5, y: 1.1, z: -2, scale: 1, scaleY: 1, lift: 0.4, color: 0xd8b830 },
  ]);
});

test('golden snapshot: snail mob records match exactly', () => {
  const records = recordsForEntity(normalizeDescriptor(MOB_DESCRIPTOR), { archetype: 'snail', scale: 0.9 }, POS);
  assert.deepEqual(records, [
    { partId: 'body', x: 5, y: 1.108, z: -2, scale: 0.9, scaleY: 0.9, color: 0xc0d8a0 },
  ]);
});
