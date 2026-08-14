/**
 * statsDisplay.js — Stats panel rendering for the analysis page.
 *
 * Generates structured text reports for the current single-seed map.
 */
import { S } from '../state.js';
import { els } from '../domRefs.js';
import { TERRAIN } from '../../../../src/game/rules/terrainTypes.js';
import {
  biomeDistribution,
  terrainDistribution,
  featureCounts,
  featureTierBands,
  mountainAnalysis,
  waterAnalysis,
  entityStats,
  traderAnalysis,
} from './stats.js';
import { runSpatialStats } from './spatialStats.js';
import { pearsonCorrelation, jointHistogramWithBiome } from './correlations.js';
import { formatSpatialStats, formatCorrelations, formatJointHistogram } from './spatialFormatting.js';

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
  lines.push(`Features:  fonts=${featCounts.blessedFonts}  knots=${featCounts.knots}  bases=${featCounts.bases}  bushes=${featCounts.bushes}  chests=${featCounts.chests}`);

  // Feature composition by distance band (featureDesign.md §3 — tiered placement)
  const tierBands = featureTierBands(tiles, radius);
  lines.push('Feature tiers by band (inner/mid/outer = thirds of the radius):');
  for (const b of tierBands) {
    const rate = b.passable > 0 ? (b.features / b.passable * 100).toFixed(1) : '0.0';
    lines.push(`  ${b.label.padEnd(6)} T1=${String(b.counts.T1).padStart(3)} T2=${String(b.counts.T2).padStart(3)} T3=${String(b.counts.T3).padStart(3)} T4=${String(b.counts.T4).padStart(3)}   feat/hex ${rate}%`);
  }

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
  lines.push('');

  // Spatial statistics (patch analysis)
  const spatialResults = runSpatialStats(tiles);
  lines.push(formatSpatialStats(spatialResults, terrainStats.total));

  // Cross-field correlations
  const tileArray = Object.values(tiles);
  const corrPairs = [
    { fieldA: 'elevationField', fieldB: 'temperature',  r: pearsonCorrelation(tileArray, 'elevationField', 'temperature').r },
    { fieldA: 'elevationField', fieldB: 'moisture',     r: pearsonCorrelation(tileArray, 'elevationField', 'moisture').r },
    { fieldA: 'moisture',       fieldB: 'temperature',  r: pearsonCorrelation(tileArray, 'moisture', 'temperature').r },
  ];
  lines.push(formatCorrelations(corrPairs));

  // 2D joint histogram (elevation × moisture) with biome overlay
  const jh = jointHistogramWithBiome(tileArray, 'elevationField', 'moisture');
  lines.push(formatJointHistogram(jh));

  return lines.join('\n');
}

/**
 * Update the stats panel DOM with the current map's formatted stats.
 */
export function updateStats() {
  els.statsBody.textContent = formatStats();
}
