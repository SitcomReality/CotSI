import * as THREE from '../../../vendor/three.module.js';
import { waterMaterial } from '../scene/materials.js';
import { hexCenter, hexCornersXZ } from '../hexWorldSpace.js';
import { HEX_THICKNESS, SIDE_DARKEN_FACTOR, WATER_RIPPLE_AMP, WATER_RIPPLE_COVERAGE } from '../../../params/render/terrainParams.js';
import { ELEVATION, resolveElev } from './tileHeight.js';
import { makeTopColorResolver } from './tileColor.js';

// Same prism layout as the terrain mesh (top face fan + 6 side quads, 54
// vertices per hex, non-indexed). Water renders on its own mesh so it can have
// a dedicated material (ripple shader) and never shares corners/blending with
// land — the no-blend rule is structural.
const VERTICES_PER_HEX = 54;

/**
 * Deterministic [0,1) hash of a world-space (x, z) position. Phase/amplitude
 * are derived from the *corner/center world position* rather than per-tile, so
 * coincident corner vertices shared between adjacent tiles carry identical
 * values and the displaced surface stays water-tight (no cracks along tile
 * edges, and top/side vertices at the same XZ move together).
 */
function hash01(x, z) {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** Ripple phase for a vertex at world (x, z): deterministic, position-locked. */
function phaseAt(x, z) {
  return hash01(x + 0.371, z * 1.713) * Math.PI * 2;
}

/** Ripple amplitude for a vertex at world (x, z): 0 (still) for most, small for a scattered subset. */
function ampAt(x, z) {
  return hash01(x * 1.319 + 7.13, z * 0.763 + 3.71) < WATER_RIPPLE_COVERAGE
    ? WATER_RIPPLE_AMP
    : 0;
}

/**
 * Write one water tile's 54 vertices into the buffers starting at vertex
 * index `vi` (vertices; positions/colors are 3 floats each, phases/amps 1
 * float each). Returns the new vertex index.
 */
function writeTileVertices(positions, colors, phases, amps, vi, tile, topColor) {
  const elev = resolveElev(tile, ELEVATION);
  const sideColor = topColor.map(c => c * SIDE_DARKEN_FACTOR);

  const { x: cx, z: cz } = hexCenter(tile.q, tile.r);
  const corners = hexCornersXZ(cx, cz);
  const topY = elev + HEX_THICKNESS;
  const botY = elev;

  // --- Top face: fan triangulation from center (flat color, no blending) ---
  // Triangle: center → corner[i+1] → corner[i] (CCW from above)
  for (let i = 0; i < 6; i++) {
    const c0 = corners[i];
    const c1 = corners[(i + 1) % 6];
    addVertex(positions, colors, phases, amps, vi, cx, topY, cz, topColor, cx, cz);
    addVertex(positions, colors, phases, amps, vi + 1, c1.x, topY, c1.z, topColor, c1.x, c1.z);
    addVertex(positions, colors, phases, amps, vi + 2, c0.x, topY, c0.z, topColor, c0.x, c0.z);
    vi += 3;
  }

  // --- Side faces: 6 quads, each = 2 triangles (own darkened color) ---
  // Triangle 1: bot0 → top0 → top1 (CCW from outside)
  // Triangle 2: bot0 → top1 → bot1
  for (let i = 0; i < 6; i++) {
    const c0 = corners[i];
    const c1 = corners[(i + 1) % 6];
    addVertex(positions, colors, phases, amps, vi,      c0.x, botY, c0.z, sideColor, c0.x, c0.z);
    addVertex(positions, colors, phases, amps, vi + 1,  c0.x, topY, c0.z, sideColor, c0.x, c0.z);
    addVertex(positions, colors, phases, amps, vi + 2,  c1.x, topY, c1.z, sideColor, c1.x, c1.z);
    addVertex(positions, colors, phases, amps, vi + 3,  c0.x, botY, c0.z, sideColor, c0.x, c0.z);
    addVertex(positions, colors, phases, amps, vi + 4,  c1.x, topY, c1.z, sideColor, c1.x, c1.z);
    addVertex(positions, colors, phases, amps, vi + 5,  c1.x, botY, c1.z, sideColor, c1.x, c1.z);
    vi += 6;
  }

  return vi;
}

function addVertex(positions, colors, phases, amps, vi, x, y, z, color, hx, hz) {
  const i3 = vi * 3;
  positions[i3]     = x;
  positions[i3 + 1] = y;
  positions[i3 + 2] = z;
  colors[i3]        = color[0];
  colors[i3 + 1]    = color[1];
  colors[i3 + 2]    = color[2];
  phases[vi]        = phaseAt(hx, hz);
  amps[vi]          = ampAt(hx, hz);
}

/**
 * Build a merged BufferGeometry for the water tiles within a single chunk.
 * Water tiles (terrain === 'water') render here instead of the terrain mesh;
 * land tiles render via buildChunkTerrainMesh. Only explored tiles are drawn.
 *
 * @param {object[]} chunkTiles - Array of tile objects belonging to this chunk
 * @param {object}   state      - Game state (for biomePalettes lookup per tile)
 * @param {Set}      visible    - Set of hex keys currently visible
 * @param {Set}      explored   - Set of hex keys ever explored
 * @returns {THREE.Mesh|null} Mesh, or null if the chunk has no explored water
 */
export function buildChunkWaterMesh(chunkTiles, state, visible, explored) {
  const waterTiles = [];
  for (const tile of chunkTiles) {
    const key = `${tile.q},${tile.r}`;
    if (tile.terrain === 'water' && explored.has(key)) waterTiles.push(tile);
  }
  if (waterTiles.length === 0) return null;

  const tileCount = waterTiles.length;
  const positions = new Float32Array(tileCount * VERTICES_PER_HEX * 3);
  const colors = new Float32Array(tileCount * VERTICES_PER_HEX * 3);
  const phases = new Float32Array(tileCount * VERTICES_PER_HEX);
  const amps = new Float32Array(tileCount * VERTICES_PER_HEX);
  const topColorFor = makeTopColorResolver(state);

  let vi = 0;
  for (const tile of waterTiles) {
    vi = writeTileVertices(positions, colors, phases, amps, vi, tile, topColorFor(tile));
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aWaterPhase', new THREE.BufferAttribute(phases, 1));
  geo.setAttribute('aWaterAmp', new THREE.BufferAttribute(amps, 1));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  const mesh = new THREE.Mesh(geo, waterMaterial);
  mesh.name = 'water';
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  mesh.frustumCulled = true;
  return mesh;
}
