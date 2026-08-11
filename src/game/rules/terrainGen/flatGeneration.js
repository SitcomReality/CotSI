import { coordKey } from '../../../engine/rules/hexGrid.js';
import { tileToChunk } from '../../../engine/rules/chunkGrid.js';
import { stringSeed } from '../../../engine/rules/seededRng.js';
import { startMeasure, endMeasure } from '../../../shared/measurements.js';
import {
  RIVER_SOURCE_MIN_ELEV, RIVER_SOURCE_MIN_MOIST,
} from '../../../params/game/worldParams.js';
import { generateChunkTiles } from './chunkGeneration.js';
import { ensurePassableConnectivity } from './postProcess/connectivityEnforcement.js';
import { enforceWaterRules, carveRiverBeds, assignRiverFlows } from './postProcess/waterRules.js';
import { selectRiverSources } from './rivers/riverSources.js';
import { traceRiver } from './rivers/riverTrace.js';
import { applyRiverMoistureBoost } from './rivers/riverMoisture.js';
import { applyRiverTerrain } from './rivers/riverTerrain.js';
import { classifyTerrain, resolveElevation } from './classification/terrainClassification.js';
import { getArchetype } from '../archetypes.js';

/**
 * Generate a flat tile map for a given seed and radius.
 * Delegates to generateChunkTiles for each chunk in range and assembles
 * the results into a single flat object keyed by "q,r".
 *
 * Global post-passes (rivers, connectivity, water rules) run over the
 * assembled tiles as-is: with the default full chunk set they cover the whole
 * map; with `opts.chunkKeys` (the lazy starting region) they cover just the
 * generated chunks and stop gracefully at the region boundary.
 *
 * @param {string}   seedText  - Seed string for reproducible generation
 * @param {number}   radius    - Hex map radius (center 0,0)
 * @param {object}   [biomeDef]- Single biome archetype definition, or null for multi-biome
 * @param {object}   [opts]    - { chunkKeys?: Set<string> } restrict which chunks to generate
 * @returns {object} tiles keyed by "q,r"
 */
export function generateTiles(seedText, radius, biomeDef = null, opts = {}) {
  startMeasure('genTiles');

  // Determine which chunks to generate: all chunks intersecting the map
  // radius, or an explicit subset (lazy starting region).
  const chunks = opts.chunkKeys
    ? opts.chunkKeys
    : (() => {
      const set = new Set();
      for (let q = -radius; q <= radius; q++) {
        for (let r = -radius; r <= radius; r++) {
          const s = -q - r;
          if (Math.abs(s) > radius) continue;
          const { cq, cr } = tileToChunk(q, r);
          set.add(`${cq},${cr}`);
        }
      }
      return set;
    })();

  const tiles = {};
  for (const ck of chunks) {
    const [cq, cr] = ck.split(',').map(Number);
    const { tileMap } = generateChunkTiles(seedText, cq, cr, radius, biomeDef);
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
    // Apply moisture boost to river-affected tiles (mutates tile.moisture;
    // baseMoisture is preserved for seam-test recomputation)
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

    // Override river-path tiles to real river terrain (mouths stay water)
    applyRiverTerrain(tiles, riverPaths);

    // Downstream flow direction per carved tile (for the animated river
    // surface) — paths are ordered source → mouth.
    assignRiverFlows(tiles, riverPaths);
  }

  // Post-classification: enforce passable-hex contiguity (multi-biome only)
  if (!biomeDef) {
    ensurePassableConnectivity(tiles, radius);
  }

  // Water system height rules (order matters):
  //   1. enforceWaterRules  — flatten stationary water bodies to a uniform
  //      height, and guarantee water sits below adjacent land.
  //   2. carveRiverBeds     — recess river channels below their banks, using
  //      the now-final water levels as each river's terminal level.
  // Rivers (river terrain) are exempt from both height rules' hard constraints.
  enforceWaterRules(tiles);
  carveRiverBeds(tiles, riverPaths);

  endMeasure('genTiles');
  return tiles;
}
