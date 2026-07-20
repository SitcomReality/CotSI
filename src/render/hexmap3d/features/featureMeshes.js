import { buildTreeMeshes } from './treeMeshes.js';
import { buildMountainMeshes } from './mountainMeshes.js';
import { buildKnotMeshes } from './knotMeshes.js';
import { buildBaseMeshes } from './baseMeshes.js';
import { buildDebrisMeshes } from './debrisMeshes.js';

export { buildTreeMeshes, buildMountainMeshes, buildKnotMeshes, buildBaseMeshes, buildDebrisMeshes };

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

  return results;
}
