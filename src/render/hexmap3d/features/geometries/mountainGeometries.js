// src/render/hexmap3d/features/geometries/mountainGeometries.js
import * as THREE from '../../../../vendor/three.module.js';

// =========================================================================
// Mountain geometry — hexagonal pyramid with vertex colors (snowy peak)
// =========================================================================
// The base is a regular hexagon at radius 1.0, matching hexCornersXZ.
// All mountains share this exact same base geometry, so adjacent hex
// edges align perfectly — no gaps between neighboring mountains.
//
// 3 rings: base (y=0, R=1.0, rock), snow line (y=0.8, R=0.45, snow),
//          peak (y=1.2, R=0, snow)
// 12 lower-triangles (rock→snow gradient) + 6 upper-triangles (all snow)
// Non-indexed, 54 vertices total.
// =========================================================================

const ROCK = [0.55, 0.52, 0.42];
const SNOW = [0.92, 0.94, 0.98];

let mountainGeo = null;

export function getMountainGeo() {
  if (!mountainGeo) {
    mountainGeo = buildMountainHexPyramid();
  }
  return mountainGeo;
}

function buildMountainHexPyramid() {
  // Precompute base ring (R=1.0, y=0) and snow ring (R=0.45, y=0.8)
  const baseVerts = [];
  const snowVerts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    baseVerts.push({ x: Math.cos(angle), z: Math.sin(angle) });
    snowVerts.push({ x: 0.45 * Math.cos(angle), z: 0.45 * Math.sin(angle) });
  }

  // Non-indexed: 54 vertices = (6 quads * 2 tri * 3 verts) + (6 tri * 3 verts)
  const vertexCount = 54;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  let vi = 0; // vertex index

  // --- Lower tier: 6 quads connecting base ring to snow ring ---
  // Each quad has 2 rock + 2 snow vertices, giving a natural gradient
  for (let i = 0; i < 6; i++) {
    const b0 = baseVerts[i];
    const b1 = baseVerts[(i + 1) % 6];
    const s0 = snowVerts[i];
    const s1 = snowVerts[(i + 1) % 6];

    // Triangle 1: b0, s1, b1  — 2 rock + 1 snow (CCW from outside)
    writeVert(positions, colors, vi++, b0.x, 0, b0.z, ROCK);
    writeVert(positions, colors, vi++, s1.x, 0.8, s1.z, SNOW);
    writeVert(positions, colors, vi++, b1.x, 0, b1.z, ROCK);

    // Triangle 2: b0, s0, s1  — 1 rock + 2 snow (CCW from outside)
    writeVert(positions, colors, vi++, b0.x, 0, b0.z, ROCK);
    writeVert(positions, colors, vi++, s0.x, 0.8, s0.z, SNOW);
    writeVert(positions, colors, vi++, s1.x, 0.8, s1.z, SNOW);
  }

  // --- Upper tier: 6 triangles connecting snow ring to peak ---
  for (let i = 0; i < 6; i++) {
    const s0 = snowVerts[i];
    const s1 = snowVerts[(i + 1) % 6];

    writeVert(positions, colors, vi++, s0.x, 0.8, s0.z, SNOW);
    writeVert(positions, colors, vi++, 0, 1.2, 0, SNOW);
    writeVert(positions, colors, vi++, s1.x, 0.8, s1.z, SNOW);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function writeVert(positions, colors, idx, x, y, z, color) {
  const i3 = idx * 3;
  positions[i3]     = x;
  positions[i3 + 1] = y;
  positions[i3 + 2] = z;
  colors[i3]        = color[0];
  colors[i3 + 1]    = color[1];
  colors[i3 + 2]    = color[2];
}
