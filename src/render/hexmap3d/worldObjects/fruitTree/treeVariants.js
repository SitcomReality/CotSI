// src/render/hexmap3d/worldObjects/fruitTree/treeVariants.js
// Canopy selection for the fruit tree: the terrain decides round vs tall (the
// same canopy family as the surrounding grove — clusterVariant), and
// canopyForVariant supplies the per-variant geometry + placement offsets +
// canopy half-height.

import {
  getTreeCanopyRoundGeo,
  getTreeCanopyTallGeo,
  getTreeCanopyWideGeo,
} from './treeGeometries.js';
import {
  TREE_TALL, TREE_WIDE, TREE_ROUND,
  TREE_CANOPY_ROUND, TREE_CANOPY_TALL, TREE_CANOPY_WIDE,
} from '../../../../params/render/geometryParams.js';

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
