/**
 * cru.js — Crucible champion variant: the Forge Juggernaut.
 *
 * A broad, grounded smith-warrior: slab-box torso, horned iron helm, heavy
 * pauldrons and a leaning warhammer. Rust-embers glow on the shoulders —
 * Scarshield's fires. Wide silhouette reads clearly from the top-down camera.
 * Saving CRU in the geometry editor rewrites this file as a self-contained
 * block (parts inlined); this committed form composes from champions/shared.js.
 */
import { PEDESTAL } from './shared.js';

export const CRU_VARIANT = {
  id: 'CRU',
  parts: [
    PEDESTAL,
    // Legs: a squat slab so the juggernaut reads wide and planted.
    { id: 'cruLegs', shape: 'box', params: { width: 0.24, height: 0.08, depth: 0.2 }, transform: { y: 0.06 }, color: 'factionBase' },
    // Torso: the broad forge-block chest.
    { id: 'cruTorso', shape: 'box', params: { width: 0.3, height: 0.2, depth: 0.24 }, transform: { y: 0.14 }, color: 'factionBase' },
    // Pauldrons: heavy slab shoulders — the silhouette's width.
    { id: 'cruPauldronL', shape: 'box', params: { width: 0.1, height: 0.09, depth: 0.15 }, transform: { y: 0.3, localPos: { x: -0.19, y: 0, z: 0 } }, color: 'factionBase' },
    { id: 'cruPauldronR', shape: 'box', params: { width: 0.1, height: 0.09, depth: 0.15 }, transform: { y: 0.3, localPos: { x: 0.19, y: 0, z: 0 } }, color: 'factionBase' },
    // Helm: a blocky iron helm.
    { id: 'cruHelm', shape: 'cube', params: { size: 0.16 }, transform: { y: 0.32 }, color: 0x2a2628 },
    // Horns: rust-iron horns leaning out from the helm.
    { id: 'cruHornL', shape: 'cone', params: { bottomR: 0.03, height: 0.18, radialSegs: 4 }, transform: { y: 0.42, localPos: { x: -0.09, y: 0, z: 0 }, tiltAxis: { x: -1, z: 0 }, tilt: 0.5 }, color: 'factionAccent' },
    { id: 'cruHornR', shape: 'cone', params: { bottomR: 0.03, height: 0.18, radialSegs: 4 }, transform: { y: 0.42, localPos: { x: 0.09, y: 0, z: 0 }, tiltAxis: { x: 1, z: 0 }, tilt: 0.5 }, color: 'factionAccent' },
    // Warhammer: shaft and head braced at the side.
    { id: 'cruShaft', shape: 'cylinder', params: { bottomR: 0.025, topR: 0.025, height: 0.42, segments: 6 }, transform: { y: 0.08, localPos: { x: 0.22, y: 0, z: 0.08 } }, color: 0x2a2628 },
    { id: 'cruHammerHead', shape: 'box', params: { width: 0.14, height: 0.12, depth: 0.2 }, transform: { y: 0.46, localPos: { x: 0.22, y: 0, z: 0.08 } }, color: 'factionAccent' },
    // Embers: glowing rust sparks hovering over the pauldrons.
    { id: 'cruEmberL', shape: 'octahedron', params: { radius: 0.035 }, transform: { y: 0.42, localPos: { x: -0.19, y: 0, z: 0 } }, color: 0xe87a6a },
    { id: 'cruEmberR', shape: 'octahedron', params: { radius: 0.035 }, transform: { y: 0.42, localPos: { x: 0.19, y: 0, z: 0 } }, color: 0xe87a6a },
  ],
};
