/**
 * trees.js — Descriptor data for the tree content.
 *
 * Migrated 1:1 from the tree builders (trees/):
 *   - grove     — the woods terrain decoration (clusterTreeRecords.js):
 *                 moisture-driven count, ring placement with outward lean,
 *                 per-tree size/stretch variation, round (forest) vs tall
 *                 (denseForest) canopy variants.
 *   - tree      — the solitary open-terrain tree (solitaryTreeRecords.js):
 *                 canopy variant by terrain + coord hash (treeVariant), small
 *                 offset from the hex center, fixed per-kind lean.
 *
 * Trunk part: cylinder, planted flush at the surface (no transform = bottom
 * height 0). Canopy parts carry the per-variant leaf color as an instance
 * color (the game's canopy material is white; per-tree colors arrive per
 * instance). Stretch ranges reproduce treeVariation(): trunk stretches on Y
 * only (trunkStretch, hash seed 6); canopies stretch on both axes (seeds 4/5).
 * The tall variant's trunk is shortened (trunkScale 0.8) so it stays hidden in
 * the cone's fat lower part.
 *
 * Canopy `lift` values are bottom heights (schema v3): each keeps its old
 * center height — lift = old center − shape base (round sphere r 0.3: 0.5 →
 * 0.2; tall cone h 0.72: 0.58 → 0.22; wide cone h 0.3: 0.45 → 0.3).
 *
 * Canopy part ids are unique per variant (canopy-round / canopy-tall /
 * canopy-wide) per the convention documented in data/mountains.js: the mesh
 * assembler resolves each record's part by id, so shared ids would let the
 * last variant's geometry (the cone) win for every canopy record — the round
 * grove bug this naming exists to prevent.
 *
 * NOT migrated (reported parity gap, see dev/futureWork.md):
 *   - fruitTree  — the procedural fruit tree (fruitTreeRecords.js) grows 2–3
 *                  snaking trunk segments, forked branches, and fruit, all
 *                  per-tree hash-driven — beyond the static-parts model.
 *   - painforest groves — gnarled twisted trees (gnarledTreeRecords.js).
 * Both keep their hard-coded builders until the descriptor model grows
 * procedural parts.
 */

const TRUNK_PARAMS = { bottomR: 0.08, topR: 0.1, height: 0.4, segments: 6 };

/** Trunk that stretches on Y only, from the object's trunkStretch range. */
const TRUNK_PART = {
  id: 'trunk',
  shape: 'cylinder',
  params: { ...TRUNK_PARAMS },
  stretch: { y: { min: 0.9, max: 1.2, seed: 6 }, xz: false },
};

/** Canopy stretch: object-level leaf variation on both axes (seeds 4/5). */
const CANOPY_STRETCH = {
  y: { min: 0.85, max: 1.3, seed: 4 },
  xz: { min: 0.9, max: 1.15, seed: 5 },
};

const ROUND_CANOPY = {
  id: 'canopy-round',
  shape: 'sphere',
  params: { radius: 0.3, wSegs: 6, hSegs: 4 },
  transform: { lift: 0.2 },
  stretch: CANOPY_STRETCH,
  color: 0x3cb371,
};
const TALL_CANOPY = {
  id: 'canopy-tall',
  shape: 'cone',
  params: { bottomR: 0.25, height: 0.72, radialSegs: 6, heightSegs: 2 },
  transform: { lift: 0.22 },
  stretch: CANOPY_STRETCH,
  color: 0x2e8b57,
};
const WIDE_CANOPY = {
  id: 'canopy-wide',
  shape: 'cone',
  params: { bottomR: 0.45, height: 0.3, radialSegs: 6, heightSegs: 1 },
  transform: { lift: 0.3 },
  stretch: CANOPY_STRETCH,
  color: 0x66cdaa,
};

/** The woods grove — the terrain decoration for forest/denseForest tiles. */
export const GROVE_DESCRIPTOR = {
  schemaVersion: 3,
  id: 'grove',
  kind: 'decor',
  displayName: 'Tree Grove',
  cluster: {
    rule: 'moisture',
    countsByTerrain: { forest: [3, 5], denseForest: [4, 7] },
    densityRange: [0.55, 0.85],
    jitter: 1,
  },
  size: { min: 1.3, max: 1.5 }, // TREE_VARIATION.scaleMin/Max
  variation: { colorJitter: 0.05 }, // TREE_VARIATION.colorJitter
  variantRule: 'cluster',
  placement: {
    mode: 'ring',
    ringMin: 0.18, ringMax: 0.55, // TREE_CLUSTER_RING
    leanMin: 0.045, leanMax: 0.12, // TREE_CLUSTER_LEAN
  },
  emphasis: { behavior: 'dispersed' },
  material: { color: 0x8b5e3c }, // TRUNK_COLOR
  parts: [{ ...TRUNK_PART }],
  variants: [
    { id: 'round', parts: [{ ...TRUNK_PART }, { ...ROUND_CANOPY }] },
    { id: 'tall', parts: [{ ...TRUNK_PART, transform: { scaleY: 0.8 } }, { ...TALL_CANOPY }] },
  ],
};

/** Solitary open-terrain tree — variant by terrain + coord hash (treeVariant). */
export const TREE_DESCRIPTOR = {
  schemaVersion: 3,
  id: 'tree',
  kind: 'feature',
  displayName: 'Tree',
  scale: 1.15, // TREE_SOLITARY.tree.scale
  variantRule: 'solitary',
  variation: { colorJitter: 0 },
  placement: {
    mode: 'jitter',
    offset: 0.08,
    tiltMin: 0.02, tiltMax: 0.02, // TREE_SOLITARY.tree.lean
    tiltSeed: 1,
  },
  emphasis: { behavior: 'dispersed' },
  material: { color: 0x8b5e3c },
  // Fallback when no variant id matches the terrain rule.
  parts: [{ ...TRUNK_PART, stretch: { y: false, xz: false } }],
  variants: [
    {
      id: 'round',
      parts: [
        { ...TRUNK_PART, stretch: { y: false, xz: false } },
        { ...ROUND_CANOPY, stretch: { y: { min: 1.1, max: 1.1, seed: 4 }, xz: { min: 1.05, max: 1.05, seed: 5 } } },
      ],
    },
    {
      id: 'tall',
      parts: [
        { ...TRUNK_PART, transform: { scaleY: 0.8 }, stretch: { y: false, xz: false } },
        { ...TALL_CANOPY, stretch: { y: { min: 1.1, max: 1.1, seed: 4 }, xz: { min: 1.05, max: 1.05, seed: 5 } } },
      ],
    },
    {
      id: 'wide',
      parts: [
        { ...TRUNK_PART, stretch: { y: false, xz: false } },
        { ...WIDE_CANOPY, stretch: { y: { min: 1.1, max: 1.1, seed: 4 }, xz: { min: 1.05, max: 1.05, seed: 5 } } },
      ],
    },
  ],
};
