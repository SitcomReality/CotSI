/**
 * descriptorMob.test.js — Mob descriptor data and the entity record path,
 * mirroring descriptorBase/descriptorChampion.
 *
 * Mobs live one file per archetype under `data/mobs/` (a `<NAME>_VARIANT`
 * block each), composed by the `data/mob.js` barrel into a single descriptor
 * with one variant per archetype shape. The roster is exactly: mushroom,
 * infernalpaca, leopard, goose, scorpelican, snail, tapir — plus the
 * `default` fallback. Tier-2 variants are gone; the infernalpaca carries a
 * variant-level emissive material, scorpelican and the others don't.
 * Mobs keep their baked SVG icon caps (pieceIcons.js, unchanged) riding on
 * top of each 3D body.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../src/vendor/three.module.js';
import { normalizeDescriptor, validateDescriptor } from '../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { recordsForEntity } from '../../src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js';
import { buildDescriptorMeshes } from '../../src/render/hexmap3d/worldObjects/descriptors/meshAssembly.js';
import { MOB_DESCRIPTOR, MOB_VARIANTS } from '../../src/render/hexmap3d/worldObjects/descriptors/data/mob.js';
import { INFERNALPACA_VARIANT } from '../../src/render/hexmap3d/worldObjects/descriptors/data/mobs/infernalpaca.js';
import { SCORPELICAN_VARIANT } from '../../src/render/hexmap3d/worldObjects/descriptors/data/mobs/scorpelican.js';
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

/** The seven archetype shape keys (variant ids), minus the fallback. */
const ARCHETYPE_SHAPES = ['infernalpaca', 'leopard', 'goose', 'scorpelican', 'snail', 'tapir', 'mushroom'];

// ── Data shape ──────────────────────────────────────────────────────────────

test('mob descriptor validates and has every archetype variant', () => {
  assert.deepEqual(validateDescriptor(MOB_DESCRIPTOR), []);
  const ids = new Set(MOB_DESCRIPTOR.variants.map((v) => v.id));
  assert.ok(ids.has('default'), 'fallback variant present');
  for (const shape of ARCHETYPE_SHAPES) {
    assert.ok(ids.has(shape), `missing variant "${shape}"`);
  }
  assert.equal(MOB_DESCRIPTOR.variants.length, ARCHETYPE_SHAPES.length + 1);
  assert.equal(MOB_DESCRIPTOR.kind, 'mob');
  assert.equal(MOB_DESCRIPTOR.variantRule, 'archetype');
  assert.deepEqual(validateDescriptor(INFERNALPACA_VARIANT_AS_DESCRIPTOR()), []);
  assert.deepEqual(validateDescriptor(SCORPELICAN_VARIANT_AS_DESCRIPTOR()), []);
});

/** Wrap a variant block as a standalone descriptor so validateDescriptor sees it. */
function VARIANT_AS_DESCRIPTOR(variant) {
  return { id: 'probe', kind: 'mob', displayName: 'Probe', parts: [{ id: 'probeFallback', shape: 'box' }], variants: [variant] };
}
function INFERNALPACA_VARIANT_AS_DESCRIPTOR() {
  return VARIANT_AS_DESCRIPTOR(INFERNALPACA_VARIANT);
}
function SCORPELICAN_VARIANT_AS_DESCRIPTOR() {
  return VARIANT_AS_DESCRIPTOR(SCORPELICAN_VARIANT);
}

test('MOB_VARIANTS keys match the variant ids and the archetype shapes', () => {
  for (const id of Object.keys(MOB_VARIANTS)) {
    assert.equal(MOB_VARIANTS[id].id, id, `MOB_VARIANTS.${id} carries its own id`);
  }
  const variantIds = new Set(MOB_DESCRIPTOR.variants.map((v) => v.id));
  assert.deepEqual(new Set(Object.keys(MOB_VARIANTS)), variantIds);
});

test('mob part ids are unique per variant (no geometry collisions in meshAssembly)', () => {
  for (const [id, variant] of Object.entries(MOB_VARIANTS)) {
    const ids = [];
    const collect = (node) => {
      if (Array.isArray(node.children)) {
        for (const child of node.children) collect(child);
        return;
      }
      ids.push(node.id);
    };
    for (const part of variant.parts) collect(part);
    assert.ok(ids.length === new Set(ids).size, `${id}: duplicate part ids within variant`);
    for (const pid of ids) {
      const elsewhere = Object.entries(MOB_VARIANTS)
        .filter(([otherId]) => otherId !== id)
        .some(([, otherVariant]) => {
          let found = false;
          const scan = (node) => {
            if (found) return;
            if (Array.isArray(node.children)) {
              for (const child of node.children) scan(child);
              return;
            }
            if (node.id === pid) found = true;
          };
          for (const part of otherVariant.parts) scan(part);
          return found;
        });
      assert.ok(!elsewhere, `${id}: part id "${pid}" must be unique to one variant`);
    }
  }
});

test('variant material is validated (emissive must be an integer color)', () => {
  const bad = VARIANT_AS_DESCRIPTOR({ id: 'glowy', material: { emissive: 'red' }, parts: [{ id: 'p', shape: 'box' }] });
  assert.ok(validateDescriptor(bad).some((e) => e.includes('material')));
  const good = VARIANT_AS_DESCRIPTOR({ id: 'glowy', material: { emissive: 0xff3e00, emissiveIntensity: 0.35 }, parts: [{ id: 'p', shape: 'box' }] });
  assert.deepEqual(validateDescriptor(good), []);
});

test('trader descriptor validates and has one fixed look', () => {
  assert.deepEqual(validateDescriptor(TRADER_DESCRIPTOR), []);
  assert.equal(TRADER_DESCRIPTOR.kind, 'trader');
  assert.equal(TRADER_DESCRIPTOR.variants.length, 1);
  assert.equal(TRADER_DESCRIPTOR.variants[0].id, 'trader');
});

// ── Golden snapshots ────────────────────────────────────────────────────────

test('golden snapshot: goose mob (single faction-darkened cone body)', () => {
  const records = recordsForEntity(normalizeDescriptor(MOB_DESCRIPTOR), ENTITY('goose'), POS);
  assert.deepEqual(records, [
    { partId: 'gooseBody', x: 0, y: 0.25, z: 0, scale: 1, scaleY: 1, color: 0x4d2018 },
  ]);
});

test('golden snapshot: infernalpaca has all 23 parts across its joint tree', () => {
  const records = recordsForEntity(normalizeDescriptor(MOB_DESCRIPTOR), ENTITY('infernalpaca'), POS);
  const partIds = records.map((r) => r.partId).sort();
  assert.deepEqual(partIds, [
    'ear-left-mesh', 'ear-right-mesh', 'eye-left', 'eye-right', 'head-base',
    'horn-left', 'horn-right', 'leg-bl-hoof', 'leg-bl-stem', 'leg-br-hoof',
    'leg-br-stem', 'leg-fl-hoof', 'leg-fl-stem', 'leg-fr-hoof', 'leg-fr-stem',
    'magma-mouth-glow', 'neck-magma-core', 'neck-obsidian-fleece', 'snout',
    'tail-flame-main', 'tail-flame-tip', 'torso-magma-fluff-under', 'torso-main',
  ]);
  // Literal themed colors survive: obsidian torso, magma underbelly, burning eyes.
  const byId = new Map(records.map((r) => [r.partId, r]));
  assert.equal(byId.get('torso-main').color, 0x1f1f24);
  assert.equal(byId.get('torso-magma-fluff-under').color, 0xff5400);
  assert.equal(byId.get('eye-left').color, 0xffea00);
});

test('golden snapshot: scorpelican has all 18 parts across its FK chain', () => {
  const records = recordsForEntity(normalizeDescriptor(MOB_DESCRIPTOR), ENTITY('scorpelican'), POS);
  const partIds = records.map((r) => r.partId).sort();
  assert.deepEqual(partIds, [
    'body-core', 'foot-l', 'foot-r', 'neck-stem', 'pelican-eye-l',
    'pelican-eye-r', 'poison-sac', 'pouch-sag', 'skull', 'stinger-needle',
    'tail-segment-1', 'tail-segment-2', 'tail-segment-3', 'thigh-l', 'thigh-r',
    'upper-beak', 'wing-feather-l', 'wing-feather-r',
  ]);
  // factionBody/factionAccent tokens resolve from the entity palette; the
  // themed leg/beak/tail parts keep their literal colors.
  const byId = new Map(records.map((r) => [r.partId, r]));
  assert.equal(byId.get('body-core').color, 0x4d2018);
  assert.equal(byId.get('wing-feather-l').color, 0xb84530);
  assert.equal(byId.get('thigh-l').color, 0xff8c00);
  assert.equal(byId.get('poison-sac').color, 0x9400d3);
  assert.equal(byId.get('stinger-needle').color, 0x331144);
});

test('golden snapshot: the stinger needle bakes the full FK chain matrix', () => {
  const records = recordsForEntity(normalizeDescriptor(MOB_DESCRIPTOR), ENTITY('scorpelican'), POS);
  const needle = records.find((r) => r.partId === 'stinger-needle');
  assert.ok(needle.matrix, 'nested leaf records carry a baked matrix');
  assert.ok(Array.isArray(needle.matrix) && needle.matrix.length === 16);
  // Column-major; the translation column (indices 12..14) is non-zero and the
  // rotation is non-identity — the tail chain arches the stinger off the body.
  assert.ok(needle.matrix[12] !== 0 || needle.matrix[13] !== 0 || needle.matrix[14] !== 0);
  assert.ok(needle.matrix.some((v, i) => i < 12 && v !== 0));
});

// ── Variant + color semantics ───────────────────────────────────────────────

test('unknown archetype falls back to the default cylinder', () => {
  const records = recordsForEntity(normalizeDescriptor(MOB_DESCRIPTOR), ENTITY('blob'), POS);
  assert.deepEqual(records.map((r) => r.partId), ['defaultBody']);
});

test('entity scale flows into the instance scale', () => {
  const records = recordsForEntity(normalizeDescriptor(MOB_DESCRIPTOR), { archetype: 'goose', scale: 1.4, colors: { factionBody: 0x4d2018 } }, POS);
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
  const base = 0x6e2e22; // CRU faction base
  const records = recordsForEntity(normalized, { archetype: 'leopard', colors: { factionBody: darken(base, 0.7) } }, POS);
  assert.equal(records[0].color, darken(base, 0.7));
});

test('infernalpaca variant material produces an emissive glow; others do not', () => {
  const normalized = normalizeDescriptor(MOB_DESCRIPTOR);
  const glow = buildDescriptorMeshes(normalized, recordsForEntity(normalized, ENTITY('infernalpaca'), POS), 'mob');
  assert.ok(glow.length > 0);
  for (const mesh of glow) {
    assert.equal(mesh.material.emissive.getHex(), 0xff3e00, `infernalpaca part "${mesh.name}" glows`);
    assert.equal(mesh.material.emissiveIntensity, 0.35);
  }
  const plain = buildDescriptorMeshes(normalized, recordsForEntity(normalized, ENTITY('scorpelican'), POS), 'mob');
  for (const mesh of plain) {
    assert.equal(mesh.material.emissive.getHex(), 0x000000, `scorpelican part "${mesh.name}" has no glow`);
  }
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
      { id: 'm1', pos: { q: 0, r: 0 }, faction: 0, archetypeName: 'infernalpaca', visualScale: 1 },   // CRU infernalpaca
      { id: 'm2', pos: { q: 2, r: 1 }, faction: 5, archetypeName: 'scorpelican', visualScale: 1 },    // MAS scorpelican
      { id: 'm3', pos: { q: 5, r: 3 }, faction: 1, archetypeName: 'goose', visualScale: 1 },          // REV goose
    ],
    traders: [{ id: 't1', pos: { q: 7, r: 4 } }],
  };
  const meshes = buildUnitMeshes(state, new Set(['0,0', '2,1', '5,3', '7,4']));

  const byName = (name) => meshes.filter((m) => m.name === name);
  assert.equal(byName('mob-torso-main').length, 1, 'infernalpaca torso renders');
  assert.equal(byName('mob-torso-main')[0].count, 1);
  assert.equal(byName('mob-body-core').length, 1, 'scorpelican body renders');
  assert.equal(byName('mob-gooseBody').length, 1);
  assert.equal(byName('trader-traderBody').length, 1);

  // Icon caps: one mesh per archetype icon, grouped per shape.
  assert.equal(byName('pieceCap_infernalpaca').length, 1);
  assert.equal(byName('pieceCap_infernalpaca')[0].count, 1);
  assert.equal(byName('pieceCap_scorpelican').length, 1);
  assert.equal(byName('pieceCap_goose').length, 1);
  assert.equal(byName('pieceCap_trader').length, 1);

  // Themed literals survive the game path: obsidian torso + emissive glow.
  const torso = byName('mob-torso-main')[0];
  assert.equal(torso.material.color.getHex(), 0xffffff);
  assert.ok(torso.instanceColor, 'mob bodies carry per-instance faction colors');
  assert.equal(instanceColorAt(torso, 0), 0x1f1f24, 'infernalpaca obsidian torso');
  assert.equal(torso.material.emissive.getHex(), 0xff3e00, 'infernalpaca glows in-game');

  // Scorpelican faction tokens: body = darkened MAS base, wing = MAS accent.
  const body = byName('mob-body-core')[0];
  assert.equal(instanceColorAt(body, 0), darken(hexColor(FACTIONS[5].base), 0.7), 'scorpelican body color');
  const wing = byName('mob-wing-feather-l')[0];
  assert.equal(instanceColorAt(wing, 0), hexColor(FACTIONS[5].color), 'scorpelican wing accent');

  // Goose: plain faction-darkened body, no glow.
  const goose = byName('mob-gooseBody')[0];
  assert.equal(instanceColorAt(goose, 0), darken(hexColor(FACTIONS[1].base), 0.7), 'REV goose body color');
  assert.equal(goose.material.emissive.getHex(), 0x000000);

  // Trader: white material + fixed teal instance color.
  const trader = byName('trader-traderBody')[0];
  assert.equal(trader.material.color.getHex(), 0xffffff);
  assert.ok(trader.instanceColor);
  assert.equal(instanceColorAt(trader, 0), 0x4abf99, 'trader teal');
});
