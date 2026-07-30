// src/render/hexmap3d/features/treeMeshes.js
import * as THREE from '../../../vendor/three.module.js';
import { hexCenter3D } from '../hexWorldSpace.js';
import { tileSurfaceY } from '../terrain/terrainMesh.js';
import {
  getTreeTrunkGeo,
  getTreeCanopyRoundGeo,
  getTreeCanopyTallGeo,
  getTreeCanopyWideGeo,
} from './geometries/index.js';
import { TREE_VARIANT_HASH_SEEDS, TREE_FOREST_TALL_THRESHOLD, TREE_VARIANT_THRESHOLDS, TREE_TALL, TREE_WIDE, TREE_ROUND, TREE_DENSITY_SCALE, TREE_TRUNK_Y_FRACTION } from '../../../params/render/geometryParams.js';

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
  const hash = ((q * TREE_VARIANT_HASH_SEEDS[0] + r * TREE_VARIANT_HASH_SEEDS[1]) * TREE_VARIANT_HASH_SEEDS[2]) % TREE_VARIANT_HASH_SEEDS[3];
  if (terrain === 'forest') {
    return hash < TREE_FOREST_TALL_THRESHOLD ? 'tall' : 'round';
  }
  if (hash < TREE_VARIANT_THRESHOLDS[0]) return 'round';
  if (hash < TREE_VARIANT_THRESHOLDS[1]) return 'tall';
  return 'wide';
}

/**
 * Get canopy geometry and Y-offset for a tree variant.
 */
function canopyForVariant(variant) {
  switch (variant) {
    case 'tall':
      return { geo: getTreeCanopyTallGeo(), heightOffset: TREE_TALL.heightOffset, canopyY: TREE_TALL.canopyY };
    case 'wide':
      return { geo: getTreeCanopyWideGeo(), heightOffset: TREE_WIDE.heightOffset, canopyY: TREE_WIDE.canopyY };
    case 'round':
    default:
      return { geo: getTreeCanopyRoundGeo(), heightOffset: TREE_ROUND.heightOffset, canopyY: TREE_ROUND.canopyY };
  }
}

/**
 * Density multiplier table.
 * Returns a scale factor for the whole tree (trunk + canopy).
 */
function densityScale(density) {
  switch (density) {
    case 'dense':  return TREE_DENSITY_SCALE.dense;
    case 'medium': return TREE_DENSITY_SCALE.medium;
    case 'sparse': return TREE_DENSITY_SCALE.sparse;
    default:       return 1.0;
  }
}

/**
 * Collect tree instance data from visible tiles and return InstancedMeshes.
 * Trees are grouped by canopy variant (round / tall / wide).
 * Density tags control per-tree scale.
 *
 * @param {Map} state.tiles
 * @param {string[]} visible
 * @returns {THREE.InstancedMesh[]}
 */
export function buildTreeMeshes(state, visible) {
  const groups = {
    round:  { trunks: [], canopies: [] },
    tall:   { trunks: [], canopies: [] },
    wide:   { trunks: [], canopies: [] },
  };

  for (const key of visible) {
    const tile = state.tiles[key];
    if (!tile || !tile.feature) continue;
    const kind = tile.feature.kind;
    if (kind !== 'tree' && kind !== 'fruitTree' && kind !== 'largeTree') continue;

    const variant = treeVariant(tile.terrain, tile.q, tile.r);
    const { heightOffset, canopyY } = canopyForVariant(variant);
    const surfaceY = tileSurfaceY(tile);
    const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);

    // largeTree gets a forced large scale regardless of density
    const baseScale = kind === 'largeTree' ? 1.8 : densityScale(tile.feature.density);

    const g = groups[variant];
    if (!g) continue;

    g.trunks.push({ x, y: surfaceY + heightOffset * TREE_TRUNK_Y_FRACTION * baseScale, z, scale: baseScale });
    g.canopies.push({ x, y: surfaceY + canopyY * baseScale, z, scale: baseScale });
  }

  const results = [];
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B5E3C, flatShading: true });
  const dummy = new THREE.Object3D();

  const variantColors = {
    round: 0x3CB371,
    tall:  0x2E8B57,
    wide:  0x66CDAA,
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
    trunkMesh.castShadow = true;
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
    canopyMesh.castShadow = true;
    canopyMesh.name = `tree-canopies-${variant}`;
    results.push(canopyMesh);
  }

  return results;
}

/**
 * Build tree InstancedMeshes for a single chunk's tiles.
 * @param {object[]} chunkTiles - Array of tile objects in this chunk
 * @param {Set<string>} visible - Set of hex keys currently visible
 * @returns {THREE.InstancedMesh[]}
 */
export function buildChunkTreeMeshes(chunkTiles, visible) {
  const groups = {
    round:  { trunks: [], canopies: [] },
    tall:   { trunks: [], canopies: [] },
    wide:   { trunks: [], canopies: [] },
  };

  for (const tile of chunkTiles) {
    const key = `${tile.q},${tile.r}`;
    if (!visible.has(key)) continue;
    if (!tile.feature) continue;
    const kind = tile.feature.kind;
    if (kind !== 'tree' && kind !== 'fruitTree' && kind !== 'largeTree') continue;

    const variant = treeVariant(tile.terrain, tile.q, tile.r);
    const { heightOffset, canopyY } = canopyForVariant(variant);
    const surfaceY = tileSurfaceY(tile);
    const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);

    const baseScale = kind === 'largeTree' ? 1.8 : densityScale(tile.feature.density);

    const g = groups[variant];
    if (!g) continue;

    g.trunks.push({ x, y: surfaceY + heightOffset * TREE_TRUNK_Y_FRACTION * baseScale, z, scale: baseScale });
    g.canopies.push({ x, y: surfaceY + canopyY * baseScale, z, scale: baseScale });
  }

  const results = [];
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B5E3C, flatShading: true });
  const dummy = new THREE.Object3D();

  const variantColors = {
    round: 0x3CB371,
    tall:  0x2E8B57,
    wide:  0x66CDAA,
  };

  for (const [variant, data] of Object.entries(groups)) {
    if (data.trunks.length === 0) continue;

    const color = variantColors[variant] || 0x3CB371;
    const canopyMat = new THREE.MeshLambertMaterial({ color, flatShading: true });

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
    trunkMesh.castShadow = true;
    trunkMesh.name = `tree-trunks-${variant}`;
    results.push(trunkMesh);

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
    canopyMesh.castShadow = true;
    canopyMesh.name = `tree-canopies-${variant}`;
    results.push(canopyMesh);
  }

  return results;
}
