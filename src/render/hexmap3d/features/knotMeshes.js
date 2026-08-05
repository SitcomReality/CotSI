// src/render/hexmap3d/features/knotMeshes.js
import * as THREE from '../../../vendor/three.module.js';
import { toonMaterial } from '../scene/materials.js';
import { hexCenter3D } from '../hexWorldSpace.js';
import { tileSurfaceY } from '../terrain/index.js';
import { getKnotGeo } from './geometries/index.js';
import { KNOT_RADIUS, KNOT_Y_OFFSET, KNOT_EMISSIVE_INTENSITY } from '../../../params/render/geometryParams.js';
import { DISPERSED_SCALE, dispersedSingleOffset, isTileOccupied } from './decorEmphasis.js';

/**
 * Collect knot instance data from visible tiles and return InstancedMeshes.
 * An occupant sharing the hex steps the knot aside to the shared
 * upper-left-corner anchor and shrinks (defensive — knots are mined on
 * arrival, so this is normally unreachable).
 * @param {Map} state.tiles
 * @param {string[]} visible
 * @param {Set<string>} occupants - "q,r" keys of tiles with an occupant
 * @returns {THREE.InstancedMesh[]}
 */
export function buildKnotMeshes(state, visible, occupants) {
  const instances = [];

  for (const key of visible) {
    const tile = state.tiles[key];
    if (!tile || !tile.feature || tile.feature.kind !== 'knot' || tile.feature.mined) continue;
    const surfaceY = tileSurfaceY(tile);
    const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);
    let ix = x;
    let iz = z;
    let scale = 1.0;
    if (isTileOccupied(occupants, tile)) {
      const { dx, dz } = dispersedSingleOffset();
      ix = x + dx;
      iz = z + dz;
      scale = DISPERSED_SCALE;
    }
    instances.push({
      x: ix, y: surfaceY + KNOT_Y_OFFSET, z: iz,
      scale,
    });
  }

  if (instances.length === 0) return [];

  const mat = toonMaterial({
    color: 0x7c3fb1,
    emissive: 0xb79aff,
    emissiveIntensity: KNOT_EMISSIVE_INTENSITY,
  });
  const mesh = new THREE.InstancedMesh(getKnotGeo(), mat, instances.length);
  const dummy = new THREE.Object3D();
  instances.forEach((inst, i) => {
    dummy.position.set(inst.x, inst.y, inst.z);
    dummy.scale.setScalar(inst.scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.name = 'knots';
  return [mesh];
}

/**
 * Build knot InstancedMesh for a single chunk's tiles.
 * @param {object[]} chunkTiles - Array of tile objects in this chunk
 * @param {Set<string>} visible - Set of hex keys currently visible
 * @param {Set<string>} occupants - "q,r" keys of tiles with an occupant
 * @returns {THREE.InstancedMesh[]}
 */
export function buildChunkKnotMeshes(chunkTiles, visible, occupants) {
  const instances = [];

  for (const tile of chunkTiles) {
    const key = `${tile.q},${tile.r}`;
    if (!visible.has(key)) continue;
    if (!tile.feature || tile.feature.kind !== 'knot' || tile.feature.mined) continue;
    const surfaceY = tileSurfaceY(tile);
    const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);
    let ix = x;
    let iz = z;
    let scale = 1.0;
    if (isTileOccupied(occupants, tile)) {
      const { dx, dz } = dispersedSingleOffset();
      ix = x + dx;
      iz = z + dz;
      scale = DISPERSED_SCALE;
    }
    instances.push({ x: ix, y: surfaceY + KNOT_Y_OFFSET, z: iz, scale });
  }

  if (instances.length === 0) return [];

  const mat = toonMaterial({
    color: 0x7c3fb1,
    emissive: 0xb79aff,
    emissiveIntensity: KNOT_EMISSIVE_INTENSITY,
  });
  const mesh = new THREE.InstancedMesh(getKnotGeo(), mat, instances.length);
  const dummy = new THREE.Object3D();
  instances.forEach((inst, i) => {
    dummy.position.set(inst.x, inst.y, inst.z);
    dummy.scale.setScalar(inst.scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  mesh.name = 'knots';
  return [mesh];
}