// src/render/hexmap3d/features/geometries/featureGeometries.js
// Placeholder geometry factories for new feature archetype shapes.
// Each factory follows the cached-singleton pattern.

import * as THREE from '../../../../vendor/three.module.js';

// =========================================================================
// Slab — flat rectangular slab
// =========================================================================

let slabGeo = null;
export function getSlabGeo() {
  if (!slabGeo) { slabGeo = new THREE.BoxGeometry(0.25, 0.05, 0.18); }
  return slabGeo;
}

// =========================================================================
// Disc — thin flat disc
// =========================================================================

let discGeo = null;
export function getDiscGeo() {
  if (!discGeo) { discGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.03, 8); }
  return discGeo;
}

// =========================================================================
// Orb — small glowing orb
// =========================================================================

let orbGeo = null;
export function getOrbGeo() {
  if (!orbGeo) { orbGeo = new THREE.SphereGeometry(0.08, 6, 5); }
  return orbGeo;
}

// =========================================================================
// Plant — small cone (placeholder for plant-like features)
// =========================================================================

let plantGeo = null;
export function getPlantGeo() {
  if (!plantGeo) { plantGeo = new THREE.ConeGeometry(0.10, 0.18, 5); }
  return plantGeo;
}

// =========================================================================
// Cluster — lichen cluster (dodecahedron)
// =========================================================================

let clusterGeo = null;
export function getClusterGeo() {
  if (!clusterGeo) { clusterGeo = new THREE.DodecahedronGeometry(0.08, 0); }
  return clusterGeo;
}

// =========================================================================
// Arch — half-torus arch
// =========================================================================

let archGeo = null;
export function getArchGeo() {
  if (!archGeo) { archGeo = new THREE.TorusGeometry(0.12, 0.03, 4, 8, Math.PI); }
  return archGeo;
}

// =========================================================================
// Figure — tall thin figure shape
// =========================================================================

let figureGeo = null;
export function getFigureGeo() {
  if (!figureGeo) { figureGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.25, 5); }
  return figureGeo;
}

// =========================================================================
// Censer — censer/pyramid shape
// =========================================================================

let censerGeo = null;
export function getCenserGeo() {
  if (!censerGeo) { censerGeo = new THREE.ConeGeometry(0.08, 0.14, 6); }
  return censerGeo;
}

// =========================================================================
// Monument — tall narrow monument
// =========================================================================

let monumentGeo = null;
export function getMonumentGeo() {
  if (!monumentGeo) { monumentGeo = new THREE.BoxGeometry(0.08, 0.22, 0.08); }
  return monumentGeo;
}

// =========================================================================
// Stone — rough stone (dodecahedron)
// =========================================================================

let stoneGeo = null;
export function getStoneGeo() {
  if (!stoneGeo) { stoneGeo = new THREE.DodecahedronGeometry(0.10, 0); }
  return stoneGeo;
}

// =========================================================================
// Vent — tapered vent shape
// =========================================================================

let ventGeo = null;
export function getVentGeo() {
  if (!ventGeo) { ventGeo = new THREE.CylinderGeometry(0.10, 0.06, 0.08, 6); }
  return ventGeo;
}

// =========================================================================
// Ring — full ring (torus)
// =========================================================================

let ringGeo = null;
export function getRingGeo() {
  if (!ringGeo) { ringGeo = new THREE.TorusGeometry(0.10, 0.02, 4, 8); }
  return ringGeo;
}

// =========================================================================
// Obelisk — very tall narrow obelisk
// =========================================================================

let obeliskGeo = null;
export function getObeliskGeo() {
  if (!obeliskGeo) { obeliskGeo = new THREE.ConeGeometry(0.04, 0.28, 4); }
  return obeliskGeo;
}

// =========================================================================
// Cypress — tall cone for placeholder cypress
// =========================================================================

let cypressGeo = null;
export function getCypressGeo() {
  if (!cypressGeo) { cypressGeo = new THREE.ConeGeometry(0.12, 0.22, 6); }
  return cypressGeo;
}

// =========================================================================
// Bigtree — large tree cone for peridexion tree
// =========================================================================

let bigtreeGeo = null;
export function getBigtreeGeo() {
  if (!bigtreeGeo) { bigtreeGeo = new THREE.ConeGeometry(0.18, 0.30, 6); }
  return bigtreeGeo;
}
