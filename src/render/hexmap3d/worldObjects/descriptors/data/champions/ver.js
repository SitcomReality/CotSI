/**
 * ver.js — Verdant champion variant: the Barkwarden.
 *
 * A living stag-warden: root-like moss skirt, bark trunk-torso, squashed moss
 * mantle, a bone stag mask, sweeping antler tines and one fresh olive sprout
 * at the crown. The antler silhouette is Verdant's signature. Saving VER in
 * the geometry editor rewrites this file as a self-contained block (parts
 * inlined).
 */
import { PEDESTAL } from './shared.js';

export const VER_VARIANT = {
  id: 'VER',
  parts: [
    PEDESTAL,
    // Root-skirt: a squat moss cone like spread roots.
    { id: 'verSkirt', shape: 'cone', params: { bottomR: 0.15, height: 0.16, radialSegs: 5 }, transform: { y: 0.06 }, color: 'factionBase' },
    // Trunk-torso: a thick bark column.
    { id: 'verTorso', shape: 'cylinder', params: { bottomR: 0.08, topR: 0.11, height: 0.22, segments: 6 }, transform: { y: 0.22 }, color: 0x4a3528 },
    // Moss mantle: squashed shoulders.
    { id: 'verMantle', shape: 'spheroid', params: { radius: 0.13, wSegs: 6, hSegs: 4 }, transform: { y: 0.36, scaleY: 0.7 }, color: 'factionBase' },
    // Stag mask: a bone snout leaning forward.
    { id: 'verMask', shape: 'cone', params: { bottomR: 0.06, height: 0.16, radialSegs: 4 }, transform: { y: 0.44, localAxis: { x: 1, y: 0, z: 0 }, localAngle: 0.28 }, color: 0xe0d8cc },
    // Antlers: bone tines sweeping up and out from the crown.
    { id: 'verAntlerL', shape: 'cone', params: { bottomR: 0.025, height: 0.3, radialSegs: 3 }, transform: { y: 0.52, localPos: { x: -0.09, y: 0, z: 0 }, tiltAxis: { x: -0.7, z: -0.3 }, tilt: 0.55 }, color: 0xe0d8cc },
    { id: 'verAntlerR', shape: 'cone', params: { bottomR: 0.025, height: 0.3, radialSegs: 3 }, transform: { y: 0.52, localPos: { x: 0.09, y: 0, z: 0 }, tiltAxis: { x: 0.7, z: -0.3 }, tilt: 0.55 }, color: 0xe0d8cc },
    // Leaf: a fresh olive sprout at the crown.
    { id: 'verLeaf', shape: 'cone', params: { bottomR: 0.03, height: 0.07, radialSegs: 4 }, transform: { y: 0.58, tiltAxis: { x: 0.6, z: 0.5 }, tilt: 0.7 }, color: 'factionAccent' },
  ],
};
