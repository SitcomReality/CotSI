// src/render/hexmap3d/knots.js
import * as THREE from '../../../lib/three.module.js';
import { hexCenter3D } from '../hexUtils.js';
import { tileTopY } from '../terrain/terrain.js';
import { getKnotGeo } from './featureGeometries.js';

/**
 * Collect knot instance data from visible tiles and return InstancedMeshes.
 * @param {Map} state.tiles
 * @param {string[]} visible
 * @returns {THREE.InstancedMesh[]}
 */
export function buildKnotMeshes(state, visible) {
  const instances = [];

  for (const key of visible) {
    const tile = state.tiles[key];
    if (!tile || !tile.feature || tile.feature.kind !== 'knot' || tile.feature.mined) continue;
    const surfaceY = tileTopY(tile.terrain);
    const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);
    instances.push({
      x, y: surfaceY + 0.30, z,
      scale: 1.0,
      color: [0.486, 0.247, 0.694],
    });
  }

  if (instances.length === 0) return [];

  const mat = new THREE.MeshLambertMaterial({
    color: 0x7c3fb1,
    emissive: 0xb79aff,
    emissiveIntensity: 0.4,
    flatShading: true,
  });
  const mesh = new THREE.InstancedMesh(getKnotGeo(), mat, instances.length);
  const dummy = new THREE.Object3D();
  instances.forEach((inst, i) => {
    dummy.position.set(inst.x, inst.y, inst.z);
    dummy.scale.setScalar(1.0);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = 'knots';
  return [mesh];
}