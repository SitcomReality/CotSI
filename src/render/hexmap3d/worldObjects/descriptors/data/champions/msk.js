/**
 * msk.js — Masque champion variant: the Troubadour.
 *
 * A masked performer: theatrical tapered gown, wide bone ruff, a flat painted
 * mask with a grinning slot, and a tall jester cap with a dusty-rose bell.
 * Playful on the surface — the fixed grin makes it sinister the longer you
 * look. The mask is Masque's signature. Saving MSK in the geometry editor
 * rewrites this file as a self-contained block (parts inlined).
 */
import { PEDESTAL } from './shared.js';

export const MSK_VARIANT = {
  id: 'MSK',
  parts: [
    PEDESTAL,
    // Robe: a theatrical tapered gown.
    { id: 'mskRobe', shape: 'cone', params: { bottomR: 0.14, height: 0.44, radialSegs: 7 }, transform: { y: 0.06 }, color: 'factionBase' },
    // Ruff: a wide bone collar at the neck.
    { id: 'mskRuff', shape: 'torus', params: { radius: 0.12, tube: 0.03, radialSegs: 4, tubularSegs: 10 }, transform: { y: 0.44, localAxis: { x: 1, y: 0, z: 0 }, localAngle: Math.PI / 2 }, color: 0xe0d8cc },
    // Mask: a flat painted face.
    { id: 'mskMask', shape: 'box', params: { width: 0.13, height: 0.15, depth: 0.05 }, transform: { y: 0.46, localPos: { x: 0, y: 0, z: 0.05 } }, color: 0xe0d8cc },
    // Grin: the dark smile slot on the mask.
    { id: 'mskGrin', shape: 'box', params: { width: 0.07, height: 0.025, depth: 0.03 }, transform: { y: 0.55, localPos: { x: 0, y: 0, z: 0.06 } }, color: 0x1c1624 },
    // Cap: a tall jester cap leaning back.
    { id: 'mskCap', shape: 'cone', params: { bottomR: 0.09, height: 0.2, radialSegs: 5 }, transform: { y: 0.58, tiltAxis: { x: -0.7, z: 0.2 }, tilt: 0.22 }, color: 'factionAccent' },
    // Pom: a dusty-rose bell near the cap tip.
    { id: 'mskPom', shape: 'sphere', params: { radius: 0.035, wSegs: 6, hSegs: 4 }, transform: { y: 0.74, localPos: { x: -0.1, y: 0, z: 0.03 } }, color: 'factionAccent' },
  ],
};
