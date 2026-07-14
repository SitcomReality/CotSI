import * as THREE from '../../../lib/three.module.js';
import { HEX_RADIUS, hexCenter, hexCornersXZ } from '../hexUtils.js';

// Face-down tile appearance
const FACEDOWN_COLOR = [0.15, 0.12, 0.08];
const FACEDOWN_TOP_Y = 0.31;   // sits at fixed low height for unexplored
const FACEDOWN_BOT_Y = 0.16;

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

function addVert(positions, colors, offset, x, y, z, color) {
  positions[offset]     = x;
  positions[offset + 1] = y;
  positions[offset + 2] = z;
  colors[offset]        = color[0];
  colors[offset + 1]    = color[1];
  colors[offset + 2]    = color[2];
}