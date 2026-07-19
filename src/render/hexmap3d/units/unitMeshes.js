import * as THREE from '../../../vendor/three.module.js';
import { FACTIONS } from '../../../game/rules/factionData.js';
import { coordKey } from '../../../engine/rules/hexGrid.js';
import { hexCenter3D } from '../hexWorldSpace.js';
import { tileTopY } from '../terrain/terrainMesh.js';

import { getChampionBodyGeo, getChampionHeadGeo, getMobBodyGeo, getTraderBodyGeo } from './unitGeometries.js';

/**
 * Convert a hex color string (#rrggbb) to an RGB array (0..1).
 */
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

/**
 * Build unit meshes for all visible champions, mobs, and traders.
 * Returns an array of THREE InstancedMesh objects to add to the scene.
 */
export function buildUnitMeshes(state, visible) {
  const results = [];

  // Collect instance data
  const championBodyInstances = [];

  const championHeadInstances = [];
  const mobInstances = [];
  const traderInstances = [];

  for (const key of visible) {
    const tile = state.tiles[key];
    if (!tile) continue;

    const champ = state.champions.find(c => coordKey(c.pos) === key);
    const mob = state.mobs?.find(m => coordKey(m.pos) === key);
    const trader = state.traders?.find(t => coordKey(t.pos) === key);

    if (!champ && !mob && !trader) continue;

    const surfaceY = tileTopY(tile.terrain);
    const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);

    if (champ) {
      const fac = FACTIONS[champ.faction];
      const color = fac ? hexToRgb(fac.color) : [0.8, 0.8, 0.8];
      championBodyInstances.push({ x, y: surfaceY + 0.15, z, color });

      championHeadInstances.push({ x, y: surfaceY + 0.45, z, color: [1, 1, 1] });
    } else if (mob) {
      const fac = FACTIONS[mob.faction];
      const color = fac ? hexToRgb(fac.color).map(c => c * 0.7) : [0.4, 0.3, 0.2];
      mobInstances.push({ x, y: surfaceY + 0.15, z, color });
    } else if (trader) {
      traderInstances.push({ x, y: surfaceY + 0.2, z, color: [0.29, 0.75, 0.6] });
    }
  }

  // Champion body InstancedMesh
  if (championBodyInstances.length > 0) {
    const mat = new THREE.MeshLambertMaterial({ flatShading: true });
    const im = new THREE.InstancedMesh(getChampionBodyGeo(), mat, championBodyInstances.length);
    const dummy = new THREE.Object3D();
    championBodyInstances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.setScalar(1.0);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      im.setColorAt(i, new THREE.Color(inst.color[0], inst.color[1], inst.color[2]));
    });
    im.instanceMatrix.needsUpdate = true;
    im.instanceColor.needsUpdate = true;
    im.name = 'championBodies';
    results.push(im);
  }

  // Champion heads InstancedMesh
  if (championHeadInstances.length > 0) {
    const mat = new THREE.MeshLambertMaterial({ color: 0xffe8c8, flatShading: true });
    const im = new THREE.InstancedMesh(getChampionHeadGeo(), mat, championHeadInstances.length);
    const dummy = new THREE.Object3D();
    championHeadInstances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.setScalar(1.0);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    im.name = 'championHeads';
    results.push(im);
  }

  // Mob InstancedMesh
  if (mobInstances.length > 0) {
    const mat = new THREE.MeshLambertMaterial({ flatShading: true });
    const im = new THREE.InstancedMesh(getMobBodyGeo(), mat, mobInstances.length);
    const dummy = new THREE.Object3D();
    mobInstances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.setScalar(1.0);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      im.setColorAt(i, new THREE.Color(inst.color[0], inst.color[1], inst.color[2]));
    });
    im.instanceMatrix.needsUpdate = true;
    im.instanceColor.needsUpdate = true;
    im.name = 'mobs';
    results.push(im);
  }

  // Trader InstancedMesh
  if (traderInstances.length > 0) {
    const mat = new THREE.MeshLambertMaterial({ color: 0x4abf9a, flatShading: true });
    const im = new THREE.InstancedMesh(getTraderBodyGeo(), mat, traderInstances.length);
    const dummy = new THREE.Object3D();
    traderInstances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.setScalar(1.0);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
    });
    im.instanceMatrix.needsUpdate = true;
    im.name = 'traders';
    results.push(im);
  }

  return results;
}
