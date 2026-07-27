/**
 * stats.js — Pure stat-collection functions for the analysis page.
 *
 * All functions take tile/entity data and return structured statistics.
 * No DOM, no rendering, no side effects.
 */
import { TERRAIN } from '../../src/game/rules/terrainTypes.js';
import { coordKey, distance } from '../../src/engine/rules/hexGrid.js';

// ─── Biome distribution ──────────────────────────────────────────────────────

export function biomeDistribution(tiles) {
  const counts = {};
  let total = 0;

  for (const key of Object.keys(tiles)) {
    const bid = tiles[key].biomeId || 'unknown';
    counts[bid] = (counts[bid] || 0) + 1;
    total++;
  }

  const dist = {};
  for (const [bid, count] of Object.entries(counts)) {
    dist[bid] = { count, pct: total > 0 ? (count / total * 100).toFixed(1) : '0.0' };
  }

  return { dist, total };
}

// ─── Terrain ─────────────────────────────────────────────────────────────────

export function terrainDistribution(tiles) {
  const counts = {};
  let total = 0;

  for (const key of Object.keys(tiles)) {
    const t = tiles[key].terrain;
    counts[t] = (counts[t] || 0) + 1;
    total++;
  }

  const dist = {};
  for (const [terrain, count] of Object.entries(counts)) {
    dist[terrain] = { count, pct: total > 0 ? (count / total * 100).toFixed(1) : '0.0' };
  }

  return { dist, total };
}

// ─── Features ─────────────────────────────────────────────────────────────────

export function featureCounts(tiles) {
  let trees = 0;
  let fruitTrees = 0;
  let largeTrees = 0;
  let knots = 0;
  let bases = 0;
  let bushes = 0;
  let vines = 0;

  for (const key of Object.keys(tiles)) {
    const f = tiles[key].feature;
    if (!f) continue;
    switch (f.kind) {
      case 'tree': trees++; break;
      case 'fruitTree': fruitTrees++; break;
      case 'largeTree': largeTrees++; break;
      case 'knot': knots++; break;
      case 'base': bases++; break;
      case 'bush': bushes++; break;
      case 'vine': vines++; break;
    }
  }

  return { trees, fruitTrees, largeTrees, knots, bases, bushes, vines };
}

export function debrisCounts(tiles) {
  let tufts = 0;
  let rocks = 0;
  let flowers = 0;

  for (const key of Object.keys(tiles)) {
    const d = tiles[key].debris;
    if (!d) continue;
    if (d.kind === 'tuft') tufts++;
    else if (d.kind === 'rock') rocks++;
    else if (d.kind === 'flower') flowers++;
  }

  return { tufts, rocks, flowers, total: tufts + rocks + flowers };
}

// ─── Mountains ────────────────────────────────────────────────────────────────

export function mountainAnalysis(tiles) {
  let total = 0;
  let peaks = 0;
  let slopes = 0;
  let isolated = 0;
  let untyped = 0;

  for (const key of Object.keys(tiles)) {
    if (tiles[key].terrain !== 'mountain') continue;
    total++;
    const mt = tiles[key].mountainType;
    if (mt === 'peak') peaks++;
    else if (mt === 'slope') slopes++;
    else if (mt === 'isolated') isolated++;
    else untyped++;
  }

  return { total, peaks, slopes, isolated, untyped };
}

// ─── Water ───────────────────────────────────────────────────────────────────

export function waterAnalysis(tiles) {
  let total = 0;
  let lakes = 0;
  let oceans = 0;
  let untyped = 0;

  for (const key of Object.keys(tiles)) {
    if (tiles[key].terrain !== 'water') continue;
    total++;
    const wt = tiles[key].waterType;
    if (wt === 'lake') lakes++;
    else if (wt === 'ocean') oceans++;
    else untyped++;
  }

  return { total, lakes, oceans, untyped };
}

// ─── Entities ─────────────────────────────────────────────────────────────────

export function entityStats(champions, mobs, traders) {
  return {
    champions: champions ? champions.filter(c => c.alive !== false).length : 0,
    mobs: mobs ? mobs.filter(m => m.alive !== false).length : 0,
    traders: traders ? traders.length : 0,
  };
}

/**
 * Collect trader positions and distances to center and nearest base.
 */
export function traderAnalysis(tiles, traders, baseKeys) {
  if (!traders || !traders.length) return [];

  const baseList = baseKeys
    ? [...baseKeys].map(k => { const [q, r] = k.split(',').map(Number); return { q, r }; })
    : [];

  return traders.map(t => {
    const distToCenter = distance({ q: 0, r: 0 }, t.pos);
    let minBaseDist = Infinity;
    for (const b of baseList) {
      const d = distance(t.pos, b);
      if (d < minBaseDist) minBaseDist = d;
    }
    return {
      pos: { q: t.pos.q, r: t.pos.r },
      distToCenter,
      minBaseDist: minBaseDist === Infinity ? null : minBaseDist,
    };
  });
}

/**
 * Compute a histogram of trader ring positions (distance from center).
 * Returns { ringDist: { [ring]: count } }
 */
export function traderRingHistogram(traders) {
  const hist = {};
  if (!traders) return hist;
  for (const t of traders) {
    const d = distance({ q: 0, r: 0 }, t.pos);
    hist[d] = (hist[d] || 0) + 1;
  }
  return hist;
}

// ─── Aggregate helpers (for multi-seed) ──────────────────────────────────────

/**
 * Combine multiple terrainDistribution results into mean and stddev.
 */
export function aggregateTerrainDistributions(distributions) {
  const terrains = Object.keys(TERRAIN);
  const result = {};

  for (const t of terrains) {
    const pcts = distributions.map(d => parseFloat((d.dist[t] || {}).pct || 0));
    const mean = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    const variance = pcts.reduce((sum, v) => sum + (v - mean) ** 2, 0) / pcts.length;
    result[t] = {
      mean: mean.toFixed(1),
      stddev: Math.sqrt(variance).toFixed(2),
      min: Math.min(...pcts).toFixed(1),
      max: Math.max(...pcts).toFixed(1),
    };
  }

  return result;
}
