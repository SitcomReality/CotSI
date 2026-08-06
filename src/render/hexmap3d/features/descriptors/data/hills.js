/**
 * hills.js — Descriptor data for the hill-mound terrain decoration.
 *
 * Migrated from hillDecorMeshes.js + hillDecorGeometries.js: one low flattened
 * dome per hill tile at the hex center (HILL_DECOR: radius 0.42, height 0.28).
 * The geometry is a top hemisphere (thetaLength π/2) flattened by
 * height/radius; emphasis 'sunk' shrinks it and descends it below the surface
 * when the tile center is claimed (decorEmphasis.js).
 */

export const HILL_DESCRIPTOR = {
  schemaVersion: 1,
  id: 'hill',
  kind: 'decor',
  displayName: 'Hill Mound',
  placement: { mode: 'center' },
  emphasis: { behavior: 'sunk' },
  material: { color: 0x7a8f5a }, // HILL_DECOR.color
  parts: [
    {
      id: 'mound',
      shape: 'sphere',
      params: {
        radius: 0.42, // HILL_DECOR.radius
        wSegs: 10, hSegs: 5,
        thetaStart: 0,
        thetaLength: Math.PI / 2, // top hemisphere
      },
      transform: { scaleY: 0.28 / 0.42 }, // HILL_DECOR.height / radius flattening
    },
  ],
};
