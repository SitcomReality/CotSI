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

export function getMountainGeo() {
  if (!mountainGeo) {
    // 6-sided cone (matches hex aesthetic)
    const baseGeo = new THREE.ConeGeometry(0.6, 0.9, 6, 1);
    const pos = baseGeo.attributes.position;
    const verts = pos.array;

    // Displace vertices for natural variation (but keep tip at origin)
    // Skip the tip vertex (index 0) and displace the base ring
    for (let i = 6; i < verts.length; i += 3) {
      // Don't displace the tip (all tip verts have y > 0.8)
      if (verts[i + 1] > 0.8) continue;
      // Displace x and z by random amount
      const angle = Math.atan2(verts[i + 2], verts[i]);
      const displace = 0.05 + Math.sin(angle * 3.7) * 0.04 + Math.cos(angle * 2.3) * 0.03;
      verts[i] += displace * Math.cos(angle);
      verts[i + 2] += displace * Math.sin(angle);
      // Slightly vary height
      verts[i + 1] += Math.sin(angle * 4.1) * 0.04;
    }

    baseGeo.computeVertexNormals();
    mountainGeo = baseGeo;
  }
  return mountainGeo;
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
