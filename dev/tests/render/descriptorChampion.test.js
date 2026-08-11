/**
 * descriptorChampion.test.js — Champion descriptor data + entity record path.
 *
 * Each faction's champion is a fully authored miniature (data/champions/
 * <faction>.js): a distinct silhouette per faction, colored via the
 * 'factionBase'/'factionAccent' tokens plus warm dark/bone literals. Every
 * champion stands on the same PEDESTAL (identical id/shape/params across all
 * variants) so meshAssembly merges all seven stands into one InstancedMesh;
 * every other part id is unique to its faction, so silhouettes never collide
 * under one part id. Variants are keyed by the 7 faction shorts; records come
 * from recordsForEntity and render through the same generic pipeline as bases.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../../src/vendor/three.module.js';
import { normalizeDescriptor, validateDescriptor } from '../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { recordsForEntity } from '../../../src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js';
import { CHAMPION_DESCRIPTOR, CHAMPION_VARIANTS } from '../../../src/render/hexmap3d/worldObjects/descriptors/data/champion.js';
import { buildUnitMeshes } from '../../../src/render/hexmap3d/units/unitMeshes.js';
import { FACTIONS } from '../../../src/game/rules/factionData.js';

const POS = { x: 0, y: 0, z: 0 };

const ENTITY = (faction) => ({ faction, colors: { factionBase: 0x6e2e22, factionAccent: 0xb84530 } });
const hexColor = (hex) => parseInt(hex.slice(1), 16);
const instanceColorAt = (mesh, i) => {
  const c = new THREE.Color();
  mesh.getColorAt(i, c);
  return c.getHex();
};

// ── Data shape ──────────────────────────────────────────────────────────────

test('champion descriptor validates and has all 7 faction variants', () => {
  assert.deepEqual(validateDescriptor(CHAMPION_DESCRIPTOR), []);
  const ids = new Set(CHAMPION_DESCRIPTOR.variants.map((v) => v.id));
  for (const fac of FACTIONS) assert.ok(ids.has(fac.short), `missing variant "${fac.short}"`);
  assert.equal(CHAMPION_DESCRIPTOR.kind, 'champion');
  assert.equal(CHAMPION_DESCRIPTOR.variantRule, 'faction');
});

test('every champion stands on the identical shared pedestal; all other ids are faction-unique', () => {
  const pedestalParams = JSON.stringify(CHAMPION_VARIANTS.CRU[0].params);
  const seen = new Map(); // part id → owning faction
  for (const [id, parts] of Object.entries(CHAMPION_VARIANTS)) {
    assert.ok(parts.length >= 6, `${id}: miniature is thin (${parts.length} parts)`);
    const pedestal = parts[0];
    assert.equal(pedestal.id, 'pedestal', `${id}: pedestal must be the first part`);
    assert.equal(JSON.stringify(pedestal.params), pedestalParams, `${id}: pedestal geometry differs`);
    const ids = parts.map((p) => p.id);
    assert.equal(ids.length, new Set(ids).size, `${id}: duplicate part ids`);
    for (const pid of ids) {
      if (pid === 'pedestal') continue; // the one intentionally shared id
      const owner = seen.get(pid);
      assert.ok(!owner, `part id "${pid}" shared between ${owner} and ${id}`);
      seen.set(pid, id);
    }
  }
});

test('every variant carries both identity tokens (factionBase body + factionAccent signature)', () => {
  for (const [id, parts] of Object.entries(CHAMPION_VARIANTS)) {
    const colors = new Set(parts.map((p) => p.color));
    assert.ok(colors.has('factionBase'), `${id}: no factionBase part`);
    assert.ok(colors.has('factionAccent'), `${id}: no factionAccent part`);
  }
});

// ── Golden snapshots ────────────────────────────────────────────────────────

test('golden snapshot: CRU champion (Forge Juggernaut)', () => {
  const records = recordsForEntity(normalizeDescriptor(CHAMPION_DESCRIPTOR), ENTITY('CRU'), POS);
  assert.deepEqual(records, [
    { partId: 'pedestal', x: 0, y: 0.03, z: 0, scale: 1, scaleY: 1, color: 0x2a2628 }, // shared stand — spans 0..0.06
    { partId: 'cruLegs', x: 0, y: 0.1, z: 0, scale: 1, scaleY: 1, color: 0x6e2e22 },
    { partId: 'cruTorso', x: 0, y: 0.24000000000000002, z: 0, scale: 1, scaleY: 1, color: 0x6e2e22 },
    { partId: 'cruPauldronL', x: 0, y: 0.345, z: 0, scale: 1, scaleY: 1, localPos: { x: -0.19, y: 0, z: 0 }, color: 0x6e2e22 },
    { partId: 'cruPauldronR', x: 0, y: 0.345, z: 0, scale: 1, scaleY: 1, localPos: { x: 0.19, y: 0, z: 0 }, color: 0x6e2e22 },
    { partId: 'cruHelm', x: 0, y: 0.4, z: 0, scale: 1, scaleY: 1, color: 0x2a2628 },
    { partId: 'cruHornL', x: 0, y: 0.42, z: 0, scale: 1, scaleY: 1, lift: 0.09, localPos: { x: -0.09, y: 0, z: 0 }, tiltAxis: { x: -1, z: 0 }, tilt: 0.5, color: 0xb84530 }, // tilt pivots at the helm
    { partId: 'cruHornR', x: 0, y: 0.42, z: 0, scale: 1, scaleY: 1, lift: 0.09, localPos: { x: 0.09, y: 0, z: 0 }, tiltAxis: { x: 1, z: 0 }, tilt: 0.5, color: 0xb84530 },
    { partId: 'cruShaft', x: 0, y: 0.29, z: 0, scale: 1, scaleY: 1, localPos: { x: 0.22, y: 0, z: 0.08 }, color: 0x2a2628 },
    { partId: 'cruHammerHead', x: 0, y: 0.52, z: 0, scale: 1, scaleY: 1, localPos: { x: 0.22, y: 0, z: 0.08 }, color: 0xb84530 },
    { partId: 'cruEmberL', x: 0, y: 0.45499999999999996, z: 0, scale: 1, scaleY: 1, localPos: { x: -0.19, y: 0, z: 0 }, color: 0xe87a6a }, // glow literal — 1-ulp drift
    { partId: 'cruEmberR', x: 0, y: 0.45499999999999996, z: 0, scale: 1, scaleY: 1, localPos: { x: 0.19, y: 0, z: 0 }, color: 0xe87a6a },
  ]);
});

test('golden snapshot: REV champion (Dreammote — localAxis crescent + orbiting orbs)', () => {
  const records = recordsForEntity(normalizeDescriptor(CHAMPION_DESCRIPTOR), ENTITY('REV'), POS);
  assert.deepEqual(records, [
    { partId: 'pedestal', x: 0, y: 0.03, z: 0, scale: 1, scaleY: 1, color: 0x2a2628 },
    { partId: 'revRobe', x: 0, y: 0.27, z: 0, scale: 1, scaleY: 1, color: 0x6e2e22 },
    { partId: 'revHood', x: 0, y: 0.52, z: 0, scale: 1, scaleY: 1, color: 0x6e2e22 },
    { partId: 'revFace', x: 0, y: 0.53, z: 0, scale: 1, scaleY: 1, localPos: { x: 0, y: 0, z: 0.06 }, color: 0x1c1624 },
    { partId: 'revOrb1', x: 0, y: 0.5950000000000001, z: 0, scale: 1, scaleY: 1, localPos: { x: -0.15, y: 0, z: 0.08 }, color: 0xb84530 },
    { partId: 'revOrb2', x: 0, y: 0.65, z: 0, scale: 1, scaleY: 1, localPos: { x: 0.13, y: 0, z: -0.1 }, color: 0xb84530 },
    { partId: 'revOrb3', x: 0, y: 0.545, z: 0, scale: 1, scaleY: 1, localPos: { x: 0.08, y: 0, z: 0.14 }, color: 0xb84530 },
    { partId: 'revCrescent', x: 0, y: 0.68, z: 0, scale: 1, scaleY: 1, localAxis: { x: 1, y: 0, z: 0 }, localAngle: 1.1, color: 0xb84530 }, // torus base (tube) baked into y
  ]);
});

test('all seven factions record their miniature; fallback to CRU is deterministic', () => {
  const normalized = normalizeDescriptor(CHAMPION_DESCRIPTOR);
  const counts = ['CRU', 'REV', 'VER', 'ARC', 'HRT', 'MSK', 'HOL'].map(
    (f) => recordsForEntity(normalized, ENTITY(f), POS).length,
  );
  assert.deepEqual(counts, [12, 8, 8, 6, 9, 7, 7]);
  const fallback = recordsForEntity(normalized, { faction: 'ZZZ', colors: {} }, POS);
  assert.deepEqual(
    fallback.map((r) => r.partId),
    recordsForEntity(normalized, ENTITY('CRU'), POS).map((r) => r.partId),
    'unknown faction falls back to the CRU miniature',
  );
  assert.deepEqual(recordsForEntity(normalized, ENTITY('MSK'), POS), recordsForEntity(normalized, ENTITY('MSK'), POS));
});

// ── Game path ───────────────────────────────────────────────────────────────

test('buildUnitMeshes renders champions through the descriptor pipeline', () => {
  // state.tiles in the game is a "q,r"-keyed accessor (the tile proxy) — mirror
  // it with a plain object here.
  const state = {
    tiles: {
      '0,0': { q: 0, r: 0, terrain: 'plains' },
      '2,1': { q: 2, r: 1, terrain: 'plains' },
    },
    champions: [
      { id: 'c1', pos: { q: 0, r: 0 }, faction: 0 }, // CRU
      { id: 'c2', pos: { q: 2, r: 1 }, faction: 5 }, // MSK
    ],
    mobs: [],
    traders: [],
  };
  const meshes = buildUnitMeshes(state, new Set(['0,0', '2,1']));

  const byName = (name) => meshes.filter((m) => m.name === name);
  assert.equal(byName('champion-pedestal').length, 1, 'one shared pedestal mesh');
  assert.equal(byName('champion-pedestal')[0].count, 2, 'pedestal instanced across both champions');
  assert.equal(byName('champion-cruHelm').length, 1, 'CRU helm present');
  assert.equal(byName('champion-mskMask').length, 1, 'MSK mask present');
  assert.equal(byName('champion-revCrescent').length, 0, 'no unselected-faction parts');

  // Every mesh keeps the white material; all color is per-instance (the shared
  // pedestal carries the literal stand color).
  const pedestal = byName('champion-pedestal')[0];
  assert.equal(pedestal.material.color.getHex(), 0xffffff);
  assert.ok(pedestal.instanceColor, 'pedestal carries per-instance colors');
  assert.equal(instanceColorAt(pedestal, 0), 0x2a2628, 'pedestal stand color');

  // Signature parts carry the faction accent color — the entity mapping must
  // provide factionAccent, not just base.
  const horn = byName('champion-cruHornL')[0];
  const pom = byName('champion-mskPom')[0];
  assert.equal(instanceColorAt(horn, 0), hexColor(FACTIONS[0].color), 'CRU accent color');
  assert.equal(instanceColorAt(pom, 0), hexColor(FACTIONS[5].color), 'MSK accent color');
});
