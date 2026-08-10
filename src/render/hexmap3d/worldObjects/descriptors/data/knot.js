/**
 * knots.js — Descriptor data for the knot feature.
 *
 * Migrated from knotMeshes.js: one octahedron per tile, hovering at
 * KNOT_Y_OFFSET (transform y — a bottom height under the v3 grounding
 * convention: center sits at KNOT_Y_OFFSET + KNOT_RADIUS, so the knot floats
 * 0.1 above the surface), emissive purple material. Displaced to the
 * corner anchor when an occupant shares the hex (defensive — knots are mined
 * on arrival). The mined filter stays in the game-side builder.
 *
 * The former bespoke `knot` shape always rendered an octahedron
 * (knotGeometries.js → OctahedronGeometry(KNOT_RADIUS, 0)); it is now the
 * standard `octahedron` shape at the same radius, so the render is unchanged.
 *
 * v4: the purple is the part's own `color` (instance-color path); the material
 * keeps only the emissive glow.
 */

export const KNOT_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'knot',
  kind: 'feature',
  displayName: 'Knot',
  placement: { mode: 'center' },
  emphasis: { behavior: 'dispersed' },
  material: {
    emissive: 0xb79aff,
    emissiveIntensity: 0.4, // KNOT_EMISSIVE_INTENSITY
  },
  parts: [
    {
      id: 'knot',
      shape: 'octahedron',
      params: { radius: 0.2, detail: 0 }, // KNOT_RADIUS
      transform: { y: 0.1 }, // KNOT_Y_OFFSET − KNOT_RADIUS: floats 0.1 above the surface
      color: 0x7c3fb1, // the knot purple — was the v3 material color
    },
  ],
};
