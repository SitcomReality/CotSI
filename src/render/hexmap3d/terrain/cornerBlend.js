import { neighbors, coordKey } from '../../../engine/rules/hexGrid.js';
import { TERRAIN_BLEND_FACTOR } from '../../../params/render/terrainParams.js';

// Corner i of a pointy-top hex (angle 60i−30°, hexCornersXZ order) is shared
// with the two tiles at these indices into neighbors() = [E, NE, NW, W, SW, SE].
const CORNER_NEIGHBOR_INDICES = [
  [0, 1], // -30°  (top-right):      E, NE
  [0, 5], //  30°  (right):          E, SE
  [5, 4], //  90°  (bottom-right):   SE, SW
  [4, 3], // 150°  (bottom-left):    SW, W
  [3, 2], // 210°  (left):           W, NW
  [2, 1], // 270°  (top-left):       NW, NE
];

/**
 * Top-face corner color for a tile, blended toward the average color of the
 * explored tiles sharing that corner (soft biome transitions). Missing or
 * unexplored neighbors are skipped; falls back to the tile's own top color.
 *
 * Water neighbors are excluded from the average: water renders on its own mesh
 * and must never terrain-blend with adjacent land (water system rule 3).
 */
export function cornerBlendColor(tile, cornerIdx, state, explored, topColorFor) {
  const own = topColorFor(tile);
  const parts = [own];
  const nbrs = neighbors({ q: tile.q, r: tile.r });
  for (const nIdx of CORNER_NEIGHBOR_INDICES[cornerIdx]) {
    const nb = nbrs[nIdx];
    const key = coordKey(nb);
    const nbTile = state.tiles[key];
    if (!nbTile || nbTile.terrain === 'water' || !explored.has(key)) continue;
    parts.push(topColorFor(nbTile));
  }
  if (parts.length === 1) return own;

  let r = 0, g = 0, b = 0;
  for (const p of parts) { r += p[0]; g += p[1]; b += p[2]; }
  const n = parts.length;
  const f = TERRAIN_BLEND_FACTOR;
  return [
    own[0] * (1 - f) + (r / n) * f,
    own[1] * (1 - f) + (g / n) * f,
    own[2] * (1 - f) + (b / n) * f,
  ];
}
