/**
 * hrt.js — Hearth champion variant: the Lanternkeeper.
 *
 * A warm, rotund hearth-keeper: bell skirt, round belly, soft conical cap with
 * a gold band, and a pole lantern spilling warm light at his side. Round and
 * welcoming on the surface — a friendly keeper of the communal fire. The
 * lantern is Hearth's signature. Saving HRT in the geometry editor rewrites
 * this file as a self-contained block (parts inlined).
 */
import { PEDESTAL } from './shared.js';

export const HRT_VARIANT = {
  id: 'HRT',
  parts: [
    PEDESTAL,
    // Skirt: a warm bell of a robe.
    { id: 'hrtSkirt', shape: 'cone', params: { bottomR: 0.15, height: 0.2, radialSegs: 7 }, transform: { y: 0.06 }, color: 'factionBase' },
    // Belly: the rotund keeper's paunch.
    { id: 'hrtBelly', shape: 'spheroid', params: { radius: 0.14, wSegs: 6, hSegs: 4 }, transform: { y: 0.24, scaleY: 1.05 }, color: 'factionBase' },
    // Head: round and friendly.
    { id: 'hrtHead', shape: 'sphere', params: { radius: 0.08, wSegs: 6, hSegs: 4 }, transform: { y: 0.39 }, color: 'factionBase' },
    // Cap: a soft conical hat.
    { id: 'hrtCap', shape: 'cone', params: { bottomR: 0.11, height: 0.14, radialSegs: 6 }, transform: { y: 0.5 }, color: 'factionBase' },
    // Band: the tarnished-gold ring around the hat.
    { id: 'hrtBand', shape: 'torus', params: { radius: 0.085, tube: 0.02, radialSegs: 4, tubularSegs: 8 }, transform: { y: 0.53, localAxis: { x: 1, y: 0, z: 0 }, localAngle: Math.PI / 2 }, color: 'factionAccent' },
    // Lantern: pole, housing and the warm flame within.
    { id: 'hrtPole', shape: 'cylinder', params: { bottomR: 0.02, topR: 0.02, height: 0.5, segments: 5 }, transform: { y: 0.08, localPos: { x: -0.2, y: 0, z: 0.08 } }, color: 0x2a2628 },
    { id: 'hrtLantern', shape: 'box', params: { width: 0.1, height: 0.13, depth: 0.1 }, transform: { y: 0.55, localPos: { x: -0.2, y: 0, z: 0.08 } }, color: 'factionAccent' },
    { id: 'hrtFlame', shape: 'sphere', params: { radius: 0.035, wSegs: 6, hSegs: 4 }, transform: { y: 0.59, localPos: { x: -0.2, y: 0, z: 0.08 } }, color: 0xd9a94e },
  ],
};
