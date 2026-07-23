// src/render/hexmap3d/features/mountainMeshes.js
import * as THREE from '../../../vendor/three.module.js';
import { hexCenter3D } from '../hexWorldSpace.js';
import { tileTopY } from '../terrain/terrainMesh.js';
import { getMountainGeo } from './geometries/index.js';

/**
 * Collect mountain instance data from visible tiles and return InstancedMeshes.
 * Uses mountainType tags from terrainGeneration for grouped chains:
 *   - 'peak':    tall (center of a large group)
 *   - 'slope':   short (edges of a group — foothills)
 *   - 'isolated': medium-height single peak
 *   - undefined: fallback to isolated
 *
 * All instance groups share the same hex-base geometry with vertex colors.
 * The base hexagon has radius 1.0, matching hexCornersXZ, so adjacent
 * mountain edges align perfectly with no gaps.
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
    const rotY = 0; // no rotation — base hex corners align with tile edges

    const mt = tile.mountainType;

    if (mt === 'peak') {
      // Tall — center of a mountain group
      peakInstances.push({
        x, y: surfaceY, z,
        scaleY: 1.3 + (hash % 15) / 100,
        rotY,
      });
    } else if (mt === 'slope') {
      // Short — foothills at the group edge
      slopeInstances.push({
        x, y: surfaceY, z,
        scaleY: 0.7 + (hash % 15) / 100,
        rotY,
      });
    } else {
      // Isolated or un-tagged — medium height
      normalInstances.push({
        x, y: surfaceY, z,
        scaleY: 0.9 + (hash % 25) / 100,
        rotY,
      });
    }
  }

  const results = [];
  const dummy = new THREE.Object3D();
  const mountainMat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
  });
  const mountainGeo = getMountainGeo();

  if (normalInstances.length > 0) {
    const mesh = new THREE.InstancedMesh(mountainGeo, mountainMat, normalInstances.length);
    normalInstances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.set(1, inst.scaleY, 1);
      dummy.rotation.y = inst.rotY;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.name = 'mountains';
    results.push(mesh);
  }

  if (peakInstances.length > 0) {
    const mesh = new THREE.InstancedMesh(mountainGeo, mountainMat, peakInstances.length);
    peakInstances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.set(1, inst.scaleY, 1);
      dummy.rotation.y = inst.rotY;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.name = 'mountain-peaks';
    results.push(mesh);
  }

  if (slopeInstances.length > 0) {
    const mesh = new THREE.InstancedMesh(mountainGeo, mountainMat, slopeInstances.length);
    slopeInstances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.set(1, inst.scaleY, 1);
      dummy.rotation.y = inst.rotY;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.name = 'mountain-slopes';
    results.push(mesh);
  }

  return results;
}
