// src/render/hexmap3d/features/featureGeometries.js
import * as THREE from '../../../vendor/three.module.js';

// =========================================================================
// Tree geometries — 3 canopy variants
// =========================================================================

let treeTrunkGeo = null;
let treeCanopyRoundGeo = null;
let treeCanopyTallGeo = null;
let treeCanopyWideGeo = null;

export function getTreeTrunkGeo() {
  if (!treeTrunkGeo) {
    treeTrunkGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.4, 6);
  }
  return treeTrunkGeo;
}

/** Round/ball canopy — like an oak */
export function getTreeCanopyRoundGeo() {
  if (!treeCanopyRoundGeo) {
    treeCanopyRoundGeo = new THREE.SphereGeometry(0.30, 6, 4);
  }
  return treeCanopyRoundGeo;
}

/** Tall/pointed canopy — like a pine */
export function getTreeCanopyTallGeo() {
  if (!treeCanopyTallGeo) {
    treeCanopyTallGeo = new THREE.ConeGeometry(0.25, 0.65, 6, 2);
  }
  return treeCanopyTallGeo;
}

/** Wide/flat canopy — like a palm */
export function getTreeCanopyWideGeo() {
  if (!treeCanopyWideGeo) {
    treeCanopyWideGeo = new THREE.ConeGeometry(0.45, 0.30, 6, 1);
  }
  return treeCanopyWideGeo;
}

// Legacy alias for backward compat
export function getTreeCanopyGeo() {
  return getTreeCanopyRoundGeo();
}

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

// =========================================================================
// Knot geometry
// =========================================================================

let knotGeo = null;

export function getKnotGeo() {
  if (!knotGeo) {
    knotGeo = new THREE.OctahedronGeometry(0.2, 0);
  }
  return knotGeo;
}

// =========================================================================
// Debris geometries — small environmental decorations
// =========================================================================

let debrisTuftGeo = null;
let debrisRockGeo = null;
let debrisFlowerGeo = null;

/** Small grass tuft */
export function getDebrisTuftGeo() {
  if (!debrisTuftGeo) {
    debrisTuftGeo = new THREE.ConeGeometry(0.04, 0.06, 3);
  }
  return debrisTuftGeo;
}

/** Tiny pebble */
export function getDebrisRockGeo() {
  if (!debrisRockGeo) {
    debrisRockGeo = new THREE.DodecahedronGeometry(0.03, 0);
  }
  return debrisRockGeo;
}

/** Tiny flower tuft */
let debrisFlowerGeo = null;

export function getDebrisFlowerGeo() {
  if (!debrisFlowerGeo) {
    // A small 5-petal flower: use a small sphere cluster
    debrisFlowerGeo = new THREE.SphereGeometry(0.025, 4, 3);
  }
  return debrisFlowerGeo;
}
