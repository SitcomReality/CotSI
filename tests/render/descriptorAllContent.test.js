/**
 * descriptorAllContent.test.js — Every migrated descriptor renders through the
 * game's descriptor pipeline.
 *
 * The editor loads ALL_DESCRIPTORS and the game consumes the same data via
 * descriptors/gameBuilder.js. This test builds one synthetic tile per
 * descriptor (a feature tile for each archetype, a grove forest tile, a hill
 * tile, a mountain tile, a knot tile) and asserts each object produces at
 * least one InstancedMesh with instances through the game path — the
 * "every existing object is loadable and renderable" half of the end-to-end
 * requirement, verified mechanically in Node.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_DESCRIPTORS } from '../../src/render/hexmap3d/features/descriptors/data/index.js';
import { buildChunkDescriptorFeatureMeshes } from '../../src/render/hexmap3d/features/descriptors/gameBuilder.js';

test('ALL_DESCRIPTORS covers every migrated object (26 features + 2 decor + mountain + knot)', () => {
  assert.equal(ALL_DESCRIPTORS.length, 32);
  const kinds = new Set(ALL_DESCRIPTORS.map((d) => d.kind));
  assert.ok(kinds.has('feature') && kinds.has('decor') && kinds.has('mountain'), 'all object kinds present');
});

test('every descriptor renders an InstancedMesh through the game pipeline', () => {
  // One distinct tile per descriptor; spread coords so no two tiles collide.
  const tiles = [];
  let q = 0;
  let r = 0;
  const push = (tile) => {
    tiles.push({ q, r, ...tile });
    q += 1;
    r += 3;
  };

  for (const d of ALL_DESCRIPTORS) {
    if (d.id === 'mountain') push({ terrain: 'mountain', mountainType: 'normal' });
    else if (d.id === 'grove') push({ terrain: 'forest', moisture: 0.6 });
    else if (d.id === 'hill') push({ terrain: 'hill' });
    else if (d.id === 'knot') push({ terrain: 'forest', feature: { kind: 'knot' } });
    else push({ terrain: 'plains', feature: { kind: d.id } }); // tree/largeTree/simple features
  }

  const visible = new Set(tiles.map((t) => `${t.q},${t.r}`));
  const meshes = buildChunkDescriptorFeatureMeshes(tiles, visible, new Set());
  assert.ok(meshes.length >= ALL_DESCRIPTORS.length, `at least one mesh per descriptor (got ${meshes.length})`);

  for (const d of ALL_DESCRIPTORS) {
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
