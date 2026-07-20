// src/render/hexmap3d/features/treeMeshes.js
import * as THREE from '../../../vendor/three.module.js';
import { hexCenter3D } from '../hexWorldSpace.js';
import { tileTopY } from '../terrain/terrainMesh.js';
import {
  getTreeTrunkGeo,
  getTreeCanopyRoundGeo,
  getTreeCanopyTallGeo,
  getTreeCanopyWideGeo,
} from './featureGeometries.js';

/**
 * Determine tree variant from tile data.
 * Uses terrain type and tile coordinates for deterministic variety.
 *
 * @param {string} terrain - Terrain type
 * @param {number} q - Hex q coordinate
 * @param {number} r - Hex r coordinate
 * @returns {'round'|'tall'|'wide'}
 */
function treeVariant(terrain, q, r) {
  // Simple hash from coordinates
  const hash = ((q * 7 + r * 13) * 31) % 17;
  if (terrain === 'forest') {
    // Forests get mostly tall pines with some round
    return hash < 10 ? 'tall' : 'round';
  }
  // Plains, marsh: mix of round and wide
  if (hash < 6) return 'round';
  if (hash < 11) return 'tall';
  return 'wide';
}

/**
 * Get canopy geometry and Y-offset for a tree variant.
 */
function canopyForVariant(variant) {
  switch (variant) {
    case 'tall':
      return { geo: getTreeCanopyTallGeo(), heightOffset: 0.65, canopyY: 0.55 };
    case 'wide':
      return { geo: getTreeCanopyWideGeo(), heightOffset: 0.55, canopyY: 0.45 };
    case 'round':
    default:
      return { geo: getTreeCanopyRoundGeo(), heightOffset: 0.50, canopyY: 0.50 };
  }
}

/**
 * Collect tree instance data from visible tiles and return InstancedMeshes.
 * Trees are grouped by canopy variant (round / tall / wide) so each variant
 * gets its own InstancedMesh with the correct geometry.
 *
 * @param {Map} state.tiles
 * @param {string[]} visible
 * @returns {THREE.InstancedMesh[]}
 */
export function buildTreeMeshes(state, visible) {
  // Group instances by variant
  const groups = {
    round:  { trunks: [], canopies: [] },
    tall:   { trunks: [], canopies: [] },
    wide:   { trunks: [], canopies: [] },
  };

  for (const key of visible) {
    const tile = state.tiles[key];
    if (!tile || !tile.feature || tile.feature.kind !== 'tree') continue;

    const variant = treeVariant(tile.terrain, tile.q, tile.r);
    const { heightOffset, canopyY } = canopyForVariant(variant);
    const surfaceY = tileTopY(tile.terrain);
    const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);

    const g = groups[variant];
    if (!g) continue;

    g.trunks.push({ x, y: surfaceY + heightOffset * 0.4, z, scale: 1.0 });
    g.canopies.push({ x, y: surfaceY + canopyY, z, scale: 1.0 });
  }

  const results = [];

  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B5E3C, flatShading: true });
  const dummy = new THREE.Object3D();

  const variantColors = {
    round: 0x3CB371,  // medium green
    tall:  0x2E8B57,  // darker green (pine)
    wide:  0x66CDAA,  // lighter green (palm-ish)
  };

  for (const [variant, data] of Object.entries(groups)) {
    if (data.trunks.length === 0) continue;

    const color = variantColors[variant] || 0x3CB371;
    const canopyMat = new THREE.MeshLambertMaterial({ color, flatShading: true });

    // Trunk InstancedMesh
    const trunkMesh = new THREE.InstancedMesh(
      getTreeTrunkGeo(), trunkMat, data.trunks.length
    );
    data.trunks.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.setScalar(inst.scale);
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(i, dummy.matrix);
    });
    trunkMesh.instanceMatrix.needsUpdate = true;
    trunkMesh.name = `tree-trunks-${variant}`;
    results.push(trunkMesh);

    // Canopy InstancedMesh
    const canopyInfo = canopyForVariant(variant);
    const canopyMesh = new THREE.InstancedMesh(
      canopyInfo.geo, canopyMat, data.canopies.length
    );
    data.canopies.forEach((inst, i) => {
      dummy.position.set(inst.x, inst.y, inst.z);
      dummy.scale.setScalar(inst.scale);
      dummy.updateMatrix();
      canopyMesh.setMatrixAt(i, dummy.matrix);
    });
    canopyMesh.instanceMatrix.needsUpdate = true;
    canopyMesh.name = `tree-canopies-${variant}`;
    results.push(canopyMesh);
  }

  return results;
}
