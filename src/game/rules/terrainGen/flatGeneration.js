import { coordKey } from '../../../engine/rules/hexGrid.js';
import { tileToChunk } from '../../../engine/rules/chunkGrid.js';
import { startMeasure, endMeasure } from '../../../dev/devPerformance.js';
import { generateChunkTiles } from './chunkGeneration.js';
import { ensurePassableConnectivity } from './postProcess/connectivityEnforcement.js';

/**
 * Generate a flat tile map for a given seed and radius.
 * Delegates to generateChunkTiles for each chunk in range and assembles
 * the results into a single flat object keyed by "q,r".
 *
 * @param {string}   seedText  - Seed string for reproducible generation
 * @param {number}   radius    - Hex map radius (center 0,0)
 * @param {object}   [biomeDef]- Single biome archetype definition, or null for multi-biome
 * @param {object}   [params]  - Map parameter multipliers
 * @returns {object} tiles keyed by "q,r"
 */
export function generateTiles(seedText, radius, biomeDef = null, params = {}) {
  startMeasure('genTiles');

  // Determine which chunks intersect the map radius
  const chunks = new Set();
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r;
      if (Math.abs(s) > radius) continue;
      const { cq, cr } = tileToChunk(q, r);
      chunks.add(`${cq},${cr}`);
    }
  }

  const tiles = {};
  for (const ck of chunks) {
    const [cq, cr] = ck.split(',').map(Number);
    const { tileMap } = generateChunkTiles(seedText, cq, cr, radius, biomeDef, params);
    for (const [, tile] of tileMap) {
      tiles[coordKey(tile)] = tile;
    }
  }

  // Post-classification: enforce passable-hex contiguity (multi-biome only)
  if (!biomeDef) {
    ensurePassableConnectivity(tiles, radius);
  }

  endMeasure('genTiles');
  return tiles;
}
