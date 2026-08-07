/**
 * tileStats.js — Per-tile statistic collection functions.
 *
 * All functions take tile data and return structured statistics.
 * Pure: no DOM, no state, no side effects.
 */
import { TERRAIN } from '../../../src/game/rules/terrainTypes.js';

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

export function featureCounts(tiles) {
  let trees = 0;
  let fruitTrees = 0;
  let knots = 0;
  let bases = 0;
  let bushes = 0;
  let chests = 0;

  for (const key of Object.keys(tiles)) {
    const f = tiles[key].feature;
    if (!f) continue;
    switch (f.kind) {
      case 'tree': trees++; break;
      case 'fruitTree': fruitTrees++; break;
      case 'knot': knots++; break;
      case 'base': bases++; break;
      case 'bush': bushes++; break;
      case 'chest': chests++; break;
    }
  }

  return { trees, fruitTrees, knots, bases, bushes, chests };
}

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
