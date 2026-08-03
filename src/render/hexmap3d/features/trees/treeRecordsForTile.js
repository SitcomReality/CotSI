// src/render/hexmap3d/features/trees/treeRecordsForTile.js
// Per-tile tree dispatch — picks the treatment for a tile's tree feature:
//
// Cluster (woods/forest): a `tree` feature on forest/denseForest terrain renders
// 3–7 trees scattered inside the hex (clusterTreeRecords.js). forest is a
// spherical (round) deciduous grove; denseForest (deep wood) a conical (tall)
// pine stand. Each tree varies slightly in size, trunk height, leaf
// height/width, and rotation, and leans slightly away from the hex center
// (cartoony bouquet look). The tile's continuous density drives cluster size.
//
// Solitary: `largeTree` (Elder Tree landmark), `fruitTree`, and a lone `tree` on
// open terrain (plains, hill, marsh) render one bigger, more distinctive tree
// (solitaryTreeRecords.js). The fruit tree (fruitTreeRecords.js) is the most
// elaborate: a snaking 2–3 segment gnarled trunk (tapering thicker at the base)
// forking into two steep branches — each may bend a second segment — with a leaf
// ball riding one final tip and a red apple hanging below the other.

import { tileHash } from './treeHash.js';
import { clusterTreeRecords } from './clusterTreeRecords.js';
import { solitaryTreeRecords } from './solitaryTreeRecords.js';
import { fruitTreeRecords } from './fruitTreeRecords.js';

const CLUSTER_TERRAINS = new Set(['forest', 'denseForest']);

/**
 * Build trunk + canopy instance records for a tile's tree feature.
 * Cluster tiles return multiple trees; solitary tiles return one big one.
 */
export function treeRecordsForTile(tile, worldPos) {
  const kind = tile.feature.kind;
  const tileH = tileHash(tile);
  const records = [];

  // ── Cluster: woods/forest tiles render a scattered grove ──
  if (kind === 'tree' && CLUSTER_TERRAINS.has(tile.terrain)) {
    return clusterTreeRecords(records, tile, worldPos, tileH);
  }

  // ── Fruit tree: curving segmented trunk + forked branches ──
  if (kind === 'fruitTree') {
    return fruitTreeRecords(tile, worldPos);
  }

  // ── Solitary: one bigger, more distinctive tree ──
  return solitaryTreeRecords(records, tile, worldPos, tileH);
}
