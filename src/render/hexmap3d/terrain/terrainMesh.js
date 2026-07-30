import * as THREE from '../../../vendor/three.module.js';
import { terrainMaterial } from '../scene/materials.js';
import { HEX_RADIUS, hexCenter, hexCornersXZ } from '../hexWorldSpace.js';
import { HEX_THICKNESS, SIDE_DARKEN_FACTOR, LAKE_COLOR_MODULATION, TERRAIN_ELEVATION, RIVER_OVERLAY_COLOR, RIVER_OVERLAY_WEIGHT } from '../../../params/render/terrainParams.js';

// Elevation per terrain type (world units)
export const ELEVATION = TERRAIN_ELEVATION;
export { HEX_THICKNESS };

/**
 * Top surface Y of a tile of given terrain type.
 * This is the single source of truth for ground level.
 */
export function tileTopY(terrain) {
  return (ELEVATION[terrain] || 0) + HEX_THICKNESS;
}

/**
 * Resolve the elevation for a tile, preferring the per-tile value set
 * during generation (which accounts for biome terrainElevation overrides).
 * Falls back to the global ELEVATION table.
 */
function resolveElev(tile, elevTable) {
  if (tile.elevation !== undefined && tile.elevation !== null) {
    return tile.elevation;
  }
  return elevTable[tile.terrain] || 0;
}

// Terrain fill colors (mapped to vertex colors)
// These are RGB tuples for vertex color attributes
export const TERRAIN_COLOR = {
  plains:        [0.455, 0.678, 0.365],  // #74ad5d — vibrant meadow green
  forest:        [0.294, 0.557, 0.255],  // #4b8e41 — deep vivid forest
  denseForest:   [0.176, 0.420, 0.137],  // #2d6b23 — dark rich green
  desert:        [0.839, 0.694, 0.357],  // #d6b15b — warm golden sand
  marsh:         [0.506, 0.600, 0.404],  // #819967 — murky vibrant marsh
  mountain:      [0.529, 0.486, 0.416],  // #877c6a — rocky warm gray
  peak:          [0.690, 0.729, 0.784],  // #b0b8c8 — pale snowy rock
  floatingIsland:[0.753, 0.847, 0.910],  // #c0d8e8 — pale cyan-white
  water:         [0.373, 0.604, 0.757],  // #5f9ac1 — bright cyan-blue
  ice:           [0.649, 0.820, 0.957],  // #a6d1f4 — pale ice blue
  beach:         [0.910, 0.847, 0.627],  // #e8d8a0 — warm sand
};

// Darken factor for side faces
const SIDE_DARKEN = SIDE_DARKEN_FACTOR;

/**
 * Build a single merged BufferGeometry for all visible + explored hex tiles.
 *
 * @param {Object} state    - Game state (G)
 * @param {Set}    visible  - Set of hex keys currently visible
 * @param {Set}    explored - Set of hex keys ever explored
 * @returns {THREE.Mesh}
 */
export function buildTerrainMesh(state, visible, explored) {
  const tiles = Object.values(state.tiles);

  // Count how many tiles we'll render
  const activeTiles = tiles.filter(t => explored.has(`${t.q},${t.r}`));
  const tileCount = activeTiles.length;

  // Each hex: top face (6 tri = 18 indices) + 6 side quads (12 tri = 36 indices)
  //   = 54 indices per hex; vertices: 1 center + 6 top corners + 6 bottom corners = 13
  // We'll use non-indexed geometry for simplicity (each triangle = 3 vertices).
  // 18 triangles per hex (6 top + 12 sides) = 54 vertices per hex.
  const vertsPerHex = 54;
  const positions = new Float32Array(tileCount * vertsPerHex * 3);
  const colors = new Float32Array(tileCount * vertsPerHex * 3);

  let vi = 0; // vertex index (in floats, so vi/3 = vertex count)

  for (const tile of activeTiles) {
    // Resolve biome palette per tile (multi-biome compatibility)
    const pal = (tile.biomeId && state.biomePalettes?.get(tile.biomeId)) || {};
    const elev = resolveElev(tile, ELEVATION);
    const baseColor = pal[tile.terrain] || TERRAIN_COLOR[tile.terrain] || TERRAIN_COLOR.plains;

    // Lakes get a darker, greener water color to distinguish from ocean
    const resolvedColor = (tile.terrain === 'water' && tile.waterType === 'lake')
      ? [baseColor[0] * LAKE_COLOR_MODULATION.r, baseColor[1] * LAKE_COLOR_MODULATION.g, baseColor[2] * LAKE_COLOR_MODULATION.b]
      : baseColor;
    const sideColor = resolvedColor.map(c => c * SIDE_DARKEN);

    // River overlay on top face only — blend river blue into the terrain color
    const topColor = tile.isRiver
      ? [
          resolvedColor[0] * (1 - RIVER_OVERLAY_WEIGHT) + RIVER_OVERLAY_COLOR[0] * RIVER_OVERLAY_WEIGHT,
          resolvedColor[1] * (1 - RIVER_OVERLAY_WEIGHT) + RIVER_OVERLAY_COLOR[1] * RIVER_OVERLAY_WEIGHT,
          resolvedColor[2] * (1 - RIVER_OVERLAY_WEIGHT) + RIVER_OVERLAY_COLOR[2] * RIVER_OVERLAY_WEIGHT,
        ]
      : resolvedColor;

    const { x: cx, z: cz } = hexCenter(tile.q, tile.r);
    const corners = hexCornersXZ(cx, cz);
    const topY = elev + HEX_THICKNESS;
    const botY = elev;

    // --- Top face: fan triangulation from center ---
    const centerX = cx, centerZ = cz, centerY = topY;
    for (let i = 0; i < 6; i++) {
      const c0 = corners[i];
      const c1 = corners[(i + 1) % 6];

      // Triangle: center → corner[i+1] → corner[i] (CCW from above)
      addVertex(positions, colors, vi, centerX, centerY, centerZ, topColor);
      addVertex(positions, colors, vi + 3, c1.x, topY, c1.z, topColor);
      addVertex(positions, colors, vi + 6, c0.x, topY, c0.z, topColor);
      vi += 9; // 3 vertices × 3 floats each
    }

    // --- Side faces: 6 quads, each = 2 triangles ---
    for (let i = 0; i < 6; i++) {
      const c0 = corners[i];
      const c1 = corners[(i + 1) % 6];

      // Side quads: CCW from outside (top1 → top0 → bot0 + top1 → bot0 → bot1)
      // Triangle 1: bot0 → top0 → top1 (CCW from outside)
      addVertex(positions, colors, vi,      c0.x, botY, c0.z, sideColor);  // bot0
      addVertex(positions, colors, vi + 3,  c0.x, topY, c0.z, sideColor);  // top0
      addVertex(positions, colors, vi + 6,  c1.x, topY, c1.z, sideColor);  // top1
      // Triangle 2: bot0 → top1 → bot1 (CCW from outside)
      addVertex(positions, colors, vi + 9,  c0.x, botY, c0.z, sideColor);  // bot0
      addVertex(positions, colors, vi + 12, c1.x, topY, c1.z, sideColor);  // top1
      addVertex(positions, colors, vi + 15, c1.x, botY, c1.z, sideColor);  // bot1
      vi += 18; // 6 vertices × 3 floats
    }
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
 * Only tiles present in `explored` are rendered.
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
    if (explored.has(key)) activeTiles.push(tile);
  }
  if (activeTiles.length === 0) return null;

  const tileCount = activeTiles.length;
  const vertsPerHex = 54;
  const positions = new Float32Array(tileCount * vertsPerHex * 3);
  const colors = new Float32Array(tileCount * vertsPerHex * 3);

  let vi = 0;
  // Resolve biome palette once for this chunk (all tiles share the same biome)
  const firstTile = activeTiles[0];
  const palette = (firstTile?.biomeId && state.biomePalettes?.get(firstTile.biomeId)) || {};

  for (const tile of activeTiles) {
    const elev = resolveElev(tile, ELEVATION);
    const baseColor = palette[tile.terrain] || TERRAIN_COLOR[tile.terrain] || TERRAIN_COLOR.plains;

    const resolvedColor = (tile.terrain === 'water' && tile.waterType === 'lake')
      ? [baseColor[0] * LAKE_COLOR_MODULATION.r, baseColor[1] * LAKE_COLOR_MODULATION.g, baseColor[2] * LAKE_COLOR_MODULATION.b]
      : baseColor;
    const sideColor = resolvedColor.map(c => c * SIDE_DARKEN);

    // River overlay on top face only
    const topColor = tile.isRiver
      ? [
          resolvedColor[0] * (1 - RIVER_OVERLAY_WEIGHT) + RIVER_OVERLAY_COLOR[0] * RIVER_OVERLAY_WEIGHT,
          resolvedColor[1] * (1 - RIVER_OVERLAY_WEIGHT) + RIVER_OVERLAY_COLOR[1] * RIVER_OVERLAY_WEIGHT,
          resolvedColor[2] * (1 - RIVER_OVERLAY_WEIGHT) + RIVER_OVERLAY_COLOR[2] * RIVER_OVERLAY_WEIGHT,
        ]
      : resolvedColor;

    const { x: cx, z: cz } = hexCenter(tile.q, tile.r);
    const corners = hexCornersXZ(cx, cz);
    const topY = elev + HEX_THICKNESS;
    const botY = elev;

    // Top face: fan triangulation from center
    const centerX = cx, centerZ = cz, centerY = topY;
    for (let i = 0; i < 6; i++) {
      const c0 = corners[i];
      const c1 = corners[(i + 1) % 6];
      addVertex(positions, colors, vi, centerX, centerY, centerZ, topColor);
      addVertex(positions, colors, vi + 3, c1.x, topY, c1.z, topColor);
      addVertex(positions, colors, vi + 6, c0.x, topY, c0.z, topColor);
      vi += 9;
    }

    // Side faces: 6 quads
    for (let i = 0; i < 6; i++) {
      const c0 = corners[i];
      const c1 = corners[(i + 1) % 6];
      addVertex(positions, colors, vi,      c0.x, botY, c0.z, sideColor);
      addVertex(positions, colors, vi + 3,  c0.x, topY, c0.z, sideColor);
      addVertex(positions, colors, vi + 6,  c1.x, topY, c1.z, sideColor);
      addVertex(positions, colors, vi + 9,  c0.x, botY, c0.z, sideColor);
      addVertex(positions, colors, vi + 12, c1.x, topY, c1.z, sideColor);
      addVertex(positions, colors, vi + 15, c1.x, botY, c1.z, sideColor);
      vi += 18;
    }
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

function addVertex(positions, colors, offset, x, y, z, color) {
  positions[offset]     = x;
  positions[offset + 1] = y;
  positions[offset + 2] = z;
  colors[offset]        = color[0];
  colors[offset + 1]    = color[1];
  colors[offset + 2]    = color[2];
}