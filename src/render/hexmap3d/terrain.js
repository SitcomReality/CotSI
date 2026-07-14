import * as THREE from '../../lib/three.module.js';
import { TERRAIN } from '../../world/map.js';
import { terrainMaterial } from './materials.js';

// World-space hex radius (maps from SVG's HEX_SIZE=30px to 3D units)
const HEX_RADIUS = 1.0;

// Elevation per terrain type (world units)
const ELEVATION = {
  plains:   0.0,
  forest:   0.08,
  desert:   0.03,
  marsh:   -0.05,
  mountain: 0.6,
  water:    -0.15,
};

// Hex thickness (the "board game piece" edge height)
const HEX_THICKNESS = 2;

// Terrain fill colors (mapped to vertex colors)
// These are RGB tuples for vertex color attributes
const TERRAIN_COLOR = {
  plains:   [0.918, 0.839, 0.651],  // #ead6a8
  forest:   [0.784, 0.816, 0.631],  // #c8d0a1
  desert:   [0.902, 0.788, 0.565],  // #e6c990
  marsh:    [0.725, 0.769, 0.659],  // #b9c4a8
  mountain: [0.718, 0.667, 0.573],  // #b7aa92
  water:    [0.651, 0.725, 0.753],  // #a6b9c0
};

// Darken factor for side faces
const SIDE_DARKEN = 0.5;

/**
 * Compute the center position of a hex in world space (XZ plane, Y is up).
 * Flat-top hex layout: x = sqrt(3) * (q + r/2), z = 1.5 * r
 */
function hexCenter(q, r) {
  const x = Math.sqrt(3) * HEX_RADIUS * (q + r / 2);
  const z = 1.5 * HEX_RADIUS * r;
  return { x, z };
}

/**
 * Generate the 6 corner vertices of a flat-top hex in the XZ plane.
 * Flat-top: first corner at angle 0° (pointing right / +x).
 */
function hexCornersXZ(cx, cz, radius = HEX_RADIUS) {
  const verts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6; // -30°, 30°, 90°, ... (pointy-top)
    verts.push({
      x: cx + radius * Math.cos(angle),
      z: cz + radius * Math.sin(angle),
    });
  }
  return verts;
}

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
    const tinfo = TERRAIN[tile.terrain];
    const elev = ELEVATION[tile.terrain] || 0;
    const baseColor = TERRAIN_COLOR[tile.terrain] || TERRAIN_COLOR.plains;
    const sideColor = baseColor.map(c => c * SIDE_DARKEN);

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