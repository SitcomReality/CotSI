/**
 * descriptorAllContent.test.js — Every migrated descriptor renders through the
 * game's descriptor pipeline.
 *
 * The editor loads ALL_DESCRIPTORS and the game consumes the same data via
 * descriptors/gameBuilder.js (tile-driven) and the entity record path
 * (recordBuilder.recordsForEntity — bases, and later champions/mobs/traders).
 * This test builds one synthetic tile per tile-driven descriptor, and one
 * synthetic entity per entity-driven descriptor, and asserts each object
 * produces at least one InstancedMesh with instances — the "every existing
 * object is loadable and renderable" half of the end-to-end requirement,
 * verified mechanically in Node.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_DESCRIPTORS } from '../../../src/render/hexmap3d/worldObjects/descriptors/data/index.js';
import { buildChunkDescriptorFeatureMeshes } from '../../../src/render/hexmap3d/worldObjects/descriptors/gameBuilder.js';
import { normalizeDescriptor } from '../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { recordsForEntity } from '../../../src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js';
import { buildDescriptorMeshes } from '../../../src/render/hexmap3d/worldObjects/descriptors/meshAssembly.js';

const NON_TILE_KINDS = new Set(['base', 'champion', 'mob', 'trader', 'item']);

test('ALL_DESCRIPTORS covers every migrated object (features + decor + mountain + knot + entity + item kinds)', () => {
  assert.equal(ALL_DESCRIPTORS.length, 51);
  const kinds = new Set(ALL_DESCRIPTORS.map((d) => d.kind));
  assert.ok(kinds.has('feature') && kinds.has('decor') && kinds.has('mountain'), 'all tile-driven kinds present');
  assert.ok(kinds.has('base') && kinds.has('champion') && kinds.has('mob') && kinds.has('trader'), 'all entity kinds present');
  assert.ok(kinds.has('item'), 'item (equipment icon) kind present');
});

test('every tile-driven descriptor renders an InstancedMesh through the game pipeline', () => {
  const tiles = [];
  let q = 0;
  let r = 0;
  const push = (tile) => {
    tiles.push({ q, r, ...tile });
    q += 1;
    r += 3;
  };

  // The supernatural refs are zeroed under the natural biomes (only the two
  // supernatural biomes select them), so the land decorators render their native
  // content on biome_default. water/ice/river are BARE on natural biomes — they
  // need a supernatural biome to show the folded-in pools, otherwise they'd
  // render nothing and fail the "at least one mesh" assertion below.
  for (const d of ALL_DESCRIPTORS) {
    if (NON_TILE_KINDS.has(d.kind)) continue; // covered by the entity test below
    if (d.id === 'mountain') push({ terrain: 'mountain', mountainType: 'normal' });
    else if (d.id === 'forest') push({ terrain: 'forest', moisture: 0.6, biomeId: 'biome_default' });
    else if (d.id === 'deepWood') push({ terrain: 'deepWood', moisture: 0.6, biomeId: 'biome_default' });
    else if (d.id === 'hill') push({ terrain: 'hill', biomeId: 'biome_default' });
    else if (d.id === 'knot') push({ terrain: 'forest', feature: { kind: 'knot' } });
    else if (d.id === 'marsh') push({ terrain: 'marsh', biomeId: 'biome_default' });
    else if (d.id === 'plateau') push({ terrain: 'plateau', biomeId: 'biome_default' });
    else if (d.id === 'plains') push({ terrain: 'plains', biomeId: 'biome_default' });
    else if (d.id === 'desert') push({ terrain: 'desert', biomeId: 'biome_default' });
    else if (d.id === 'beach') push({ terrain: 'beach', biomeId: 'biome_default' });
    else if (d.id === 'water') push({ terrain: 'water', biomeId: 'biome_titanstain' });
    else if (d.id === 'ice') push({ terrain: 'ice', biomeId: 'biome_titanstain' });
    else if (d.id === 'river') push({ terrain: 'river', biomeId: 'biome_titanstain' });
    else push({ terrain: 'plains', feature: { kind: d.id } }); // tree/simple features
  }

  const visible = new Set(tiles.map((t) => `${t.q},${t.r}`));
  const meshes = buildChunkDescriptorFeatureMeshes(tiles, visible, new Set());
  assert.ok(meshes.length >= ALL_DESCRIPTORS.length - NON_TILE_KINDS.size, 'at least one mesh per tile-driven descriptor');

  for (const d of ALL_DESCRIPTORS) {
    if (NON_TILE_KINDS.has(d.kind)) continue;
    const own = meshes.filter((m) => m.name.startsWith(`${d.id}-`));
    assert.ok(own.length >= 1, `${d.id} renders at least one mesh`);
    for (const mesh of own) {
      assert.ok(mesh.count >= 1, `${d.id} mesh "${mesh.name}" has instances`);
    }
  }

  // Woods decor renders trunk + canopy parts (ids carry the motif prefix under
  // the v6 migration, so match by substring; gnarled trunks are -trunk-base/
  // -trunk-upper and the marshwood/violetwood canopies are -crown).
  const hasPart = (prefix, needles) => meshes.some((m) => m.name.startsWith(prefix) && needles.some((n) => m.name.includes(n)));
  const TRUNK = ['-trunk'];
  const CANOPY = ['-canopy', '-crown'];
  assert.ok(hasPart('forest-', TRUNK) && hasPart('forest-', CANOPY), 'forest trunk/canopy parts');
  assert.ok(hasPart('deepWood-', TRUNK) && hasPart('deepWood-', CANOPY), 'deepWood trunk/canopy parts');
  // The knot renders one mesh per authored part (parts are edited in the
  // geometry editor) — derive the expectation from the descriptor so adding
  // or removing a part never leaves this test stale.
  const knotDesc = ALL_DESCRIPTORS.find((d) => d.id === 'knot');
  assert.ok(knotDesc, 'knot descriptor present');
  for (const part of knotDesc.parts) {
    assert.ok(meshes.some((m) => m.name.startsWith(`knot-${part.id}`)), `knot part "${part.id}" renders a mesh`);
  }
  assert.equal(meshes.filter((m) => m.name.startsWith('mountain-')).length, 1, 'one mountain mesh');
});

test('every non-tile descriptor renders an InstancedMesh through the record path', () => {
  const entity = {
    faction: 'CRU',
    archetype: 'infernalpaca',
    scale: 1,
    color: 0xffffff,
    colors: { factionBase: 0x6e2e22, factionAccent: 0xb84530 },
  };
  const entities = ALL_DESCRIPTORS.filter((d) => NON_TILE_KINDS.has(d.kind));
  assert.ok(entities.length >= 1, 'at least one entity descriptor');
  for (const d of entities) {
    const normalized = normalizeDescriptor(d);
    const records = recordsForEntity(normalized, entity, { x: 0, y: 1, z: 0 });
    assert.ok(records.length >= 1, `${d.id} produces records for an entity`);
    const meshes = buildDescriptorMeshes(normalized, records, d.id);
    assert.ok(meshes.length >= 1, `${d.id} renders at least one mesh`);
    for (const mesh of meshes) {
      assert.ok(mesh.count >= 1, `${d.id} mesh "${mesh.name}" has instances`);
    }
  }
});
