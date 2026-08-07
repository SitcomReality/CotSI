/**
 * tileStats.js — Per-tile statistic collection functions.
 *
 * All functions take tile data and return structured statistics.
 * Pure: no DOM, no state, no side effects.
 */
import { TERRAIN } from '../../../src/game/rules/terrainTypes.js';
import { listArchetypes, getArchetype } from '../../../src/game/rules/archetypes.js';
import { centerDistance01 } from '../../../src/game/rules/terrainGen/features/featureSpawning.js';

/**
 * Feature kind → placement tier map, derived from the biome feature rules
 * (the single source of truth — rules without a `tier` field are T1).
 */
function tierByKind() {
  const map = new Map();
  for (const id of listArchetypes('biome')) {
    const def = getArchetype(id);
    for (const rule of def?.features ?? []) {
      if (rule.kind) map.set(rule.kind, rule.tier ?? 'T1');
    }
  }
  return map;
}

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

/**
 * Feature composition by distance band and placement tier (featureDesign.md §3).
 *
 * Buckets passable tiles into three equal-radius bands (inner / mid / outer)
 * and counts each band's features per tier, plus the band's passable-tile
 * count so rates are comparable across unequal band sizes. T1 is uniform,
 * T2 ramps mildly, T3 strongly, T4 is center-only.
 *
 * @param {object} tiles  - Tile map keyed by "q,r"
 * @param {number} radius - Map radius in hexes
 * @returns {Array<{ label: string, counts: object, features: number, passable: number }>}
 */
export function featureTierBands(tiles, radius) {
  const tier = tierByKind();
  const bands = [
    { label: 'inner', lo: 0, hi: 1 / 3, counts: { T1: 0, T2: 0, T3: 0, T4: 0 }, features: 0, passable: 0 },
    { label: 'mid', lo: 1 / 3, hi: 2 / 3, counts: { T1: 0, T2: 0, T3: 0, T4: 0 }, features: 0, passable: 0 },
    { label: 'outer', lo: 2 / 3, hi: 1, counts: { T1: 0, T2: 0, T3: 0, T4: 0 }, features: 0, passable: 0 },
  ];
  const bandFor = (d01) => (d01 < 1 / 3 ? bands[0] : d01 < 2 / 3 ? bands[1] : bands[2]);

  for (const key of Object.keys(tiles)) {
    const t = tiles[key];
    if (!TERRAIN[t.terrain]?.passable) continue;
    const [q, r] = key.split(',').map(Number);
    const band = bandFor(centerDistance01(q, r, radius));
    band.passable++;
    const kind = t.feature?.kind;
    if (!kind) continue;
    const tKey = tier.get(kind) ?? 'T1';
    if (tKey === 'T1' || tKey === 'T2' || tKey === 'T3' || tKey === 'T4') {
      band.counts[tKey]++;
      band.features++;
    }
  }
  return bands;
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
