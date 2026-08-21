/**
 * data/motifs/titanBoil.js — Shared motif: "titanBoil".
 *
 * Hand-authored geometry source of truth (see dev/docs/descriptorAuthoring.md
 * for the shared-motif reference contract). The Titanstain biome's organic
 * signature: a low, wide boil of corrupted flesh. One motif placement rolls a
 * single boil, an overlapping pair, or a cluster of pustules. References by
 * `{ motif: 'titanBoil', ... }`.
 */

// A single flattened boil dome, bottom-anchored at the ground (root leaf).
function boil(id, radius, scaleXZ, scaleY, x, z) {
  return {
    id,
    shape: 'spheroid',
    params: { radius },
    transform: {
      localPos: { x, y: 0, z },
      scaleY,
      scaleX: scaleXZ,
      scaleZ: scaleXZ,
    },
    color: 0x9c4a5a,
    biomeColor: { source: 'foliage', influence: 0.6 },
  };
}

export const TITAN_BOIL_MOTIF = {
  id: 'titanBoil',
  parts: [
    {
      id: 'titan-boil-variant',
      seed: 106,
      default: 'titan-boil-single',
      alternatives: [
        {
          id: 'titan-boil-single',
          weight: 0.5,
          parts: [boil('titan-boil-single-a', 0.13, 1.4, 0.7, 0, 0)],
        },
        {
          id: 'titan-boil-pair',
          weight: 0.3,
          parts: [
            boil('titan-boil-pair-a', 0.12, 1.5, 0.72, -0.07, -0.04),
            boil('titan-boil-pair-b', 0.08, 1.35, 0.62, 0.11, 0.06),
          ],
        },
        {
          id: 'titan-boil-pustules',
          weight: 0.2,
          parts: [
            boil('titan-boil-pustules-a', 0.1, 1.45, 0.68, -0.08, 0.06),
            boil('titan-boil-pustules-b', 0.06, 1.3, 0.6, 0.1, -0.07),
            boil('titan-boil-pustules-c', 0.045, 1.25, 0.55, 0.02, 0.12),
          ],
        },
      ],
    },
  ],
};
