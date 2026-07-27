/**
 * statsDisplay.js — Stats panel rendering for the analysis page.
 *
 * Generates structured text reports for the current single-seed map
 * and for multi-seed aggregate results.
 */
import { S } from './state.js';
import { els } from './domRefs.js';
import { TERRAIN } from '../../src/game/rules/terrainTypes.js';
import {
  biomeDistribution,
  terrainDistribution,
  featureCounts,
  debrisCounts,
  mountainAnalysis,
  waterAnalysis,
  entityStats,
  traderAnalysis,
} from './stats.js';

// ─── Single-seed stats ────────────────────────────────────────────────────────

/**
 * Format single-seed stats as a text block for the stats panel.
 */
export function formatStats() {
  if (!S.lastResult) return 'No map generated yet.';

  const { tiles, champions, mobs, traders, baseKeys, radius, seed, biomeDef, multiBiome, biomeIds } = S.lastResult;

  const bioDist = biomeDistribution(tiles);
  const terrainStats = terrainDistribution(tiles);
  const featCounts = featureCounts(tiles);
  const debCounts = debrisCounts(tiles);
  const mtStats = mountainAnalysis(tiles);
  const wtStats = waterAnalysis(tiles);
  const entStats = entityStats(champions, mobs, traders);
  const traderPositions = traderAnalysis(tiles, traders, baseKeys);

  const lines = [];
  lines.push(`Seed: ${seed}  |  Radius: ${radius}  |  Biome: ${biomeDef?.name || 'default'}  |  Multi: ${multiBiome ? 'yes' : 'no'}`);
  lines.push(`Tiles: ${terrainStats.total}`);
  lines.push('');

  // Biome distribution (multi-biome)
  if (multiBiome && biomeIds && biomeIds.length > 1) {
    lines.push('Biomes:');
    for (const [bid, d] of Object.entries(bioDist.dist)) {
      lines.push(`  ${bid.padEnd(16)} ${String(d.count).padStart(5)}  ${String(d.pct).padStart(5)}%`);
    }
    lines.push('');
  }

  // Terrain distribution
  lines.push('Terrain:');
  for (const [t, d] of Object.entries(terrainStats.dist)) {
    const label = (TERRAIN[t]?.label || t).padEnd(12);
    const bar = '█'.repeat(Math.round(parseFloat(d.pct) / 2));
    lines.push(`  ${label} ${String(d.count).padStart(5)}  ${String(d.pct).padStart(5)}%  ${bar}`);
  }

  lines.push('');
  lines.push(`Features:  trees=${featCounts.trees}  fruit=${featCounts.fruitTrees}  large=${featCounts.largeTrees}  knots=${featCounts.knots}  bases=${featCounts.bases}  bushes=${featCounts.bushes}  vines=${featCounts.vines}`);
  lines.push(`Debris:    tufts=${debCounts.tufts}  rocks=${debCounts.rocks}  flowers=${debCounts.flowers}`);
  lines.push(`Mountains: total=${mtStats.total}  peaks=${mtStats.peaks}  slopes=${mtStats.slopes}  isolated=${mtStats.isolated}`);
  lines.push(`Water:     total=${wtStats.total}  lakes=${wtStats.lakes}  oceans=${wtStats.oceans}`);
  lines.push('');

  // Entities
  lines.push(`Entities:  champions=${entStats.champions}  mobs=${entStats.mobs}  traders=${entStats.traders}`);
  if (traderPositions.length > 0) {
    lines.push('Trader positions:');
    for (const tp of traderPositions) {
      lines.push(`  (${tp.pos.q}, ${tp.pos.r})  center dist=${tp.distToCenter}  nearest base=${tp.minBaseDist ?? 'N/A'}`);
    }
  }

  return lines.join('\n');
}

/**
 * Update the stats panel DOM with the current map's formatted stats.
 */
export function updateStats() {
  els.statsPanel.textContent = formatStats();
}

// ─── Multi-seed stats ─────────────────────────────────────────────────────────

/**
 * Format multi-seed aggregate results as a text block.
 *
 * @param {{ aggregate, traderHeatmap }} result — the output of runMultiSeed()
 */
export function formatMultiStats(result) {
  const { aggregate, traderHeatmap } = result;
  const lines = [];

  lines.push(`=== Multi-Seed Report ===`);
  lines.push(`Seeds: ${aggregate.seedCount}  |  Radius: ${aggregate.radius}  |  Base seed: ${aggregate.baseSeed}`);
  lines.push('');

  lines.push('Terrain distribution (mean % ± stddev):');
  for (const [t, d] of Object.entries(aggregate.terrain)) {
    const label = (TERRAIN[t]?.label || t).padEnd(12);
    lines.push(`  ${label} ${d.mean.padStart(5)}%  ±${d.stddev.padStart(5)}  (min ${d.min}%, max ${d.max}%)`);
  }

  lines.push('');
  lines.push('Trader position heatmap (top 15 hexes by seed count):');
  const sorted = [...traderHeatmap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  for (const [key, count] of sorted) {
    const pct = ((count / aggregate.seedCount) * 100).toFixed(1);
    lines.push(`  ${key.padStart(8)}  ${count}/${aggregate.seedCount}  (${pct}%)`);
  }

  return lines.join('\n');
}
