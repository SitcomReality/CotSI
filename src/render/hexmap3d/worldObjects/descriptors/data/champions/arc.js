/**
 * arc.js — Archive champion variant: the Everwatcher.
 *
 * A slate scholar-guardian: columnar robe, a weathered-blue record tablet held
 * at the chest, a smooth cowl, and the Everknown's floating eye-gem with a
 * second glyph-mote drifting above. The floating records are Archive's
 * signature. Saving ARC in the geometry editor rewrites this file as a
 * self-contained block (parts inlined).
 */
import { PEDESTAL } from './shared.js';

export const ARC_VARIANT = {
  id: 'ARC',
  parts: [
    PEDESTAL,
    // Robe: a straight slate column.
    { id: 'arcRobe', shape: 'cone', params: { bottomR: 0.14, height: 0.38, radialSegs: 6 }, transform: { y: 0.06 }, color: 'factionBase' },
    // Tablet: the record held at the chest.
    { id: 'arcTablet', shape: 'box', params: { width: 0.14, height: 0.18, depth: 0.04 }, transform: { y: 0.18, localPos: { x: 0, y: 0, z: 0.12 }, localAxis: { x: 1, y: 0, z: 0 }, localAngle: 0.18 }, color: 'factionAccent' },
    // Cowl: a smooth scholar's helm.
    { id: 'arcCowl', shape: 'cylinder', params: { bottomR: 0.09, topR: 0.08, height: 0.12, segments: 6 }, transform: { y: 0.42 }, color: 'factionBase' },
    // Eye-gem: the Everknown's floating eye.
    { id: 'arcEye', shape: 'octahedron', params: { radius: 0.045 }, transform: { y: 0.62, localPos: { x: 0.07, y: 0, z: 0.04 } }, color: 'factionAccent' },
    // Glyph-mote: a second record fragment drifting higher.
    { id: 'arcGlyph', shape: 'dodecahedron', params: { radius: 0.035 }, transform: { y: 0.7, localPos: { x: -0.09, y: 0, z: 0 } }, color: 'factionAccent' },
  ],
};
