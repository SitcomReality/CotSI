/**
 * descriptorMob.test.js — Mob + trader descriptor data and the entity record
 * path, mirroring descriptorBase/descriptorChampion.
 *
 * Mobs migrate from unitGeometries.js: the seven archetype shapes (bear,
 * leopard, snail, tapir, mushroom, goose, scorpion) become descriptor variants
 * keyed by the archetype shape, plus the tier-2 elder-bear and scorpion-queen
 * variants. Traders are a single fixed coin look. Both keep their icon caps
 * (pieceIcons.js, unchanged) riding on top; the caps sit at the top of each
 * 3D body instead of the old flat coin.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../src/vendor/three.module.js';
import { normalizeDescriptor, validateDescriptor } from '../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { recordsForEntity } from '../../src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js';
import { MOB_DESCRIPTOR, MOB_VARIANTS, MOB_TIER2_VARIANTS } from '../../src/render/hexmap3d/worldObjects/descriptors/data/mob.js';
import { TRADER_DESCRIPTOR } from '../../src/render/hexmap3d/worldObjects/descriptors/data/trader.js';
import { buildUnitMeshes } from '../../src/render/hexmap3d/units/unitMeshes.js';
import { FACTIONS } from '../../src/game/rules/factionData.js';

const POS = { x: 0, y: 0, z: 0 };

const ENTITY = (archetype, colors = { factionBody: 0x4d2018, factionAccent: 0xb84530 }) => ({
  archetype,
  scale: 1,
  colors,
});

const hexColor = (hex) => parseInt(hex.slice(1), 16);
const darken = (hex, f) => {
  const ch = (s) => Math.round(((hex >> s) & 0xff) * f);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};
const instanceColorAt = (mesh, i) => {
  const c = new THREE.Color();
  mesh.getColorAt(i, c);
  return c.getHex();
};

// ── Data shape ──────────────────────────────────────────────────────────────

test('mob descriptor validates and has every archetype variant', () => {
  assert.deepEqual(validateDescriptor(MOB_DESCRIPTOR), []);
  const ids = new Set(MOB_DESCRIPTOR.variants.map((v) => v.id));
  for (const shape of ['default', 'bear', 'leopard', 'snail', 'tapir', 'mushroom', 'goose', 'scorpion']) {
    assert.ok(ids.has(shape), `missing variant "${shape}"`);
  }
  assert.ok(ids.has('bear-elder') && ids.has('scorpion-queen'), 'tier-2 variants present');
  assert.equal(MOB_DESCRIPTOR.kind, 'mob');
  assert.equal(MOB_DESCRIPTOR.variantRule, 'archetype');
});

test('tier-2 mapping covers the variants that exist in the game', () => {
  assert.deepEqual(MOB_TIER2_VARIANTS, { bear: 'bear-elder', scorpion: 'scorpion-queen' });
  for (const id of Object.values(MOB_TIER2_VARIANTS)) {
    assert.ok(MOB_VARIANTS[id], `variant "${id}" defined`);
  }
});

test('mob part ids are unique per variant (no geometry collisions in meshAssembly)', () => {
  for (const [id, parts] of Object.entries(MOB_VARIANTS)) {
    const ids = parts.map((p) => p.id);
    assert.ok(ids.length === new Set(ids).size, `${id}: duplicate part ids within variant`);
    for (const pid of ids) {
      const elsewhere = Object.entries(MOB_VARIANTS)
        .filter(([otherId]) => otherId !== id)
        .some(([, otherParts]) => otherParts.some((p) => p.id === pid));
      assert.ok(!elsewhere, `${id}: part id "${pid}" must be unique to one variant`);
    }
  }
});

test('trader descriptor validates and has one fixed look', () => {
  assert.deepEqual(validateDescriptor(TRADER_DESCRIPTOR), []);
  assert.equal(TRADER_DESCRIPTOR.kind, 'trader');
  assert.equal(TRADER_DESCRIPTOR.variants.length, 1);
  assert.equal(TRADER_DESCRIPTOR.variants[0].id, 'trader');
});

// ── Golden snapshots ────────────────────────────────────────────────────────

test('golden snapshot: bear mob (single faction-darkened cylinder body)', () => {
  const records = recordsForEntity(normalizeDescriptor(MOB_DESCRIPTOR), ENTITY('bear'), POS);
  assert.deepEqual(records, [
    { partId: 'bearBody', x: 0, y: 0.14, z: 0, scale: 1, scaleY: 1, color: 0x4d2018 },
  ]);
});

test('golden snapshot: elder bear (body + accent crown)', () => {
  const records = recordsForEntity(normalizeDescriptor(MOB_DESCRIPTOR), ENTITY('bear-elder'), POS);
  assert.deepEqual(records, [
    { partId: 'bearElderBody', x: 0, y: 0.14, z: 0, scale: 1, scaleY: 1, color: 0x4d2018 },
    { partId: 'elderCrown', x: 0, y: 0.30000000000000004, z: 0, scale: 1, scaleY: 1, color: 0xb84530 }, // y = 0.275 bottom + 0.025 base (1-ulp drift)
  ]);
});

test('golden snapshot: scorpion queen and goose', () => {
  const normalized = normalizeDescriptor(MOB_DESCRIPTOR);
  const queen = recordsForEntity(normalized, ENTITY('scorpion-queen'), POS);
  assert.deepEqual(queen, [
    { partId: 'scorpionQueenBody', x: 0, y: 0.14, z: 0, scale: 1, scaleY: 1, color: 0x4d2018 },
    { partId: 'queenGem', x: 0, y: 0.3, z: 0, scale: 1, scaleY: 1, color: 0xb84530 },
  ]);
  const goose = recordsForEntity(normalized, ENTITY('goose'), POS);
  assert.deepEqual(goose, [{ partId: 'gooseBody', x: 0, y: 0.25, z: 0, scale: 1, scaleY: 1, color: 0x4d2018 }]);
});

test('golden snapshot: trader (flat teal coin, the old piece body)', () => {
  const records = recordsForEntity(normalizeDescriptor(TRADER_DESCRIPTOR), { scale: 1 }, POS);
  assert.deepEqual(records, [
    { partId: 'traderBody', x: 0, y: 0.05, z: 0, scale: 1, scaleY: 1, color: 0x4abf99 },
  ]);
});

// ── Variant + color semantics ───────────────────────────────────────────────

test('unknown archetype falls back to the default cylinder', () => {
  const records = recordsForEntity(normalizeDescriptor(MOB_DESCRIPTOR), ENTITY('blob'), POS);
  assert.deepEqual(records.map((r) => r.partId), ['defaultBody']);
});

test('entity scale flows into the instance scale (elder/queen are bigger)', () => {
  const records = recordsForEntity(normalizeDescriptor(MOB_DESCRIPTOR), { archetype: 'bear', scale: 1.4, colors: { factionBody: 0x4d2018 } }, POS);
  assert.equal(records[0].scale, 1.4);
  assert.equal(records[0].scaleY, 1.4);
});

test('recordsForEntity is deterministic; hidden displacement yields no records', () => {
  const normalized = normalizeDescriptor(MOB_DESCRIPTOR);
  assert.deepEqual(recordsForEntity(normalized, ENTITY('tapir'), POS), recordsForEntity(normalized, ENTITY('tapir'), POS));
  assert.deepEqual(recordsForEntity(normalized, ENTITY('tapir'), POS, { hidden: true }), []);
});

test('factionBody resolves to the darkened faction base (old MOB_COLOR_DARKEN)', () => {
  const normalized = normalizeDescriptor(MOB_DESCRIPTOR);
  const darken = (hex, f) => {
    const ch = (s) => Math.round(((hex >> s) & 0xff) * f);
    return (ch(16) << 16) | (ch(8) << 8) | ch(0);
  };
  const base = 0x6e2e22; // CRU faction base
  const records = recordsForEntity(normalized, { archetype: 'bear', colors: { factionBody: darken(base, 0.7) } }, POS);
  assert.equal(records[0].color, darken(base, 0.7));
});

// ── Game path ───────────────────────────────────────────────────────────────

test('buildUnitMeshes renders mobs and traders through the descriptor pipeline', () => {
  // state.tiles in the game is a "q,r"-keyed accessor (the tile proxy) — mirror
  // it with a plain object here.
  const state = {
    tiles: {
      '0,0': { q: 0, r: 0, terrain: 'plains' },
      '2,1': { q: 2, r: 1, terrain: 'plains' },
      '5,3': { q: 5, r: 3, terrain: 'plains' },
      '7,4': { q: 7, r: 4, terrain: 'plains' },
    },
    champions: [],
    mobs: [
      { id: 'm1', pos: { q: 0, r: 0 }, faction: 0, archetypeName: 'bear', visualScale: 1 },            // CRU bear
      { id: 'm2', pos: { q: 2, r: 1 }, faction: 5, archetypeName: 'bear', tier: 2, visualScale: 1.4 }, // elder bear
      { id: 'm3', pos: { q: 5, r: 3 }, faction: 1, archetypeName: 'goose', visualScale: 1 },           // REV goose
    ],
    traders: [{ id: 't1', pos: { q: 7, r: 4 } }],
  };
  const meshes = buildUnitMeshes(state, new Set(['0,0', '2,1', '5,3', '7,4']));

  const byName = (name) => meshes.filter((m) => m.name === name);
  assert.equal(byName('mob-bearBody').length, 1);
  assert.equal(byName('mob-bearBody')[0].count, 1, 'one regular bear');
  assert.equal(byName('mob-bearElderBody').length, 1, 'elder bear has its own body variant');
  assert.equal(byName('mob-elderCrown').length, 1);
  assert.equal(byName('mob-gooseBody').length, 1);
  assert.equal(byName('trader-traderBody').length, 1);

  // Icon caps: bear + elder share the bear icon, one mesh each per icon.
  assert.equal(byName('pieceCap_bear').length, 1);
  assert.equal(byName('pieceCap_bear')[0].count, 2);
  assert.equal(byName('pieceCap_goose').length, 1);
  assert.equal(byName('pieceCap_trader').length, 1);

  // Mob bodies: white material + per-instance faction color. CRU bear body is
  // the darkened CRU base; the elder's crown carries the CRU accent; the REV
  // goose body the darkened REV base — the entity mapping must provide both
  // factionBody and factionAccent tokens.
  const bear = byName('mob-bearBody')[0];
  assert.equal(bear.material.color.getHex(), 0xffffff);
  assert.ok(bear.instanceColor, 'mob bodies carry per-instance faction colors');
  assert.equal(instanceColorAt(bear, 0), darken(hexColor(FACTIONS[0].base), 0.7), 'CRU bear body color');

  const crown = byName('mob-elderCrown')[0];
  assert.equal(instanceColorAt(crown, 0), hexColor(FACTIONS[5].color), 'elder crown carries its mob faction accent');

  const goose = byName('mob-gooseBody')[0];
  assert.equal(instanceColorAt(goose, 0), darken(hexColor(FACTIONS[1].base), 0.7), 'REV goose body color');

  // Trader: white material + fixed teal instance color.
  const trader = byName('trader-traderBody')[0];
  assert.equal(trader.material.color.getHex(), 0xffffff);
  assert.ok(trader.instanceColor);
  assert.equal(instanceColorAt(trader, 0), 0x4abf99, 'trader teal');
});
