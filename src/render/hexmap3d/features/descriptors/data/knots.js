/**
 * knots.js — Descriptor data for the knot feature.
 *
 * Migrated from knotMeshes.js: one octahedron per tile, hovering at
 * KNOT_Y_OFFSET (transform y), emissive purple material. Displaced to the
 * corner anchor when an occupant shares the hex (defensive — knots are mined
 * on arrival). The mined filter stays in the game-side builder.
 *
 * The former bespoke `knot` shape always rendered an octahedron
 * (knotGeometries.js → OctahedronGeometry(KNOT_RADIUS, 0)); it is now the
 * standard `octahedron` shape at the same radius, so the render is unchanged.
 */

export const KNOT_DESCRIPTOR = {
  schemaVersion: 1,
  id: 'knot',
  kind: 'feature',
  displayName: 'Knot',
  placement: { mode: 'center' },
  emphasis: { behavior: 'dispersed' },
  material: {
    color: 0x7c3fb1,
    emissive: 0xb79aff,
    emissiveIntensity: 0.4, // KNOT_EMISSIVE_INTENSITY
  },
  parts: [
    {
      id: 'knot',
      shape: 'octahedron',
      params: { radius: 0.2, detail: 0 }, // KNOT_RADIUS
      transform: { y: 0.3 }, // KNOT_Y_OFFSET
    },
  ],
};
