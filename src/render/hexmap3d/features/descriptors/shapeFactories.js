/**
 * shapeFactories.js — THREE geometry/material factories for descriptor parts.
 *
 * Maps a descriptor part's shape type + params onto the same THREE constructors
 * the game's per-kind geometry factories use (see geometries/), so a descriptor
 * reproduces identical geometry. Geometries are cached per (type, params) pair.
 *
 * This module is the only THREE-dependent part of the descriptor pipeline —
 * record generation (recordBuilder.js) stays pure.
 */
import * as THREE from '../../../../vendor/three.module.js';
import { getMountainGeo, getSnowpersonGeo as getLatheGeo } from '../geometries/index.js';
import { toonMaterial } from '../../scene/materials.js';

const geometryCache = new Map();

/**
 * Cached BufferGeometry for a descriptor part's shape.
 * @param {string} type   - key of SHAPE_TYPES (schema.js)
 * @param {object} params - normalized shape params
 * @returns {THREE.BufferGeometry}
 */
export function geometryForShape(type, params) {
  const key = `${type}:${JSON.stringify(params)}`;
  if (!geometryCache.has(key)) {
    geometryCache.set(key, buildShape(type, params));
  }
  return geometryCache.get(key);
}

function buildShape(type, params) {
  switch (type) {
    case 'cylinder':
      return new THREE.CylinderGeometry(params.bottomR, params.topR, params.height, params.segments);
    case 'cone':
      return new THREE.ConeGeometry(params.bottomR, params.height, params.radialSegs, params.heightSegs);
    case 'sphere':
      return new THREE.SphereGeometry(params.radius, params.wSegs, params.hSegs, params.phiStart, params.phiLength, params.thetaStart, params.thetaLength);
    case 'torus':
      return new THREE.TorusGeometry(params.radius, params.tube, params.radialSegs, params.tubularSegs, params.arc);
    case 'box':
      return new THREE.BoxGeometry(params.width, params.height, params.depth);
    case 'dodecahedron':
      return new THREE.DodecahedronGeometry(params.radius, params.detail);
    case 'octahedron':
      return new THREE.OctahedronGeometry(params.radius, params.detail);
    case 'mountain':
      return getMountainGeo(params.variant);
    case 'cube':
      return new THREE.BoxGeometry(params.size, params.size, params.size);
    case 'spheroid':
      return new THREE.SphereGeometry(params.radius, params.wSegs, params.hSegs);
    case 'lathe':
      return getLatheGeo();
    default:
      throw new Error(`descriptor: unknown shape type "${type}"`);
  }
}

/**
 * Toon material for a part. The part's own materialColor wins; otherwise the
 * object's material.color applies (the instance-color path keeps the material
 * white — e.g. tree canopies). Object-level emissive (resource nodes) passes
 * through.
 *
 * Materials are cached per option-set and marked shared: unit meshes rebuild
 * every render pass, and disposeMesh (sceneContext) skips shared materials, so
 * identical parts must reuse one material instead of recreating it per frame.
 *
 * @param {object} descriptor - normalized descriptor
 * @param {object} part       - descriptor part
 * @returns {THREE.MeshToonMaterial}
 */
const materialCache = new Map();

export function materialForPart(descriptor, part) {
  const material = descriptor.material;
  const opts = {};
  if (part.shape === 'mountain') {
    // Mountain geometry carries per-vertex colors (mountainGeometries.js) —
    // keep the material white and let vertex colors drive the look, matching
    // the game's MOUNTAIN_MATERIAL.
    opts.vertexColors = true;
  } else {
    opts.color = part.materialColor ?? material.color;
  }
  if (material.emissive !== undefined) opts.emissive = material.emissive;
  if (material.emissiveIntensity !== undefined) opts.emissiveIntensity = material.emissiveIntensity;
  const key = JSON.stringify(opts);
  let mat = materialCache.get(key);
  if (!mat) {
    mat = toonMaterial(opts);
    mat.userData.shared = true;
    materialCache.set(key, mat);
  }
  return mat;
}
