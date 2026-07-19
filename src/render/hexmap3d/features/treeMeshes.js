// src/render/hexmap3d/features/treeMeshes.js
import * as THREE from '../../../vendor/three.module.js';
import { hexCenter3D } from '../hexWorldSpace.js';
import { tileTopY } from '../terrain/terrainMesh.js';
import { getTreeTrunkGeo, getTreeCanopyGeo } from './featureGeometries.js';

/**
 * Collect tree instance data from visible tiles and return InstancedMeshes.
 * @param {Map} state.tiles
 * @param {string[]} visible
 * @returns {THREE.InstancedMesh[]}
 */
export function buildTreeMeshes(state, visible) {
  const trunkInstances = [];
  const canopyInstances = [];

  for (const key of visible) {
    const tile = state.tiles[key];
    if (!tile || !tile.feature || tile.feature.kind !== 'tree') continue;
    const surfaceY = tileTopY(tile.terrain);
    const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);

    // Trunk
    trunkInstances.push({
      x, y: surfaceY + 0.20, z,
      scale: 1.0,
    });

    // Canopy
    canopyInstances.push({
      x, y: surfaceY + 0.50, z,
      scale: 1.0,
    });
  }

  if (trunkInstances.length === 0) return [];

  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B5E3C, flatShading: true });
  const canopyMat = new THREE.MeshLambertMaterial({ color: 0x3CB371, flatShading: true });

  const trunkMesh = new THREE.InstancedMesh(getTreeTrunkGeo(), trunkMat, trunkInstances.length);
  const canopyMesh = new THREE.InstancedMesh(getTreeCanopyGeo(), canopyMat, canopyInstances.length);

  const dummy = new THREE.Object3D();

  trunkInstances.forEach((inst, i) => {
    dummy.position.set(inst.x, inst.y, inst.z);
    dummy.scale.setScalar(inst.scale);
    dummy.updateMatrix();
    trunkMesh.setMatrixAt(i, dummy.matrix);
  });
  trunkMesh.instanceMatrix.needsUpdate = true;
  trunkMesh.name = 'tree-trunks';

  canopyInstances.forEach((inst, i) => {
    dummy.position.set(inst.x, inst.y, inst.z);
    dummy.scale.setScalar(inst.scale);
    dummy.updateMatrix();
    canopyMesh.setMatrixAt(i, dummy.matrix);
  });
  canopyMesh.instanceMatrix.needsUpdate = true;
  canopyMesh.name = 'tree-canopies';

  return [trunkMesh, canopyMesh];
}