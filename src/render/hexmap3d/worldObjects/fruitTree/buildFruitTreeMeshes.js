// src/render/hexmap3d/worldObjects/fruitTree/buildFruitTreeMeshes.js
// Collects fruit-tree instance records from visible tiles and assembles one
// InstancedMesh per part geometry. Public entry points for the fruit-tree
// feature (the only treatment still on a hard-coded builder).
//
// Everything else — groves on any woods (including the Painforest gnarled
// variant), solitary trees, simple features, knots, mountains, hills — is
// migrated to descriptor data and resolved by descriptors/gameBuilder.js.

import * as THREE from '../../../../vendor/three.module.js';
import { toonMaterial } from '../../scene/materials.js';
import {
  getTreeTrunkGeo,
  getTreeCanopyRoundGeo,
  getTreeCanopyTallGeo,
  getTreeCanopyWideGeo,
  getFruitTreeTrunkGeo,
  getFruitTreeBranchGeo,
  getFruitTreeCanopyGeo,
  getFruitTreeAppleGeo,
} from './treeGeometries.js';
import { collectInstances, buildInstanced } from '../meshBuilder.js';
import { fruitTreeRecordsForTile } from './fruitTreeRecordsForTile.js';
import { FRUIT_TREE_COLORS } from '../../../../params/render/geometryParams.js';

const TRUNK_COLOR = 0x8B5E3C;

/**
 * A tile draws legacy tree meshes for the one treatment still on the
 * hard-coded builders (see fruitTreeRecordsForTile.js): a fruitTree feature on
 * any terrain. Everything else resolves through descriptor data.
 */
function isTreeTile(tile) {
  return tile.feature?.kind === 'fruitTree';
}

/**
 * Collect legacy tree records (fruit trees). They are features and stay gated
 * on `visible`.
 */
function collectTreeInstances(tilesOrArray, visible, occupants) {
  return collectInstances(
    tilesOrArray, visible,
    (tile) => isTreeTile(tile),
    (tile, worldPos) => fruitTreeRecordsForTile(tile, worldPos, occupants, visible.has(`${tile.q},${tile.r}`)),
  );
}

/** Part geometry registry — one InstancedMesh per geo key. */
const PART_GEOS = {
  trunk:         getTreeTrunkGeo,
  'canopy-round': getTreeCanopyRoundGeo,
  'canopy-tall':  getTreeCanopyTallGeo,
  'canopy-wide':  getTreeCanopyWideGeo,
  'fruit-trunk':  getFruitTreeTrunkGeo,
  'fruit-branch': getFruitTreeBranchGeo,
  'fruit-canopy': getFruitTreeCanopyGeo,
  'fruit-apple':  getFruitTreeAppleGeo,
};

/** Solid-wood parts share the brown trunk material (branches get a lighter one). */
const WOOD_GEO_KEYS = new Set(['trunk', 'fruit-trunk', 'fruit-branch']);

function buildMeshesFromInstances(instances) {
  // Group records by part geometry (one InstancedMesh per geo key)
  const groups = {};
  for (const inst of instances) {
    (groups[inst.geo] || (groups[inst.geo] = [])).push(inst);
  }

  const results = [];
  const trunkMat = toonMaterial({ color: TRUNK_COLOR });
  const branchMat = toonMaterial({ color: FRUIT_TREE_COLORS.branch });
  // Canopy/apple material is white; per-tree colors arrive via instance colors.
  const canopyMat = toonMaterial({ color: 0xFFFFFF });

  for (const [geo, data] of Object.entries(groups)) {
    const makeGeo = PART_GEOS[geo];
    if (!makeGeo) continue;
    const material = geo === 'fruit-branch' ? branchMat : WOOD_GEO_KEYS.has(geo) ? trunkMat : canopyMat;
    results.push(buildInstanced(makeGeo(), material, data, `tree-${geo}`));
  }
  return results;
}

/**
 * Build fruit-tree InstancedMeshes for the current game state.
 * @param {object} state - Game state (state.tiles Map)
 * @param {Set<string>} visible - Set of "q,r" keys currently visible
 * @param {Set<string>} occupants - "q,r" keys of tiles with an occupant
 * @returns {THREE.InstancedMesh[]}
 */
export function buildFruitTreeMeshes(state, visible, occupants) {
  return buildMeshesFromInstances(collectTreeInstances(state.tiles, visible, occupants));
}

/**
 * Build fruit-tree InstancedMeshes for a single chunk's tiles.
 * @param {object[]} chunkTiles - Array of tile objects in this chunk
 * @param {Set<string>} visible - Set of hex keys currently visible
 * @param {Set<string>} occupants - "q,r" keys of tiles with an occupant
 * @returns {THREE.InstancedMesh[]}
 */
export function buildChunkFruitTreeMeshes(chunkTiles, visible, occupants) {
  return buildMeshesFromInstances(collectTreeInstances(chunkTiles, visible, occupants));
}
