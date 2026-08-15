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

  for (const d of ALL_DESCRIPTORS) {
    if (NON_TILE_KINDS.has(d.kind)) continue; // covered by the entity test below
    if (d.id === 'mountain') push({ terrain: 'mountain', mountainType: 'normal' });
    else if (d.id === 'grove') push({ terrain: 'forest', moisture: 0.6 });
    else if (d.id === 'hill') push({ terrain: 'hill' });
    else if (d.id === 'knot') push({ terrain: 'forest', feature: { kind: 'knot' } });
    else if (d.id === 'marshReeds') push({ terrain: 'marsh' });
    else if (d.id === 'plateauMound') push({ terrain: 'plateau' });
    else if (d.id === 'plainsGrass') push({ terrain: 'plains' });
    else if (d.id === 'desertScrub') push({ terrain: 'desert' });
    else if (d.id === 'beachDriftwood') push({ terrain: 'beach' });
    else if (d.id === 'titanflesh') push({ terrain: 'plains', biomeId: 'biome_titanstain' });
    else if (d.id === 'titanblood') push({ terrain: 'water', biomeId: 'biome_titanstain' });
    else if (d.id === 'unfinishedScrap') push({ terrain: 'plains', biomeId: 'biome_unfinished_lands' });
    else if (d.id === 'forespring') push({ terrain: 'water', biomeId: 'biome_unfinished_lands' });
    else push({ terrain: 'plains', feature: { kind: d.id } }); // tree/simple features
  }

  const visible = new Set(tiles.map((t) => `${t.q},${t.r}`));
  // The supernatural biome decor overrides (the render layer receives these
  // from state — gameFactory collects them from the biome archetypes).
  const decorOverrides = new Map([
    ['biome_titanstain', { plains: 'titanflesh', water: 'titanblood' }],
    ['biome_unfinished_lands', { plains: 'unfinishedScrap', water: 'forespring' }],
  ]);
  const meshes = buildChunkDescriptorFeatureMeshes(tiles, visible, new Set(), undefined, null, null, decorOverrides);
  assert.ok(meshes.length >= ALL_DESCRIPTORS.length - NON_TILE_KINDS.size, 'at least one mesh per tile-driven descriptor');

  for (const d of ALL_DESCRIPTORS) {
    if (NON_TILE_KINDS.has(d.kind)) continue;
    const own = meshes.filter((m) => m.name.startsWith(`${d.id}-`));
    assert.ok(own.length >= 1, `${d.id} renders at least one mesh`);
    for (const mesh of own) {
      assert.ok(mesh.count >= 1, `${d.id} mesh "${mesh.name}" has instances`);
    }
  }

  // Grove parts pair up (one canopy per trunk); knot hovers; mountain is a
  // single hex-tiling mesh.
  const groveTrunk = meshes.find((m) => m.name === 'grove-trunk');
  const groveCanopyRound = meshes.find((m) => m.name === 'grove-canopy-round');
  assert.ok(groveTrunk && groveCanopyRound && groveTrunk.count === groveCanopyRound.count, 'grove trunk/canopy pair');
  const knots = meshes.filter((m) => m.name.startsWith('knot-'));
  assert.equal(knots.length, 1, 'one knot mesh');
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
