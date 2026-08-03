import { buildTreeMeshes, buildChunkTreeMeshes } from './trees/index.js';
import { buildMountainMeshes, buildChunkMountainMeshes } from './mountainMeshes.js';
import { buildKnotMeshes, buildChunkKnotMeshes } from './knotMeshes.js';
import { buildBaseMeshes, buildChunkBaseMeshes } from './baseMeshes.js';
import { buildDebrisMeshes, buildChunkDebrisMeshes } from './debrisMeshes.js';
import { buildSimpleFeatureMeshes, buildChunkSimpleFeatureMeshes } from './simpleFeatureMeshes.js';

export {
  buildTreeMeshes, buildMountainMeshes, buildKnotMeshes, buildBaseMeshes, buildDebrisMeshes,
  buildSimpleFeatureMeshes,
  buildChunkTreeMeshes, buildChunkMountainMeshes, buildChunkKnotMeshes, buildChunkBaseMeshes,
  buildChunkDebrisMeshes, buildChunkSimpleFeatureMeshes,
};

/**
 * Build all feature InstancedMeshes for the current game state.
 * Returns an array of meshes to add to the scene.
 */
export function buildFeatureMeshes(state, visible) {
  const results = [];

  results.push(...buildTreeMeshes(state, visible));
  results.push(...buildMountainMeshes(state, visible));
  results.push(...buildKnotMeshes(state, visible));
  results.push(...buildBaseMeshes(state, visible));
  results.push(...buildDebrisMeshes(state, visible));
  results.push(...buildSimpleFeatureMeshes(state, visible));

  return results;
}

/**
 * Build feature meshes for a single chunk's tiles.
 * @param {object[]} chunkTiles - Array of tile objects in this chunk
 * @param {object} state - Game state (unused here, kept for API symmetry)
 * @param {Set<string>} visible - Set of hex keys currently visible
 * @returns {(THREE.InstancedMesh|THREE.Group)[]}
 */
export function buildChunkFeatureMeshes(chunkTiles, _state, visible) {
  const results = [];

  results.push(...buildChunkTreeMeshes(chunkTiles, visible));
  results.push(...buildChunkMountainMeshes(chunkTiles, visible));
  results.push(...buildChunkKnotMeshes(chunkTiles, visible));
  results.push(...buildChunkBaseMeshes(chunkTiles, visible));
  results.push(...buildChunkDebrisMeshes(chunkTiles, visible));
  results.push(...buildChunkSimpleFeatureMeshes(chunkTiles, visible));

  return results;
}
