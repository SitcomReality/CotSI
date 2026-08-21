/**
 * data/motifs/titanSpire.js — Shared motif: "titanSpire".
 *
 * Hand-authored geometry source of truth (see dev/docs/descriptorAuthoring.md
 * for the shared-motif reference contract). The Titanstain biome's signature
 * vertical growth: a jagged low-poly cone. One motif placement rolls a single
 * spire, a leaning pair, or a small thicket, so a titanstain hex reads as
 * broken growth rather than a row of identical spires. References by
 * `{ motif: 'titanSpire', ... }`.
 */

// A single leaning spire cone, bottom-anchored at the ground (root leaf).
function spire(id, bottomR, height, x, z, lean) {
  return {
    id,
    shape: 'cone',
    params: { bottomR, height, radialSegs: 6, heightSegs: 2 },
    transform: {
      localPos: { x, y: 0, z },
      localAxis: { x: 1, y: 0, z: 0 },
      localAngle: lean,
    },
    stretch: { y: { min: 0.85, max: 1.35, seed: 6 }, x: false, z: false },
    color: 0x7c3b48,
    biomeColor: { source: 'foliage', influence: 0.55 },
  };
}

export const TITAN_SPIRE_MOTIF = {
  id: 'titanSpire',
  parts: [
    {
      id: 'titan-spire-variant',
      seed: 105,
      default: 'titan-spire-single',
      alternatives: [
        {
          id: 'titan-spire-single',
          weight: 0.45,
          parts: [spire('titan-spire-single-a', 0.085, 0.42, 0, 0, 0.06)],
        },
        {
          id: 'titan-spire-pair',
          weight: 0.35,
          parts: [
            spire('titan-spire-pair-a', 0.09, 0.46, -0.05, 0.01, 0.05),
            spire('titan-spire-pair-b', 0.065, 0.28, 0.1, -0.05, -0.09),
          ],
        },
        {
          id: 'titan-spire-thicket',
          weight: 0.2,
          parts: [
            spire('titan-spire-thicket-a', 0.08, 0.4, -0.08, -0.05, 0.07),
            spire('titan-spire-thicket-b', 0.06, 0.3, 0.04, 0.06, -0.05),
            spire('titan-spire-thicket-c', 0.05, 0.22, 0.12, -0.03, 0.1),
          ],
        },
      ],
    },
  ],
};
