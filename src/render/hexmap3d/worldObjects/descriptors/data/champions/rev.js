/**
 * rev.js — Reverie champion variant: the Dreammote.
 *
 * A hooded dream-weaver: violet robe, deep cowl with a dark faceless void,
 * violet motes orbiting the hood and a crescent of dream-light floating
 * above. The orbiting orbs are Reverie's signature — a piece in motion even
 * at rest. Saving REV in the geometry editor rewrites this file as a
 * self-contained block (parts inlined).
 */
import { PEDESTAL } from './shared.js';

export const REV_VARIANT = {
  id: 'REV',
  parts: [
    PEDESTAL,
    // Robe: a long violet cone tapering to the ground.
    { id: 'revRobe', shape: 'cone', params: { bottomR: 0.15, height: 0.42, radialSegs: 6 }, transform: { y: 0.06 }, color: 'factionBase' },
    // Hood: a deep cowl.
    { id: 'revHood', shape: 'cone', params: { bottomR: 0.1, height: 0.2, radialSegs: 5 }, transform: { y: 0.42 }, color: 'factionBase' },
    // Face: the dark void behind the hood.
    { id: 'revFace', shape: 'sphere', params: { radius: 0.05, wSegs: 6, hSegs: 4 }, transform: { y: 0.48, localPos: { x: 0, y: 0, z: 0.06 } }, color: 0x1c1624 },
    // Dream-orbs: violet motes orbiting the hood at different heights.
    { id: 'revOrb1', shape: 'octahedron', params: { radius: 0.035 }, transform: { y: 0.56, localPos: { x: -0.15, y: 0, z: 0.08 } }, color: 'factionAccent' },
    { id: 'revOrb2', shape: 'octahedron', params: { radius: 0.03 }, transform: { y: 0.62, localPos: { x: 0.13, y: 0, z: -0.1 } }, color: 'factionAccent' },
    { id: 'revOrb3', shape: 'octahedron', params: { radius: 0.025 }, transform: { y: 0.52, localPos: { x: 0.08, y: 0, z: 0.14 } }, color: 'factionAccent' },
    // Crescent: a half-ring of dream-light above the hood.
    { id: 'revCrescent', shape: 'torus', params: { radius: 0.09, tube: 0.02, radialSegs: 4, tubularSegs: 8, arc: Math.PI * 1.25 }, transform: { y: 0.66, localAxis: { x: 1, y: 0, z: 0 }, localAngle: 1.1 }, color: 'factionAccent' },
  ],
};
