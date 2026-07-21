import * as THREE from '../../../vendor/three.module.js';
import { FACTIONS } from '../../../game/rules/factionData.js';
import { coordKey } from '../../../engine/rules/hexGrid.js';
import { hexCenter3D } from '../hexWorldSpace.js';
import { tileTopY } from '../terrain/terrainMesh.js';

import {
  getChampionBodyGeo,
  getChampionHeadGeo,
  getMobGeo,
  getTraderBodyGeo,
} from './unitGeometries.js';
import { isAnimating } from './movementAnimator.js';
import { hexToRgb } from './movementCurves.js';

/**
 * Build unit meshes for all visible champions, mobs, and traders.
 * Mobs are grouped by archetype shape so each distinct mob type gets its own
 * InstancedMesh with the correct geometry.
 *
 * @param {Object} state   - Game state
 * @param {Set}    visible - Set of visible hex keys
 * @returns {THREE.InstancedMesh[]}
 */
export function buildUnitMeshes(state, visible) {
  const results = [];

  // ---- Collect instance data ----
  const championBodyInstances = [];
  const championHeadInstances = [];
  /** @type {Map<string, Array<{x:number, y:number, z:number, scale:number, color:number[]}>>} */
  const mobInstancesByShape = new Map();
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
      // Skip champions that are currently being animated — the movement
      // animator layer shows a temporary mesh for them instead.
      if (isAnimating(champ.id)) continue;

      const fac = FACTIONS[champ.faction];
      const color = fac ? hexToRgb(fac.base) : [0.5, 0.4, 0.3];
      championBodyInstances.push({ x, y: surfaceY + 0.15, z, color });
      championHeadInstances.push({ x, y: surfaceY + 0.45, z, color: [1, 1, 1] });
    } else if (mob) {
      const fac = FACTIONS[mob.faction];
      const color = fac ? hexToRgb(fac.base).map(c => c * 0.7) : [0.3, 0.25, 0.2];
      const shapeKey = mob.archetypeName || 'default';
      if (!mobInstancesByShape.has(shapeKey)) {
        mobInstancesByShape.set(shapeKey, []);
      }
      mobInstancesByShape.get(shapeKey).push({
        x,
        y: surfaceY + 0.15,
        z,
        scale: mob.visualScale || 1.0,
        color,
      });
    } else if (trader) {
      traderInstances.push({ x, y: surfaceY + 0.2, z, color: [0.29, 0.75, 0.6] });
    }
  }

  // ---- Champion body InstancedMesh ----
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

  // ---- Champion heads InstancedMesh ----
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

  // ---- Mob InstancedMeshes — one per shape ----
  for (const [shapeKey, instances] of mobInstancesByShape) {
    if (instances.length === 0) continue;
    const geo = getMobGeo(shapeKey);
    const mat = new THREE.MeshLambertMaterial({ flatShading: true });
    const im = new THREE.InstancedMesh(geo, mat, instances.length);
    const dummy = new THREE.Object3D();
    instances.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.setScalar(inst.scale);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      im.setColorAt(i, new THREE.Color(inst.color[0], inst.color[1], inst.color[2]));
    });
    im.instanceMatrix.needsUpdate = true;
    im.instanceColor.needsUpdate = true;
    im.name = `mobs_${shapeKey}`;
    results.push(im);
  }

  // ---- Trader InstancedMesh ----
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
