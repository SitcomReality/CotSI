/**
 * hol.js — Hollow base variant: the Hollow-Bastion.
 *
 * Two dark towers joined by a lintel above a gap of absolute dark — a shell
 * whose core is missing. A cool-steel ring floats over the bastion and
 * shards drift at its edges. The hollow arch and the ring are Hollow's
 * signature. Saving HOL in the geometry editor rewrites this file as a
 * self-contained block (parts inlined).
 */
export const HOL_VARIANT = {
  id: 'HOL',
  parts: [
    // Shattered plinth: the foundation.
    { id: 'holFPlinth', shape: 'box', params: { width: 0.7, height: 0.1, depth: 0.7 }, color: 'factionBase' },
    // Twin towers: two dark spires with the void between.
    { id: 'holFTowerL', shape: 'box', params: { width: 0.22, height: 0.42, depth: 0.26 }, transform: { y: 0.1, localPos: { x: -0.16, y: 0, z: 0 } }, color: 'factionBase' },
    { id: 'holFTowerR', shape: 'box', params: { width: 0.22, height: 0.42, depth: 0.26 }, transform: { y: 0.1, localPos: { x: 0.16, y: 0, z: 0 } }, color: 'factionBase' },
    // Lintel: the arch joining the towers above the void.
    { id: 'holFLintel', shape: 'box', params: { width: 0.22, height: 0.07, depth: 0.3 }, transform: { y: 0.46 }, color: 0x2a2628 },
    // Void: the abyss core of the arch.
    { id: 'holFVoid', shape: 'sphere', params: { radius: 0.1, wSegs: 6, hSegs: 4 }, transform: { y: 0.28, localPos: { x: 0, y: 0, z: 0.04 } }, color: 0x0c0e12 },
    // Ring: a cool-steel ring floating above the bastion.
    { id: 'holFRing', shape: 'torus', params: { radius: 0.2, tube: 0.02, radialSegs: 4, tubularSegs: 10 }, transform: { y: 0.62, localAxis: { x: 1, y: 0, z: 0 }, localAngle: 1.05 }, color: 'factionAccent' },
    // Shards: drifting fragments at the bastion's edges.
    { id: 'holFShardL', shape: 'octahedron', params: { radius: 0.05 }, transform: { y: 0.36, localPos: { x: -0.32, y: 0, z: 0.12 } }, color: 'factionAccent' },
    { id: 'holFShardR', shape: 'octahedron', params: { radius: 0.04 }, transform: { y: 0.5, localPos: { x: 0.32, y: 0, z: -0.08 } }, color: 'factionAccent' },
  ],
};
