/**
 * data/motifs/yetFragmentCube.js — Shared motif: "yetFragmentCube".
 *
 * Hand-authored geometry source of truth (see dev/docs/descriptorAuthoring.md
 * for the shared-motif reference contract). The Unfinished Lands biome's
 * half-formed signature: a rigid cube floating above the ground. One motif
 * placement rolls a single floating cube, a loose pair, or a half-built column.
 * References by `{ motif: 'yetFragmentCube', ... }`.
 */

// A single floating, tilted cube (root leaf — lift keeps it airborne).
function cube(id, size, x, z, liftMin, liftMax, axis, angle) {
  return {
    id,
    shape: 'cube',
    params: { size },
    transform: {
      y: 0,
      lift: 0,
      localPos: { x, y: 0, z },
      liftRange: { min: liftMin, max: liftMax, seed: 8 },
      localAxis: axis,
      localAngle: angle,
    },
    color: 0x8a9aa2,
    biomeColor: { source: 'terrain', influence: 0.4 },
  };
}

export const YET_FRAGMENT_CUBE_MOTIF = {
  id: 'yetFragmentCube',
  parts: [
    {
      id: 'yet-fragment-cube-variant',
      seed: 107,
      default: 'yet-fragment-cube-single',
      alternatives: [
        {
          id: 'yet-fragment-cube-single',
          weight: 0.4,
          parts: [
            cube('yet-fragment-cube-single-a', 0.13, 0, 0, 0.06, 0.28, { x: 1, y: 1, z: 0 }, 0.6),
          ],
        },
        {
          id: 'yet-fragment-cube-pair',
          weight: 0.35,
          parts: [
            cube('yet-fragment-cube-pair-a', 0.13, -0.05, -0.02, 0.08, 0.24, { x: 1, y: 1, z: 0 }, 0.6),
            cube('yet-fragment-cube-pair-b', 0.09, 0.12, 0.06, 0.18, 0.34, { x: 0, y: 1, z: 1 }, -0.5),
          ],
        },
        {
          id: 'yet-fragment-cube-tower',
          weight: 0.25,
          parts: [
            cube('yet-fragment-cube-tower-a', 0.14, -0.02, 0, 0.02, 0.1, { x: 1, y: 1, z: 0 }, 0.3),
            cube('yet-fragment-cube-tower-b', 0.11, 0.05, -0.03, 0.16, 0.24, { x: 0, y: 1, z: 1 }, 0.5),
            cube('yet-fragment-cube-tower-c', 0.08, -0.04, 0.05, 0.3, 0.4, { x: 1, y: 0, z: 1 }, -0.4),
          ],
        },
      ],
    },
  ],
};
