/**
 * shared.js — Shared building blocks for the per-faction base variants.
 *
 * The tower + cap (faction-colored via the 'factionBase' token) are identical
 * in every variant, and the decorations compose from the ring/dome/spire/
 * hangSpike parts and the spikes()/dots() generators. Each faction file in
 * this directory (data/bases/<faction>.js) imports what it needs and exports
 * its <FACTION>_VARIANT block; data/base.js composes the barrel.
 *
 * Generated caveat: saving a faction in the geometry editor rewrites that
 * faction's file with a SELF-CONTAINED variant block (parts inlined — the
 * editor emits plain JSON, no imports). These helpers stay the canonical
 * hand-authoring source for any faction not yet re-saved.
 *
 * Values are JSON-safe (colors as tokens, angles in radians, lengths in world
 * units where hex radius = 1.0).
 */

// Shared tower + cap — identical in every variant (faction-colored body).
// Tower has no transform (flush); cap/decoration y values are bottom heights.
export const TOWER = {
  id: 'tower',
  shape: 'cylinder',
  params: { bottomR: 0.22, topR: 0.25, height: 0.7, segments: 8 },
  color: 'factionBase',
};
export const CAP = {
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
export function spikes(prefix, count, cy, ringRadius, bottomR, height) {
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
export function dots(prefix, count, cy, ringRadius) {
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

export const RING = {
  id: 'ring',
  shape: 'torus',
  params: { radius: 0.28, tube: 0.02, radialSegs: 6, tubularSegs: 12 },
  transform: { y: 0.83, localAxis: { x: 1, y: 0, z: 0 }, localAngle: Math.PI / 2 },
  color: 'factionAccent',
};

export const DOME = {
  id: 'dome',
  shape: 'sphere',
  params: {
    radius: 0.18, wSegs: 6, hSegs: 4,
    phiStart: 0, phiLength: Math.PI, thetaStart: 0, thetaLength: Math.PI / 2,
  },
  transform: { y: 0.83 },
  color: 'factionAccent',
};

export const SPIRE = {
  id: 'spire',
  shape: 'cone',
  params: { bottomR: 0.05, height: 0.15, radialSegs: 6, heightSegs: 1 },
  transform: { y: 0.795 },
  color: 'factionAccent',
};

export const HANG_SPIKE = {
  id: 'hangSpike',
  shape: 'cone',
  params: { bottomR: 0.04, height: 0.12, radialSegs: 4, heightSegs: 1 },
  transform: { y: 0.01, localAxis: { x: 1, y: 0, z: 0 }, localAngle: Math.PI },
  color: 'factionAccent',
};
