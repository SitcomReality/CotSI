/**
 * cru.js — Crucible base variant: the Forge-Citadel.
 *
 * A squat iron forge-fortress: iron plinth, broad forge-block keep, four
 * crenellated corner towers, a dark gate arch, a soot-black smokestack and a
 * floating rust ember above it. Low and wide — the foundry of the realm.
 * Saving CRU in the geometry editor rewrites this file as a self-contained
 * block (parts inlined).
 */
export const CRU_VARIANT = {
  id: 'CRU',
  parts: [
    // Iron plinth: the forge floor.
    { id: 'cruFPlinth', shape: 'box', params: { width: 0.72, height: 0.1, depth: 0.72 }, color: 0x2a2628 },
    // Keep: the squat forge-block.
    { id: 'cruFKeep', shape: 'box', params: { width: 0.44, height: 0.26, depth: 0.44 }, transform: { y: 0.1 }, color: 'factionBase' },
    // Corner towers: crenellated bastions.
    { id: 'cruFTowerFL', shape: 'cube', params: { size: 0.16 }, transform: { y: 0.1, localPos: { x: -0.27, y: 0, z: -0.27 } }, color: 'factionBase' },
    { id: 'cruFTowerFR', shape: 'cube', params: { size: 0.16 }, transform: { y: 0.1, localPos: { x: 0.27, y: 0, z: -0.27 } }, color: 'factionBase' },
    { id: 'cruFTowerBL', shape: 'cube', params: { size: 0.16 }, transform: { y: 0.1, localPos: { x: -0.27, y: 0, z: 0.27 } }, color: 'factionBase' },
    { id: 'cruFTowerBR', shape: 'cube', params: { size: 0.16 }, transform: { y: 0.1, localPos: { x: 0.27, y: 0, z: 0.27 } }, color: 'factionBase' },
    // Gate: a dark entry arch on the front face.
    { id: 'cruFGate', shape: 'box', params: { width: 0.16, height: 0.2, depth: 0.06 }, transform: { y: 0.1, localPos: { x: 0, y: 0, z: 0.25 } }, color: 0x0c0e12 },
    // Chimney: a soot-black smokestack.
    { id: 'cruFChimney', shape: 'cylinder', params: { bottomR: 0.07, topR: 0.05, height: 0.38, segments: 6 }, transform: { y: 0.26, localPos: { x: 0, y: 0, z: 0.02 } }, color: 0x2a2628 },
    // Ember: a floating rust spark above the chimney.
    { id: 'cruFEmber', shape: 'octahedron', params: { radius: 0.05 }, transform: { y: 0.66, localPos: { x: 0, y: 0, z: 0.02 } }, color: 'factionAccent' },
  ],
};
