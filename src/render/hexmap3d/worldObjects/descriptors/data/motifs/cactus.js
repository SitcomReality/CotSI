/**
 * data/motifs/cactus.js — Shared motif: "cactus".
 *
 * The desert cactus: a tapered, subtly ribbed trunk with a domed cap and a small
 * `bloom`-tinted flower, plus a weighted arm choice (none / one / two). Every arm
 * is an out-then-up elbow with a rounded tip, so it reads as a cactus rather
 * than a stick. Hand-authored geometry source of truth — any decor's motif
 * table can reference it by `{ motif: 'cactus', weight, ... }`.
 */

const GREEN = 0x4c8a4a;
const GREEN_TINT = { source: 'foliage', influence: 0.3 };

// A thin vertical trunk rib, placed around the trunk axis by `angle` (radians).
function rib(index, angle) {
  return {
    id: `cactus-rib-${index}`,
    shape: 'cylinder',
    params: { bottomR: 0.018, topR: 0.016, height: 0.46, segments: 5 },
    transform: { localPos: { x: 0.095, y: 0.23, z: 0 }, rotY: angle },
    color: GREEN,
    biomeColor: GREEN_TINT,
  };
}

// A single arm: a horizontal stub out from the trunk, an upward rise, and a
// rounded tip. `dir` is -1 for the left side, +1 for the right. `tag` keeps
// part ids unique across the arm options (ids are globally unique per tree).
function arm(side, tag) {
  const dir = side === 'left' ? -1 : 1;
  return {
    id: `cactus-arm-${tag}-${side}`,
    transform: { localPos: { x: dir * 0.1, y: 0.26, z: 0 } },
    children: [
      {
        id: `cactus-arm-${tag}-${side}-stub`,
        shape: 'cylinder',
        params: { bottomR: 0.045, topR: 0.045, height: 0.14, segments: 5 },
        transform: {
          localPos: { x: dir * 0.07, y: 0, z: 0 },
          localAxis: { x: 0, y: 0, z: 1 },
          localAngle: 1.5707963267948966,
        },
        color: GREEN,
        biomeColor: GREEN_TINT,
      },
      {
        id: `cactus-arm-${tag}-${side}-rise`,
        shape: 'cylinder',
        params: { bottomR: 0.045, topR: 0.04, height: 0.16, segments: 5 },
        transform: { localPos: { x: dir * 0.12, y: 0.08, z: 0 } },
        color: GREEN,
        biomeColor: GREEN_TINT,
      },
      {
        id: `cactus-arm-${tag}-${side}-tip`,
        shape: 'spheroid',
        params: { radius: 0.05 },
        transform: { localPos: { x: dir * 0.12, y: 0.16, z: 0 }, scaleY: 0.7 },
        color: GREEN,
        biomeColor: GREEN_TINT,
      },
    ],
  };
}

export const CACTUS_MOTIF = {
  id: 'cactus',
  parts: [
    {
      // The trunk: tapered body, subtle ribs, domed cap, and a small bloom.
      id: 'cactus-trunk',
      children: [
        {
          id: 'cactus-trunk-body',
          shape: 'cylinder',
          params: { bottomR: 0.1, topR: 0.085, height: 0.5, segments: 8 },
          stretch: { y: { min: 0.9, max: 1.2, seed: 6 }, x: false, z: false },
          color: GREEN,
          biomeColor: GREEN_TINT,
          biomeScale: { biome_edenfall: 1.1, biome_dustbleed: 1.05 },
        },
        rib(0, 0),
        rib(1, 1.2566370614359172),
        rib(2, 2.5132741228718345),
        rib(3, 3.7699111843077517),
        rib(4, 5.026548245743669),
        {
          id: 'cactus-trunk-cap',
          shape: 'spheroid',
          params: { radius: 0.082 },
          transform: { localPos: { x: 0, y: 0.5, z: 0 }, scaleY: 0.55 },
          color: GREEN,
          biomeColor: GREEN_TINT,
        },
        {
          id: 'cactus-bloom',
          shape: 'spheroid',
          params: { radius: 0.028 },
          transform: { localPos: { x: 0, y: 0.53, z: 0 }, scaleY: 0.8 },
          color: 0xd86a8c,
          biomeColor: { source: 'bloom', influence: 0.55 },
        },
      ],
    },
    {
      id: 'cactus-arms',
      seed: 101,
      default: 'cactus-arms-two',
      alternatives: [
        { id: 'cactus-arms-none', weight: 0.12, parts: [] },
        { id: 'cactus-arms-one', weight: 0.3, parts: [arm('left', 'one')] },
        { id: 'cactus-arms-two', weight: 0.58, parts: [arm('left', 'two'), arm('right', 'two')] },
      ],
    },
  ],
};
