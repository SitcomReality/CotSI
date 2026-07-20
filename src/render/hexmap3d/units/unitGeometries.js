import * as THREE from '../../../vendor/three.module.js';

// =========================================================================
// Champion geometries
// =========================================================================

let championBodyGeo = null;

export function getChampionBodyGeo() {
  if (!championBodyGeo) {
    championBodyGeo = new THREE.CylinderGeometry(0.08, 0.12, 0.5, 8);
  }
  return championBodyGeo;
}

export function getChampionHeadGeo() {
  return new THREE.SphereGeometry(0.1, 8, 6);
}

// =========================================================================
// Trader geometry
// =========================================================================

let traderBodyGeo = null;

export function getTraderBodyGeo() {
  if (!traderBodyGeo) {
    traderBodyGeo = new THREE.ConeGeometry(0.13, 0.45, 8);
  }
  return traderBodyGeo;
}

// =========================================================================
// Mob archetype geometries — each archetype shape gets a distinct geometry
// =========================================================================

const mobGeoCache = {};

/** Bear — wide, chunky body */
function buildBearGeo() {
  return new THREE.CylinderGeometry(0.16, 0.18, 0.28, 6);
}

/** Leopard — tall, slender, feline */
function buildLeopardGeo() {
  return new THREE.CylinderGeometry(0.07, 0.10, 0.50, 6);
}

/** Snail — domed shell */
function buildSnailGeo() {
  return new THREE.SphereGeometry(0.16, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
}

/** Tapir — tapered, pear-like */
function buildTapirGeo() {
  return new THREE.CylinderGeometry(0.08, 0.18, 0.42, 7);
}

/** Mushroom — wide flat cap */
function buildMushroomGeo() {
  return new THREE.ConeGeometry(0.20, 0.14, 8);
}

/** Goose — narrow pointed wedge */
function buildGooseGeo() {
  return new THREE.ConeGeometry(0.07, 0.50, 4);
}

/** Scorpion — faceted, aggressive diamond */
function buildScorpionGeo() {
  return new THREE.OctahedronGeometry(0.14, 0);
}

/**
 * Registry mapping archetype shape name → geometry builder.
 * Each geometry is lazily created and cached.
 */
const mobGeoBuilders = {
  bear:     buildBearGeo,
  leopard:  buildLeopardGeo,
  snail:    buildSnailGeo,
  tapir:    buildTapirGeo,
  mushroom: buildMushroomGeo,
  goose:    buildGooseGeo,
  scorpion: buildScorpionGeo,
};

/**
 * Get (or create and cache) a geometry for a mob archetype shape.
 * Falls back to a default cylinder if the shape is unknown.
 *
 * @param {string} archetypeShape - e.g. 'bear', 'scorpion'
 * @returns {THREE.BufferGeometry}
 */
export function getMobGeo(archetypeShape) {
  const key = archetypeShape || 'default';
  if (!mobGeoCache[key]) {
    const builder = mobGeoBuilders[key];
    if (builder) {
      mobGeoCache[key] = builder();
    } else {
      // Fallback for unknown shapes
      mobGeoCache[key] = new THREE.CylinderGeometry(0.1, 0.14, 0.4, 8);
    }
  }
  return mobGeoCache[key];
}

/**
 * Get the set of known mob shape keys for iteration.
 * Used by unitMeshes.js to group instances by shape.
 */
export function getMobShapeKeys() {
  return Object.keys(mobGeoBuilders);
}

/**
 * Legacy fallback for any code still using the old single-geometry export.
 */
export function getMobBodyGeo() {
  return getMobGeo('default');
}
