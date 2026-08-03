// src/render/hexmap3d/features/geometries/debrisGeometries.js
import * as THREE from '../../../../vendor/three.module.js';
import {
  DEBRIS_TUFT,
  DEBRIS_ROCK_RADIUS,
  DEBRIS_FLOWER_RADIUS,
  DEBRIS_BONE,
  DEBRIS_CRYSTAL,
  DEBRIS_SHROOM,
  DEBRIS_LOG,
} from '../../../../params/render/geometryParams.js';

// =========================================================================
// Debris geometries — small environmental decorations
// =========================================================================

let debrisTuftGeo = null;
let debrisRockGeo = null;
let debrisFlowerGeo = null;
let debrisBoneGeo = null;
let debrisCrystalGeo = null;
let debrisShroomGeo = null;
let debrisLogGeo = null;

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

/** Sun-bleached bone shard (tall, tapered) */
export function getDebrisBoneGeo() {
  if (!debrisBoneGeo) {
    debrisBoneGeo = new THREE.CylinderGeometry(
      DEBRIS_BONE.topR, DEBRIS_BONE.bottomR, DEBRIS_BONE.height,
      DEBRIS_BONE.segments, 1, false
    );
  }
  return debrisBoneGeo;
}

/** Faceted crystal shard (low-segment cone) */
export function getDebrisCrystalGeo() {
  if (!debrisCrystalGeo) {
    debrisCrystalGeo = new THREE.ConeGeometry(DEBRIS_CRYSTAL.radius, DEBRIS_CRYSTAL.height, DEBRIS_CRYSTAL.segments);
  }
  return debrisCrystalGeo;
}

/** Tiny mushroom — cone cap only (stem reads implicitly at this scale) */
export function getDebrisShroomGeo() {
  if (!debrisShroomGeo) {
    debrisShroomGeo = new THREE.ConeGeometry(DEBRIS_SHROOM.capR, DEBRIS_SHROOM.capHeight, DEBRIS_SHROOM.capSegments);
  }
  return debrisShroomGeo;
}

/** Fallen log — short cylinder, pre-rotated to lie flat on the ground */
export function getDebrisLogGeo() {
  if (!debrisLogGeo) {
    debrisLogGeo = new THREE.CylinderGeometry(
      DEBRIS_LOG.radius, DEBRIS_LOG.radius, DEBRIS_LOG.length, DEBRIS_LOG.segments
    );
    debrisLogGeo.rotateX(Math.PI / 2);
  }
  return debrisLogGeo;
}
