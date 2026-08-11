/**
 * hol.js — Hollow champion variant: the Voidwrought.
 *
 * A hollow spire of a body: tall charcoal shell, a gap of absolute dark
 * showing through its open front, a cool-steel ring orbiting the upper shell,
 * and broken shell fragments drifting around it. A thing defined by what it
 * no longer contains — Vaunted Nothing made miniature. The floating ring is
 * Hollow's signature. Saving HOL in the geometry editor rewrites this file as
 * a self-contained block (parts inlined).
 */
import { PEDESTAL } from './shared.js';

export const HOL_VARIANT = {
  id: 'HOL',
  parts: [
    PEDESTAL,
    // Shell: a tall hollow spire of a body.
    { id: 'holShell', shape: 'cone', params: { bottomR: 0.13, height: 0.5, radialSegs: 5 }, transform: { y: 0.06 }, color: 'factionBase' },
    // Void: the abyss showing through the shell's open front.
    { id: 'holVoid', shape: 'sphere', params: { radius: 0.06, wSegs: 6, hSegs: 4 }, transform: { y: 0.34, localPos: { x: 0, y: 0, z: 0.05 } }, color: 0x0c0e12 },
    // Ring: a cool-steel ring orbiting the upper shell.
    { id: 'holRing', shape: 'torus', params: { radius: 0.13, tube: 0.018, radialSegs: 4, tubularSegs: 10 }, transform: { y: 0.5, localAxis: { x: 1, y: 0, z: 0 }, localAngle: 1.05 }, color: 'factionAccent' },
    // Shards: broken shell fragments drifting around.
    { id: 'holShardL', shape: 'octahedron', params: { radius: 0.05 }, transform: { y: 0.42, localPos: { x: -0.19, y: 0, z: 0.05 } }, color: 'factionAccent' },
    { id: 'holShardR', shape: 'octahedron', params: { radius: 0.04 }, transform: { y: 0.52, localPos: { x: 0.18, y: 0, z: -0.04 } }, color: 'factionAccent' },
    { id: 'holShardS', shape: 'octahedron', params: { radius: 0.03 }, transform: { y: 0.3, localPos: { x: -0.14, y: 0, z: 0.14 } }, color: 'factionAccent' },
  ],
};
