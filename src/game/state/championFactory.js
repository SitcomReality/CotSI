/**
 * championFactory.js — Faction base placement and champion creation.
 * Orchestrates spawn positioning, base tile placement, and entity
 * construction for all champion factions.
 */
import { FACTIONS } from '../rules/factionData.js';
import { parseKey } from '../../engine/rules/hexGrid.js';
import { nearestOpenKey } from '../rules/tileQueries.js';
import { shuffle } from '../../engine/rules/shuffle.js';
import { spawnTarget } from './spawnPosition.js';
import { placeBase } from './basePlacer.js';

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

  const championList = [];

  for (let i = 0; i < N; i++) {
    const entry = shuffledChamps[i];
    const target = spawnTarget(i, N, rand, radius);
    const baseKey = placeBase(tiles, target, used, placedBaseKeys);

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
