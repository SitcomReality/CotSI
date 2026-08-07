/**
 * bases.js — Descriptor data for champion bases.
 *
 * Migrated 1:1 from baseMeshes.js: the shared tower + cap (faction-colored via
 * the 'factionBase' token) and the per-faction decoration (the 'factionAccent'
 * token) that used to be a 7-branch switch. Variant ids are the faction shorts
 * (CRU / REV / VER / ARC / HRT / MSK / HOL) — recordsForEntity picks the
 * variant whose id equals the entity's faction, and resolves the color tokens
 * from the faction palette.
 *
 * Decoration parts carry unique part ids per variant (spike0..5, ring, crown0..7,
 * dot0..3, dome, spire, hangSpike) so part grouping in meshAssembly never
 * mixes two different geometries under one id. Material stays white — instance
 * colors drive the look.
 *
 * Values are JSON-safe (colors as tokens, angles in radians, lengths in world
 * units where hex radius = 1.0).
 */

// Shared tower + cap — identical in every variant (faction-colored body).
// Tower has no transform (flush); cap/decoration y values are bottom heights.
const TOWER = {
  id: 'tower',
  shape: 'cylinder',
  params: { bottomR: 0.22, topR: 0.25, height: 0.7, segments: 8 },
  color: 'factionBase',
};
const CAP = {
  id: 'cap',
  shape: 'cylinder',
  params: { bottomR: 0.24, topR: 0.2, height: 0.15, segments: 8 },
  transform: { y: 0.675 },
  color: 'factionBase',
};

/**
 * A ring of leaning cone spikes (CRU/VER decorations). The old builder placed
 * N spikes on a ring radius and leaned each outward (rotation.z = cos·tilt,
 * rotation.x = sin·tilt); equivalent: per-spike localPos on the ring + a
 * tiltAxis perpendicular to the offset direction, tilting outward.
 */
function spikes(prefix, count, cy, ringRadius, bottomR, height) {
  return Array.from({ length: count }, (_, i) => {
    const a = (Math.PI * 2 / count) * i;
    return {
      id: `${prefix}${i}`,
      shape: 'cone',
      params: { bottomR, height, radialSegs: 4, heightSegs: 1 },
      transform: {
        y: cy,
        localPos: { x: Math.cos(a) * ringRadius, y: 0, z: Math.sin(a) * ringRadius },
        tiltAxis: { x: Math.sin(a), z: -Math.cos(a) },
        tilt: 0.3,
      },
      color: 'factionAccent',
    };
  });
}

/** ARC — small satellite dots on a ring (no lean). */
function dots(prefix, count, cy, ringRadius) {
  return Array.from({ length: count }, (_, i) => {
    const a = (Math.PI * 2 / count) * i;
    return {
      id: `${prefix}${i}`,
      shape: 'sphere',
      params: { radius: 0.03, wSegs: 4, hSegs: 3 },
      transform: { y: cy, localPos: { x: Math.cos(a) * ringRadius, y: 0, z: Math.sin(a) * ringRadius } },
      color: 'factionAccent',
    };
  });
}

const RING = {
  id: 'ring',
  shape: 'torus',
  params: { radius: 0.28, tube: 0.02, radialSegs: 6, tubularSegs: 12 },
  transform: { y: 0.83, localAxis: { x: 1, y: 0, z: 0 }, localAngle: Math.PI / 2 },
  color: 'factionAccent',
};

const DOME = {
  id: 'dome',
  shape: 'sphere',
  params: {
    radius: 0.18, wSegs: 6, hSegs: 4,
    phiStart: 0, phiLength: Math.PI, thetaStart: 0, thetaLength: Math.PI / 2,
  },
  transform: { y: 0.83 },
  color: 'factionAccent',
};

const SPIRE = {
  id: 'spire',
  shape: 'cone',
  params: { bottomR: 0.05, height: 0.15, radialSegs: 6, heightSegs: 1 },
  transform: { y: 0.795 },
  color: 'factionAccent',
};

const HANG_SPIKE = {
  id: 'hangSpike',
  shape: 'cone',
  params: { bottomR: 0.04, height: 0.12, radialSegs: 4, heightSegs: 1 },
  transform: { y: 0.01, localAxis: { x: 1, y: 0, z: 0 }, localAngle: Math.PI },
  color: 'factionAccent',
};

/** Every faction variant. Variant id === the faction short name. */
export const BASE_VARIANTS = {
  CRU: [TOWER, CAP, ...spikes('spike', 6, 0.1, 0.28, 0.06, 0.1)],
  REV: [TOWER, CAP, RING],
  VER: [TOWER, CAP, ...spikes('crown', 8, 0.76, 0.28, 0.04, 0.08)],
  ARC: [TOWER, CAP, ...dots('dot', 4, 0.52, 0.32)],
  HRT: [TOWER, CAP, DOME],
  MSK: [TOWER, CAP, SPIRE],
  HOL: [TOWER, CAP, HANG_SPIKE],
};

/** The base descriptor — top-level parts are the CRU fallback. */
export const BASE_DESCRIPTOR = {
  schemaVersion: 3,
  id: 'base',
  kind: 'base',
  displayName: 'Faction Base',
  variantRule: 'faction',
  material: { color: 0xffffff },
  parts: BASE_VARIANTS.CRU,
  variants: Object.entries(BASE_VARIANTS).map(([id, parts]) => ({ id, parts })),
};
