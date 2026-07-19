// src/render/hexmap3d/features/mountainMeshes.js
import * as THREE from '../../../vendor/three.module.js';
import { hexCenter3D } from '../hexWorldSpace.js';
import { tileTopY } from '../terrain/terrainMesh.js';
import { getMountainGeo } from './featureGeometries.js';

/**
 * Collect mountain instance data from visible tiles and return InstancedMeshes.
 * @param {Map} state.tiles
 * @param {string[]} visible
 * @returns {THREE.InstancedMesh[]}
 */
export function buildMountainMeshes(state, visible) {
  const instances = [];

  for (const key of visible) {
    const tile = state.tiles[key];
    if (!tile) continue;
    const f = tile.feature;
    if (!f || (f.kind !== 'mountain' && tile.terrain !== 'mountain')) continue;
    const surfaceY = tileTopY(tile.terrain);
    const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);
    instances.push({
      x, y: surfaceY + 0.35, z,
      scale: 1.0,
      color: [0.718, 0.667, 0.573],
    });
  }

  if (instances.length === 0) return [];

  const mat = new THREE.MeshLambertMaterial({ color: 0xb7aa92, flatShading: true });
  const mesh = new THREE.InstancedMesh(getMountainGeo(), mat, instances.length);
  const dummy = new THREE.Object3D();
  instances.forEach((inst, i) => {
    dummy.position.set(inst.x, inst.y, inst.z);
    dummy.scale.setScalar(1.0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = 'mountains';
  return [mesh];
}