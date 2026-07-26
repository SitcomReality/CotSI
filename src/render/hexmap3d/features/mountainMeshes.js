// src/render/hexmap3d/features/mountainMeshes.js
import * as THREE from '../../../vendor/three.module.js';
import { hexCenter3D } from '../hexWorldSpace.js';
import { tileTopY } from '../terrain/terrainMesh.js';
import { getMountainGeo } from './geometries/index.js';
import { MOUNTAIN_HASH_SEEDS, MOUNTAIN_PEAK_SCALE, MOUNTAIN_PEAK_SCALE_RANGE, MOUNTAIN_SLOPE_SCALE, MOUNTAIN_SLOPE_SCALE_RANGE, MOUNTAIN_NORMAL_SCALE, MOUNTAIN_NORMAL_SCALE_RANGE, MOUNTAIN_SNOW_RING_RADIUS, MOUNTAIN_SNOW_RING_HEIGHT, MOUNTAIN_PEAK_HEIGHT, MOUNTAIN_ROCK_COLOR, MOUNTAIN_SNOW_COLOR } from '../../../params/render/geometryParams.js';

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
    const hash = ((tile.q * MOUNTAIN_HASH_SEEDS[0] + tile.r * MOUNTAIN_HASH_SEEDS[1]) * MOUNTAIN_HASH_SEEDS[2]) % MOUNTAIN_HASH_SEEDS[3];
    const rotY = 0; // no rotation — base hex corners align with tile edges

    const mt = tile.mountainType;

    if (mt === 'peak') {
      // Tall — center of a mountain group
      peakInstances.push({
        x, y: surfaceY, z,
        scaleY: MOUNTAIN_PEAK_SCALE + (hash % MOUNTAIN_PEAK_SCALE_RANGE) / 100,
        rotY,
      });
    } else if (mt === 'slope') {
      // Short — foothills at the group edge
      slopeInstances.push({
        x, y: surfaceY, z,
        scaleY: MOUNTAIN_SLOPE_SCALE + (hash % MOUNTAIN_SLOPE_SCALE_RANGE) / 100,
        rotY,
      });
    } else {
      // Isolated or un-tagged — medium height
      normalInstances.push({
        x, y: surfaceY, z,
        scaleY: MOUNTAIN_NORMAL_SCALE + (hash % MOUNTAIN_NORMAL_SCALE_RANGE) / 100,
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

/**
 * Build mountain InstancedMeshes for a single chunk's tiles.
 * @param {object[]} chunkTiles - Array of tile objects in this chunk
 * @param {Set<string>} visible - Set of hex keys currently visible
 * @returns {THREE.InstancedMesh[]}
 */
export function buildChunkMountainMeshes(chunkTiles, visible) {
  const peakInstances = [];
  const slopeInstances = [];
  const normalInstances = [];

  for (const tile of chunkTiles) {
    const key = `${tile.q},${tile.r}`;
    if (!visible.has(key)) continue;
    if (tile.terrain !== 'mountain') continue;

    const surfaceY = tileTopY(tile.terrain);
    const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);
    const hash = ((tile.q * MOUNTAIN_HASH_SEEDS[0] + tile.r * MOUNTAIN_HASH_SEEDS[1]) * MOUNTAIN_HASH_SEEDS[2]) % MOUNTAIN_HASH_SEEDS[3];
    const rotY = 0;

    const mt = tile.mountainType;

    if (mt === 'peak') {
      peakInstances.push({ x, y: surfaceY, z, scaleY: MOUNTAIN_PEAK_SCALE + (hash % MOUNTAIN_PEAK_SCALE_RANGE) / 100, rotY });
    } else if (mt === 'slope') {
      slopeInstances.push({ x, y: surfaceY, z, scaleY: MOUNTAIN_SLOPE_SCALE + (hash % MOUNTAIN_SLOPE_SCALE_RANGE) / 100, rotY });
    } else {
      normalInstances.push({ x, y: surfaceY, z, scaleY: MOUNTAIN_NORMAL_SCALE + (hash % MOUNTAIN_NORMAL_SCALE_RANGE) / 100, rotY });
    }
  }

  const results = [];
  const dummy = new THREE.Object3D();
  const mountainMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
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
