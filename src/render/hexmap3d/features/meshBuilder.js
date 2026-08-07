// src/render/hexmap3d/features/meshBuilder.js
// Shared utilities for building InstancedMeshes from tile data.
// Eliminates the iteration + matrix boilerplate duplicated across mesh builders.

import * as THREE from '../../../vendor/three.module.js';
import { hexCenter3D } from '../hexWorldSpace.js';
import { tileSurfaceY } from '../terrain/index.js';

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
 * Per-instance matrix: M = T(position) · R · T(localPos) · R_local · S
 *   - `y` is the pivot height. The part is placed at `localPos` in the tree
 *     frame, oriented by `R_local` there, spun by `rotY`, then leaned in world
 *     space by `tilt` around `y` — so a whole tree leans rigidly around its
 *     base and every part of it stays in the same relative arrangement.
 *   - `localPos` defaults to { x: 0, y: lift ?? 0, z: 0 }, which is the plain
 *     "raised above the pivot" case used by the simple trunk/canopy parts.
 *
 * @param {THREE.BufferGeometry} geometry  - Shared geometry
 * @param {THREE.Material}       material  - Shared material
 * @param {object[]}             instances - Instance records { x, y, z, scale?, rotY? }
 *                                           Optional per-instance extras:
 *                                           - scaleX   — non-uniform X scale (defaults to `scaleXZ`/`scale`)
 *                                           - scaleY   — non-uniform Y scale (defaults to `scale`)
 *                                           - scaleZ   — non-uniform Z scale (defaults to `scaleXZ`/`scale`)
 *                                           - scaleXZ  — legacy combined X/Z scale (defaults to `scale`)
 *                                           - lift     — local-space height above the pivot
 *                                           - localPos — { x, y, z } placement in the tree frame
 *                                                       (overrides `lift` when present)
 *                                           - localAxis — { x, y, z } local orientation axis
 *                                           - localAngle — local orientation angle (radians)
 *                                           - tiltAxis — { x, z } horizontal lean axis (world space)
 *                                           - tilt     — lean angle in radians around tiltAxis
 *                                           - color    — per-instance color (THREE.Color)
 * @param {string}               meshName  - Name for the InstancedMesh
 * @param {object}               [opts]    - Optional overrides
 * @param {boolean}              [opts.castShadow=true]
 * @returns {THREE.InstancedMesh}
 *
 * NOTE: rotation is composed in local quaternions and assigned via
 * `copy()`/`makeRotationFromQuaternion()`. Never set `dummy.rotation` +
 * `rotateOnWorldAxis()` on a dummy that is reused across instances: Object3D
 * syncs the Euler from the quaternion on every change, so the previous
 * instance's tilt would leak into the next instance's Euler x/z and produce
 * wild rotations.
 */
const _yAxis = new THREE.Vector3(0, 1, 0);
const _tiltAxis = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _quatTilt = new THREE.Quaternion();
const _quatLocal = new THREE.Quaternion();
const _localAxis = new THREE.Vector3();
const _matrixT = new THREE.Matrix4();
const _matrixR = new THREE.Matrix4();
const _matrixLift = new THREE.Matrix4();
const _matrixLocal = new THREE.Matrix4();
const _matrixS = new THREE.Matrix4();

export function buildInstanced(geometry, material, instances, meshName, opts = {}) {
  const castShadow = opts.castShadow !== false;
  const mesh = new THREE.InstancedMesh(geometry, material, instances.length);
  let hasInstanceColors = false;

  for (let i = 0; i < instances.length; i++) {
    const inst = instances[i];
    const s = inst.scale ?? 1.0;
    const sx = inst.scaleX ?? inst.scaleXZ ?? s;
    const sy = inst.scaleY ?? s;
    const sz = inst.scaleZ ?? inst.scaleXZ ?? s;

    // Local placement in the tree frame (default: plain lift above the pivot).
    const lx = inst.localPos ? inst.localPos.x : 0;
    const ly = inst.localPos ? inst.localPos.y : (inst.lift ?? 0);
    const lz = inst.localPos ? inst.localPos.z : 0;
    _matrixLift.makeTranslation(lx, ly, lz);

    // Local orientation in the tree frame (default: none).
    if (inst.localAxis != null && inst.localAngle != null) {
      _matrixLocal.makeRotationFromQuaternion(
        _quatLocal.setFromAxisAngle(_localAxis.set(inst.localAxis.x, inst.localAxis.y, inst.localAxis.z).normalize(), inst.localAngle),
      );
    } else {
      _matrixLocal.identity();
    }

    // Tree-frame spin, then world-space lean about the horizontal tilt axis.
    _quat.setFromAxisAngle(_yAxis, inst.rotY ?? 0);
    if (inst.tiltAxis != null && inst.tilt != null) {
      _quatTilt.setFromAxisAngle(_tiltAxis.set(inst.tiltAxis.x, 0, inst.tiltAxis.z).normalize(), inst.tilt);
      _quat.premultiply(_quatTilt);
    }

    _matrixT.makeTranslation(inst.x, inst.y ?? 0, inst.z);
    _matrixR.makeRotationFromQuaternion(_quat);
    _matrixS.makeScale(sx, sy, sz);
    _matrixT.multiply(_matrixR).multiply(_matrixLift).multiply(_matrixLocal).multiply(_matrixS);
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
