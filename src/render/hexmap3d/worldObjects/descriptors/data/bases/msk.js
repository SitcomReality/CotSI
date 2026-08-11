/**
 * msk.js — Masque base variant: the Marqueetheater.
 *
 * A stage pavilion: wide marquee floor, four slender corner posts, a dusty-
 * rose canopy with a pyramidal tent-top, a bone mask on the stage front and
 * two jester poms on the marquee edge. The tent and the mask are Masque's
 * signature. Saving MSK in the geometry editor rewrites this file as a
 * self-contained block (parts inlined).
 */
export const MSK_VARIANT = {
  id: 'MSK',
  parts: [
    // Stage: the marquee floor.
    { id: 'mskFStage', shape: 'box', params: { width: 0.68, height: 0.12, depth: 0.68 }, color: 'factionBase' },
    // Posts: four slender corner poles.
    { id: 'mskFPostFL', shape: 'cylinder', params: { bottomR: 0.03, topR: 0.03, height: 0.5, segments: 6 }, transform: { y: 0.12, localPos: { x: -0.26, y: 0, z: -0.26 } }, color: 'factionBase' },
    { id: 'mskFPostFR', shape: 'cylinder', params: { bottomR: 0.03, topR: 0.03, height: 0.5, segments: 6 }, transform: { y: 0.12, localPos: { x: 0.26, y: 0, z: -0.26 } }, color: 'factionBase' },
    { id: 'mskFPostBL', shape: 'cylinder', params: { bottomR: 0.03, topR: 0.03, height: 0.5, segments: 6 }, transform: { y: 0.12, localPos: { x: -0.26, y: 0, z: 0.26 } }, color: 'factionBase' },
    { id: 'mskFPostBR', shape: 'cylinder', params: { bottomR: 0.03, topR: 0.03, height: 0.5, segments: 6 }, transform: { y: 0.12, localPos: { x: 0.26, y: 0, z: 0.26 } }, color: 'factionBase' },
    // Canopy: the dusty-rose marquee roof.
    { id: 'mskFCanopy', shape: 'box', params: { width: 0.72, height: 0.06, depth: 0.72 }, transform: { y: 0.6 }, color: 'factionAccent' },
    // Tent-top: a pyramidal crown on the canopy.
    { id: 'mskFTent', shape: 'cone', params: { bottomR: 0.3, height: 0.14, radialSegs: 4 }, transform: { y: 0.66 }, color: 'factionAccent' },
    // Mask: a bone face on the stage front.
    { id: 'mskFMask', shape: 'box', params: { width: 0.16, height: 0.14, depth: 0.05 }, transform: { y: 0.24, localPos: { x: 0, y: 0, z: 0.32 } }, color: 0xe0d8cc },
    // Poms: two jester bells on the marquee edge.
    { id: 'mskFPomL', shape: 'sphere', params: { radius: 0.035, wSegs: 6, hSegs: 4 }, transform: { y: 0.62, localPos: { x: -0.3, y: 0, z: 0 } }, color: 'factionBase' },
    { id: 'mskFPomR', shape: 'sphere', params: { radius: 0.035, wSegs: 6, hSegs: 4 }, transform: { y: 0.62, localPos: { x: 0.3, y: 0, z: 0 } }, color: 'factionBase' },
  ],
};
