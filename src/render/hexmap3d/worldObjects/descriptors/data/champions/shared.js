/**
 * shared.js — Shared building blocks for the per-faction champion variants.
 *
 * Every champion is the same cylinder body (faction-colored via the
 * 'factionBase' token) + sphere head (fixed skin tone 0xffe8c8) plus one
 * small accent part in the faction accent color. The BODY / HEAD parts and
 * the per-faction ACCENTS map live here; each faction file in this directory
 * (data/champions/<faction>.js) imports what it needs and exports its
 * <FACTION>_VARIANT block; data/champion.js composes the barrel.
 *
 * Generated caveat: saving a faction in the geometry editor rewrites that
 * faction's file with a SELF-CONTAINED variant block (parts inlined — the
 * editor emits plain JSON, no imports). These helpers stay the canonical
 * hand-authoring source for any faction not yet re-saved.
 *
 * Values are JSON-safe (colors as tokens / integers, angles in radians,
 * lengths in world units where hex radius = 1.0).
 */

export const BODY = {
  id: 'body',
  shape: 'cylinder',
  params: { bottomR: 0.08, topR: 0.12, height: 0.5, segments: 8 },
  color: 'factionBase',
};
export const HEAD = {
  id: 'head',
  shape: 'sphere',
  params: { radius: 0.1, wSegs: 8, hSegs: 6 },
  transform: { y: 0.35 },
  color: 0xffe8c8, // skin tone — was the v3 materialColor (CHAMPION_HEAD_MAT)
};

/** One small accent part per faction, sitting on/around the head. */
export const ACCENTS = {
  CRU: [{ id: 'spikeTop', shape: 'cone', params: { bottomR: 0.03, height: 0.06, radialSegs: 4, heightSegs: 1 }, transform: { y: 0.55 }, color: 'factionAccent' }],
  REV: [{ id: 'halo', shape: 'torus', params: { radius: 0.11, tube: 0.015, radialSegs: 4, tubularSegs: 8 }, transform: { y: 0.435, localAxis: { x: 1, y: 0, z: 0 }, localAngle: Math.PI / 2 }, color: 'factionAccent' }],
  VER: [{ id: 'leaf', shape: 'cone', params: { bottomR: 0.03, height: 0.05, radialSegs: 4, heightSegs: 1 }, transform: { y: 0.525, tiltAxis: { x: 1, z: 0 }, tilt: 0.5 }, color: 'factionAccent' }],
  ARC: [{ id: 'orb', shape: 'sphere', params: { radius: 0.035, wSegs: 6, hSegs: 4 }, transform: { y: 0.545 }, color: 'factionAccent' }],
  HRT: [{ id: 'cap', shape: 'sphere', params: { radius: 0.05, wSegs: 6, hSegs: 4, phiStart: 0, phiLength: Math.PI, thetaStart: 0, thetaLength: Math.PI / 2 }, transform: { y: 0.57 }, color: 'factionAccent' }],
  MSK: [{ id: 'gem', shape: 'dodecahedron', params: { radius: 0.035, detail: 0 }, transform: { y: 0.545 }, color: 'factionAccent' }],
  HOL: [{ id: 'pendant', shape: 'cone', params: { bottomR: 0.03, height: 0.05, radialSegs: 4, heightSegs: 1 }, transform: { y: 0.355, localAxis: { x: 1, y: 0, z: 0 }, localAngle: Math.PI }, color: 'factionAccent' }],
};
