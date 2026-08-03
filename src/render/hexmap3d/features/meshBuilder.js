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
 * Per-instance matrix: M = T(position) · R · T(0, lift, 0) · S
 *   - `y` is the pivot height; `lift` raises the part above the pivot in its
 *     own (pre-rotation) frame, so a lean rotates around the pivot instead of
 *     the part's own center — trunk and canopy sharing a pivot stay coaxial.
 *
 * @param {THREE.BufferGeometry} geometry  - Shared geometry
 * @param {THREE.Material}       material  - Shared material
 * @param {object[]}             instances - Instance records { x, y, z, scale?, rotY? }
 *                                           Optional per-instance extras:
 *                                           - scaleY   — non-uniform Y scale (defaults to `scale`)
 *                                           - scaleXZ  — non-uniform X/Z scale (defaults to `scale`)
 *                                           - lift     — local-space height above the pivot
 *                                           - tiltAxis — { x, z } horizontal lean axis (world space)
 *                                           - tilt     — lean angle in radians around tiltAxis
 *                                           - color    — per-instance color (THREE.Color)
 * @param {string}               meshName  - Name for the InstancedMesh
 * @param {object}               [opts]    - Optional overrides
 * @param {boolean}              [opts.castShadow=true]
 * @returns {THREE.InstancedMesh}
 *
 * NOTE: rotation is composed in a local quaternion and assigned via
 * `copy()`. Never set `dummy.rotation` + `rotateOnWorldAxis()` on a dummy
 * that is reused across instances: Object3D syncs the Euler from the
 * quaternion on every change, so the previous instance's tilt would leak
 * into the next instance's Euler x/z and produce wild rotations.
 */
const _yAxis = new THREE.Vector3(0, 1, 0);
const _tiltAxis = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _quatTilt = new THREE.Quaternion();
const _matrixT = new THREE.Matrix4();
const _matrixR = new THREE.Matrix4();
const _matrixLift = new THREE.Matrix4();
const _matrixS = new THREE.Matrix4();

export function buildInstanced(geometry, material, instances, meshName, opts = {}) {
  const castShadow = opts.castShadow !== false;
  const mesh = new THREE.InstancedMesh(geometry, material, instances.length);
  let hasInstanceColors = false;

  for (let i = 0; i < instances.length; i++) {
    const inst = instances[i];
    const s = inst.scale ?? 1.0;
    const sx = inst.scaleXZ ?? s;
    const sy = inst.scaleY ?? s;
    const sz = inst.scaleXZ ?? s;
    const lift = inst.lift ?? 0;

    // Rotation: Y-spin, then world-space lean about the horizontal tilt axis.
    _quat.setFromAxisAngle(_yAxis, inst.rotY ?? 0);
    if (inst.tiltAxis != null && inst.tilt != null) {
      _quatTilt.setFromAxisAngle(_tiltAxis.set(inst.tiltAxis.x, 0, inst.tiltAxis.z).normalize(), inst.tilt);
      _quat.premultiply(_quatTilt);
    }

    _matrixT.makeTranslation(inst.x, inst.y ?? 0, inst.z);
    _matrixR.makeRotationFromQuaternion(_quat);
    _matrixLift.makeTranslation(0, lift, 0);
    _matrixS.makeScale(sx, sy, sz);
    _matrixT.multiply(_matrixR).multiply(_matrixLift).multiply(_matrixS);
    mesh.setMatrixAt(i, _matrixT);

    if (inst.color != null) {
      mesh.setColorAt(i, inst.color);
      hasInstanceColors = true;
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  if (hasInstanceColors && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
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
