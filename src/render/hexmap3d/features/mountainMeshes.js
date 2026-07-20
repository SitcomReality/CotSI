// src/render/hexmap3d/features/mountainMeshes.js
import * as THREE from '../../../vendor/three.module.js';
import { hexCenter3D } from '../hexWorldSpace.js';
import { tileTopY } from '../terrain/terrainMesh.js';
import { getMountainGeo } from './featureGeometries.js';

/**
 * Collect mountain instance data from visible tiles and return InstancedMeshes.
 * Uses a displaced-vertex 6-sided cone for natural variation.
 * Each instance is slightly rotated and scaled for organic variety.
 *
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

    // Use tile coordinates for deterministic variety
    const hash = ((tile.q * 13 + tile.r * 7) * 19) % 100;
    const scale = 0.85 + (hash % 30) / 100; // 0.85–1.15
    const rotY = (hash * 0.618) % (Math.PI * 2); // golden angle for even distribution

    instances.push({
      x, y: surfaceY + 0.35, z,
      scale,
      rotY,
    });
  }

  if (instances.length === 0) return [];

  const mat = new THREE.MeshLambertMaterial({ color: 0xb7aa92, flatShading: true });
  const mesh = new THREE.InstancedMesh(getMountainGeo(), mat, instances.length);
  const dummy = new THREE.Object3D();
  instances.forEach((inst, i) => {
    dummy.position.set(inst.x, inst.y, inst.z);
    dummy.scale.setScalar(inst.scale);
    dummy.rotation.y = inst.rotY;
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = 'mountains';
  return [mesh];
}
