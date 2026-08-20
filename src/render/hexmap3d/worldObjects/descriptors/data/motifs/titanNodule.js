/**
 * data/motifs/titanNodule.js — Shared motif: "titanNodule".
 *
 * Hand-authored geometry source of truth (see data/motifs/debris.js header for
 * the library/reference contract). A discrete signature object of the
 * Titanstain biome. References by `{ motif: 'titanNodule', ... }`.
 */
export const TITAN_NODULE_MOTIF = {
  id: 'titanNodule',
  parts: [
    {
      id: 'titan-nodule',
      shape: 'dodecahedron',
      params: { radius: 0.08 },
      transform: {
        localPos: { x: -0.26, y: 0, z: 0.12 },
        scaleY: 1.4,
        localAxis: { x: 1, y: 1, z: 0 },
        localAngle: 0.4,
      },
      color: 0x6e2f3d,
      biomeColor: { source: 'exotic', influence: 0.45 },
    },
  ],
};