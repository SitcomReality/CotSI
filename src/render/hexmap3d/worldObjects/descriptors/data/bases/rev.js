/**
 * rev.js — Reverie base variant: the Dream-Spire.
 *
 * A slender violet spire rising from a two-tier plinth, with a floating
 * crescent of dream-light drifting beside it and a hanging star-mote. Tall,
 * thin, slightly off-balance — a tower out of a dream. Saving REV in the
 * geometry editor rewrites this file as a self-contained block (parts
 * inlined).
 */
export const REV_VARIANT = {
  id: 'REV',
  parts: [
    // Dream-plinth: a wide low base.
    { id: 'revFPlinth', shape: 'cylinder', params: { bottomR: 0.34, topR: 0.3, height: 0.1, segments: 6 }, color: 'factionBase' },
    // Step: a second tier narrowing up.
    { id: 'revFStep', shape: 'cylinder', params: { bottomR: 0.22, topR: 0.2, height: 0.14, segments: 6 }, transform: { y: 0.1 }, color: 'factionBase' },
    // Spire: the slender needle.
    { id: 'revFSpire', shape: 'cone', params: { bottomR: 0.13, height: 0.5, radialSegs: 5 }, transform: { y: 0.24 }, color: 'factionBase' },
    // Crescent: a violet sliver of dream-light floating beside the spire.
    { id: 'revFCrescent', shape: 'torus', params: { radius: 0.1, tube: 0.022, radialSegs: 4, tubularSegs: 10, arc: Math.PI * 1.3 }, transform: { y: 0.6, localPos: { x: 0.2, y: 0, z: 0 }, localAxis: { x: 1, y: 0, z: 0 }, localAngle: 1.2 }, color: 'factionAccent' },
    // Star: a hanging mote of dream-light.
    { id: 'revFStar', shape: 'octahedron', params: { radius: 0.045 }, transform: { y: 0.52, localPos: { x: -0.18, y: 0, z: 0.12 } }, color: 'factionAccent' },
  ],
};
