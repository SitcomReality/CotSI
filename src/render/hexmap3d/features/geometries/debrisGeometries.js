// src/render/hexmap3d/features/geometries/debrisGeometries.js
import * as THREE from '../../../../vendor/three.module.js';

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
export function getDebrisFlowerGeo() {
  if (!debrisFlowerGeo) {
    debrisFlowerGeo = new THREE.SphereGeometry(0.025, 4, 3);
  }
  return debrisFlowerGeo;
}
