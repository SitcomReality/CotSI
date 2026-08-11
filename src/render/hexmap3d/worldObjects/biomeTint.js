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
 * Untouched (biome_default) and Painforest (biome_painforest) never signature
 * tint: their decor keeps the default part colors per the design rule, so
 * `primary`/`accent` are not computed for tiles of those biomes. Their colors
 * still bleed into NEIGHBOR tiles' blends — the check applies to the tile's
 * own biome only. The `terrain` source is different: it matches decor to the
 * ground it sits on, so it applies in every biome (including the default-tint
 * ones), whenever the biome palettes are known.
 *
 * Pure module: no THREE, no game state — it reads `biomeColors` (biome id →
 * { primary, accent }) and `biomePalettes` (biome id → per-terrain palette)
 * Maps passed in as args, so it is unit-testable in Node and shared by the
 * state and chunk paths.
 */
import { neighbors, coordKey } from '../../../engine/rules/hexGrid.js';
import { TERRAIN_BLEND_FACTOR, TERRAIN_COLOR } from '../../../params/render/terrainParams.js';

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
 * be computed. The returned tint carries whichever sources apply to the tile:
 *   primary / accent — the biome's signature colors, neighbor-blended; skipped
 *       on Untouched and Painforest tiles (default-tint design rule).
 *   terrain — the tile's own terrain surface color, neighbor-blended the same
 *       way the surface itself is; applies in every biome (ground matching).
 *
 * @param {object} tile          - tile ({ q, r, biomeId, terrain })
 * @param {Map}    tilesByKey    - "q,r" → tile lookup for the tiles being built
 *                                 (state.tiles Map, or a Map built from a chunk)
 * @param {Map}    biomeColors   - biome id → { primary, accent } (0-1 tuples)
 * @param {Set<string>} [decorGate] - "q,r" keys of decor-visible tiles; when
 *                                 given, out-of-gate neighbors are skipped
 * @param {Map}    [biomePalettes] - biome id → palette (terrain type → 0-1
 *                                 color tuple); required for the terrain source
 * @returns {{ primary?: number[], accent?: number[], terrain?: number[] }|null}
 */
export function biomeTintForTile(tile, tilesByKey, biomeColors, decorGate = null, biomePalettes = null) {
  const wantSignature = biomeColors && !DEFAULT_TINT_BIOMES.has(tile.biomeId);
  const ownSignature = wantSignature ? biomeColors.get(tile.biomeId) : null;
  const wantTerrain = !!biomePalettes;

  const partsP = ownSignature ? [ownSignature.primary] : null;
  const partsA = ownSignature ? [ownSignature.accent] : null;
  const partsT = wantTerrain ? [terrainColorFor(tile, biomePalettes)] : null;
  if (!partsP && !partsT) return null;

  const tint = {};
  if (partsP) {
    tint.primary = partsP[0];
    tint.accent = partsA[0];
  }
  if (partsT) tint.terrain = partsT[0];

  for (const nb of neighbors({ q: tile.q, r: tile.r })) {
    const key = coordKey(nb);
    const nbTile = tilesByKey?.get(key);
    if (!nbTile || nbTile.terrain === 'water' || nbTile.terrain === 'river') continue;
    if (decorGate && !decorGate.has(key)) continue;
    if (partsP) {
      const nbColors = biomeColors.get(nbTile.biomeId);
      if (nbColors) {
        partsP.push(nbColors.primary);
        partsA.push(nbColors.accent);
      }
    }
    if (partsT) partsT.push(terrainColorFor(nbTile, biomePalettes));
  }

  if (partsP && partsP.length > 1) {
    tint.primary = averageColor(partsP, ownSignature.primary, TERRAIN_BLEND_FACTOR);
    tint.accent = averageColor(partsA, ownSignature.accent, TERRAIN_BLEND_FACTOR);
  }
  if (partsT && partsT.length > 1) {
    tint.terrain = averageColor(partsT, partsT[0], TERRAIN_BLEND_FACTOR);
  }
  return tint;
}
