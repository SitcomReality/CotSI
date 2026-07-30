// src/render/hexmap3d/features/meshBuilder.js
// Shared utilities for building InstancedMeshes from tile data.
// Eliminates the iteration + matrix boilerplate duplicated across mesh builders.

import * as THREE from '../../../vendor/three.module.js';
import { hexCenter3D } from '../hexWorldSpace.js';
import { tileSurfaceY } from '../terrain/terrainMesh.js';

/**
 * Iterate tiles, apply visibility + filter match, compute hex-center position,
 * and collect instance records via a callback.
 *
 * Accepts either a Map (state.tiles) keyed by "q,r" or an array of chunkTile objects.
 *
 * @param {Map|object[]} tilesOrArray - state.tiles Map or chunkTiles array
 * @param {Set<string>}  visible      - Set of "q,r" keys currently visible
 * @param {Function}     matchFn      - (tile) => boolean; return true to collect this tile
 * @param {Function}     collectFn    - (tile, worldPos) => object|object[]|null;
 *                                      worldPos is { x, y: surfaceY, z }.
 *                                      Return a single instance record, an array of
 *                                      records, or null to skip.
 * @returns {object[]} Collected instance records { x, y, z, scale?, rotY? }
 */
export function collectInstances(tilesOrArray, visible, matchFn, collectFn) {
  const results = [];

  if (tilesOrArray instanceof Map) {
    for (const key of visible) {
      const tile = tilesOrArray.get(key);
      if (!tile) continue;
      if (!matchFn(tile)) continue;
      const surfaceY = tileSurfaceY(tile);
      const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);
      const record = collectFn(tile, { x, y: surfaceY, z });
      if (record != null) addRecord(results, record);
    }
  } else {
    for (const tile of tilesOrArray) {
      const key = `${tile.q},${tile.r}`;
      if (!visible.has(key)) continue;
      if (!matchFn(tile)) continue;
      const surfaceY = tileSurfaceY(tile);
      const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);
      const record = collectFn(tile, { x, y: surfaceY, z });
      if (record != null) addRecord(results, record);
    }
  }

  return results;
}

/**
 * Build a single InstancedMesh from collected instance records.
 *
 * @param {THREE.BufferGeometry} geometry  - Shared geometry
 * @param {THREE.Material}       material  - Shared material
 * @param {object[]}             instances - Instance records { x, y, z, scale?, rotY? }
 * @param {string}               meshName  - Name for the InstancedMesh
 * @param {object}               [opts]    - Optional overrides
 * @param {boolean}              [opts.castShadow=true]
 * @returns {THREE.InstancedMesh}
 */
export function buildInstanced(geometry, material, instances, meshName, opts = {}) {
  const castShadow = opts.castShadow !== false;
  const mesh = new THREE.InstancedMesh(geometry, material, instances.length);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < instances.length; i++) {
    const inst = instances[i];
    dummy.position.set(inst.x, inst.y ?? 0, inst.z);
    dummy.scale.setScalar(inst.scale ?? 1.0);
    if (inst.rotY != null) dummy.rotation.y = inst.rotY;
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = castShadow;
  mesh.name = meshName;
  return mesh;
}

function addRecord(results, record) {
  if (Array.isArray(record)) {
    for (const r of record) {
      if (r != null) results.push(r);
    }
  } else {
    results.push(record);
  }
}
