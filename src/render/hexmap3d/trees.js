// src/render/hexmap3d/trees.js
import * as THREE from '../../lib/three.module.js';
import { hexCenter3D } from './hexUtils.js';
import { tileTopY } from './terrain.js';
import { getTreeTrunkGeo, getTreeCanopyGeo } from './featureGeometries.js';
import { pseudoRandom } from './featureUtils.js';

/**
 * Collect tree instance data from visible tiles and return InstancedMeshes.
 * @param {Map} state.tiles
 * @param {string[]} visible - array of tile keys
 * @returns {THREE.InstancedMesh[]}
 */
export function buildTreeMeshes(state, visible) {
  const trunkInstances = [];
  const canopyInstances = [];

  for (const key of visible) {
    const tile = state.tiles[key];
    if (!tile || !tile.feature || tile.feature.kind !== 'tree') continue;
    const f = tile.feature;
    const surfaceY = tileTopY(tile.terrain);
    const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);

    const seed = tile.q * 1000 + tile.r;
    const count = 3 + (Math.abs(seed) % 3);
    for (let i = 0; i < count; i++) {
      const ox = pseudoRandom(seed + i * 7, -0.35, 0.35);
      const oz = pseudoRandom(seed + i * 13, -0.35, 0.35);
      const scale = 0.7 + pseudoRandom(seed + i * 17, 0, 0.6);
      const ripe = f.ripe !== false;
      trunkInstances.push({
        x: x + ox, y: surfaceY + 0.15, z: z + oz,
        scale,
        color: ripe ? [0.353, 0.227, 0.133] : [0.478, 0.353, 0.227],
      });
      canopyInstances.push({
        x: x + ox, y: surfaceY + 0.45, z: z + oz,
        scale,
        color: ripe ? [0.184, 0.494, 0.267] : [0.416, 0.541, 0.353],
      });
    }
  }

  const results = [];

  if (trunkInstances.length > 0) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x5a3a22, flatShading: true });
    const mesh = new THREE.InstancedMesh(getTreeTrunkGeo(), mat, trunkInstances.length);
    const dummy = new THREE.Object3D();
    trunkInstances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.set(inst.scale, inst.scale * 1.3, inst.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = 'treeTrunks';
    results.push(mesh);
  }

  if (canopyInstances.length > 0) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x4a9f5a, flatShading: true });
    const mesh = new THREE.InstancedMesh(getTreeCanopyGeo(), mat, canopyInstances.length);
    const dummy = new THREE.Object3D();
    canopyInstances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.setScalar(inst.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = 'treeCanopies';
    results.push(mesh);
  }

  return results;
}