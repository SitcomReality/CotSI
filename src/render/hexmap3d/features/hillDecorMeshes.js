// src/render/hexmap3d/features/hillDecorMeshes.js
// Terrain decoration for hill tiles: one low flattened dome at the hex
// center. It cannot spread out like a grove, so de-emphasis sinks it below
// the tile surface (shrink + descend) — or hides it entirely when an
// occupant and a feature share the tile (decorEmphasis.js).

import { toonMaterial } from '../scene/materials.js';
import { collectInstances, buildInstanced } from './meshBuilder.js';
import { getHillDecorGeo } from './geometries/index.js';
import { HILL_DECOR } from '../../../params/render/geometryParams.js';
import {
  DECOR_STATE, DECORATION,
  decorState, isTileOccupied, sunkTransform,
} from './decorEmphasis.js';

const HILL_MATERIAL = toonMaterial({ color: HILL_DECOR.color });

/**
 * Collect mound instances for a set of hill tiles and build one InstancedMesh.
 *
 * @param {Map|object[]} tilesOrArray - state.tiles Map or chunkTiles array
 * @param {Set<string>} visible - Set of "q,r" keys currently visible
 * @param {Set<string>} occupants - "q,r" keys of tiles with an occupant
 * @returns {THREE.InstancedMesh[]}
 */
function _buildHillDecor(tilesOrArray, visible, occupants) {
  const instances = collectInstances(
    tilesOrArray, visible,
    (tile) => tile.terrain === 'hill',
    (tile, worldPos) => {
      const mode = decorState({
        hasOccupant: isTileOccupied(occupants, tile),
        hasFeature: !!tile.feature,
        decoration: DECORATION.HILL,
      });
      if (mode === DECOR_STATE.HIDDEN) return null;
      const { scale, yOffset } = mode === DECOR_STATE.SUNK
        ? sunkTransform()
        : { scale: 1, yOffset: 0 };
      return {
        x: worldPos.x, y: worldPos.y + yOffset, z: worldPos.z,
        scale,
      };
    },
  );

  if (instances.length === 0) return [];
  return [buildInstanced(getHillDecorGeo(), HILL_MATERIAL, instances, 'decor-hill')];
}

/**
 * Build hill mound InstancedMeshes for the current full game state.
 * @param {object} state  - Game state (state.tiles Map)
 * @param {Set<string>} visible - Set of "q,r" keys currently visible
 * @param {Set<string>} occupants - "q,r" keys of tiles with an occupant
 * @returns {THREE.InstancedMesh[]}
 */
export function buildHillDecorMeshes(state, visible, occupants) {
  return _buildHillDecor(state.tiles, visible, occupants);
}

/**
 * Build hill mound InstancedMeshes for a single chunk's tiles.
 * @param {object[]} chunkTiles - Array of tile objects in this chunk
 * @param {Set<string>} visible - Set of hex keys currently visible
 * @param {Set<string>} occupants - "q,r" keys of tiles with an occupant
 * @returns {THREE.InstancedMesh[]}
 */
export function buildChunkHillDecorMeshes(chunkTiles, visible, occupants) {
  return _buildHillDecor(chunkTiles, visible, occupants);
}
