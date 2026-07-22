// src/render/hexmap3d/features/geometries/mountainGeometries.js
import * as THREE from '../../../../vendor/three.module.js';

// =========================================================================
// Mountain geometry — 6-sided cone with vertex displacement
// =========================================================================

let mountainGeo = null;

/**
 * Standard displaced mountain geometry (isolated/single peaks).
 */
export function getMountainGeo() {
  if (!mountainGeo) {
    mountainGeo = buildMountainCone(0.6, 0.9, 0.05);
  }
  return mountainGeo;
}

/**
 * Taller, narrower geometry for group peaks.
 */
let mountainPeakGeo = null;

export function getMountainPeakGeo() {
  if (!mountainPeakGeo) {
    mountainPeakGeo = buildMountainCone(0.5, 1.2, 0.03);
  }
  return mountainPeakGeo;
}

/**
 * Shorter, wider geometry for slopes/foothills.
 */
let mountainSlopeGeo = null;

export function getMountainSlopeGeo() {
  if (!mountainSlopeGeo) {
    mountainSlopeGeo = buildMountainCone(0.7, 0.5, 0.02);
  }
  return mountainSlopeGeo;
}

/**
 * Build a 6-sided cone with displaced base-ring vertices.
 * @param {number} radius - Base radius
 * @param {number} height - Cone height
 * @param {number} displaceAmount - Max vertex displacement
 * @returns {THREE.ConeGeometry}
 */
function buildMountainCone(radius, height, displaceAmount) {
  const geo = new THREE.ConeGeometry(radius, height, 6, 1);
  const pos = geo.attributes.position;
  const verts = pos.array;

  for (let i = 6; i < verts.length; i += 3) {
    if (verts[i + 1] > 0.8) continue; // skip tip
    const angle = Math.atan2(verts[i + 2], verts[i]);
    const d = displaceAmount
      + Math.sin(angle * 3.7) * displaceAmount * 0.8
      + Math.cos(angle * 2.3) * displaceAmount * 0.6;
    verts[i] += d * Math.cos(angle);
    verts[i + 2] += d * Math.sin(angle);
    verts[i + 1] += Math.sin(angle * 4.1) * displaceAmount * 0.8;
  }

  geo.computeVertexNormals();
  return geo;
}
