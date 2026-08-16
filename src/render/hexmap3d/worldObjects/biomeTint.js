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
 * Every biome's decor takes the swatch tint (there is no per-biome
 * suppression — biomes with unique terrain keep their colors unique by never
 * sharing decor with other biomes; anything that must stay untinted uses a
 * motif). A tile whose biome has no known colors simply never tints. The
 * `terrain` source is different: it matches decor to the ground it sits on,
 * so it applies in every biome whenever the biome palettes are known.
 *
 * Pure module: no THREE, no game state — it reads `biomeColors` (biome id →
 * { foliage, wood, soil, stone, bloom, exotic }) and `biomePalettes` (biome
 * id → per-terrain palette) Maps passed in as args, so it is unit-testable in
 * Node and shared by the state and chunk paths.
 */
import { neighbors, coordKey } from '../../../engine/rules/hexGrid.js';
import { TERRAIN_BLEND_FACTOR, TERRAIN_COLOR } from '../../../params/render/terrainParams.js';

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
 * The tile's terrain surface color: its biome palette entry for the tile's
 * terrain type, falling back to the base TERRAIN_COLOR table like the terrain
 * mesh resolver (tileColor.js). Lake/river modulation is irrelevant here —
 * decor never sits on water, and water neighbors are excluded from the blend.
 */
function terrainColorFor(tile, biomePalettes) {
  const pal = (tile.biomeId && biomePalettes.get(tile.biomeId)) || {};
  return pal[tile.terrain] || TERRAIN_COLOR[tile.terrain] || TERRAIN_COLOR.plains;
}

/**
 * Neighbor-blended biome colors for a tile's decor, or null when nothing can
 * be computed. The returned tint carries one entry per color swatch the
 * biome defines — foliage, wood, soil, stone, bloom, exotic (the
 * gameFactory-merged biomeColors map has all six) — plus `terrain` when
 * palettes are given:
 *   swatches — the biome's material-class colors, neighbor-blended; skipped
 *       on Untouched and Painforest tiles (default-tint design rule).
 *   terrain — the tile's own terrain surface color, neighbor-blended the same
 *       way the surface itself is; applies in every biome (ground matching).
 *
 * @param {object} tile          - tile ({ q, r, biomeId, terrain })
 * @param {Map}    tilesByKey    - "q,r" → tile lookup for the tiles being built
 *                                 (state.tiles Map, or a Map built from a chunk)
 * @param {Map}    biomeColors   - biome id → color swatches (foliage, wood,
 *                                 soil, stone, bloom, exotic; 0-1 tuples)
 * @param {Set<string>} [decorGate] - "q,r" keys of decor-visible tiles; when
 *                                 given, out-of-gate neighbors are skipped
 * @param {Map}    [biomePalettes] - biome id → palette (terrain type → 0-1
 *                                 color tuple); required for the terrain source
 * @returns {object|null} - blended swatch colors keyed by swatch name, plus
 *                                 `terrain` when palettes are given; null
 *                                 when nothing can be computed
 */
export function biomeTintForTile(tile, tilesByKey, biomeColors, decorGate = null, biomePalettes = null) {
  const wantSignature = !!biomeColors;
  const ownSignature = wantSignature ? biomeColors.get(tile.biomeId) : null;
  const wantTerrain = !!biomePalettes;

  // Per-swatch part lists: swatch → [own color, ...neighbor colors]. Every
  // swatch the biome defines blends independently across the same neighbor
  // set (the gameFactory-merged map carries all six: foliage, wood, soil,
  // stone, bloom, exotic).
  const partsBySwatch = new Map();
  if (ownSignature) {
    for (const [swatch, color] of Object.entries(ownSignature)) {
      if (Array.isArray(color) && color.length === 3) partsBySwatch.set(swatch, [color]);
    }
  }
  const partsT = wantTerrain ? [terrainColorFor(tile, biomePalettes)] : null;
  if (partsBySwatch.size === 0 && !partsT) return null;

  const tint = {};
  for (const [swatch, parts] of partsBySwatch) tint[swatch] = parts[0];
  if (partsT) tint.terrain = partsT[0];

  for (const nb of neighbors({ q: tile.q, r: tile.r })) {
    const key = coordKey(nb);
    const nbTile = tilesByKey?.get(key);
    if (!nbTile || nbTile.terrain === 'water' || nbTile.terrain === 'river') continue;
    if (decorGate && !decorGate.has(key)) continue;
    if (partsBySwatch.size > 0) {
      const nbColors = biomeColors.get(nbTile.biomeId);
      if (nbColors) {
        for (const [swatch, parts] of partsBySwatch) {
          const nbColor = nbColors[swatch];
          if (Array.isArray(nbColor) && nbColor.length === 3) parts.push(nbColor);
        }
      }
    }
    if (partsT) partsT.push(terrainColorFor(nbTile, biomePalettes));
  }

  for (const [swatch, parts] of partsBySwatch) {
    if (parts.length > 1) tint[swatch] = averageColor(parts, ownSignature[swatch], TERRAIN_BLEND_FACTOR);
  }
  if (partsT && partsT.length > 1) {
    tint.terrain = averageColor(partsT, partsT[0], TERRAIN_BLEND_FACTOR);
  }
  return tint;
}
