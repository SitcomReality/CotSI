/**
 * champions.js — Descriptor data for champion units.
 *
 * Migrated from unitMeshes.js: the champion is a cylinder body + sphere head.
 * The body is faction-colored (the 'factionBase' token, resolved from the
 * champion's faction palette); the head is a fixed skin tone (part
 * materialColor 0xffe8c8 — a material color, not an instance color, exactly
 * like the old CHAMPION_HEAD_MAT).
 *
 * Vertical offsets are bottom heights (schema v3): no transform = flush on the
 * ground. The body sits flush; the head and accents keep their old center
 * positions (y = old center height − shape base).
 *
 * Per the design brief, each faction gets a SLIGHT variation on the same body
 * — a small head accent in the faction accent color ('factionAccent'), the
 * same idea as the base decorations. The accents below are minimal placeholders
 * (one small part per faction); they are ordinary descriptor parts, so anyone
 * can author richer faction looks in the geometry editor.
 *
 * Variant ids are the faction shorts (CRU / REV / VER / ARC / HRT / MSK / HOL).
 * Values are JSON-safe (colors as tokens / integers, angles in radians,
 * lengths in world units where hex radius = 1.0).
 */

const BODY = {
  id: 'body',
  shape: 'cylinder',
  params: { bottomR: 0.08, topR: 0.12, height: 0.5, segments: 8 },
  color: 'factionBase',
};
const HEAD = {
  id: 'head',
  shape: 'sphere',
  params: { radius: 0.1, wSegs: 8, hSegs: 6 },
  transform: { y: 0.35 },
  materialColor: 0xffe8c8,
};

/** One small accent part per faction, sitting on/around the head. */
const ACCENTS = {
  CRU: [{ id: 'spikeTop', shape: 'cone', params: { bottomR: 0.03, height: 0.06, radialSegs: 4, heightSegs: 1 }, transform: { y: 0.55 }, color: 'factionAccent' }],
  REV: [{ id: 'halo', shape: 'torus', params: { radius: 0.11, tube: 0.015, radialSegs: 4, tubularSegs: 8 }, transform: { y: 0.435, localAxis: { x: 1, y: 0, z: 0 }, localAngle: Math.PI / 2 }, color: 'factionAccent' }],
  VER: [{ id: 'leaf', shape: 'cone', params: { bottomR: 0.03, height: 0.05, radialSegs: 4, heightSegs: 1 }, transform: { y: 0.525, tiltAxis: { x: 1, z: 0 }, tilt: 0.5 }, color: 'factionAccent' }],
  ARC: [{ id: 'orb', shape: 'sphere', params: { radius: 0.035, wSegs: 6, hSegs: 4 }, transform: { y: 0.545 }, color: 'factionAccent' }],
  HRT: [{ id: 'cap', shape: 'sphere', params: { radius: 0.05, wSegs: 6, hSegs: 4, phiStart: 0, phiLength: Math.PI, thetaStart: 0, thetaLength: Math.PI / 2 }, transform: { y: 0.57 }, color: 'factionAccent' }],
  MSK: [{ id: 'gem', shape: 'dodecahedron', params: { radius: 0.035, detail: 0 }, transform: { y: 0.545 }, color: 'factionAccent' }],
  HOL: [{ id: 'pendant', shape: 'cone', params: { bottomR: 0.03, height: 0.05, radialSegs: 4, heightSegs: 1 }, transform: { y: 0.355, localAxis: { x: 1, y: 0, z: 0 }, localAngle: Math.PI }, color: 'factionAccent' }],
};

/** Every faction variant: same body + head, slight accent variation. */
export const CHAMPION_VARIANTS = Object.fromEntries(
  Object.entries(ACCENTS).map(([id, accent]) => [id, [BODY, HEAD, ...accent]]),
);

/** The champion descriptor — top-level parts are the CRU fallback. */
export const CHAMPION_DESCRIPTOR = {
  schemaVersion: 3,
  id: 'champion',
  kind: 'champion',
  displayName: 'Champion',
  variantRule: 'faction',
  material: { color: 0xffffff },
  parts: CHAMPION_VARIANTS.CRU,
  variants: Object.entries(CHAMPION_VARIANTS).map(([id, parts]) => ({ id, parts })),
};
