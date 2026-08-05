// src/render/hexmap3d/features/trees/treeRecordsForTile.js
// Per-tile tree dispatch — picks the treatment for a tile's trees:
//
// Grove (terrain decoration): every forest/denseForest tile renders a
// scattered grove by default (clusterTreeRecords.js). forest is a spherical
// (round) deciduous grove; denseForest (deep wood) a conical (tall) pine
// stand — except in the Painforest biome, where grove members are gnarled
// twisted trees. Each tree varies slightly in size, trunk height, leaf
// height/width, and rotation, and leans slightly away from the hex center
// (cartoony bouquet look). Tile moisture drives grove density.
//
// An interactive feature claims its tile: a fruit tree (fruitTreeRecords.js)
// renders as one bigger forest-family tree with visible, ripening fruit; any
// other feature (knot, base, slab…) suppresses the grove entirely so the
// feature reads as the tile's single subject.
//
// Solitary: a `tree` on open terrain (plains, hill, marsh) and `largeTree`
// (Elder Tree landmark) render one bigger, more distinctive tree
// (solitaryTreeRecords.js).

import { tileHash } from './treeHash.js';
import { clusterTreeRecords } from './clusterTreeRecords.js';
import { solitaryTreeRecords } from './solitaryTreeRecords.js';
import { fruitTreeRecords } from './fruitTreeRecords.js';

/** Terrains whose default look is a scattered tree grove. */
export const CLUSTER_TERRAINS = new Set(['forest', 'denseForest']);

/**
 * Build trunk + canopy instance records for a tile's trees.
 * Grove tiles return multiple trees; feature tiles return the feature's tree
 * (or nothing when a non-tree feature claims the tile).
 */
export function treeRecordsForTile(tile, worldPos) {
  const kind = tile.feature?.kind;
  const tileH = tileHash(tile);

  // ── Woods: the grove is the default look; a feature claims its tile ──
  if (CLUSTER_TERRAINS.has(tile.terrain)) {
    if (!tile.feature) return clusterTreeRecords([], tile, worldPos, tileH);
    if (kind === 'tree') return clusterTreeRecords([], tile, worldPos, tileH); // legacy `tree` on woods
    if (kind === 'fruitTree') return fruitTreeRecords(tile, worldPos);
    // Any other feature (knot, base, slab…) claims the tile — no grove.
    return [];
  }

  // ── Open terrain: solitary landmarks ──
  if (kind === 'fruitTree') return fruitTreeRecords(tile, worldPos); // legacy fruit tree on open terrain
  if (kind === 'tree' || kind === 'largeTree') return solitaryTreeRecords([], tile, worldPos, tileH);
  return [];
}
