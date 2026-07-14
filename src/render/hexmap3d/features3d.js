import { buildTreeMeshes } from './trees.js';
import { buildMountainMeshes } from './mountains.js';
import { buildKnotMeshes } from './knots.js';
import { buildBaseMeshes } from './bases.js';

export { buildTreeMeshes, buildMountainMeshes, buildKnotMeshes, buildBaseMeshes };

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

  return results;
}