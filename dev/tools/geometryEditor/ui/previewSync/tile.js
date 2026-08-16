/**
 * tile.js — The preview tile: descriptor → tile derivation, biome signature
 * colors / terrain palettes, and the biome tint for the single preview tile.
 * Pure state→tile math — no DOM.
 */
import { S } from '../../state.js';
import { listArchetypes, getArchetype } from '../../../../../src/game/rules/archetypes.js';
import { biomeTintForTile } from '../../../../../src/render/hexmap3d/worldObjects/biomeTint.js';
import { TERRAIN } from '../../../../../src/game/rules/terrainTypes.js';
import { BIOME_COLOR_DEFAULTS, BIOME_IDENTITY_SWATCHES } from '../../../../../src/game/rules/archetypeData/biomes/biomeColorDefaults.js';

/** The tile the preview renders on — a stable hex with a hash. */
const PREVIEW_TILE = { q: 1, r: 0, terrain: 'forest' };
const ORIGIN = { x: 0, y: 0, z: 0 };

/**
 * The preview tile's terrain, derived from the descriptor: decors and
 * mountains are bound to exactly one terrain — the decor's id IS the terrain's
 * id (gameBuilder's SIMPLE_DECOR_BY_TERRAIN dispatch) — so the terrain is
 * never a free choice; a feature has no terrain of its own and previews on
 * the plain default. Only descriptors whose id is a real TERRAIN key use it
 * as terrain (the biome-override decors — titanflesh, forespring, … — keep
 * the default tile).
 */
export function previewTerrain(d) {
  return TERRAIN[d.id] ? d.id : 'forest';
}

/**
 * The preview tile, with the editor's selected biome applied (S.biomeId) and
 * the terrain derived from the descriptor (previewTerrain). The terrain
 * feeds moisture cluster counts and the `terrain` biome-tint source; a null
 * biome keeps a plain tile — default part colors and full sizes.
 */
export function previewTile(d) {
  const tile = { ...PREVIEW_TILE, terrain: previewTerrain(d) };
  if (S.biomeId) tile.biomeId = S.biomeId;
  return tile;
}

/** The shared preview origin (world 0,0,0). */
export function previewOrigin() {
  return ORIGIN;
}

/** Biome color swatches (biome id → { foliage, wood, soil, stone, bloom,
 *  exotic }), for the preview tint. Material swatches inherit the global
 *  defaults, exactly as gameFactory merges them for the game state. The
 *  single preview tile has no neighbors, so the tint is the biome's own
 *  colors — no blending to show here. */
const biomeColors = new Map(
  listArchetypes('biome')
    .map((id) => [id, getArchetype(id)?.colors])
    .filter(([, colors]) => colors && BIOME_IDENTITY_SWATCHES.every((s) => colors[s]))
    .map(([id, colors]) => [id, { ...BIOME_COLOR_DEFAULTS, ...colors }]),
);

/** Biome terrain palettes (biome id → per-terrain color), for the `terrain`
 *  tint source — the tile's ground color. Same per-biome data the game state
 *  collects into state.biomePalettes. */
const biomePalettes = new Map(
  listArchetypes('biome')
    .map((id) => [id, getArchetype(id)?.palette])
    .filter(([, palette]) => palette),
);

/** The biome tint for the preview tile, or null (default colors). */
export function previewTint(tile) {
  if (!S.biomeId) return null;
  return biomeTintForTile(tile, new Map([['1,0', tile]]), biomeColors, null, biomePalettes);
}
