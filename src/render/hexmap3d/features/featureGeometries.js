// src/render/hexmap3d/features/featureGeometries.js
import * as THREE from '../../../vendor/three.module.js';

let treeTrunkGeo = null;
let treeCanopyGeo = null;
let mountainGeo = null;
let knotGeo = null;

export function getTreeTrunkGeo() {
  if (!treeTrunkGeo) {
    treeTrunkGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.4, 6);
  }
  return treeTrunkGeo;
}

export function getTreeCanopyGeo() {
  if (!treeCanopyGeo) {
    treeCanopyGeo = new THREE.ConeGeometry(0.4, 0.5, 6, 2);
  }
  return treeCanopyGeo;
}

export function getMountainGeo() {
  if (!mountainGeo) {
    mountainGeo = new THREE.ConeGeometry(0.6, 0.9, 4);
  }
  return mountainGeo;
}

export function getKnotGeo() {
  if (!knotGeo) {
    knotGeo = new THREE.OctahedronGeometry(0.2, 0);
  }
  return knotGeo;
}