import * as THREE from '../../../vendor/three.module.js';
import { FACTIONS } from '../../../game/rules/factionData.js';
import { coordKey } from '../../../engine/rules/hexGrid.js';
import { hexCenter3D } from '../hexWorldSpace.js';
import { tileTopY } from '../terrain/terrainMesh.js';

import {
  getChampionBodyGeo,
  getChampionHeadGeo,
  getPieceBodyGeo,
  getPieceCapGeo,
} from './unitGeometries.js';
import { isAnimating } from './movementAnimator.js';
import { hexToRgb } from './movementCurves.js';
import {
  getPieceTexture,
  pieceIconForArchetype,
  traderPieceIconId,
} from './pieceIcons.js';

/**
 * Build unit meshes for all visible champions, mobs, and traders.
 *
 * Champions render as cylinder body + sphere head (unchanged).
 * Mobs and traders render as flat-cylinder "pieces" with baked SVG icon caps:
 *   - Body: thin CylinderGeometry with per-instance faction-tinted colour
 *   - Cap:  ultra-thin CylinderGeometry with a CanvasTexture bearing the icon
 *
 * Mobs are grouped by archetype shape so each distinct type gets its own
 * body+capped InstancedMesh pair with the correct icon.
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
        y: surfaceY + 0.05,       // body centre (body height 0.10)
        z,
        scale: mob.visualScale || 1.0,
        color,
      });
    } else if (trader) {
      traderInstances.push({ x, y: surfaceY + 0.05, z, scale: 1.0, color: [0.29, 0.75, 0.6] });
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

  // ---- Mob piece meshes — body + cap per archetype shape ----
  for (const [shapeKey, instances] of mobInstancesByShape) {
    if (instances.length === 0) continue;

    _buildPiecePair(instances, pieceIconForArchetype(shapeKey), shapeKey, results);
  }

  // ---- Trader piece meshes — body + cap ----
  if (traderInstances.length > 0) {
    _buildPiecePair(traderInstances, traderPieceIconId(), 'trader', results);
  }

  return results;
}

// ─── Piece building helper ──────────────────────────────────────────────────

/**
 * Create a two-layer piece (body + cap) and push into results.
 *
 * @param {Array}   instances  - Instance data with {x, y, z, scale, color}
 * @param {string}  iconId     - Piece icon ID (e.g. 'p-bear') or null for fallback
 * @param {string}  label      - Debug label for the mesh name
 * @param {Array}   results    - Output array to push InstancedMeshes into
 */
function _buildPiecePair(instances, iconId, label, results) {
  const count = instances.length;
  const dummy = new THREE.Object3D();

  // --- Body (faction-coloured coin edge) ---
  const bodyMat = new THREE.MeshLambertMaterial({ flatShading: true });
  const bodyIm = new THREE.InstancedMesh(getPieceBodyGeo(), bodyMat, count);

  instances.forEach((inst, i) => {
    dummy.position.set(inst.x, inst.y, inst.z);
    dummy.scale.setScalar(inst.scale);
    dummy.updateMatrix();
    bodyIm.setMatrixAt(i, dummy.matrix);
    bodyIm.setColorAt(i, new THREE.Color(inst.color[0], inst.color[1], inst.color[2]));
  });
  bodyIm.instanceMatrix.needsUpdate = true;
  bodyIm.instanceColor.needsUpdate = true;
  bodyIm.name = `pieceBody_${label}`;
  results.push(bodyIm);

  // --- Cap (icon disc on top) ---
  const tex = iconId ? getPieceTexture(iconId) : null;
  const capMat = tex
    ? new THREE.MeshLambertMaterial({ map: tex })
    : new THREE.MeshLambertMaterial({ color: 0xf0e8d0 }); // fallback: plain parchment
  const capIm = new THREE.InstancedMesh(getPieceCapGeo(), capMat, count);

  // Cap Y is body centre + body half-height + cap half-height + tiny spacer
  const capYOffset = 0.05 + 0.0125 + 0.002; // 0.0645 above body centre (0.050 + 0.0125 + 0.002)

  instances.forEach((inst, i) => {
    dummy.position.set(inst.x, inst.y + capYOffset, inst.z);
    dummy.scale.setScalar(inst.scale);
    dummy.updateMatrix();
    capIm.setMatrixAt(i, dummy.matrix);
  });
  capIm.instanceMatrix.needsUpdate = true;
  capIm.name = `pieceCap_${label}`;
  results.push(capIm);
}
