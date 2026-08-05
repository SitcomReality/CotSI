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
// other feature (knot, base, slab…) claims the hex center and the grove
// disperses to the hex edge (shrunk) instead of being removed — or hides
// entirely when an occupant stands on the tile too.
//
// Solitary: a `tree` on open terrain (plains, hill, marsh) and `largeTree`
// (Elder Tree landmark) render one bigger, more distinctive tree
// (solitaryTreeRecords.js).
//
// De-emphasis: when an occupant (champion/mob/trader) shares the hex, the
// non-occupant content steps aside — feature trees move to the shared
// upper-left corner anchor and shrink (decorEmphasis.js).

import { tileHash } from './treeHash.js';
import { clusterTreeRecords } from './clusterTreeRecords.js';
import { solitaryTreeRecords } from './solitaryTreeRecords.js';
import { fruitTreeRecords } from './fruitTreeRecords.js';
import {
  decorState, featureState, DECORATION, isTileOccupied,
} from '../decorEmphasis.js';

/** Terrains whose default look is a scattered tree grove. */
export const CLUSTER_TERRAINS = new Set(['forest', 'denseForest']);

/**
 * Build trunk + canopy instance records for a tile's trees.
 * Grove tiles return multiple trees; feature tiles return the feature's tree
 * (or the dispersing grove when a non-tree feature claims the tile).
 *
 * @param {object} tile      - Tile with `terrain`, `feature`, `q`, `r`
 * @param {object} worldPos  - { x, y, z } hex center in world space
 * @param {Set<string>} occupants - "q,r" keys of tiles with an occupant
 */
export function treeRecordsForTile(tile, worldPos, occupants) {
  const kind = tile.feature?.kind;
  const tileH = tileHash(tile);
  const occupied = isTileOccupied(occupants, tile);

  // ── Woods: the grove is the default look; a feature claims the center ──
  if (CLUSTER_TERRAINS.has(tile.terrain)) {
    if (!tile.feature || kind === 'tree') {
      // Plain grove, or legacy `tree` on woods (the grove is the tree).
      const mode = decorState({ hasOccupant: occupied, hasFeature: false, decoration: DECORATION.GROVE });
      return clusterTreeRecords([], tile, worldPos, tileH, mode);
    }
    if (kind === 'fruitTree') return fruitTreeRecords(tile, worldPos, featureState({ hasOccupant: occupied }));
    // Any other feature (knot, base, slab…) claims the center — grove disperses.
    const mode = decorState({ hasOccupant: occupied, hasFeature: true, decoration: DECORATION.GROVE });
    return clusterTreeRecords([], tile, worldPos, tileH, mode);
  }

  // ── Open terrain: solitary landmarks ──
  const mode = featureState({ hasOccupant: occupied });
  if (kind === 'fruitTree') return fruitTreeRecords(tile, worldPos, mode); // legacy fruit tree on open terrain
  if (kind === 'tree' || kind === 'largeTree') return solitaryTreeRecords([], tile, worldPos, tileH, mode);
  return [];
}
