// src/render/hexmap3d/features/geometries/treeGeometries.js
import * as THREE from '../../../../vendor/three.module.js';
import {
  TREE_TRUNK,
  TREE_CANOPY_ROUND,
  TREE_CANOPY_TALL,
  TREE_CANOPY_WIDE,
} from '../../../../params/render/geometryParams.js';

// =========================================================================
// Tree geometries — 3 canopy variants
// =========================================================================

let treeTrunkGeo = null;
let treeCanopyRoundGeo = null;
let treeCanopyTallGeo = null;
let treeCanopyWideGeo = null;

export function getTreeTrunkGeo() {
  if (!treeTrunkGeo) {
    treeTrunkGeo = new THREE.CylinderGeometry(TREE_TRUNK.bottomR, TREE_TRUNK.topR, TREE_TRUNK.height, TREE_TRUNK.segments);
  }
  return treeTrunkGeo;
}

/** Round/ball canopy — like an oak */
export function getTreeCanopyRoundGeo() {
  if (!treeCanopyRoundGeo) {
    treeCanopyRoundGeo = new THREE.SphereGeometry(TREE_CANOPY_ROUND.radius, TREE_CANOPY_ROUND.wSegs, TREE_CANOPY_ROUND.hSegs);
  }
  return treeCanopyRoundGeo;
}

/** Tall/pointed canopy — like a pine */
export function getTreeCanopyTallGeo() {
  if (!treeCanopyTallGeo) {
    treeCanopyTallGeo = new THREE.ConeGeometry(TREE_CANOPY_TALL.bottomR, TREE_CANOPY_TALL.height, TREE_CANOPY_TALL.radialSegs, TREE_CANOPY_TALL.heightSegs);
  }
  return treeCanopyTallGeo;
}

/** Wide/flat canopy — like a palm */
export function getTreeCanopyWideGeo() {
  if (!treeCanopyWideGeo) {
    treeCanopyWideGeo = new THREE.ConeGeometry(TREE_CANOPY_WIDE.bottomR, TREE_CANOPY_WIDE.height, TREE_CANOPY_WIDE.radialSegs, TREE_CANOPY_WIDE.heightSegs);
  }
  return treeCanopyWideGeo;
}

// Legacy alias for backward compat
export function getTreeCanopyGeo() {
  return getTreeCanopyRoundGeo();
}
