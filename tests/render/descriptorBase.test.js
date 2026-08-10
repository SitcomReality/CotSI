/**
 * descriptorBase.test.js — Base descriptor data + entity record path.
 *
 * The base descriptor (descriptors/data/base.js) is migrated 1:1 from the old
 * baseMeshes.js switch: tower + cap + per-faction decoration, keyed by the 7
 * faction shorts. These tests lock the descriptor→record mapping (golden
 * snapshots per faction), the faction-palette color tokens, variant fallback,
 * part-id uniqueness (so meshAssembly never merges two geometries under one
 * id), and the real game path (buildBaseMeshes over a synthetic state).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../src/vendor/three.module.js';
import { normalizeDescriptor, validateDescriptor } from '../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { recordsForEntity } from '../../src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js';
import { BASE_DESCRIPTOR, BASE_VARIANTS } from '../../src/render/hexmap3d/worldObjects/descriptors/data/base.js';
import { buildBaseMeshes } from '../../src/render/hexmap3d/worldObjects/baseMeshes.js';
import { FACTIONS } from '../../src/game/rules/factionData.js';

const POS = { x: 0, y: 0, z: 0 };

const ENTITY = (faction) => ({
  faction,
  scale: 1,
  color: 0x111111,
  colors: { factionBase: 0x224466, factionAccent: 0xd8b830 },
});

const hexColor = (hex) => parseInt(hex.slice(1), 16);
const instanceColorAt = (mesh, i) => {
  const c = new THREE.Color();
  mesh.getColorAt(i, c);
  return c.getHex();
};

// ── Data shape ──────────────────────────────────────────────────────────────

test('base descriptor validates and has all 7 faction variants', () => {
  assert.deepEqual(validateDescriptor(BASE_DESCRIPTOR), []);
  const ids = new Set(BASE_DESCRIPTOR.variants.map((v) => v.id));
  for (const fac of FACTIONS) assert.ok(ids.has(fac.short), `missing variant "${fac.short}"`);
  assert.equal(BASE_DESCRIPTOR.kind, 'base');
  assert.equal(BASE_DESCRIPTOR.variantRule, 'faction');
});

test('decoration part ids are unique per variant (no geometry collisions in meshAssembly)', () => {
  const shared = ['tower', 'cap'];
  for (const [id, parts] of Object.entries(BASE_VARIANTS)) {
    const ids = parts.map((p) => p.id);
    assert.ok(ids.length === new Set(ids).size, `${id}: duplicate part ids within variant`);
    for (const pid of ids) {
      if (shared.includes(pid)) continue;
      const elsewhere = Object.entries(BASE_VARIANTS)
        .filter(([otherId]) => otherId !== id)
        .some(([, otherParts]) => otherParts.some((p) => p.id === pid));
      assert.ok(!elsewhere, `${id}: part id "${pid}" must be unique to one variant`);
    }
  }
});

// ── Golden snapshots (one per faction) ─────────────────────────────────────

test('golden snapshot: CRU base (tower + cap + 6 leaning spikes)', () => {
  const records = recordsForEntity(normalizeDescriptor(BASE_DESCRIPTOR), ENTITY('CRU'), POS);
  assert.deepEqual(records, [
    { partId: 'tower', x: 0, y: 0.35, z: 0, scale: 1, scaleY: 1, color: 0x224466 },
    { partId: 'cap', x: 0, y: 0.75, z: 0, scale: 1, scaleY: 1, color: 0x224466 },
    ...Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI * 2 / 6) * i;
      return {
        partId: `spike${i}`, x: 0, y: 0.1, z: 0, scale: 1, scaleY: 1, // y = 0.1 bottom — tilt pivots at the base
        lift: 0.05, // cone h 0.1 → base 0.05 rides inside the tilt rotation
        localPos: { x: Math.cos(a) * 0.28, y: 0, z: Math.sin(a) * 0.28 },
        tiltAxis: { x: Math.sin(a), z: -Math.cos(a) },
        tilt: 0.3,
        color: 0xd8b830,
      };
    }),
  ]);
});

test('golden snapshot: REV base (tower + cap + flat ring) and HOL base (inverted spike)', () => {
  const rev = recordsForEntity(normalizeDescriptor(BASE_DESCRIPTOR), ENTITY('REV'), POS);
  assert.deepEqual(rev, [
    { partId: 'tower', x: 0, y: 0.35, z: 0, scale: 1, scaleY: 1, color: 0x224466 },
    { partId: 'cap', x: 0, y: 0.75, z: 0, scale: 1, scaleY: 1, color: 0x224466 },
    { partId: 'ring', x: 0, y: 0.85, z: 0, scale: 1, scaleY: 1, localAxis: { x: 1, y: 0, z: 0 }, localAngle: Math.PI / 2, color: 0xd8b830 },
  ]);

  const hol = recordsForEntity(normalizeDescriptor(BASE_DESCRIPTOR), ENTITY('HOL'), POS);
  assert.deepEqual(hol[2], {
    partId: 'hangSpike', x: 0, y: 0.06999999999999999, z: 0, scale: 1, scaleY: 1, // y = 0.01 bottom + 0.06 base (1-ulp drift)
    localAxis: { x: 1, y: 0, z: 0 }, localAngle: Math.PI, color: 0xd8b830,
  });
});

test('part counts per faction match the old builder (8/3/10/6/3/3/3)', () => {
  const normalized = normalizeDescriptor(BASE_DESCRIPTOR);
  const counts = ['CRU', 'REV', 'VER', 'ARC', 'HRT', 'MSK', 'HOL'].map(
    (f) => recordsForEntity(normalized, ENTITY(f), POS).length,
  );
  assert.deepEqual(counts, [8, 3, 10, 6, 3, 3, 3]);
});

// ── Variant + color semantics ───────────────────────────────────────────────

test('unknown faction falls back to the CRU variant', () => {
  const records = recordsForEntity(normalizeDescriptor(BASE_DESCRIPTOR), ENTITY('ZZZ'), POS);
  assert.deepEqual(records.map((r) => r.partId), ['tower', 'cap', 'spike0', 'spike1', 'spike2', 'spike3', 'spike4', 'spike5']);
});

test('recordsForEntity is deterministic and hidden displacement yields no records', () => {
  const normalized = normalizeDescriptor(BASE_DESCRIPTOR);
  assert.deepEqual(recordsForEntity(normalized, ENTITY('VER'), POS), recordsForEntity(normalized, ENTITY('VER'), POS));
  assert.deepEqual(recordsForEntity(normalized, ENTITY('VER'), POS, { hidden: true }), []);
});

test('color tokens resolve from the faction palette (FACTIONS hex strings)', () => {
  const normalized = normalizeDescriptor(BASE_DESCRIPTOR);
  const hex = (s) => parseInt(s.slice(1), 16);
  for (const fac of FACTIONS) {
    const entity = { faction: fac.short, colors: { factionBase: hex(fac.base), factionAccent: hex(fac.color) } };
    const records = recordsForEntity(normalized, entity, POS);
    for (const r of records) {
      const expected = r.partId === 'tower' || r.partId === 'cap' ? hex(fac.base) : hex(fac.color);
      assert.equal(r.color, expected, `${fac.short} ${r.partId} color`);
    }
  }
});

// ── Game path ───────────────────────────────────────────────────────────────

test('buildBaseMeshes renders bases through the game path, instanced per part', () => {
  // state.tiles in the game is a "q,r"-keyed accessor (the tile proxy) — mirror
  // it with a plain object here.
  const tiles = {
    '0,0': { q: 0, r: 0, terrain: 'plains', feature: { kind: 'base', faction: 0 } }, // CRU
    '2,1': { q: 2, r: 1, terrain: 'plains', feature: { kind: 'base', faction: 2 } }, // VER
    '5,3': { q: 5, r: 3, terrain: 'plains', feature: { kind: 'base', faction: 9 } }, // unknown — skipped
    '7,4': { q: 7, r: 4, terrain: 'plains' }, // no base feature — skipped
  };
  const meshes = buildBaseMeshes({ tiles }, ['0,0', '2,1', '5,3', '7,4']);

  const byName = new Map(meshes.map((m) => [m.name, m]));
  assert.equal(byName.get('base-tower').count, 2, 'tower instanced across both bases');
  assert.equal(byName.get('base-cap').count, 2);
  assert.equal(byName.get('base-spike0').count, 1, 'CRU spikes present once');
  assert.equal(byName.get('base-crown0').count, 1, 'VER crown present once');
  assert.ok(!byName.has('base-ring') && !byName.has('base-hangSpike'), 'no decoration from unselected factions');

  // Colors: CRU tower carries faction 0's base color via instance color.
  const tower = byName.get('base-tower');
  assert.ok(tower.count === 2);
  assert.ok(tower.isInstancedMesh);

  // Decoration colors come from the entity mapping's factionAccent token
  // (CRU spike at index 0, VER crown at index 0) — guards the same regression
  // class as the champion/mob accent assertions.
  const spike0 = byName.get('base-spike0');
  const crown0 = byName.get('base-crown0');
  assert.equal(instanceColorAt(spike0, 0), hexColor(FACTIONS[0].color), 'CRU decoration accent');
  assert.equal(instanceColorAt(crown0, 0), hexColor(FACTIONS[2].color), 'VER decoration accent');
});
