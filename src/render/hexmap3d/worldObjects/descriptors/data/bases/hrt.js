/**
 * hrt.js — Hearth base variant: the Hearth-Hall.
 *
 * A round welcoming keep under a great tarnished-gold roof: dark entry door
 * with warm hearth-light spilling out, and two lanterns at the hall front.
 * The golden roof and the hearth-glow are Hearth's signature. Saving HRT in
 * the geometry editor rewrites this file as a self-contained block (parts
 * inlined).
 */
export const HRT_VARIANT = {
  id: 'HRT',
  parts: [
    // Hearth plinth: the foundation.
    { id: 'hrtFPlinth', shape: 'cylinder', params: { bottomR: 0.34, topR: 0.32, height: 0.1, segments: 8 }, color: 'factionBase' },
    // Hall: the round welcoming keep.
    { id: 'hrtFHall', shape: 'cylinder', params: { bottomR: 0.25, topR: 0.27, height: 0.3, segments: 8 }, transform: { y: 0.1 }, color: 'factionBase' },
    // Roof: the great tarnished-gold cone.
    { id: 'hrtFRoof', shape: 'cone', params: { bottomR: 0.31, height: 0.28, radialSegs: 8 }, transform: { y: 0.4 }, color: 'factionAccent' },
    // Door: the dark entry.
    { id: 'hrtFDoor', shape: 'box', params: { width: 0.15, height: 0.2, depth: 0.05 }, transform: { y: 0.1, localPos: { x: 0, y: 0, z: 0.29 } }, color: 0x0c0e12 },
    // Hearth-glow: warm light spilling from the door.
    { id: 'hrtFHearth', shape: 'sphere', params: { radius: 0.05, wSegs: 6, hSegs: 4 }, transform: { y: 0.18, localPos: { x: 0, y: 0, z: 0.36 } }, color: 0xd9a94e },
    // Lanterns: two warm lights at the hall front.
    { id: 'hrtFLanternL', shape: 'sphere', params: { radius: 0.03, wSegs: 6, hSegs: 4 }, transform: { y: 0.22, localPos: { x: -0.21, y: 0, z: 0.3 } }, color: 0xd9a94e },
    { id: 'hrtFLanternR', shape: 'sphere', params: { radius: 0.03, wSegs: 6, hSegs: 4 }, transform: { y: 0.22, localPos: { x: 0.21, y: 0, z: 0.3 } }, color: 0xd9a94e },
  ],
};
