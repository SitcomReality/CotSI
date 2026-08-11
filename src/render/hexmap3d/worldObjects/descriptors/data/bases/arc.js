/**
 * arc.js — Archive base variant: the Archive-Observatory.
 *
 * A stacked store of records crowned by a weathered-blue sky-dome, with four
 * glyph-dots orbiting the tier and one star-mote above the dome. The dome and
 * orbiting dots are Archive's signature. Saving ARC in the geometry editor
 * rewrites this file as a self-contained block (parts inlined).
 */
export const ARC_VARIANT = {
  id: 'ARC',
  parts: [
    // Archive plinth: the foundation.
    { id: 'arcFPlinth', shape: 'cylinder', params: { bottomR: 0.32, topR: 0.28, height: 0.12, segments: 8 }, color: 'factionBase' },
    // Record tier: the stack of stored knowledge.
    { id: 'arcFTier', shape: 'cylinder', params: { bottomR: 0.24, topR: 0.22, height: 0.3, segments: 8 }, transform: { y: 0.12 }, color: 'factionBase' },
    // Observing dome: the weathered-blue sky-dome.
    { id: 'arcFDome', shape: 'sphere', params: { radius: 0.19, wSegs: 6, hSegs: 4, phiLength: Math.PI * 2, thetaLength: Math.PI / 2 }, transform: { y: 0.42 }, color: 'factionAccent' },
    // Glyph dots: four records orbiting the tier.
    { id: 'arcFDot1', shape: 'sphere', params: { radius: 0.035, wSegs: 4, hSegs: 3 }, transform: { y: 0.24, localPos: { x: 0.32, y: 0, z: 0 } }, color: 'factionAccent' },
    { id: 'arcFDot2', shape: 'sphere', params: { radius: 0.035, wSegs: 4, hSegs: 3 }, transform: { y: 0.24, localPos: { x: 0, y: 0, z: 0.32 } }, color: 'factionAccent' },
    { id: 'arcFDot3', shape: 'sphere', params: { radius: 0.035, wSegs: 4, hSegs: 3 }, transform: { y: 0.24, localPos: { x: -0.32, y: 0, z: 0 } }, color: 'factionAccent' },
    { id: 'arcFDot4', shape: 'sphere', params: { radius: 0.035, wSegs: 4, hSegs: 3 }, transform: { y: 0.24, localPos: { x: 0, y: 0, z: -0.32 } }, color: 'factionAccent' },
    // Star-mote: one glyph drifting above the dome.
    { id: 'arcFStar', shape: 'octahedron', params: { radius: 0.045 }, transform: { y: 0.68, localPos: { x: 0.12, y: 0, z: 0.05 } }, color: 'factionAccent' },
  ],
};
