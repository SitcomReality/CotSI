/**
 * shapeFactories.js — THREE geometry/material factories for descriptor parts.
 *
 * Maps a descriptor part's shape type + params onto the THREE constructors the
 * game's geometry uses. Geometries are cached per (type, params) pair.
 *
 * Bespoke shapes that don't map onto a single primitive live here too:
 * `mountain` (faceted low-poly hex pyramid with vertex colors — migrated from
 * the legacy geometries/mountainGeometries.js) and `lathe` (the former
 * snowperson solid of revolution — geometries/featureGeometries.js). These are
 * the only shape types with custom geometry; everything else is a primitive.
 *
 * This module is the only THREE-dependent part of the descriptor pipeline —
 * record generation (recordBuilder.js) stays pure.
 */
import * as THREE from '../../../../vendor/three.module.js';
import {
  MOUNTAIN_BASE_RADIUS,
  MOUNTAIN_CAP_RADIUS,
  MOUNTAIN_CAP_HEIGHT,
  MOUNTAIN_TIP_HEIGHT,
  MOUNTAIN_TIP_RING_RADIUS,
  MOUNTAIN_TIP_RING_HEIGHT,
  MOUNTAIN_BODY_COLOR,
  MOUNTAIN_CAP_COLOR,
  MOUNTAIN_TIP_COLOR,
  MOUNTAIN_OFFPEAK,
} from '../../../../params/render/geometryParams.js';
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

// =========================================================================
// Bespoke shapes
// =========================================================================

// -------------------------------------------------------------------------
// Mountain geometry — faceted low-poly hex pyramids with vertex colors.
// -------------------------------------------------------------------------
// Every variant shares the same base ring (radius MOUNTAIN_BASE_RADIUS, y=0),
// matching hexCornersXZ, so adjacent mountain edges align perfectly — no gaps.
// Variants differ only in the upper structure (cap size/offset, tip offset),
// so instances keep zero rotation and uniform scale and still tile cleanly.
//
// Pyramid layout (per appendPyramid call), three solid color bands:
//   - BODY — base ring (y=0, R=baseRadius) up to the cap ring: solid mountain color
//   - CAP  — cap ring (y=capHeight, R=capRadius) up to the tip ring: the white cap
//   - TIP  — tip ring (y=tipRingHeight, R=tipRingRadius) to the tip point
//            (y=tipHeight, R=0): the summit, separately colorable
// Tiers: 6 body quads + 6 cap quads + 6 tip triangles.
// Non-indexed, 90 vertices per pyramid. Tiers share no vertices, so the band
// boundaries are crisp.
// -------------------------------------------------------------------------

const mountainGeos = {};

/**
 * Get the cached mountain geometry for a profile variant.
 * @param {'classic'|'offpeak'} [variant='classic']
 * @returns {THREE.BufferGeometry}
 */
function getMountainGeo(variant = 'classic') {
  if (!mountainGeos[variant]) {
    mountainGeos[variant] = buildVariant(variant);
  }
  return mountainGeos[variant];
}

function buildVariant(variant) {
  switch (variant) {
    case 'offpeak': {
      const ox = MOUNTAIN_OFFPEAK.offset * Math.cos(MOUNTAIN_OFFPEAK.direction);
      const oz = MOUNTAIN_OFFPEAK.offset * Math.sin(MOUNTAIN_OFFPEAK.direction);
      const tipRingRadius = MOUNTAIN_TIP_RING_RADIUS * (MOUNTAIN_OFFPEAK.capRadius / MOUNTAIN_CAP_RADIUS);
      return buildMountainPyramid({
        capCenterX: ox, capCenterZ: oz,
        capRadius: MOUNTAIN_OFFPEAK.capRadius,
        tipRingRadius,
        tipX: ox, tipZ: oz,
      });
    }
    case 'classic':
    default:
      return buildMountainPyramid({
        capCenterX: 0, capCenterZ: 0,
        capRadius: MOUNTAIN_CAP_RADIUS,
        tipRingRadius: MOUNTAIN_TIP_RING_RADIUS,
        tipX: 0, tipZ: 0,
      });
  }
}

function buildMountainPyramid(opts) {
  const positions = new Float32Array(90 * 3);
  const colors = new Float32Array(90 * 3);
  appendPyramid(positions, colors, 0, {
    baseCenterX: 0, baseCenterZ: 0,
    baseRadius: MOUNTAIN_BASE_RADIUS,
    capHeight: MOUNTAIN_CAP_HEIGHT,
    tipRingHeight: MOUNTAIN_TIP_RING_HEIGHT,
    tipHeight: MOUNTAIN_TIP_HEIGHT,
    ...opts,
  });
  return finalize(positions, colors);
}

/**
 * Write one hex-pyramid's 90 vertices (6 body quads + 6 cap quads + 6 tip triangles).
 * @returns {number} next vertex index
 */
function appendPyramid(positions, colors, vi, p) {
  const baseVerts = [];
  const capVerts = [];
  const tipRingVerts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    baseVerts.push({ x: p.baseCenterX + p.baseRadius * Math.cos(angle), z: p.baseCenterZ + p.baseRadius * Math.sin(angle) });
    capVerts.push({ x: p.capCenterX + p.capRadius * Math.cos(angle), z: p.capCenterZ + p.capRadius * Math.sin(angle) });
    tipRingVerts.push({ x: p.capCenterX + p.tipRingRadius * Math.cos(angle), z: p.capCenterZ + p.tipRingRadius * Math.sin(angle) });
  }

  // --- Body tier: 6 quads connecting base ring to cap ring — solid body color ---
  for (let i = 0; i < 6; i++) {
    const b0 = baseVerts[i];
    const b1 = baseVerts[(i + 1) % 6];
    const c0 = capVerts[i];
    const c1 = capVerts[(i + 1) % 6];

    // Triangle 1: b0, c1, b1 (CCW from outside)
    writeVert(positions, colors, vi++, b0.x, 0, b0.z, MOUNTAIN_BODY_COLOR);
    writeVert(positions, colors, vi++, c1.x, p.capHeight, c1.z, MOUNTAIN_BODY_COLOR);
    writeVert(positions, colors, vi++, b1.x, 0, b1.z, MOUNTAIN_BODY_COLOR);

    // Triangle 2: b0, c0, c1 (CCW from outside)
    writeVert(positions, colors, vi++, b0.x, 0, b0.z, MOUNTAIN_BODY_COLOR);
    writeVert(positions, colors, vi++, c0.x, p.capHeight, c0.z, MOUNTAIN_BODY_COLOR);
    writeVert(positions, colors, vi++, c1.x, p.capHeight, c1.z, MOUNTAIN_BODY_COLOR);
  }

  // --- Cap tier: 6 quads connecting cap ring to tip ring — solid cap color ---
  for (let i = 0; i < 6; i++) {
    const c0 = capVerts[i];
    const c1 = capVerts[(i + 1) % 6];
    const t0 = tipRingVerts[i];
    const t1 = tipRingVerts[(i + 1) % 6];

    writeVert(positions, colors, vi++, c0.x, p.capHeight, c0.z, MOUNTAIN_CAP_COLOR);
    writeVert(positions, colors, vi++, t1.x, p.tipRingHeight, t1.z, MOUNTAIN_CAP_COLOR);
    writeVert(positions, colors, vi++, c1.x, p.capHeight, c1.z, MOUNTAIN_CAP_COLOR);

    writeVert(positions, colors, vi++, c0.x, p.capHeight, c0.z, MOUNTAIN_CAP_COLOR);
    writeVert(positions, colors, vi++, t0.x, p.tipRingHeight, t0.z, MOUNTAIN_CAP_COLOR);
    writeVert(positions, colors, vi++, t1.x, p.tipRingHeight, t1.z, MOUNTAIN_CAP_COLOR);
  }

  // --- Tip tier: 6 triangles connecting tip ring to the tip point — solid tip color ---
  for (let i = 0; i < 6; i++) {
    const t0 = tipRingVerts[i];
    const t1 = tipRingVerts[(i + 1) % 6];

    writeVert(positions, colors, vi++, t0.x, p.tipRingHeight, t0.z, MOUNTAIN_TIP_COLOR);
    writeVert(positions, colors, vi++, p.tipX, p.tipHeight, p.tipZ, MOUNTAIN_TIP_COLOR);
    writeVert(positions, colors, vi++, t1.x, p.tipRingHeight, t1.z, MOUNTAIN_TIP_COLOR);
  }

  return vi;
}

function finalize(positions, colors) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function writeVert(positions, colors, idx, x, y, z, color) {
  const i3 = idx * 3;
  positions[i3]     = x;
  positions[i3 + 1] = y;
  positions[i3 + 2] = z;
  colors[i3]        = color[0];
  colors[i3 + 1]    = color[1];
  colors[i3 + 2]    = color[2];
}

// -------------------------------------------------------------------------
// Lathe — a solid of revolution (the former snowperson body+head blend).
// -------------------------------------------------------------------------

let latheGeo = null;
function getLatheGeo() {
  if (!latheGeo) {
    const pts = [];
    const segments = 10;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI;
      // Body: radius 0.10 centered at y=0.10 (bottom at exactly 0 — the lathe
      // is a bottom-anchored geometry, so the record path adds no base offset)
      const bodyR = Math.sin(a) * 0.10;
      const bodyY = -Math.cos(a) * 0.10 + 0.10;
      // Head: radius 0.06 centered at y=0.28
      const headA = Math.max(0, Math.min(Math.PI, a * 1.8 - 0.6));
      const headR = Math.sin(headA) * 0.06;
      const headY = -Math.cos(headA) * 0.06 + 0.28;
      // Blend body into head in the middle zone
      const t = Math.max(0, Math.min(1, (a - 0.7) / 1.0));
      pts.push(new THREE.Vector2(
        bodyR * (1 - t) + headR * t,
        bodyY * (1 - t) + headY * t,
      ));
    }
    latheGeo = new THREE.LatheGeometry(pts, 8);
  }
  return latheGeo;
}

// =========================================================================
// Materials
// =========================================================================

/**
 * Toon material for a part — always white: instance colors (record.color from
 * recordBuilder) carry the look, so a shared white material stays the single
 * cache entry per option-set. Mountain geometry carries per-vertex colors
 * (getMountainGeo above) — keep the material white and let vertex colors drive
 * the look, matching the game's MOUNTAIN_MATERIAL. Object-level emissive
 * (resource nodes) passes through; a per-variant emissive (variant.material —
 * e.g. the infernalpaca's glow) merges over it and wins.
 *
 * Materials are cached per option-set and marked shared: unit meshes rebuild
 * every render pass, and disposeMesh (sceneContext) skips shared materials, so
 * identical parts must reuse one material instead of recreating it per frame.
 *
 * @param {object} descriptor      - normalized descriptor
 * @param {object} part            - descriptor part
 * @param {object} [variantMaterial] - the part's variant-level material (emissive)
 * @returns {THREE.MeshToonMaterial}
 */
const materialCache = new Map();

export function materialForPart(descriptor, part, variantMaterial) {
  const material = { ...descriptor.material, ...(variantMaterial ?? {}) };
  const opts = {};
  if (part.shape === 'mountain') {
    opts.vertexColors = true;
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
