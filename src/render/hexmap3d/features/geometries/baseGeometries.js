// src/render/hexmap3d/features/geometries/baseGeometries.js
import * as THREE from '../../../../vendor/three.module.js';
import {
  BASE_SPIKE,
  BASE_RING,
  BASE_RING_DOT,
} from '../../../../params/render/geometryParams.js';

// =========================================================================
// Base geometries — small decorations shared across bases
// =========================================================================

let baseSpikeGeo = null;
let baseRingGeo = null;
let baseRingDotGeo = null;

export function getBaseSpikeGeo() {
  if (!baseSpikeGeo) {
    baseSpikeGeo = new THREE.ConeGeometry(BASE_SPIKE.bottomR, BASE_SPIKE.height, BASE_SPIKE.segments);
  }
  return baseSpikeGeo;
}

export function getBaseRingGeo() {
  if (!baseRingGeo) {
    baseRingGeo = new THREE.TorusGeometry(BASE_RING.radius, BASE_RING.tube, BASE_RING.radialSegs, BASE_RING.tubularSegs);
  }
  return baseRingGeo;
}

export function getBaseRingDotGeo() {
  if (!baseRingDotGeo) {
    baseRingDotGeo = new THREE.SphereGeometry(BASE_RING_DOT.radius, BASE_RING_DOT.wSegs, BASE_RING_DOT.hSegs);
  }
  return baseRingDotGeo;
}
