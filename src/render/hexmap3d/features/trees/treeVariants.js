// src/render/hexmap3d/features/trees/treeVariants.js
// Canopy-shape selection for trees: which variant a tile's trees use, and the
// per-variant geometry + placement offsets + canopy half-height.

import {
  getTreeCanopyRoundGeo,
  getTreeCanopyTallGeo,
  getTreeCanopyWideGeo,
} from '../geometries/index.js';
import {
  TREE_VARIANT_HASH_SEEDS, TREE_FOREST_TALL_THRESHOLD, TREE_VARIANT_THRESHOLDS,
  TREE_TALL, TREE_WIDE, TREE_ROUND,
  TREE_CANOPY_ROUND, TREE_CANOPY_TALL, TREE_CANOPY_WIDE,
} from '../../../../params/render/geometryParams.js';

/**
 * Canopy variant for a solitary tree — deterministic from terrain + coords.
 * (Cluster trees pick their shape per terrain below; lone trees keep the
 * original round/tall/wide mix.)
 */
export function treeVariant(terrain, q, r) {
  const hash = ((q * TREE_VARIANT_HASH_SEEDS[0] + r * TREE_VARIANT_HASH_SEEDS[1]) * TREE_VARIANT_HASH_SEEDS[2]) % TREE_VARIANT_HASH_SEEDS[3];
  if (terrain === 'forest') {
    return hash < TREE_FOREST_TALL_THRESHOLD ? 'tall' : 'round';
  }
  if (hash < TREE_VARIANT_THRESHOLDS[0]) return 'round';
  if (hash < TREE_VARIANT_THRESHOLDS[1]) return 'tall';
  return 'wide';
}

/**
 * Canopy shape for a cluster terrain — one shape per landscape:
 * forest = spherical (round) deciduous groves, denseForest (deep wood) =
 * conical (tall) pines. Per-tree size/stretch/lean/color variation still comes
 * from treeVariation, so cluster members stay individually distinct.
 */
export function clusterVariant(terrain) {
  return terrain === 'denseForest' ? 'tall' : 'round';
}

/**
 * Per-variant geometry, placement offsets, canopy half-height, and trunk
 * height scale. halfHeight anchors the canopy bottom to the trunk top when the
 * canopy is stretched in Y. trunkScale shortens the trunk for the tall (pine)
 * variant — the cone tapers to a point, so a full-length trunk would poke
 * through the foliage near the tip.
 */
export function canopyForVariant(variant) {
  switch (variant) {
    case 'tall':
      return { geo: getTreeCanopyTallGeo(), heightOffset: TREE_TALL.heightOffset, canopyY: TREE_TALL.canopyY, halfHeight: TREE_CANOPY_TALL.height / 2, trunkScale: 0.8 };
    case 'wide':
      return { geo: getTreeCanopyWideGeo(), heightOffset: TREE_WIDE.heightOffset, canopyY: TREE_WIDE.canopyY, halfHeight: TREE_CANOPY_WIDE.height / 2, trunkScale: 1.0 };
    case 'round':
    default:
      return { geo: getTreeCanopyRoundGeo(), heightOffset: TREE_ROUND.heightOffset, canopyY: TREE_ROUND.canopyY, halfHeight: TREE_CANOPY_ROUND.radius, trunkScale: 1.0 };
  }
}
