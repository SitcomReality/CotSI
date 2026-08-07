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
import { ALL_DESCRIPTORS } from '../../src/render/hexmap3d/features/descriptors/data/index.js';
import { buildChunkDescriptorFeatureMeshes } from '../../src/render/hexmap3d/features/descriptors/gameBuilder.js';
import { normalizeDescriptor } from '../../src/render/hexmap3d/features/descriptors/schema.js';
import { recordsForEntity } from '../../src/render/hexmap3d/features/descriptors/recordBuilder.js';
import { buildDescriptorMeshes } from '../../src/render/hexmap3d/features/descriptors/meshAssembly.js';

const ENTITY_KINDS = new Set(['base', 'champion', 'mob', 'trader']);

test('ALL_DESCRIPTORS covers every migrated object (27 features + 2 decor + mountain + knot + base + champion + mob + trader)', () => {
  assert.equal(ALL_DESCRIPTORS.length, 37);
  const kinds = new Set(ALL_DESCRIPTORS.map((d) => d.kind));
  assert.ok(kinds.has('feature') && kinds.has('decor') && kinds.has('mountain'), 'all tile-driven kinds present');
  assert.ok(kinds.has('base') && kinds.has('champion') && kinds.has('mob') && kinds.has('trader'), 'all entity kinds present');
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
    if (ENTITY_KINDS.has(d.kind)) continue; // covered by the entity test below
    if (d.id === 'mountain') push({ terrain: 'mountain', mountainType: 'normal' });
    else if (d.id === 'grove') push({ terrain: 'forest', moisture: 0.6 });
    else if (d.id === 'hill') push({ terrain: 'hill' });
    else if (d.id === 'knot') push({ terrain: 'forest', feature: { kind: 'knot' } });
    else push({ terrain: 'plains', feature: { kind: d.id } }); // tree/largeTree/simple features
  }

  const visible = new Set(tiles.map((t) => `${t.q},${t.r}`));
  const meshes = buildChunkDescriptorFeatureMeshes(tiles, visible, new Set());
  assert.ok(meshes.length >= ALL_DESCRIPTORS.length - ENTITY_KINDS.size, 'at least one mesh per tile-driven descriptor');

  for (const d of ALL_DESCRIPTORS) {
    if (ENTITY_KINDS.has(d.kind)) continue;
    const own = meshes.filter((m) => m.name.startsWith(`${d.id}-`));
    assert.ok(own.length >= 1, `${d.id} renders at least one mesh`);
    for (const mesh of own) {
      assert.ok(mesh.count >= 1, `${d.id} mesh "${mesh.name}" has instances`);
    }
  }

  // Grove parts pair up (one canopy per trunk); knot hovers; mountain is a
  // single hex-tiling mesh.
  const groveTrunk = meshes.find((m) => m.name === 'grove-trunk');
  const groveCanopy = meshes.find((m) => m.name === 'grove-canopy');
  assert.ok(groveTrunk && groveCanopy && groveTrunk.count === groveCanopy.count, 'grove trunk/canopy pair');
  const knots = meshes.filter((m) => m.name.startsWith('knot-'));
  assert.equal(knots.length, 1, 'one knot mesh');
  assert.equal(meshes.filter((m) => m.name.startsWith('mountain-')).length, 1, 'one mountain mesh');
});

test('every entity descriptor renders an InstancedMesh through the entity path', () => {
  const entity = {
    faction: 'CRU',
    archetype: 'bear',
    scale: 1,
    color: 0xffffff,
    colors: { factionBase: 0x6e2e22, factionAccent: 0xb84530 },
  };
  const entities = ALL_DESCRIPTORS.filter((d) => ENTITY_KINDS.has(d.kind));
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
