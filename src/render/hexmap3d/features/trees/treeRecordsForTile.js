// src/render/hexmap3d/features/trees/treeRecordsForTile.js
// Per-tile tree dispatch — now only the legacy procedural treatments that the
// static-parts descriptor model cannot express (see descriptors/data/trees.js):
//
// fruitTree — one bigger forest-family tree with visible, ripening fruit
// (fruitTreeRecords.js), on any terrain. Renders as one forest-family tree
// with 1–2 hanging fruit reflecting the tree's ripe/unripe game state.
//
// Painforest groves — forest/denseForest tiles in the Painforest biome render
// gnarled twisted trees (clusterTreeRecords.js → gnarledTreeRecords.js) with
// dark foliage. De-emphasis matches the pre-migration rules: an occupant or
// non-tree feature claims the hex center and the grove disperses to a shrunk
// ring near the hex edge — or hides entirely when an occupant and feature
// share the tile.
//
// Everything else — groves on non-Painforest woods, solitary trees, simple
// features, knots, mountains, hills — is migrated to descriptor data and
// resolved by descriptors/gameBuilder.js.

import { tileHash } from './treeHash.js';
import { clusterTreeRecords } from './clusterTreeRecords.js';
import { fruitTreeRecords } from './fruitTreeRecords.js';
import {
  decorState, featureState, DECORATION, isTileOccupied,
} from '../decorEmphasis.js';

/** Terrains whose default look is a scattered tree grove. */
export const CLUSTER_TERRAINS = new Set(['forest', 'denseForest']);

const PAINFOREST_BIOME = 'biome_painforest';

/**
 * Build trunk + canopy instance records for a tile's legacy trees.
 *
 * @param {object} tile      - Tile with `terrain`, `biomeId`, `feature`, `q`, `r`
 * @param {object} worldPos  - { x, y, z } hex center in world space
 * @param {Set<string>} occupants - "q,r" keys of tiles with an occupant
 * @param {boolean} [visible=true] - whether the tile is currently visible;
 *        when false the grove renders unoccupied (occupants and features are
 *        not rendered out of sight, so nothing displaces it)
 */
export function treeRecordsForTile(tile, worldPos, occupants, visible = true) {
  const kind = tile.feature?.kind;
  const tileH = tileHash(tile);
  const occupied = visible && isTileOccupied(occupants, tile);

  // ── Painforest woods: the gnarled grove is the default look ──
  if (CLUSTER_TERRAINS.has(tile.terrain) && tile.biomeId === PAINFOREST_BIOME) {
    if (!tile.feature || kind === 'tree') {
      // Plain grove, or legacy `tree` on woods (the grove is the tree).
      const mode = decorState({ hasOccupant: occupied, hasFeature: false, decoration: DECORATION.GROVE });
      return clusterTreeRecords([], tile, worldPos, tileH, mode);
    }
    if (kind === 'fruitTree') return fruitTreeRecords(tile, worldPos, featureState({ hasOccupant: occupied }));
    // Any other feature claims the center — grove disperses (out of sight the
    // feature is invisible, so the grove stays in its unoccupied state).
    const mode = decorState({ hasOccupant: occupied, hasFeature: visible, decoration: DECORATION.GROVE });
    return clusterTreeRecords([], tile, worldPos, tileH, mode);
  }

  // ── Fruit tree on any other terrain ──
  if (kind === 'fruitTree') return fruitTreeRecords(tile, worldPos, featureState({ hasOccupant: occupied }));
  return [];
}
