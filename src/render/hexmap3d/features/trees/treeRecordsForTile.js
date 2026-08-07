// src/render/hexmap3d/features/trees/treeRecordsForTile.js
// Per-tile legacy tree dispatch — the one procedural treatment the static-parts
// descriptor model cannot express (see descriptors/data/trees.js):
//
// fruitTree — one bigger forest-family tree with visible, ripening fruit
// (fruitTreeRecords.js), on any terrain. Renders as one forest-family tree
// with 1–2 hanging fruit reflecting the tree's ripe/unripe game state.
//
// Everything else — groves on any woods (including the Painforest gnarled
// variant), solitary trees, simple features, knots, mountains, hills — is
// migrated to descriptor data and resolved by descriptors/gameBuilder.js.

import { fruitTreeRecords } from './fruitTreeRecords.js';
import {
  featureState, isTileOccupied,
} from '../decorEmphasis.js';

/**
 * Build trunk + canopy instance records for a tile's legacy trees (fruit
 * trees only — see the module comment).
 *
 * @param {object} tile      - Tile with `feature`, `q`, `r`
 * @param {object} worldPos  - { x, y, z } hex center in world space
 * @param {Set<string>} occupants - "q,r" keys of tiles with an occupant
 * @param {boolean} [visible=true] - whether the tile is currently visible;
 *        out of sight the feature is not rendered, so it stays unoccupied
 */
export function treeRecordsForTile(tile, worldPos, occupants, visible = true) {
  if (tile.feature?.kind !== 'fruitTree') return [];
  const occupied = visible && isTileOccupied(occupants, tile);
  return fruitTreeRecords(tile, worldPos, featureState({ hasOccupant: occupied }));
}
