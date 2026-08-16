/**
 * biomeColorDefaults.js — Global default biome color swatches.
 *
 * Every biome's `colors` block is a set of material-class swatches used to
 * tint decor parts per-hex (see biomeTint.js). Two kinds of swatch exist:
 *
 *   Identity swatches — `foliage`, `bloom`, `exotic` — carry a biome's
 *   signature palette and must be authored per biome (enforced by the
 *   archetype tests). `foliage` is the plant-life color (leaves, grass,
 *   scrub, moss), `bloom` the natural-life accent (flowers, fruits, berries),
 *   `exotic` the rare-material accent (crystals, ores, glows, supernatural
 *   bits).
 *
 *   Material swatches — `wood`, `soil`, `stone` — are near-constant across
 *   biomes (wood is brown everywhere), so a biome may omit them and inherit
 *   the global defaults below, or override any that are distinctive to it
 *   (e.g. Edenfall's purple-tinted stone). gameFactory merges
 *   `{ ...BIOME_COLOR_DEFAULTS, ...def.colors }` when building the
 *   biomeColors map — the same fallback pattern the ground palettes use
 *   (palette[terrain] → TERRAIN_COLOR).
 */
export const BIOME_COLOR_DEFAULTS = {
  wood: [0.545, 0.369, 0.235], // #8b5e3c — warm bark brown (the trees' authored trunk color)
  soil: [0.541, 0.420, 0.290], // #8a6b4a — earth brown
  stone: [0.550, 0.550, 0.550], // #8c8c8c — neutral rock grey
};

/** Every swatch a biome's colors block may define (the full contract). */
export const BIOME_SWATCHES = ['foliage', 'wood', 'soil', 'stone', 'bloom', 'exotic'];

/**
 * Swatches every biome must define itself — the identity colors that give a
 * biome its character. The material swatches (wood/soil/stone) fall back to
 * BIOME_COLOR_DEFAULTS instead.
 */
export const BIOME_IDENTITY_SWATCHES = ['foliage', 'bloom', 'exotic'];
