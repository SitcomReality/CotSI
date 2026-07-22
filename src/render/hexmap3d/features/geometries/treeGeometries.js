// src/render/hexmap3d/features/geometries/treeGeometries.js
import * as THREE from '../../../../vendor/three.module.js';

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
