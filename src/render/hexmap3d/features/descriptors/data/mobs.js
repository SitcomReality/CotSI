/**
 * mobs.js — Descriptor data for mob units.
 *
 * Migrated from unitGeometries.js: the seven archetype shapes designed there
 * (bear, leopard, snail, tapir, mushroom, goose, scorpion — the MOB_* params)
 * become the baseline 3D bodies, authored here as data so the geometry editor
 * can restyle any mob type. Before this migration those geometries were never
 * wired into a renderer — mobs rendered as flat "coin" pieces — so the 3D
 * bodies are the first real per-archetype look, with the existing icon cap
 * (pieceIcons.js) riding on top until it is replaced by full 3D geometry.
 *
 * Variant ids are the archetype shape keys ('bear', 'goose', ...), matching
 * the mob's `archetypeName` field via variantRule 'archetype'. Tier-2 mobs —
 * the elder bear and the scorpion queen — are distinct variants with a small
 * accent part; they share their base variant's body shape (the game only
 * differentiates them by tier + scale), but the body part ids differ per
 * variant so the editor can author genuinely different geometry without
 * colliding in meshAssembly's part grouping.
 *
 * Colors resolve through the entity palette: the body uses the 'factionBody'
 * token (the faction base color darkened by MOB_COLOR_DARKEN — the old
 * piece-body tint), accents use 'factionAccent'. The tier-2 accent parts are
 * minimal placeholders, ordinary descriptor parts anyone can restyle.
 *
 * Values are JSON-safe (colors as tokens, angles in radians, lengths in world
 * units where hex radius = 1.0).
 */

const BODY_COLOR = 'factionBody';
const ACCENT_COLOR = 'factionAccent';

// ── The seven archetype bodies (baseline) ────────────────────────────────────
// Each body part id is unique to its variant so variant-specific geometry can
// diverge without meshAssembly merging two shapes under one part id.
// Bodies have no transform — y = 0 bottom height, sitting flush on the ground.

const DEFAULT_BODY = {
  id: 'defaultBody',
  shape: 'cylinder',
  params: { bottomR: 0.1, topR: 0.14, height: 0.4, segments: 8 },
  color: BODY_COLOR,
};

const BEAR_BODY = {
  id: 'bearBody',
  shape: 'cylinder',
  params: { bottomR: 0.16, topR: 0.18, height: 0.28, segments: 6 },
  color: BODY_COLOR,
};

const LEOPARD_BODY = {
  id: 'leopardBody',
  shape: 'cylinder',
  params: { bottomR: 0.07, topR: 0.1, height: 0.5, segments: 6 },
  color: BODY_COLOR,
};

const SNAIL_BODY = {
  id: 'snailBody',
  shape: 'sphere',
  params: {
    radius: 0.16, wSegs: 8, hSegs: 6,
    phiStart: 0, phiLength: Math.PI, thetaStart: 0, thetaLength: Math.PI * 0.55,
  },
  color: BODY_COLOR,
};

const TAPIR_BODY = {
  id: 'tapirBody',
  shape: 'cylinder',
  params: { bottomR: 0.08, topR: 0.18, height: 0.42, segments: 7 },
  color: BODY_COLOR,
};

const MUSHROOM_BODY = {
  id: 'mushroomBody',
  shape: 'cone',
  params: { bottomR: 0.2, height: 0.14, radialSegs: 8, heightSegs: 1 },
  color: BODY_COLOR,
};

const GOOSE_BODY = {
  id: 'gooseBody',
  shape: 'cone',
  params: { bottomR: 0.07, height: 0.5, radialSegs: 4, heightSegs: 1 },
  color: BODY_COLOR,
};

const SCORPION_BODY = {
  id: 'scorpionBody',
  shape: 'octahedron',
  params: { radius: 0.14, detail: 0 },
  color: BODY_COLOR,
};

// ── Tier-2 variants (same body shape, plus a small accent marker) ────────────

const BEAR_ELDER_BODY = {
  id: 'bearElderBody',
  shape: 'cylinder',
  params: { bottomR: 0.16, topR: 0.18, height: 0.28, segments: 6 },
  color: BODY_COLOR,
};

const ELDER_CROWN = {
  id: 'elderCrown',
  shape: 'cone',
  params: { bottomR: 0.03, height: 0.05, radialSegs: 4, heightSegs: 1 },
  transform: { y: 0.275 },
  color: ACCENT_COLOR,
};

const SCORPION_QUEEN_BODY = {
  id: 'scorpionQueenBody',
  shape: 'octahedron',
  params: { radius: 0.14, detail: 0 },
  color: BODY_COLOR,
};

const QUEEN_GEM = {
  id: 'queenGem',
  shape: 'sphere',
  params: { radius: 0.04, wSegs: 6, hSegs: 4 },
  transform: { y: 0.26 },
  color: ACCENT_COLOR,
};

/** Every mob variant. Variant id === the archetype shape key. */
export const MOB_VARIANTS = {
  default: [DEFAULT_BODY],
  bear: [BEAR_BODY],
  'bear-elder': [BEAR_ELDER_BODY, ELDER_CROWN],
  leopard: [LEOPARD_BODY],
  snail: [SNAIL_BODY],
  tapir: [TAPIR_BODY],
  mushroom: [MUSHROOM_BODY],
  goose: [GOOSE_BODY],
  scorpion: [SCORPION_BODY],
  'scorpion-queen': [SCORPION_QUEEN_BODY, QUEEN_GEM],
};

/**
 * Tier-2 shape → variant id mapping. The game's mob state only carries the
 * archetype shape + tier (entityFactory.js), so unitMeshes uses this to select
 * the elder/queen variant when `mob.tier > 1`. Shapes without a tier-2 entry
 * keep their baseline variant (still scaled by the mob's visualScale).
 */
export const MOB_TIER2_VARIANTS = Object.freeze({
  bear: 'bear-elder',
  scorpion: 'scorpion-queen',
});

/** The mob descriptor — top-level parts are the unknown-shape fallback. */
export const MOB_DESCRIPTOR = {
  schemaVersion: 4,
  id: 'mob',
  kind: 'mob',
  displayName: 'Mob',
  variantRule: 'archetype',
  parts: MOB_VARIANTS.default,
  variants: Object.entries(MOB_VARIANTS).map(([id, parts]) => ({ id, parts })),
};
