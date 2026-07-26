import * as THREE from '../../../vendor/three.module.js';
import {
  CHAMPION_BODY,
  CHAMPION_HEAD,
  PIECE_BODY,
  PIECE_CAP,
  MOB_BEAR,
  MOB_LEOPARD,
  MOB_SNAIL,
  MOB_TAPIR,
  MOB_MUSHROOM,
  MOB_GOOSE,
  MOB_SCORPION,
  MOB_DEFAULT,
} from '../../../params/render/geometryParams.js';

// =========================================================================
// Champion geometries
// =========================================================================

let championBodyGeo = null;

export function getChampionBodyGeo() {
  if (!championBodyGeo) {
    championBodyGeo = new THREE.CylinderGeometry(CHAMPION_BODY.bottomR, CHAMPION_BODY.topR, CHAMPION_BODY.height, CHAMPION_BODY.segments);
  }
  return championBodyGeo;
}

let championHeadGeo = null;

export function getChampionHeadGeo() {
  if (!championHeadGeo) {
    championHeadGeo = new THREE.SphereGeometry(CHAMPION_HEAD.radius, CHAMPION_HEAD.wSegs, CHAMPION_HEAD.hSegs);
  }
  return championHeadGeo;
}

// =========================================================================
// Trader geometry (legacy — kept for compatibility, unused by new piece system)
// =========================================================================

let traderBodyGeo = null;

export function getTraderBodyGeo() {
  if (!traderBodyGeo) {
    traderBodyGeo = new THREE.ConeGeometry(0.13, 0.45, 8);
  }
  return traderBodyGeo;
}

// =========================================================================
// Piece geometries — flat cylinders ("thick coins") for mob & trader NPCs
// =========================================================================

let pieceBodyGeo = null;
let pieceCapGeo = null;

/** Thin uniform-radius cylinder — the "coin" body whose rim shows faction colour. */
export function getPieceBodyGeo() {
  if (!pieceBodyGeo) {
    pieceBodyGeo = new THREE.CylinderGeometry(PIECE_BODY.radiusX, PIECE_BODY.radiusY, PIECE_BODY.height, PIECE_BODY.segments);
  }
  return pieceBodyGeo;
}

/** Ultra-thin disc sitting on top of the body, carrying the icon CanvasTexture. */
export function getPieceCapGeo() {
  if (!pieceCapGeo) {
    pieceCapGeo = new THREE.CylinderGeometry(PIECE_CAP.radiusX, PIECE_CAP.radiusY, PIECE_CAP.height, PIECE_CAP.segments);
  }
  return pieceCapGeo;
}

// =========================================================================
// Mob archetype geometries — each archetype shape gets a distinct geometry
// =========================================================================

const mobGeoCache = {};

/** Bear — wide, chunky body */
function buildBearGeo() {
  return new THREE.CylinderGeometry(MOB_BEAR.radius, MOB_BEAR.height, MOB_BEAR.bodyWidth, MOB_BEAR.segments);
}

/** Leopard — tall, slender, feline */
function buildLeopardGeo() {
  return new THREE.CylinderGeometry(MOB_LEOPARD.radius, MOB_LEOPARD.height, MOB_LEOPARD.bodyLength, MOB_LEOPARD.segments);
}

/** Snail — domed shell */
function buildSnailGeo() {
  return new THREE.SphereGeometry(MOB_SNAIL.radius, MOB_SNAIL.wSegs, MOB_SNAIL.hSegs, MOB_SNAIL.phiStart, MOB_SNAIL.phiLength, 0, Math.PI * 0.55);
}

/** Tapir — tapered, pear-like */
function buildTapirGeo() {
  return new THREE.CylinderGeometry(MOB_TAPIR.radius, MOB_TAPIR.height, MOB_TAPIR.bodyLength, MOB_TAPIR.segments);
}

/** Mushroom — wide flat cap */
function buildMushroomGeo() {
  return new THREE.ConeGeometry(MOB_MUSHROOM.capRadius, MOB_MUSHROOM.stemRadius, MOB_MUSHROOM.segments);
}

/** Goose — narrow pointed wedge */
function buildGooseGeo() {
  return new THREE.ConeGeometry(MOB_GOOSE.radius, MOB_GOOSE.height, MOB_GOOSE.segments);
}

/** Scorpion — faceted, aggressive diamond */
function buildScorpionGeo() {
  return new THREE.OctahedronGeometry(MOB_SCORPION.radius, MOB_SCORPION.detail);
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
      mobGeoCache[key] = new THREE.CylinderGeometry(MOB_DEFAULT.radius, MOB_DEFAULT.topR, MOB_DEFAULT.height, MOB_DEFAULT.segments);
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
