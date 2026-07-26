// src/render/hexmap3d/features/geometries/debrisGeometries.js
import * as THREE from '../../../../vendor/three.module.js';
import {
  DEBRIS_TUFT,
  DEBRIS_ROCK_RADIUS,
  DEBRIS_FLOWER_RADIUS,
} from '../../../../params/render/geometryParams.js';

// =========================================================================
// Debris geometries — small environmental decorations
// =========================================================================

let debrisTuftGeo = null;
let debrisRockGeo = null;
let debrisFlowerGeo = null;

/** Small grass tuft */
export function getDebrisTuftGeo() {
  if (!debrisTuftGeo) {
    debrisTuftGeo = new THREE.ConeGeometry(DEBRIS_TUFT.bottomR, DEBRIS_TUFT.height, DEBRIS_TUFT.segments);
  }
  return debrisTuftGeo;
}

/** Tiny pebble */
export function getDebrisRockGeo() {
  if (!debrisRockGeo) {
    debrisRockGeo = new THREE.DodecahedronGeometry(DEBRIS_ROCK_RADIUS, 0);
  }
  return debrisRockGeo;
}

/** Tiny flower tuft */
export function getDebrisFlowerGeo() {
  if (!debrisFlowerGeo) {
    debrisFlowerGeo = new THREE.SphereGeometry(DEBRIS_FLOWER_RADIUS, 4, 3);
  }
  return debrisFlowerGeo;
}
