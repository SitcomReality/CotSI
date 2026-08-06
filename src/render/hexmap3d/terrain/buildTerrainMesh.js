import * as THREE from '../../../vendor/three.module.js';
import { neighbors, coordKey } from '../../../engine/rules/hexGrid.js';
import { terrainMaterial } from '../scene/materials.js';
import { hexCenter, hexCornersXZ } from '../hexWorldSpace.js';
import { HEX_THICKNESS, SIDE_DARKEN_FACTOR, SIDE_WATER_TINT_COLOR, SIDE_WATER_TINT_WEIGHT } from '../../../params/render/terrainParams.js';
import { ELEVATION, resolveElev } from './tileHeight.js';
import { makeTopColorResolver } from './tileColor.js';
import { cornerBlendColor } from './cornerBlend.js';

// Each hex: top face (6 triangles) + 6 side quads (12 triangles) = 18
// triangles. Non-indexed geometry (each triangle = 3 vertices) → 54 vertices
// per hex.
const VERTICES_PER_HEX = 54;

// Side i (between corners i and i+1, hexCornersXZ order) faces the neighbor
// at this index into neighbors() = [E, NE, NW, W, SW, SE]. Used by the
// damp-bank side tint below.
const SIDE_NEIGHBOR_INDEX = [0, 5, 4, 3, 2, 1];

/**
 * Write one hex tile's 54 vertices (positions + vertex colors) into the
 * buffers, starting at float offset `vi`. Returns the new offset.
 * vi is a vertex index in floats, so vi/3 = vertex count.
 */
function writeTileVertices(positions, colors, vi, tile, state, explored, topColorFor) {
  const elev = resolveElev(tile, ELEVATION);
  const topColor = topColorFor(tile);
  const sideColor = topColor.map(c => c * SIDE_DARKEN_FACTOR);

  const { x: cx, z: cz } = hexCenter(tile.q, tile.r);
  const corners = hexCornersXZ(cx, cz);
  const topY = elev + HEX_THICKNESS;
  const botY = elev;

  // Precompute blended corner colors (top face only)
  const cornerColors = [];
  for (let i = 0; i < 6; i++) {
    cornerColors.push(cornerBlendColor(tile, i, state, explored, topColorFor));
  }

  // --- Top face: fan triangulation from center (corners blend into neighbors) ---
  const centerX = cx, centerZ = cz, centerY = topY;
  for (let i = 0; i < 6; i++) {
    const c0 = corners[i];
    const c1 = corners[(i + 1) % 6];

    // Triangle: center → corner[i+1] → corner[i] (CCW from above)
    addVertex(positions, colors, vi, centerX, centerY, centerZ, topColor);
    addVertex(positions, colors, vi + 3, c1.x, topY, c1.z, cornerColors[(i + 1) % 6]);
    addVertex(positions, colors, vi + 6, c0.x, topY, c0.z, cornerColors[i]);
    vi += 9; // 3 vertices × 3 floats each
  }

  // --- Side faces: 6 quads, each = 2 triangles (own darkened color, no blend) ---
  // Sides that border water (lakes, ocean, rivers) pull toward a dark water
  // color so shorelines and channel walls read as water-adjacent.
  const nbrs = neighbors({ q: tile.q, r: tile.r });
  for (let i = 0; i < 6; i++) {
    const c0 = corners[i];
    const c1 = corners[(i + 1) % 6];

    let quadColor = sideColor;
    const nbr = nbrs[SIDE_NEIGHBOR_INDEX[i]];
    const nbrKey = coordKey(nbr);
    const nbTile = state.tiles[nbrKey];
    if (nbTile && explored.has(nbrKey) && (nbTile.terrain === 'water' || nbTile.terrain === 'river')) {
      quadColor = [
        sideColor[0] * (1 - SIDE_WATER_TINT_WEIGHT) + SIDE_WATER_TINT_COLOR[0] * SIDE_WATER_TINT_WEIGHT,
        sideColor[1] * (1 - SIDE_WATER_TINT_WEIGHT) + SIDE_WATER_TINT_COLOR[1] * SIDE_WATER_TINT_WEIGHT,
        sideColor[2] * (1 - SIDE_WATER_TINT_WEIGHT) + SIDE_WATER_TINT_COLOR[2] * SIDE_WATER_TINT_WEIGHT,
      ];
    }

    // Side quads: CCW from outside (top1 → top0 → bot0 + top1 → bot0 → bot1)
    // Triangle 1: bot0 → top0 → top1 (CCW from outside)
    addVertex(positions, colors, vi,      c0.x, botY, c0.z, quadColor);  // bot0
    addVertex(positions, colors, vi + 3,  c0.x, topY, c0.z, quadColor);  // top0
    addVertex(positions, colors, vi + 6,  c1.x, topY, c1.z, quadColor);  // top1
    // Triangle 2: bot0 → top1 → bot1 (CCW from outside)
    addVertex(positions, colors, vi + 9,  c0.x, botY, c0.z, quadColor);  // bot0
    addVertex(positions, colors, vi + 12, c1.x, topY, c1.z, quadColor);  // top1
    addVertex(positions, colors, vi + 15, c1.x, botY, c1.z, quadColor);  // bot1
    vi += 18; // 6 vertices × 3 floats
  }

  return vi;
}

function addVertex(positions, colors, offset, x, y, z, color) {
  positions[offset]     = x;
  positions[offset + 1] = y;
  positions[offset + 2] = z;
  colors[offset]        = color[0];
  colors[offset + 1]    = color[1];
  colors[offset + 2]    = color[2];
}

/**
 * Build a single merged BufferGeometry for all visible + explored hex tiles.
 * Water tiles (water + river terrain) are excluded — they render via
 * buildChunkWaterMesh on their own material (no terrain blending, ripple +
 * flow animation).
 *
 * @param {Object} state    - Game state (G)
 * @param {Set}    visible  - Set of hex keys currently visible
 * @param {Set}    explored - Set of hex keys ever explored
 * @returns {THREE.Mesh}
 */
export function buildTerrainMesh(state, visible, explored) {
  const tiles = Object.values(state.tiles);

  // Count how many tiles we'll render
  const activeTiles = tiles.filter(t => explored.has(`${t.q},${t.r}`) && t.terrain !== 'water' && t.terrain !== 'river');
  const tileCount = activeTiles.length;

  const positions = new Float32Array(tileCount * VERTICES_PER_HEX * 3);
  const colors = new Float32Array(tileCount * VERTICES_PER_HEX * 3);
  const topColorFor = makeTopColorResolver(state);

  let vi = 0; // vertex index (in floats, so vi/3 = vertex count)
  for (const tile of activeTiles) {
    vi = writeTileVertices(positions, colors, vi, tile, state, explored, topColorFor);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, terrainMaterial);
  mesh.name = 'terrain';
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

/**
 * Build a merged BufferGeometry for tiles within a single chunk.
 * Only tiles present in `explored` are rendered; water tiles (water + river
 * terrain) are excluded (they render via buildChunkWaterMesh on their own
 * material).
 *
 * @param {object[]} chunkTiles - Array of tile objects belonging to this chunk
 * @param {object}   state      - Game state (for biomePalettes lookup per tile)
 * @param {Set}      visible    - Set of hex keys currently visible
 * @param {Set}      explored   - Set of hex keys ever explored
 * @returns {THREE.Mesh|null} Mesh, or null if no tiles to render
 */
export function buildChunkTerrainMesh(chunkTiles, state, visible, explored) {
  const activeTiles = [];
  for (const tile of chunkTiles) {
    const key = `${tile.q},${tile.r}`;
    if (explored.has(key) && tile.terrain !== 'water' && tile.terrain !== 'river') activeTiles.push(tile);
  }
  if (activeTiles.length === 0) return null;

  const tileCount = activeTiles.length;
  const positions = new Float32Array(tileCount * VERTICES_PER_HEX * 3);
  const colors = new Float32Array(tileCount * VERTICES_PER_HEX * 3);
  const topColorFor = makeTopColorResolver(state);

  let vi = 0;
  for (const tile of activeTiles) {
    vi = writeTileVertices(positions, colors, vi, tile, state, explored, topColorFor);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(geo, terrainMaterial);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  mesh.frustumCulled = true;
  return mesh;
}
