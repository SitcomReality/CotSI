/**
 * biomeTint.js — Neighbor-blended biome colors for descriptor parts.
 *
 * Decor parts carry an optional `biomeColor` influence (see schema.js): the
 * record builder mixes the part's default color toward a tint. This module
 * computes that tint for one tile the same way the terrain surfaces do
 * (cornerBlend.js) — the tile's own biome colors pulled toward the average of
 * the biome colors of the explored land tiles sharing its edges. An Edenfall
 * tree beside Painforest tiles therefore gets its purple diluted by the
 * Painforest green bleeding in.
 *
 * Water and river neighbors never participate (water renders on its own mesh
 * and must never terrain-blend with land — the same rule the terrain blend
 * follows), and neighbors outside the decor gate (visible ∪ explored) are
 * skipped, standing in for the terrain blend's `explored` set.
 *
 * Untouched (biome_default) and Painforest (biome_painforest) never tint:
 * their decor keeps the default part colors per the design rule, so the blend
 * returns null for tiles of those biomes. Their colors still bleed into
 * NEIGHBOR tiles' blends — the check applies to the tile's own biome only.
 *
 * Pure module: no THREE, no game state — it reads a `biomeColors` Map
 * (biome id → { primary, accent }) and a tile lookup Map passed in as args,
 * so it is unit-testable in Node and shared by the state and chunk paths.
 */
import { neighbors, coordKey } from '../../../engine/rules/hexGrid.js';
import { TERRAIN_BLEND_FACTOR } from '../../../params/render/terrainParams.js';

/** Biomes whose decor keeps the default part colors (never tinted). */
const DEFAULT_TINT_BIOMES = new Set(['biome_default', 'biome_painforest']);

/** Whether a tile of this biome takes a biome tint (Untouched/Painforest don't). */
export function isDefaultTintBiome(biomeId) {
  return DEFAULT_TINT_BIOMES.has(biomeId);
}

/**
 * One color tuple: own pulled toward the average of all parts by `factor`
 * (mirrors cornerBlendColor's formula, per channel).
 */
function averageColor(parts, own, factor) {
  let r = 0, g = 0, b = 0;
  for (const p of parts) { r += p[0]; g += p[1]; b += p[2]; }
  const n = parts.length;
  return [
    own[0] * (1 - factor) + (r / n) * factor,
    own[1] * (1 - factor) + (g / n) * factor,
    own[2] * (1 - factor) + (b / n) * factor,
  ];
}

/**
 * Neighbor-blended biome colors for a tile's decor, or null when the tile has
 * no biome tint (default biomes, or no colors known for its biome).
 *
 * @param {object} tile        - tile ({ q, r, biomeId, terrain })
 * @param {Map}    tilesByKey  - "q,r" → tile lookup for the tiles being built
 *                               (state.tiles Map, or a Map built from a chunk)
 * @param {Map}    biomeColors - biome id → { primary, accent } (0-1 tuples)
 * @param {Set<string>} [decorGate] - "q,r" keys of decor-visible tiles; when
 *                               given, out-of-gate neighbors are skipped
 * @returns {{ primary: number[], accent: number[] }|null}
 */
export function biomeTintForTile(tile, tilesByKey, biomeColors, decorGate = null) {
  if (!biomeColors || DEFAULT_TINT_BIOMES.has(tile.biomeId)) return null;
  const own = biomeColors.get(tile.biomeId);
  if (!own) return null;

  const partsP = [own.primary];
  const partsA = [own.accent];
  for (const nb of neighbors({ q: tile.q, r: tile.r })) {
    const key = coordKey(nb);
    const nbTile = tilesByKey?.get(key);
    if (!nbTile || nbTile.terrain === 'water' || nbTile.terrain === 'river') continue;
    if (decorGate && !decorGate.has(key)) continue;
    const nbColors = biomeColors.get(nbTile.biomeId);
    if (!nbColors) continue;
    partsP.push(nbColors.primary);
    partsA.push(nbColors.accent);
  }

  if (partsP.length === 1) return { primary: own.primary, accent: own.accent };
  return {
    primary: averageColor(partsP, own.primary, TERRAIN_BLEND_FACTOR),
    accent: averageColor(partsA, own.accent, TERRAIN_BLEND_FACTOR),
  };
}
