/**
 * championFactory.js — Faction base placement and champion creation.
 * Reads the tile map, places faction bases at radially-distributed spawn
 * points, and returns champion entries + the set of claimed hexes.
 */
import { FACTIONS } from '../rules/factionData.js';
import { distance, parseKey } from '../../engine/rules/hexGrid.js';
import {
  nearestOpenKey,
  nearestOpenMultiRing,
  TERRAIN,
} from '../rules/terrainGeneration.js';
import { shuffle } from '../../engine/rules/shuffle.js';

/**
 * Place champions on the map with even radial distribution.
 *
 * @param {Object}  params.tiles      - The generated tile map keyed by "q,r"
 * @param {Array}   params.champions  - Champion configs from the setup screen
 * @param {Function} params.rand      - Seeded RNG function returning [0, 1)
 * @param {number}  params.radius     - Map radius in hexes
 * @returns {{ champions: Array, used: Set<string>, placedBaseKeys: Set<string> }}
 */
export function createChampions({ tiles, champions, rand, radius }) {
  const used = new Set();
  const placedBaseKeys = new Set();
  const shuffledChamps = shuffle(champions, rand);
  const N = shuffledChamps.length;
  const basesRing = Math.max(2, Math.floor(radius * 0.45));   // ~45% of map radius
  const basesJitter = Math.max(1, Math.floor(radius * 0.15)); // ± radial jitter
  const wedgeSize = (2 * Math.PI) / N;
  const MIN_BASE_DIST = 2; // hexes

  const championList = [];

  for (let i = 0; i < N; i++) {
    const entry = shuffledChamps[i];

    // Jittered ring distance — keeps spawns in the middle band of the map
    const ring = Math.max(2, Math.min(radius - 2,
      basesRing + Math.floor((rand() - 0.5) * 2 * basesJitter)));

    // Jittered angle — each faction occupies a wedge
    const angle = (i / N) * 2 * Math.PI + (rand() - 0.5) * wedgeSize * 0.5;

    // Convert polar to approximate axial hex coordinates
    const target = {
      q: Math.round(ring * Math.cos(angle)),
      r: Math.round(ring * Math.sin(angle)),
    };

    // Search outward from target for a suitable base tile
    const sortedKeys = Object.keys(tiles).sort(
      (a, b) => distance(target, parseKey(a)) - distance(target, parseKey(b))
    );

    let baseKey = null;
    for (const key of sortedKeys) {
      const t = tiles[key];
      if (used.has(key) || !TERRAIN[t.terrain].passable) continue;
      if (t.feature) continue;

      // Enforce minimum distance from other faction bases
      let tooClose = false;
      for (const placedKey of placedBaseKeys) {
        if (distance(parseKey(key), parseKey(placedKey)) < MIN_BASE_DIST) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      baseKey = key;
      break;
    }

    // Fallback: nearest open tile to target (ignoring inter-base distance)
    if (!baseKey) {
      baseKey = sortedKeys.find(k => {
        const t = tiles[k];
        return !used.has(k) && TERRAIN[t.terrain].passable && !t.feature;
      }) ?? null;
    }

    // Last resort: nearest open key from origin
    if (!baseKey) {
      baseKey = nearestOpenMultiRing(tiles, { q: 0, r: 0 }, used, 1)
        ?? nearestOpenKey(tiles, { q: 0, r: 0 }, used, true);
    }

    // Place faction base
    used.add(baseKey);
    placedBaseKeys.add(baseKey);
    tiles[baseKey].terrain = 'plains';
    tiles[baseKey].feature = { kind: 'base', faction: entry.faction };

    // Place champion start adjacent to base
    const startKey = nearestOpenKey(tiles, parseKey(baseKey), used, false);
    used.add(startKey);
    const start = parseKey(startKey);
    const potencies = Array(7).fill(1);
    potencies[entry.faction] = 3;
    championList.push({
      id: `champ-${entry.faction}-${i}`,
      name: `${FACTIONS[entry.faction].name} Champion`,
      faction: entry.faction,
      controller: entry.controller,
      pos: start,
      hp: 100,
      maxHp: 100,
      baseMove: 5,
      moves: 0,
      sight: 4,
      gold: 24,
      knot: 0,
      relics: 0,
      potencies,
      artifact: null,
      armor: 'worn linen',
      weapon: 'ash staff',
      offeredArtifact: false,
      pendingDig: false,
      dispatchLedger: [],
      lastActionCombat: false,
      alive: true,
      visible: [],
      explored: [],
    });
  }

  return { champions: championList, used, placedBaseKeys };
}
