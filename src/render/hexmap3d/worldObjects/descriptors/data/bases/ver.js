/**
 * ver.js — Verdant base variant: the Grove-Citadel.
 *
 * A living grove: mossy earthen mound, thick bark trunk, broad moss canopy
 * with an olive spire through the leaves, and two leaning menhirs at the
 * mound's edge. The canopy and menhirs read clearly from above. Saving VER in
 * the geometry editor rewrites this file as a self-contained block (parts
 * inlined).
 */
export const VER_VARIANT = {
  id: 'VER',
  parts: [
    // Moss mound: the grove's earthen base.
    { id: 'verFMound', shape: 'spheroid', params: { radius: 0.34, wSegs: 6, hSegs: 4 }, transform: { scaleY: 0.22 }, color: 'factionBase' },
    // Trunk: the thick living trunk.
    { id: 'verFTrunk', shape: 'cylinder', params: { bottomR: 0.15, topR: 0.09, height: 0.38, segments: 6 }, transform: { y: 0.1 }, color: 0x4a3528 },
    // Canopy: the broad moss crown.
    { id: 'verFCrown', shape: 'spheroid', params: { radius: 0.28, wSegs: 6, hSegs: 4 }, transform: { y: 0.42, scaleY: 0.6 }, color: 'factionBase' },
    // Crown-tip: an olive spire through the leaves.
    { id: 'verFTip', shape: 'cone', params: { bottomR: 0.14, height: 0.24, radialSegs: 5 }, transform: { y: 0.54 }, color: 'factionAccent' },
    // Menhirs: two leaning standing stones.
    { id: 'verFMenhirL', shape: 'box', params: { width: 0.08, height: 0.34, depth: 0.08 }, transform: { y: 0.1, localPos: { x: -0.3, y: 0, z: 0.12 }, tiltAxis: { x: -0.4, z: 0.9 }, tilt: 0.16 }, color: 0x7a7268 },
    { id: 'verFMenhirR', shape: 'box', params: { width: 0.08, height: 0.34, depth: 0.08 }, transform: { y: 0.1, localPos: { x: 0.3, y: 0, z: 0.12 }, tiltAxis: { x: 0.4, z: 0.9 }, tilt: 0.16 }, color: 0x7a7268 },
  ],
};
