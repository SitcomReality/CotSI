// src/render/hexmap3d/worldObjects/fruitTree/treeGeometries.js
// Geometry factories for the procedural fruit tree (the only remaining legacy
// tree builder — groves and solitary trees are descriptor-driven now).
// Moved here from features/geometries/ during the geometry-system cleanup.
import * as THREE from '../../../../vendor/three.module.js';
import {
  TREE_TRUNK,
  TREE_CANOPY_ROUND,
  TREE_CANOPY_TALL,
  TREE_CANOPY_WIDE,
  FRUIT_TREE_TRUNK,
  FRUIT_TREE_BRANCH,
  FRUIT_TREE_CANOPY,
  FRUIT_TREE_APPLE,
} from '../../../../params/render/geometryParams.js';

// =========================================================================
// Tree geometries — 3 canopy variants + fruit-tree parts
// =========================================================================

let treeTrunkGeo = null;
let treeCanopyRoundGeo = null;
let treeCanopyTallGeo = null;
let treeCanopyWideGeo = null;
let fruitTreeTrunkGeo = null;
let fruitTreeBranchGeo = null;
let fruitTreeCanopyGeo = null;
let fruitTreeAppleGeo = null;

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

/** Fruit tree: single trunk segment (stack 2–3 of these, each tilted a bit more). */
export function getFruitTreeTrunkGeo() {
  if (!fruitTreeTrunkGeo) {
    fruitTreeTrunkGeo = new THREE.CylinderGeometry(FRUIT_TREE_TRUNK.bottomR, FRUIT_TREE_TRUNK.topR, FRUIT_TREE_TRUNK.height, FRUIT_TREE_TRUNK.segments);
  }
  return fruitTreeTrunkGeo;
}

/** Fruit tree: forked branch (thin tapered cylinder, one per side). */
export function getFruitTreeBranchGeo() {
  if (!fruitTreeBranchGeo) {
    fruitTreeBranchGeo = new THREE.CylinderGeometry(FRUIT_TREE_BRANCH.bottomR, FRUIT_TREE_BRANCH.topR, FRUIT_TREE_BRANCH.height, FRUIT_TREE_BRANCH.segments);
  }
  return fruitTreeBranchGeo;
}

/** Fruit tree: leaf ball at the end of the leaf branch. */
export function getFruitTreeCanopyGeo() {
  if (!fruitTreeCanopyGeo) {
    fruitTreeCanopyGeo = new THREE.SphereGeometry(FRUIT_TREE_CANOPY.radius, FRUIT_TREE_CANOPY.wSegs, FRUIT_TREE_CANOPY.hSegs);
  }
  return fruitTreeCanopyGeo;
}

/** Fruit tree: the apple hanging below the fruit branch tip. */
export function getFruitTreeAppleGeo() {
  if (!fruitTreeAppleGeo) {
    fruitTreeAppleGeo = new THREE.SphereGeometry(FRUIT_TREE_APPLE.radius, FRUIT_TREE_APPLE.wSegs, FRUIT_TREE_APPLE.hSegs);
  }
  return fruitTreeAppleGeo;
}
