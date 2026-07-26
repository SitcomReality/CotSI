/**
 * multiSeed.js — Batch map generation and aggregation across multiple seeds.
 *
 * Runs the full generation pipeline (terrain + entities) for each seed
 * and collects aggregate statistics. Uses setTimeout-based yielding to
 * keep the UI responsive during long batches.
 */
import { generateTiles } from '../../src/game/rules/terrainGenerator.js';
import { makeRng } from '../../src/engine/rules/seededRng.js';
import { createChampions } from '../../src/game/state/championFactory.js';
import { createMobs, createTraders } from '../../src/game/state/entityFactory.js';
import { coordKey } from '../../src/engine/rules/hexGrid.js';
import {
  terrainDistribution,
  featureCounts,
  debrisCounts,
  mountainAnalysis,
  waterAnalysis,
  entityStats,
  traderAnalysis,
  traderRingHistogram,
  aggregateTerrainDistributions,
} from './stats.js';

// Default champion config: one per faction, in faction order.
// The shuffle in createChampions will randomize them per-seed deterministically.
const DEFAULT_CHAMPIONS = [
  { faction: 0 }, { faction: 1 }, { faction: 2 },
  { faction: 3 }, { faction: 4 }, { faction: 5 }, { faction: 6 },
];

/**
 * Generate terrain and entities for a single seed.
 * Mirrors the pipeline in gameFactory.js: tiles → champs → mobs → traders.
 */
function generateSingleSeed(seedText, radius, biomeDef, mapSettings) {
  const tiles = generateTiles(seedText, radius, biomeDef, mapSettings);
  const rng = makeRng(seedText);
  const rand = () => rng();

  const { champions, used } = createChampions({
    tiles, champions: DEFAULT_CHAMPIONS, rand, radius,
  });

  const baseKeys = new Set();
  for (const key of Object.keys(tiles)) {
    if (tiles[key].feature?.kind === 'base') baseKeys.add(key);
  }

  const mobs = createMobs({ tiles, rand, used, radius });
  const traders = createTraders({ tiles, rand, used, champions });

  return { tiles, champions, mobs, traders, baseKeys };
}

/**
 * Collect all statistics for a single seed result.
 */
function collectSeedStats(result) {
  const { tiles, champions, mobs, traders, baseKeys } = result;
  return {
    terrain: terrainDistribution(tiles),
    features: featureCounts(tiles),
    debris: debrisCounts(tiles),
    mountains: mountainAnalysis(tiles),
    water: waterAnalysis(tiles),
    entities: entityStats(champions, mobs, traders),
    traderPositions: traderAnalysis(tiles, traders, baseKeys),
    traderRings: traderRingHistogram(traders),
  };
}

/**
 * Aggregate trader positions across all seeds into a heatmap.
 * Returns a Map of "q,r" → count of seeds where a trader appeared there.
 */
function buildTraderHeatmap(perSeedStats) {
  const heatmap = new Map();
  for (const seed of perSeedStats) {
    if (!seed.traderPositions) continue;
    const seen = new Set(); // one count per seed per hex
    for (const tp of seed.traderPositions) {
      const key = coordKey(tp.pos);
      if (seen.has(key)) continue;
      seen.add(key);
      heatmap.set(key, (heatmap.get(key) || 0) + 1);
    }
  }
  return heatmap;
}

/**
 * Aggregate entity positions (champion spawns) across seeds.
 */
function buildChampionHeatmap(perSeedStats) {
  const heatmap = new Map();
  for (const seed of perSeedStats) {
    if (!seed.championPositions) continue;
    for (const pos of seed.championPositions) {
      const key = coordKey(pos);
      heatmap.set(key, (heatmap.get(key) || 0) + 1);
    }
  }
  return heatmap;
}

/**
 * Run multi-seed analysis.
 *
 * @param {object}   params
 * @param {string}   params.baseSeed   - Base seed text (e.g. "glut-17")
 * @param {number}   params.count      - Number of seeds to generate
 * @param {number}   params.radius     - Map radius
 * @param {object}   params.biomeDef   - Resolved biome archetype definition
 * @param {object}   params.mapSettings - { heightVariation, wateriness, mountainousness }
 * @param {function} params.onProgress - Called with (current, total) after each seed
 * @returns {Promise<object>} { perSeedStats, aggregate, traderHeatmap, championHeatmap }
 */
export async function runMultiSeed({ baseSeed, count, radius, biomeDef, mapSettings, onProgress }) {
  const perSeedStats = [];
  const terrainDistributions = [];
  const allChampionPositions = [];

  for (let i = 0; i < count; i++) {
    const seedText = `${baseSeed}-${i}`;
    const result = generateSingleSeed(seedText, radius, biomeDef, mapSettings);
    const stats = collectSeedStats(result);

    // Collect champion positions for heatmap
    const champPositions = result.champions
      .filter(c => c.alive !== false)
      .map(c => ({ q: c.pos.q, r: c.pos.r }));
    stats.championPositions = champPositions;
    allChampionPositions.push(...champPositions);

    perSeedStats.push(stats);
    terrainDistributions.push(stats.terrain);

    if (onProgress) onProgress(i + 1, count);

    // Yield to the browser every 10 seeds to keep UI responsive
    if (i % 10 === 9 && i < count - 1) {
      await new Promise(r => setTimeout(r, 0));
    }
  }

  const aggregate = {
    terrain: aggregateTerrainDistributions(terrainDistributions),
    seedCount: count,
    radius,
    baseSeed,
  };

  return {
    perSeedStats,
    aggregate,
    traderHeatmap: buildTraderHeatmap(perSeedStats),
    championHeatmap: buildChampionHeatmap(perSeedStats),
  };
}
