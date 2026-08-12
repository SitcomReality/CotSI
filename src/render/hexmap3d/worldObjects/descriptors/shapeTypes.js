/**
 * shapeTypes.js — The descriptor shape registry and its geometry facts.
 *
 * `SHAPE_TYPES` maps each editable shape to its validation rules (`params`)
 * and new-part defaults. `shapeBaseOffset` computes a shape's vertical base
 * (half the vertical extent for centered THREE primitives, 0 for
 * bottom-anchored bespoke geometry) so the record builders can ground parts
 * flush on the surface.
 */

// ── Shape registry ─────────────────────────────────────────────────────────

/**
 * Shape types the editor can compose. `params` maps each editable dimension to
 * its validation rule; `defaults` seeds new parts and fills omitted params.
 * Param names mirror the THREE constructor arguments the game's geometry
 * factories use (see shapeFactories.js), so a descriptor's params map 1:1 onto
 * the factory calls. Bespoke shapes (mountain) carry a variant enum instead.
 */
export const SHAPE_TYPES = Object.freeze({
  cylinder: {
    params: {
      bottomR: { type: 'number', min: 0.001 },
      topR: { type: 'number', min: 0.001 },
      height: { type: 'number', min: 0.001 },
      segments: { type: 'int', min: 3 },
    },
    defaults: Object.freeze({ bottomR: 0.08, topR: 0.1, height: 0.4, segments: 6 }),
  },
  cone: {
    params: {
      bottomR: { type: 'number', min: 0.001 },
      height: { type: 'number', min: 0.001 },
      radialSegs: { type: 'int', min: 3 },
      heightSegs: { type: 'int', min: 1 },
    },
    defaults: Object.freeze({ bottomR: 0.25, height: 0.72, radialSegs: 6, heightSegs: 2 }),
  },
  sphere: {
    params: {
      radius: { type: 'number', min: 0.001 },
      wSegs: { type: 'int', min: 3 },
      hSegs: { type: 'int', min: 2 },
      phiStart: { type: 'number' },
      phiLength: { type: 'number', min: 0.001 },
      thetaStart: { type: 'number' },
      thetaLength: { type: 'number', min: 0.001 },
    },
    defaults: Object.freeze({
      radius: 0.3, wSegs: 6, hSegs: 4,
      phiStart: 0, phiLength: Math.PI * 2, thetaStart: 0, thetaLength: Math.PI,
    }),
  },
  spheroid: {
    // A stretchable sphere: non-uniform elongation comes from the part's
    // transform scale (scaleX/scaleY/scaleZ), so the params stay simple.
    params: {
      radius: { type: 'number', min: 0.001 },
      wSegs: { type: 'int', min: 3 },
      hSegs: { type: 'int', min: 2 },
    },
    defaults: Object.freeze({ radius: 0.3, wSegs: 6, hSegs: 4 }),
  },
  torus: {
    params: {
      radius: { type: 'number', min: 0.001 },
      tube: { type: 'number', min: 0.001 },
      radialSegs: { type: 'int', min: 3 },
      tubularSegs: { type: 'int', min: 3 },
      arc: { type: 'number', min: 0.001, max: Math.PI * 2 },
    },
    defaults: Object.freeze({ radius: 0.1, tube: 0.02, radialSegs: 4, tubularSegs: 8, arc: Math.PI * 2 }),
  },
  box: {
    params: {
      width: { type: 'number', min: 0.001 },
      height: { type: 'number', min: 0.001 },
      depth: { type: 'number', min: 0.001 },
    },
    defaults: Object.freeze({ width: 0.25, height: 0.05, depth: 0.18 }),
  },
  cube: {
    // A regular cube; non-uniform elongation is a transform-scale concern
    // (scaleX/scaleY/scaleZ), keeping the part itself a true cube.
    params: {
      size: { type: 'number', min: 0.001 },
    },
    defaults: Object.freeze({ size: 0.3 }),
  },
  dodecahedron: {
    params: {
      radius: { type: 'number', min: 0.001 },
      detail: { type: 'int', min: 0 },
    },
    defaults: Object.freeze({ radius: 0.08, detail: 0 }),
  },
  octahedron: {
    params: {
      radius: { type: 'number', min: 0.001 },
      detail: { type: 'int', min: 0 },
    },
    defaults: Object.freeze({ radius: 0.2, detail: 0 }),
  },
  mountain: {
    params: {
      variant: { type: 'enum', values: ['classic', 'offpeak'] },
    },
    defaults: Object.freeze({ variant: 'classic' }),
  },
  lathe: {
    // Bespoke solid of revolution (featureGeometries.js — the former
    // "snowperson" shape) — no editable dimensions.
    params: {},
    defaults: Object.freeze({}),
  },
});

/**
 * Vertical distance from a shape's origin to its lowest vertex, in world units
 * (pre-scale), for a part with the given params.
 *
 * Three.js primitives (cylinder, cone, sphere, box, torus, polyhedra) are
 * vertically CENTERED at the origin, so their base offset is half their
 * vertical extent (a cylinder of height 0.4 spans -0.2..+0.2 around the
 * origin); custom bottom-anchored geometries (mountain pyramid, lathe profile)
 * start at y=0 and offset to 0. `recordBuilder` bakes `baseOffset * sy` (sy =
 * the record's Y scale, including stretch) into the record y, so every part's
 * lowest point lands at `transform.y + lift (+ localPos.y)` — the
 * bottom-anchored convention: y = 0 / lift = 0 sits flush on the surface, and
 * stretch grows a part upward from the ground instead of from its center.
 *
 * Spheres are theta-aware: the polar range [thetaStart, thetaStart+thetaLength]
 * places the lowest vertex at r·cos(thetaEnd), or at y = -r when the range
 * covers the south pole — a full sphere offsets by its radius, while the hill
 * mound's top hemisphere (thetaLength π/2) starts at y=0 and offsets to 0.
 * The azimuth (phi) range never affects the vertical extent.
 *
 * @param {string} shape  - key of SHAPE_TYPES
 * @param {object} params - normalized shape params (defaults applied)
 * @returns {number} base offset in world units (pre-scale)
 */
export function shapeBaseOffset(shape, params) {
  switch (shape) {
    case 'cylinder':
    case 'cone':
      return params.height / 2;
    case 'box':
      return params.height / 2;
    case 'cube':
      return params.size / 2;
    case 'sphere':
    case 'spheroid': {
      const r = params.radius;
      const thetaStart = params.thetaStart ?? 0;
      const thetaEnd = thetaStart + (params.thetaLength ?? Math.PI);
      // Lowest vertex: -r when the band covers the south pole (theta = π);
      // otherwise it sits at whichever band endpoint dips lower.
      const coversSouthPole = thetaStart <= Math.PI && thetaEnd >= Math.PI;
      const lowest = coversSouthPole ? -r : r * Math.min(Math.cos(thetaStart), Math.cos(thetaEnd));
      return -lowest;
    }
    case 'torus':
      return params.tube;
    case 'dodecahedron':
    case 'octahedron':
      return params.radius;
    case 'mountain':
    case 'lathe':
      return 0; // bottom-anchored geometry — the base ring / profile starts at y=0
    default:
      return 0;
  }
}
