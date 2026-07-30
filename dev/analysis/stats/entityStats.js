/**
 * entityStats.js — Entity-statistic collection functions.
 *
 * All functions take entity data and return structured statistics.
 * Pure: no DOM, no state, no side effects.
 */
import { distance } from '../../../src/engine/rules/hexGrid.js';

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
