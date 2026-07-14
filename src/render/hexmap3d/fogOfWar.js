import * as THREE from '../../lib/three.module.js';
import { TERRAIN } from '../../world/map.js';

const HEX_RADIUS = 1.0;

// Match terrain.js elevation & thickness for positioning
const ELEVATION = {
  plains:   0.0,
  forest:   0.08,
  desert:   0.03,
  marsh:   -0.05,
  mountain: 0.6,
  water:    -0.15,
};
const HEX_THICKNESS = 2;

// Face-down tile appearance
const FACEDOWN_COLOR = [0.15, 0.12, 0.08];
const FACEDOWN_TOP_Y = 0.31;   // sits at fixed low height for unexplored
const FACEDOWN_BOT_Y = 0.16;

// Dark mist appearance
const MIST_COLOR = [0.1, 0.08, 0.04];
const MIST_OPACITY = 0.5;
const MIST_OFFSET = 0.05;       // float just above terrain top

function hexCenter(q, r) {
  const x = Math.sqrt(3) * HEX_RADIUS * (q + r / 2);
  const z = 1.5 * HEX_RADIUS * r;
  return { x, z };
}

// Match terrain.js hex orientation: pointy-top corners (offset by -30°)
function hexCornersXZ(cx, cz) {
  const verts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    verts.push({
      x: cx + HEX_RADIUS * Math.cos(angle),
      z: cz + HEX_RADIUS * Math.sin(angle),
    });
  }
  return verts;
}

/**
 * Build face-down tiles for completely unexplored hexes.
 */
export function buildUnexploredMesh(tiles, explored) {
  const unexplored = Object.values(tiles).filter(t => !explored.has(`${t.q},${t.r}`));
  if (unexplored.length === 0) return null;

  const vertsPerHex = 54;
  const positions = new Float32Array(unexplored.length * vertsPerHex * 3);
  const colors = new Float32Array(unexplored.length * vertsPerHex * 3);
  let vi = 0;

  for (const tile of unexplored) {
    const { x: cx, z: cz } = hexCenter(tile.q, tile.r);
    const corners = hexCornersXZ(cx, cz);
    const topY = FACEDOWN_TOP_Y;
    const botY = FACEDOWN_BOT_Y;

    // Top face — match terrain winding: center → c1 → c0 (CCW from above)
    for (let i = 0; i < 6; i++) {
      const c0 = corners[i];
      const c1 = corners[(i + 1) % 6];
      addVert(positions, colors, vi,      cx, topY, cz, FACEDOWN_COLOR);  // center
      addVert(positions, colors, vi + 3,  c1.x, topY, c1.z, FACEDOWN_COLOR); // c1
      addVert(positions, colors, vi + 6,  c0.x, topY, c0.z, FACEDOWN_COLOR); // c0
      vi += 9;
    }

    // Side faces — match terrain winding: bot0 → top0 → top1, bot0 → top1 → bot1
    for (let i = 0; i < 6; i++) {
      const c0 = corners[i];
      const c1 = corners[(i + 1) % 6];
      // Triangle 1: bot0 → top0 → top1
      addVert(positions, colors, vi,      c0.x, botY, c0.z, FACEDOWN_COLOR);
      addVert(positions, colors, vi + 3,  c0.x, topY, c0.z, FACEDOWN_COLOR);
      addVert(positions, colors, vi + 6,  c1.x, topY, c1.z, FACEDOWN_COLOR);
      // Triangle 2: bot0 → top1 → bot1
      addVert(positions, colors, vi + 9,  c0.x, botY, c0.z, FACEDOWN_COLOR);
      addVert(positions, colors, vi + 12, c1.x, topY, c1.z, FACEDOWN_COLOR);
      addVert(positions, colors, vi + 15, c1.x, botY, c1.z, FACEDOWN_COLOR);
      vi += 18;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'fogUnexplored';
  return mesh;
}

/**
 * Build dark mist overlay for explored-but-not-visible hexes.
 * Floats just above terrain top, uses depthTest: false to always show.
 */
export function buildExploredMistMesh(tiles, explored, visible) {
  const mistTiles = Object.values(tiles).filter(t => {
    const key = `${t.q},${t.r}`;
    return explored.has(key) && !visible.has(key);
  });
  if (mistTiles.length === 0) return null;

  const vertsPerHex = 54;
  const positions = new Float32Array(mistTiles.length * vertsPerHex * 3);
  const colors = new Float32Array(mistTiles.length * vertsPerHex * 3);
  let vi = 0;

  for (const tile of mistTiles) {
    const { x: cx, z: cz } = hexCenter(tile.q, tile.r);
    const corners = hexCornersXZ(cx, cz);
    const elev = ELEVATION[tile.terrain] || 0;
    const terrainTop = elev + HEX_THICKNESS;
    const topY = terrainTop + MIST_OFFSET;
    const botY = terrainTop;

    // Top face — match terrain winding: center → c1 → c0 (CCW from above)
    for (let i = 0; i < 6; i++) {
      const c0 = corners[i];
      const c1 = corners[(i + 1) % 6];
      addVert(positions, colors, vi,      cx, topY, cz, MIST_COLOR);
      addVert(positions, colors, vi + 3,  c1.x, topY, c1.z, MIST_COLOR);
      addVert(positions, colors, vi + 6,  c0.x, topY, c0.z, MIST_COLOR);
      vi += 9;
    }

    // Side faces (thin prism) — match terrain winding
    for (let i = 0; i < 6; i++) {
      const c0 = corners[i];
      const c1 = corners[(i + 1) % 6];
      addVert(positions, colors, vi,      c0.x, botY, c0.z, MIST_COLOR);
      addVert(positions, colors, vi + 3,  c0.x, topY, c0.z, MIST_COLOR);
      addVert(positions, colors, vi + 6,  c1.x, topY, c1.z, MIST_COLOR);
      addVert(positions, colors, vi + 9,  c0.x, botY, c0.z, MIST_COLOR);
      addVert(positions, colors, vi + 12, c1.x, topY, c1.z, MIST_COLOR);
      addVert(positions, colors, vi + 15, c1.x, botY, c1.z, MIST_COLOR);
      vi += 18;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
    transparent: true,
    opacity: MIST_OPACITY,
    depthTest: false,       // always render over terrain
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'fogMist';
  mesh.renderOrder = 1;
  return mesh;
}

function addVert(positions, colors, offset, x, y, z, color) {
  positions[offset]     = x;
  positions[offset + 1] = y;
  positions[offset + 2] = z;
  colors[offset]        = color[0];
  colors[offset + 1]    = color[1];
  colors[offset + 2]    = color[2];
}