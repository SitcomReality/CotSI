import { coordKey } from '../../../engine/rules/hexGrid.js';
import { tileToChunk } from '../../../engine/rules/chunkGrid.js';
import { stringSeed } from '../../../engine/rules/seededRng.js';
import { startMeasure, endMeasure } from '../../../dev/performance/index.js';
import {
  RIVER_SOURCE_MIN_ELEV, RIVER_SOURCE_MIN_MOIST,
} from '../../../params/game/worldParams.js';
import { generateChunkTiles } from './chunkGeneration.js';
import { ensurePassableConnectivity } from './postProcess/connectivityEnforcement.js';
import { selectRiverSources } from './rivers/riverSources.js';
import { traceRiver } from './rivers/riverTrace.js';
import { applyRiverMoistureBoost } from './rivers/riverMoisture.js';
import { classifyTerrain, resolveElevation } from './classification/terrainClassification.js';
import { getArchetype } from '../archetypes.js';

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

  // ---------------------------------------------------------------------------
  // River post-passes (Phase D) — runs after all chunks are assembled
  // ---------------------------------------------------------------------------
  const tileList = Object.values(tiles);
  const fieldMap = new Map();
  const provisionalWaterSet = new Set();
  for (const tile of tileList) {
    const key = coordKey(tile);
    fieldMap.set(key, { elevation: tile.elevationField, baseMoisture: tile.baseMoisture });
    if (tile.terrain === 'water') {
      provisionalWaterSet.add(key);
    }
  }

  const seed = stringSeed(seedText);
  const riverParams = {
    sourceMinElev: RIVER_SOURCE_MIN_ELEV,
    sourceMinMoist: RIVER_SOURCE_MIN_MOIST,
    seed,
  };

  const sources = selectRiverSources(tileList, fieldMap, riverParams);
  const riverPaths = sources.map(source => traceRiver(source, fieldMap, provisionalWaterSet, { seed }));

  if (riverPaths.length > 0) {
    // Apply moisture boost to river-affected tiles (mutates tile.baseMoisture + tile.moisture)
    const boostedKeys = applyRiverMoistureBoost(tileList, riverPaths);

    // Re-classify terrain for river-affected tiles (fertile valleys)
    for (const key of boostedKeys) {
      const tile = tiles[key];
      if (!tile) continue;
      const archetypeDef = getArchetype(tile.biomeId) || getArchetype('biome_default');
      if (!archetypeDef) continue;
      const terrain = classifyTerrain(
        tile.elevationField, tile.moisture, tile.temperature, tile.slope, archetypeDef,
        tile.q, tile.r, (nq, nr) => {
          const nt = tiles[coordKey({ q: nq, r: nr })];
          return nt && (nt.terrain === 'water' || nt.terrain === 'ice');
        }
      );
      tile.terrain = terrain;
      tile.elevation = resolveElevation(terrain, archetypeDef);
    }

    // Set isRiver flags on river-path tiles
    for (const path of riverPaths) {
      for (const hex of path) {
        const tile = tiles[coordKey(hex)];
        if (tile) {
          tile.isRiver = true;
        }
      }
    }
  }

  // Post-classification: enforce passable-hex contiguity (multi-biome only)
  if (!biomeDef) {
    ensurePassableConnectivity(tiles, radius);
  }

  endMeasure('genTiles');
  return tiles;
}
