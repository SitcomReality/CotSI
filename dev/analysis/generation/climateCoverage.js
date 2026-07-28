/**
 * climateCoverage.js — Climate-cube coverage report.
 *
 * Generates a multi-biome map and reports which (elevation, moisture)
 * zones are covered by each biome. Tiles assigned to the fallback biome
 * (biome_default when not chosen as the fallback, or any biome that has
 * no climateRange in the future pipeline) are reported as coverage gaps.
 *
 * In the current generator, biome assignment is climate-driven (Phase A)
 * with epicenter overrides. This report shows which (elevation, moisture)
 * tuples each biome claims. The report makes coverage gaps visible.
 *
 * Pure: no DOM, no state, no side effects.
 */
import { generateSingleSeed } from './generate.js';

/** Default seed and radius for coverage reporting. */
const DEFAULT_SEED = 'glut-17';
const DEFAULT_RADIUS = 21;

/** Number of bins per axis for the climate grid summary. */
const CLIMATE_BINS = 10;

/**
 * Run the climate coverage report.
 *
 * @param {string} [seedText='glut-17'] - Seed string
 * @param {number} [radius=21]          - Map radius
 * @returns {{ biomeCounts: object, biomeDefaultTiles: object[], climateGrid: object }}
 *   - biomeCounts: { biomeId: { count, pct } }
 *   - biomeDefaultTiles: array of { q, r, elevationField, moisture } for biome_default tiles
 *   - climateGrid: binned summary of biome coverage
 */
export function runClimateCoverageTest(seedText = DEFAULT_SEED, radius = DEFAULT_RADIUS) {
  const result = generateSingleSeed(seedText, radius, null);
  const tiles = result.tiles;
  const tileEntries = Object.values(tiles);
  const tileCount = tileEntries.length;

  if (tileCount === 0) {
    return { biomeCounts: {}, biomeDefaultTiles: [], climateGrid: {}, error: 'No tiles generated' };
  }

  // Count per-biome and collect biome_default tile data
  const biomeCounts = {};
  const biomeDefaultTiles = [];

  // Climate grid: for each (elevBin, moistBin), which biomes appear?
  const climateGrid = {};

  for (const tile of tileEntries) {
    const { q, r, elevationField, moisture, biomeId } = tile;

    // Count
    if (!biomeCounts[biomeId]) {
      biomeCounts[biomeId] = { count: 0, pct: 0 };
    }
    biomeCounts[biomeId].count++;

    // Track biome_default tiles
    if (biomeId === 'biome_default') {
      biomeDefaultTiles.push({ q, r, elevationField, moisture });
    }

    // Climate grid binning
    const elevBin = Math.min(CLIMATE_BINS - 1, Math.floor(elevationField * CLIMATE_BINS));
    const moistBin = Math.min(CLIMATE_BINS - 1, Math.floor(moisture * CLIMATE_BINS));
    const binKey = `${elevBin},${moistBin}`;
    if (!climateGrid[binKey]) {
      climateGrid[binKey] = { elevBin, moistBin, biomes: new Set(), count: 0 };
    }
    climateGrid[binKey].biomes.add(biomeId);
    climateGrid[binKey].count++;
  }

  // Compute percentages
  for (const biomeId of Object.keys(biomeCounts)) {
    biomeCounts[biomeId].pct = biomeCounts[biomeId].count / tileCount;
  }

  // Convert Sets to arrays for serialization
  const gridEntries = Object.values(climateGrid).map(entry => ({
    ...entry,
    biomes: [...entry.biomes],
  }));

  return {
    biomeCounts,
    biomeDefaultTiles,
    climateGrid: gridEntries,
    totalTiles: tileCount,
    seed: seedText,
    radius,
  };
}

/**
 * Format climate coverage results as a human-readable text report.
 *
 * @param {object} report - Output of runClimateCoverageTest()
 * @returns {string}
 */
export function formatClimateCoverageReport(report) {
  const lines = [];
  lines.push('=== Climate Coverage Report ===');
  lines.push(`Seed: ${report.seed}  |  Radius: ${report.radius}  |  Tiles: ${report.totalTiles}`);
  lines.push('');

  if (report.error) {
    lines.push(`ERROR: ${report.error}`);
    return lines.join('\n');
  }

  // Per-biome counts
  lines.push('Biome distribution:');
  const sorted = Object.entries(report.biomeCounts)
    .sort((a, b) => b[1].count - a[1].count);
  for (const [biomeId, info] of sorted) {
    lines.push(`  ${biomeId}: ${info.count} tiles (${(info.pct * 100).toFixed(1)}%)`);
  }
  lines.push('');

  // biome_default sample tiles (show up to 10)
  if (report.biomeDefaultTiles.length > 0) {
    lines.push(`biome_default tiles: ${report.biomeDefaultTiles.length} (coverage gaps)`);
    lines.push('Sample (elevationField, moisture) coordinates:');
    const sample = report.biomeDefaultTiles.slice(0, 10);
    for (const t of sample) {
      lines.push(`  (${t.q},${t.r})  elev=${t.elevationField?.toFixed(4)}  moist=${t.moisture?.toFixed(4)}`);
    }
    if (report.biomeDefaultTiles.length > 10) {
      lines.push(`  ... and ${report.biomeDefaultTiles.length - 10} more`);
    }
    lines.push('');
  }

  // Climate grid gaps (cells with only biome_default)
  const gapCells = report.climateGrid.filter(
    cell => cell.biomes.length === 1 && cell.biomes[0] === 'biome_default'
  );
  if (gapCells.length > 0) {
    lines.push(`Climate cells covered only by biome_default: ${gapCells.length}`);
    const elevRange = 1 / CLIMATE_BINS;
    const moistRange = 1 / CLIMATE_BINS;
    for (const cell of gapCells) {
      lines.push(
        `  elev [${(cell.elevBin * elevRange).toFixed(1)}, ${((cell.elevBin + 1) * elevRange).toFixed(1)}]  ` +
        `moist [${(cell.moistBin * moistRange).toFixed(1)}, ${((cell.moistBin + 1) * moistRange).toFixed(1)}]  ` +
        `(${cell.count} tiles)`
      );
    }
    lines.push('');
  }

  lines.push('Note: Biome assignment is climate-driven with epicenter overrides.');
  lines.push('biome_default tiles here are climate gaps or fallout from epicenter regions.');
  lines.push('Gaps indicate climate zones with no natural biome match.');
  lines.push('');

  return lines.join('\n');
}
