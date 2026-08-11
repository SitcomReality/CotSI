/**
 * descriptorChampion.test.js — Champion descriptor data + entity record path.
 *
 * Champions migrate from unitMeshes.js: a cylinder body (faction-colored via
 * the 'factionBase' token) + sphere head (fixed skin-tone materialColor, no
 * instance color) + one slight per-faction accent part in the faction accent
 * color. Variants are keyed by the 7 faction shorts; records come from
 * recordsForEntity and render through the same generic pipeline as bases.
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
  // Every variant shares the same body + head parts (same part ids, same shapes).
  const baseParts = CHAMPION_VARIANTS.CRU.map((p) => `${p.id}:${p.shape}`);
  for (const [id, parts] of Object.entries(CHAMPION_VARIANTS)) {
    assert.deepEqual(parts.map((p) => `${p.id}:${p.shape}`).slice(0, 2), baseParts.slice(0, 2), `${id}: body/head differ`);
  }
});

test('every faction variant has exactly one accent part with a unique id', () => {
  for (const [id, parts] of Object.entries(CHAMPION_VARIANTS)) {
    assert.equal(parts.length, 3, `${id}: body + head + one accent`);
    const accent = parts[2];
    assert.equal(accent.color, 'factionAccent', `${id}: accent is faction-colored`);
    const ids = parts.map((p) => p.id);
    assert.equal(ids.length, new Set(ids).size, `${id}: duplicate part ids`);
    const elsewhere = Object.entries(CHAMPION_VARIANTS)
      .filter(([otherId]) => otherId !== id)
      .some(([, otherParts]) => otherParts.some((p) => p.id === accent.id));
    assert.ok(!elsewhere, `${id}: accent id "${accent.id}" must be unique to one variant`);
  }
});

// ── Golden snapshots ────────────────────────────────────────────────────────

test('golden snapshot: CRU champion (body + head + top spike)', () => {
  const records = recordsForEntity(normalizeDescriptor(CHAMPION_DESCRIPTOR), ENTITY('CRU'), POS);
  assert.deepEqual(records, [
    { partId: 'body', x: 0, y: 0.25, z: 0, scale: 1, scaleY: 1, color: 0x6e2e22 }, // flush bottom (0) + 0.25 base
    { partId: 'head', x: 0, y: 0.44999999999999996, z: 0, scale: 1, scaleY: 1, color: 0xffe8c8 }, // skin tone — a literal instance color in v4; 1-ulp drift from the v3 grounding round-trip (0.35 + 0.1)
    { partId: 'spikeTop', x: 0, y: 0.5800000000000001, z: 0, scale: 1, scaleY: 1, color: 0xb84530 }, // y = 0.55 bottom + 0.03 base (1-ulp drift)
  ]);
});

test('golden snapshot: REV champion (halo ring around the head)', () => {
  const records = recordsForEntity(normalizeDescriptor(CHAMPION_DESCRIPTOR), ENTITY('REV'), POS);
  assert.deepEqual(records[2], {
    partId: 'halo', x: 0, y: 0.45, z: 0, scale: 1, scaleY: 1,
    localAxis: { x: 1, y: 0, z: 0 }, localAngle: Math.PI / 2, color: 0xb84530,
  });
});

test('all seven factions record exactly three parts', () => {
  const normalized = normalizeDescriptor(CHAMPION_DESCRIPTOR);
  for (const fac of FACTIONS) {
    const records = recordsForEntity(normalized, ENTITY(fac.short), POS);
    assert.equal(records.length, 3, `${fac.short} parts`);
    assert.equal(records[0].partId, 'body');
    assert.equal(records[1].partId, 'head');
  }
});

test('unknown faction falls back to the CRU variant; records are deterministic', () => {
  const normalized = normalizeDescriptor(CHAMPION_DESCRIPTOR);
  const fallback = recordsForEntity(normalized, { faction: 'ZZZ', colors: {} }, POS);
  assert.deepEqual(fallback.map((r) => r.partId), ['body', 'head', 'spikeTop']);
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
  assert.equal(byName('champion-body').length, 1);
  assert.equal(byName('champion-head').length, 1);
  assert.equal(byName('champion-spikeTop').length, 1, 'CRU accent present');
  assert.equal(byName('champion-gem').length, 1, 'MSK accent present');
  assert.equal(byName('champion-halo').length, 0, 'no unselected-faction accents');

  // Body and head meshes: white material + per-instance colors (the head's
  // skin tone is a literal instance color in v4 — materialColor is gone).
  const body = byName('champion-body')[0];
  const head = byName('champion-head')[0];
  assert.equal(body.count, 2, 'one body instance per champion');
  assert.equal(body.material.color.getHex(), 0xffffff);
  assert.ok(body.instanceColor, 'body carries per-instance faction colors');
  assert.equal(head.material.color.getHex(), 0xffffff, 'head material is white; the skin tone is an instance color');
  assert.ok(head.instanceColor, 'head carries the skin-tone instance color');
  assert.equal(head.count, 2);

  // Accents carry the faction accent color (CRU spike at index 0, MSK gem at
  // index 1) — the entity mapping must provide factionAccent, not just base.
  const spike = byName('champion-spikeTop')[0];
  const gem = byName('champion-gem')[0];
  assert.equal(instanceColorAt(spike, 0), hexColor(FACTIONS[0].color), 'CRU accent color');
  assert.equal(instanceColorAt(gem, 0), hexColor(FACTIONS[5].color), 'MSK accent color');
});
