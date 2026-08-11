import { coordKey, distance, neighbors } from '../../../../engine/rules/hexGrid.js';
import { WATER_BFS_MAX_DEPTH, OCEAN_EDGE_BUFFER } from '../../../../params/game/terrainGenParams.js';
import { provisionalTerrainForRing } from '../classification/provisionalWater.js';

export function waterTypeForTile(q, r, radius, fieldMap, tileLookup) {
  if (distance({ q: 0, r: 0 }, { q, r }) >= radius - OCEAN_EDGE_BUFFER) {
    return 'ocean';
  }

  const seen = new Set();
  const queue = [{ q, r, depth: 0 }];
  seen.add(`${q},${r}`);

  while (queue.length) {
    const cur = queue.shift();
    if (cur.depth >= WATER_BFS_MAX_DEPTH) continue;

    for (const n of neighbors({ q: cur.q, r: cur.r })) {
      const nk = `${n.q},${n.r}`;
      if (seen.has(nk)) continue;
      seen.add(nk);

      const existing = tileLookup(n.q, n.r);
      const prov = provisionalTerrainForRing(n.q, n.r, fieldMap);
      const isWater = existing
        ? existing.terrain === 'water'
        : prov === 'water';

      if (!isWater) continue;

      if (distance({ q: 0, r: 0 }, { q: n.q, r: n.r }) >= radius - OCEAN_EDGE_BUFFER) {
        return 'ocean';
      }

      queue.push({ q: n.q, r: n.r, depth: cur.depth + 1 });
    }
  }

  return 'lake';
}
