/**
 * descriptorBase.test.js — Base descriptor data + entity record path.
 *
 * The base descriptor (descriptors/data/base.js) is a fully authored citadel
 * per faction (data/bases/<faction>.js), keyed by the 7 faction shorts. These
 * tests lock the descriptor→record mapping (golden snapshots), the
 * faction-palette color tokens, variant fallback, part-id uniqueness (so
 * meshAssembly never merges two geometries under one id), and the real game
 * path (buildBaseMeshes over a synthetic state).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../../src/vendor/three.module.js';
import { normalizeDescriptor, validateDescriptor } from '../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { recordsForEntity } from '../../../src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js';
import { BASE_DESCRIPTOR, BASE_VARIANTS } from '../../../src/render/hexmap3d/worldObjects/descriptors/data/base.js';
import { buildBaseMeshes } from '../../../src/render/hexmap3d/worldObjects/baseMeshes.js';
import { FACTIONS } from '../../../src/game/rules/factionData.js';

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

test('every base part id is unique across all variants (no geometry collisions in meshAssembly)', () => {
  const seen = new Map(); // part id → owning faction
  for (const [id, parts] of Object.entries(BASE_VARIANTS)) {
    const ids = parts.map((p) => p.id);
    assert.equal(ids.length, new Set(ids).size, `${id}: duplicate part ids within variant`);
    for (const pid of ids) {
      const owner = seen.get(pid);
      assert.ok(!owner, `part id "${pid}" shared between ${owner} and ${id}`);
      seen.set(pid, id);
    }
  }
});

test('every variant carries both identity tokens (factionBase structure + factionAccent signature)', () => {
  for (const [id, parts] of Object.entries(BASE_VARIANTS)) {
    const colors = new Set(parts.map((p) => p.color));
    assert.ok(colors.has('factionBase'), `${id}: no factionBase part`);
    assert.ok(colors.has('factionAccent'), `${id}: no factionAccent part`);
  }
});

// ── Golden snapshots (one per faction) ─────────────────────────────────────

test('golden snapshot: CRU base (Forge-Citadel)', () => {
  const records = recordsForEntity(normalizeDescriptor(BASE_DESCRIPTOR), ENTITY('CRU'), POS);
  assert.deepEqual(records, [
    { partId: 'cruFPlinth', x: 0, y: 0.05, z: 0, scale: 1, scaleY: 1, color: 0x2a2628 }, // iron plinth — spans 0..0.1
    { partId: 'cruFKeep', x: 0, y: 0.23, z: 0, scale: 1, scaleY: 1, color: 0x224466 },
    { partId: 'cruFTowerFL', x: 0, y: 0.18, z: 0, scale: 1, scaleY: 1, localPos: { x: -0.27, y: 0, z: -0.27 }, color: 0x224466 },
    { partId: 'cruFTowerFR', x: 0, y: 0.18, z: 0, scale: 1, scaleY: 1, localPos: { x: 0.27, y: 0, z: -0.27 }, color: 0x224466 },
    { partId: 'cruFTowerBL', x: 0, y: 0.18, z: 0, scale: 1, scaleY: 1, localPos: { x: -0.27, y: 0, z: 0.27 }, color: 0x224466 },
    { partId: 'cruFTowerBR', x: 0, y: 0.18, z: 0, scale: 1, scaleY: 1, localPos: { x: 0.27, y: 0, z: 0.27 }, color: 0x224466 },
    { partId: 'cruFGate', x: 0, y: 0.2, z: 0, scale: 1, scaleY: 1, localPos: { x: 0, y: 0, z: 0.25 }, color: 0x0c0e12 },
    { partId: 'cruFChimney', x: 0, y: 0.45, z: 0, scale: 1, scaleY: 1, localPos: { x: 0, y: 0, z: 0.02 }, color: 0x2a2628 },
    { partId: 'cruFEmber', x: 0, y: 0.7100000000000001, z: 0, scale: 1, scaleY: 1, localPos: { x: 0, y: 0, z: 0.02 }, color: 0xd8b830 }, // floats above the chimney (1-ulp drift)
  ]);
});

test('golden snapshot: HOL base (Hollow-Bastion — ring + localPos parts)', () => {
  const records = recordsForEntity(normalizeDescriptor(BASE_DESCRIPTOR), ENTITY('HOL'), POS);
  assert.deepEqual(records, [
    { partId: 'holFPlinth', x: 0, y: 0.05, z: 0, scale: 1, scaleY: 1, color: 0x224466 },
    { partId: 'holFTowerL', x: 0, y: 0.31, z: 0, scale: 1, scaleY: 1, localPos: { x: -0.16, y: 0, z: 0 }, color: 0x224466 },
    { partId: 'holFTowerR', x: 0, y: 0.31, z: 0, scale: 1, scaleY: 1, localPos: { x: 0.16, y: 0, z: 0 }, color: 0x224466 },
    { partId: 'holFLintel', x: 0, y: 0.495, z: 0, scale: 1, scaleY: 1, color: 0x2a2628 },
    { partId: 'holFVoid', x: 0, y: 0.38, z: 0, scale: 1, scaleY: 1, localPos: { x: 0, y: 0, z: 0.04 }, color: 0x0c0e12 }, // the abyss core of the arch
    { partId: 'holFRing', x: 0, y: 0.64, z: 0, scale: 1, scaleY: 1, localAxis: { x: 1, y: 0, z: 0 }, localAngle: 1.05, color: 0xd8b830 }, // torus base (tube) baked into y
    { partId: 'holFShardL', x: 0, y: 0.41, z: 0, scale: 1, scaleY: 1, localPos: { x: -0.32, y: 0, z: 0.12 }, color: 0xd8b830 },
    { partId: 'holFShardR', x: 0, y: 0.54, z: 0, scale: 1, scaleY: 1, localPos: { x: 0.32, y: 0, z: -0.08 }, color: 0xd8b830 },
  ]);
});

test('part counts per faction', () => {
  const normalized = normalizeDescriptor(BASE_DESCRIPTOR);
  const counts = ['CRU', 'REV', 'VER', 'ARC', 'HRT', 'MSK', 'HOL'].map(
    (f) => recordsForEntity(normalized, ENTITY(f), POS).length,
  );
  assert.deepEqual(counts, [9, 5, 6, 8, 7, 10, 8]);
});

// ── Variant + color semantics ───────────────────────────────────────────────

test('unknown faction falls back to the CRU variant', () => {
  const records = recordsForEntity(normalizeDescriptor(BASE_DESCRIPTOR), ENTITY('ZZZ'), POS);
  assert.deepEqual(
    records.map((r) => r.partId),
    ['cruFPlinth', 'cruFKeep', 'cruFTowerFL', 'cruFTowerFR', 'cruFTowerBL', 'cruFTowerBR', 'cruFGate', 'cruFChimney', 'cruFEmber'],
  );
});

test('recordsForEntity is deterministic and hidden displacement yields no records', () => {
  const normalized = normalizeDescriptor(BASE_DESCRIPTOR);
  assert.deepEqual(recordsForEntity(normalized, ENTITY('VER'), POS), recordsForEntity(normalized, ENTITY('VER'), POS));
  assert.deepEqual(recordsForEntity(normalized, ENTITY('VER'), POS, { hidden: true }), []);
});

test('color tokens resolve from the faction palette (FACTIONS hex strings); literals pass through', () => {
  const normalized = normalizeDescriptor(BASE_DESCRIPTOR);
  const hex = (s) => parseInt(s.slice(1), 16);
  for (const fac of FACTIONS) {
    const entity = { faction: fac.short, colors: { factionBase: hex(fac.base), factionAccent: hex(fac.color) } };
    const records = recordsForEntity(normalized, entity, POS);
    const parts = BASE_VARIANTS[fac.short];
    assert.equal(records.length, parts.length, `${fac.short}: one record per part`);
    parts.forEach((p, i) => {
      const expected = p.color === 'factionBase' ? hex(fac.base) : p.color === 'factionAccent' ? hex(fac.color) : p.color;
      assert.equal(records[i].color, expected, `${fac.short} ${p.id} color`);
    });
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
  assert.equal(byName.get('base-cruFKeep').count, 1, 'CRU keep present once');
  assert.equal(byName.get('base-verFTrunk').count, 1, 'VER trunk present once');
  assert.ok(!byName.has('base-revFSpire'), 'no parts from unselected factions');

  // Signature parts carry the faction accent color via instance color (CRU
  // ember at index 0, VER crown-tip at index 0) — guards the same regression
  // class as the champion/mob accent assertions.
  const ember = byName.get('base-cruFEmber');
  const tip = byName.get('base-verFTip');
  assert.equal(instanceColorAt(ember, 0), hexColor(FACTIONS[0].color), 'CRU accent');
  assert.equal(instanceColorAt(tip, 0), hexColor(FACTIONS[2].color), 'VER accent');
});
