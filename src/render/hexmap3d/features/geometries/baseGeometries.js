// src/render/hexmap3d/features/geometries/baseGeometries.js
import * as THREE from '../../../../vendor/three.module.js';

// =========================================================================
// Base geometries — small decorations shared across bases
// =========================================================================

let baseSpikeGeo = null;
let baseRingGeo = null;
let baseRingDotGeo = null;

export function getBaseSpikeGeo() {
  if (!baseSpikeGeo) {
    baseSpikeGeo = new THREE.ConeGeometry(0.06, 0.10, 4);
  }
  return baseSpikeGeo;
}

export function getBaseRingGeo() {
  if (!baseRingGeo) {
    baseRingGeo = new THREE.TorusGeometry(0.28, 0.02, 6, 12);
  }
  return baseRingGeo;
}

export function getBaseRingDotGeo() {
  if (!baseRingDotGeo) {
    baseRingDotGeo = new THREE.SphereGeometry(0.03, 4, 3);
  }
  return baseRingDotGeo;
}
