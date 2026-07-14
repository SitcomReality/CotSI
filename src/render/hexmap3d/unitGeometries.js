import * as THREE from '../../lib/three.module.js';

// Shared cached geometries
let championBodyGeo = null;
let championRingGeo = null;
let mobBodyGeo = null;
let traderBodyGeo = null;

export function getChampionBodyGeo() {
  if (!championBodyGeo) {
    championBodyGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.5, 8);
  }
  return championBodyGeo;
}

export function getChampionHeadGeo() {
  return new THREE.SphereGeometry(0.1, 8, 6);
}

export function getChampionRingGeo() {
  if (!championRingGeo) {
    championRingGeo = new THREE.TorusGeometry(0.22, 0.04, 8, 12);
  }
  return championRingGeo;
}

export function getMobBodyGeo() {
  if (!mobBodyGeo) {
    mobBodyGeo = new THREE.CylinderGeometry(0.1, 0.14, 0.4, 8);
  }
  return mobBodyGeo;
}

export function getTraderBodyGeo() {
  if (!traderBodyGeo) {
    traderBodyGeo = new THREE.ConeGeometry(0.13, 0.45, 8);
  }
  return traderBodyGeo;
}