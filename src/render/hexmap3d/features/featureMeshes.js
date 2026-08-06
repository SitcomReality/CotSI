import { buildTreeMeshes, buildChunkTreeMeshes } from './trees/index.js';
import { buildBaseMeshes, buildChunkBaseMeshes } from './baseMeshes.js';
import { buildDescriptorFeatureMeshes, buildChunkDescriptorFeatureMeshes } from './descriptors/gameBuilder.js';
import { addOutlines } from '../scene/outline.js';
import { occupiedKeys } from './decorEmphasis.js';

export {
  buildTreeMeshes, buildBaseMeshes, buildDescriptorFeatureMeshes,
  buildChunkTreeMeshes, buildChunkBaseMeshes, buildChunkDescriptorFeatureMeshes,
};

/**
 * Build all feature InstancedMeshes for the current game state.
 * Returns an array of meshes to add to the scene.
 *
 * Feature geometry now comes from descriptor data (descriptors/gameBuilder.js)
 * for every migrated object — simple features, knots, mountains, hill mounds,
 * groves, solitary trees. The tree builder keeps only the legacy procedural
 * treatments (fruit trees, Painforest gnarled groves); baseMeshes renders
 * champion bases through the same generic pipeline (descriptors/data/bases.js).
 */
export function buildFeatureMeshes(state, visible) {
  const results = [];
  const occupants = occupiedKeys(state);

  results.push(...buildTreeMeshes(state, visible, occupants));
  results.push(...buildDescriptorFeatureMeshes(state, visible, occupants));
  results.push(...buildBaseMeshes(state, visible));

  return results;
}

/**
 * Build feature meshes for a single chunk's tiles.
 * @param {object[]} chunkTiles - Array of tile objects in this chunk
 * @param {object} state - Game state (occupant positions for de-emphasis)
 * @param {Set<string>} visible - Set of hex keys currently visible
 * @returns {(THREE.InstancedMesh|THREE.Group)[]}
 */
export function buildChunkFeatureMeshes(chunkTiles, state, visible) {
  const results = [];
  const occupants = occupiedKeys(state);

  results.push(...buildChunkTreeMeshes(chunkTiles, visible, occupants));
  results.push(...buildChunkDescriptorFeatureMeshes(chunkTiles, visible, occupants));
  results.push(...buildChunkBaseMeshes(chunkTiles, visible));

  // Ink-outline twins for every feature mesh (units + features coverage —
  // see aestheticConventions §11). addOutlines returns [source, ...hulls].
  return results.flatMap(addOutlines);
}
