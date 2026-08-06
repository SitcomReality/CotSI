// src/render/hexmap3d/features/trees/buildTreeMeshes.js
// Collects tree instance records from visible tiles and assembles one
// InstancedMesh per part geometry. Public entry points for the tree feature.

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
} from '../geometries/index.js';
import { collectInstances, buildInstanced } from '../meshBuilder.js';
import { treeRecordsForTile, CLUSTER_TERRAINS } from './treeRecordsForTile.js';
import { FRUIT_TREE_COLORS } from '../../../../params/render/geometryParams.js';

const TRUNK_COLOR = 0x8B5E3C;
const PAINFOREST_BIOME = 'biome_painforest';

/**
 * A tile draws legacy tree meshes for the two treatments still on the
 * hard-coded builders (see treeRecordsForTile.js): a fruitTree feature on any
 * terrain, and Painforest gnarled groves (forest/denseForest woods in the
 * Painforest biome — a feature claim just disperses the grove). Everything
 * else — non-Painforest groves, solitary trees, and the migrated
 * simple/knot/mountain/hill content — resolves through descriptor data
 * (descriptors/gameBuilder.js).
 */
function isTreeTile(tile) {
  const kind = tile.feature?.kind;
  if (kind === 'fruitTree') return true;
  return CLUSTER_TERRAINS.has(tile.terrain) && tile.biomeId === PAINFOREST_BIOME;
}

function collectTreeInstances(tilesOrArray, visible, occupants) {
  return collectInstances(
    tilesOrArray, visible, isTreeTile,
    (tile, worldPos) => treeRecordsForTile(tile, worldPos, occupants),
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
 * Build tree InstancedMeshes for the current game state.
 * @param {object} state - Game state (state.tiles Map)
 * @param {Set<string>} visible - Set of "q,r" keys currently visible
 * @param {Set<string>} occupants - "q,r" keys of tiles with an occupant
 * @returns {THREE.InstancedMesh[]}
 */
export function buildTreeMeshes(state, visible, occupants) {
  return buildMeshesFromInstances(collectTreeInstances(state.tiles, visible, occupants));
}

/**
 * Build tree InstancedMeshes for a single chunk's tiles.
 * @param {object[]} chunkTiles - Array of tile objects in this chunk
 * @param {Set<string>} visible - Set of hex keys currently visible
 * @param {Set<string>} occupants - "q,r" keys of tiles with an occupant
 * @returns {THREE.InstancedMesh[]}
 */
export function buildChunkTreeMeshes(chunkTiles, visible, occupants) {
  return buildMeshesFromInstances(collectTreeInstances(chunkTiles, visible, occupants));
}
