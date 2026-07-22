import * as THREE from '../../../vendor/three.module.js';
import { terrainMaterial } from '../scene/materials.js';
import { HEX_RADIUS, hexCenter, hexCornersXZ } from '../hexWorldSpace.js';

// Elevation per terrain type (world units)
export const ELEVATION = {
  plains:   0.0,
  forest:   0.08,
  desert:   0.03,
  marsh:   -0.05,
  mountain: 0.6,
  water:    -0.15,
};

// Hex thickness (the "board game piece" edge height)
export const HEX_THICKNESS = 1.25;

/**
 * Top surface Y of a tile of given terrain type.
 * This is the single source of truth for ground level.
 */
export function tileTopY(terrain) {
  return (ELEVATION[terrain] || 0) + HEX_THICKNESS;
}

// Terrain fill colors (mapped to vertex colors)
// These are RGB tuples for vertex color attributes
export const TERRAIN_COLOR = {
  plains:   [0.455, 0.678, 0.365],  // #74ad5d — vibrant meadow green
  forest:   [0.294, 0.557, 0.255],  // #4b8e41 — deep vivid forest
  desert:   [0.839, 0.694, 0.357],  // #d6b15b — warm golden sand
  marsh:    [0.506, 0.600, 0.404],  // #819967 — murky vibrant marsh
  mountain: [0.529, 0.486, 0.416],  // #877c6a — rocky warm gray
  water:    [0.373, 0.604, 0.757],  // #5f9ac1 — bright cyan-blue
};

// Darken factor for side faces
const SIDE_DARKEN = 0.5;

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

  // Resolve colors — biome palette overrides the default TERRAIN_COLOR
  const palette = state.biomePalette || {};

  for (const tile of activeTiles) {
    const elev = ELEVATION[tile.terrain] || 0;
    const baseColor = palette[tile.terrain] || TERRAIN_COLOR[tile.terrain] || TERRAIN_COLOR.plains;

    // Lakes get a darker, greener water color to distinguish from ocean
    const resolvedColor = (tile.terrain === 'water' && tile.waterType === 'lake')
      ? [baseColor[0] * 0.7, baseColor[1] * 0.85, baseColor[2] * 0.9]
      : baseColor;
    const sideColor = resolvedColor.map(c => c * SIDE_DARKEN);

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
      addVertex(positions, colors, vi, centerX, centerY, centerZ, baseColor);
      addVertex(positions, colors, vi + 3, c1.x, topY, c1.z, baseColor);
      addVertex(positions, colors, vi + 6, c0.x, topY, c0.z, baseColor);
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

function addVertex(positions, colors, offset, x, y, z, color) {
  positions[offset]     = x;
  positions[offset + 1] = y;
  positions[offset + 2] = z;
  colors[offset]        = color[0];
  colors[offset + 1]    = color[1];
  colors[offset + 2]    = color[2];
}