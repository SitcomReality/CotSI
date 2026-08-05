import { buildTreeMeshes, buildChunkTreeMeshes } from './trees/index.js';
import { buildMountainMeshes, buildChunkMountainMeshes } from './mountainMeshes.js';
import { buildKnotMeshes, buildChunkKnotMeshes } from './knotMeshes.js';
import { buildBaseMeshes, buildChunkBaseMeshes } from './baseMeshes.js';
import { buildSimpleFeatureMeshes, buildChunkSimpleFeatureMeshes } from './simpleFeatureMeshes.js';
import { buildHillDecorMeshes, buildChunkHillDecorMeshes } from './hillDecorMeshes.js';
import { addOutlines } from '../scene/outline.js';
import { occupiedKeys } from './decorEmphasis.js';

export {
  buildTreeMeshes, buildMountainMeshes, buildKnotMeshes, buildBaseMeshes,
  buildSimpleFeatureMeshes, buildHillDecorMeshes,
  buildChunkTreeMeshes, buildChunkMountainMeshes, buildChunkKnotMeshes, buildChunkBaseMeshes,
  buildChunkSimpleFeatureMeshes, buildChunkHillDecorMeshes,
};

/**
 * Build all feature InstancedMeshes for the current game state.
 * Returns an array of meshes to add to the scene.
 */
export function buildFeatureMeshes(state, visible) {
  const results = [];
  const occupants = occupiedKeys(state);

  results.push(...buildTreeMeshes(state, visible, occupants));
  results.push(...buildMountainMeshes(state, visible));
  results.push(...buildKnotMeshes(state, visible, occupants));
  results.push(...buildBaseMeshes(state, visible));
  results.push(...buildSimpleFeatureMeshes(state, visible, occupants));
  results.push(...buildHillDecorMeshes(state, visible, occupants));

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
  results.push(...buildChunkMountainMeshes(chunkTiles, visible));
  results.push(...buildChunkKnotMeshes(chunkTiles, visible, occupants));
  results.push(...buildChunkBaseMeshes(chunkTiles, visible));
  results.push(...buildChunkSimpleFeatureMeshes(chunkTiles, visible, occupants));
  results.push(...buildChunkHillDecorMeshes(chunkTiles, visible, occupants));

  // Ink-outline twins for every feature mesh (units + features coverage —
  // see aestheticConventions §11). addOutlines returns [source, ...hulls].
  return results.flatMap(addOutlines);
}
