// src/render/hexmap3d/features/mountainMeshes.js
import * as THREE from '../../../vendor/three.module.js';
import { hexCenter3D } from '../hexWorldSpace.js';
import { tileTopY } from '../terrain/terrainMesh.js';
import { getMountainGeo } from './featureGeometries.js';
import { getMountainSlopeGeo } from './featureGeometries.js';
import { getMountainPeakGeo } from './featureGeometries.js';

/**
 * Collect mountain instance data from visible tiles and return InstancedMeshes.
 * Uses mountainType tags from terrainGeneration for grouped chains:
 *   - 'peak':    tall, narrow cone (center of a large group)
 *   - 'slope':   short, wide cone (edges of a group — foothills)
 *   - 'isolated': single-peak, current default scale
 *   - undefined: fallback to current default
 *
 * @param {Map} state.tiles
 * @param {string[]} visible
 * @returns {THREE.InstancedMesh[]}
 */
export function buildMountainMeshes(state, visible) {
  const peakInstances = [];
  const slopeInstances = [];
  const normalInstances = [];

  for (const key of visible) {
    const tile = state.tiles[key];
    if (!tile || tile.terrain !== 'mountain') continue;

    const surfaceY = tileTopY(tile.terrain);
    const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);
    const hash = ((tile.q * 13 + tile.r * 7) * 19) % 100;
    const rotY = (hash * 0.618) % (Math.PI * 2);

    const mt = tile.mountainType;

    if (mt === 'peak') {
      // Tall, narrow — center of a mountain group
      peakInstances.push({
        x, y: surfaceY + 0.35, z,
        scaleY: 1.3 + (hash % 15) / 100,
        scaleXZ: 0.85 + (hash % 10) / 100,
        rotY,
      });
    } else if (mt === 'slope') {
      // Short, wide — foothills at the group edge
      slopeInstances.push({
        x, y: surfaceY + 0.25, z,
        scaleY: 0.65 + (hash % 20) / 100,
        scaleXZ: 1.15 + (hash % 20) / 100,
        rotY,
      });
    } else {
      // Isolated or un-tagged — current default behavior
      const scale = 0.85 + (hash % 30) / 100;
      normalInstances.push({
        x, y: surfaceY + 0.35, z,
        scale,
        rotY,
      });
    }
  }

  const results = [];
  const dummy = new THREE.Object3D();

  if (normalInstances.length > 0) {
    const mat = new THREE.MeshLambertMaterial({ color: 0xb7aa92, flatShading: true });
    const mesh = new THREE.InstancedMesh(getMountainGeo(), mat, normalInstances.length);
    normalInstances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.setScalar(inst.scale);
      dummy.rotation.y = inst.rotY;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = 'mountains';
    results.push(mesh);
  }

  if (peakInstances.length > 0) {
    const peakMat = new THREE.MeshLambertMaterial({ color: 0xc4b8a0, flatShading: true });
    const mesh = new THREE.InstancedMesh(getMountainPeakGeo(), peakMat, peakInstances.length);
    peakInstances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.set(inst.scaleXZ, inst.scaleY, inst.scaleXZ);
      dummy.rotation.y = inst.rotY;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = 'mountain-peaks';
    results.push(mesh);
  }

  if (slopeInstances.length > 0) {
    const slopeMat = new THREE.MeshLambertMaterial({ color: 0xaa9e8a, flatShading: true });
    const mesh = new THREE.InstancedMesh(getMountainSlopeGeo(), slopeMat, slopeInstances.length);
    slopeInstances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.set(inst.scaleXZ, inst.scaleY, inst.scaleXZ);
      dummy.rotation.y = inst.rotY;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = 'mountain-slopes';
    results.push(mesh);
  }

  return results;
}
