/**
 * renameIds.test.js — Id renames with reference rewrites for the geometry
 * editor (dev/tools/geometryEditor/ui/renameIds.js). Pure descriptor data —
 * no DOM — so it runs in the Node suite.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renameNodeId,
  renameVariantId,
  renameMotifId,
} from '../../../dev/tools/geometryEditor/ui/renameIds.js';

test('renameNodeId renames a node and rewrites the owning choice point default', () => {
  const parts = [
    { id: 'trunk', shape: 'cylinder' },
    {
      id: 'arms', seed: 101, default: 'two',
      alternatives: [
        { id: 'none', weight: 0.25, parts: [] },
        { id: 'two', weight: 0.3, parts: [{ id: 'arm-a', shape: 'cylinder' }] },
      ],
    },
  ];
  // Rename an option — the choice point's default follows.
  renameNodeId(parts, 'two', 'two-straight');
  assert.equal(parts[1].default, 'two-straight');
  assert.equal(parts[1].alternatives[1].id, 'two-straight');
  // Rename a plain part.
  renameNodeId(parts, 'arm-a', 'arm-left');
  assert.equal(parts[1].alternatives[1].parts[0].id, 'arm-left');
  // Rename the choice point itself.
  renameNodeId(parts, 'arms', 'cactus-arms');
  assert.equal(parts[1].id, 'cactus-arms');
  // Unrelated ids are untouched.
  assert.equal(parts[0].id, 'trunk');
  assert.equal(parts[1].alternatives[0].id, 'none');
});

test('renameVariantId rewrites biomeVariants pins that named it', () => {
  const d = {
    variants: [
      { id: 'round', parts: [] },
      { id: 'dead', parts: [] },
    ],
    biomeVariants: { biome_painforest: 'dead', biome_tundra: 'dead' },
  };
  renameVariantId(d, 'dead', 'deadwood');
  assert.deepEqual(d.variants.map((v) => v.id), ['round', 'deadwood']);
  assert.deepEqual(d.biomeVariants, { biome_painforest: 'deadwood', biome_tundra: 'deadwood' });
});

test('renameMotifId rewrites pins and the motif-scoped storage prefixes on its parts', () => {
  const d = {
    motifs: [
      {
        id: 'cactus', weight: 0.4, parts: [
          { id: 'cactus-trunk', shape: 'cylinder' },
          {
            id: 'cactus-arms', seed: 101, default: 'two',
            alternatives: [
              { id: 'none', weight: 0.25, parts: [] },
              { id: 'two', weight: 0.3, parts: [{ id: 'cactus-arm-a', shape: 'cylinder' }] },
            ],
          },
        ],
      },
      { id: 'rock', weight: 0.45, parts: [{ id: 'rock-shard', shape: 'dodecahedron' }] },
    ],
    biomeVariants: { biome_sere_wastes: 'cactus' },
  };
  renameMotifId(d, 'cactus', 'succulent');
  // The motif itself + the pin.
  assert.equal(d.motifs[0].id, 'succulent');
  assert.deepEqual(d.biomeVariants, { biome_sere_wastes: 'succulent' });
  // Storage-prefixed parts follow the rename; other motifs' parts do not.
  const cactusParts = d.motifs[0].parts;
  assert.equal(cactusParts[0].id, 'succulent-trunk');
  assert.equal(cactusParts[1].id, 'succulent-arms');
  assert.equal(cactusParts[1].alternatives[1].parts[0].id, 'succulent-arm-a');
  assert.equal(d.motifs[1].parts[0].id, 'rock-shard');
  // Unprefixed option ids are untouched.
  assert.equal(cactusParts[1].alternatives[0].id, 'none');
  assert.equal(cactusParts[1].default, 'two');
});
