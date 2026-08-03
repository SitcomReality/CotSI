/**
 * championFactory.js — Faction base placement and champion creation.
 * Orchestrates spawn positioning, base tile placement, and entity
 * construction for all champion factions.
 */
import { FACTIONS, PALEY_CYCLES } from '../rules/factionData.js';
import { parseKey } from '../../engine/rules/hexGrid.js';
import { nearestOpenKey } from '../rules/tileQueries.js';
import { shuffle } from '../../engine/rules/shuffle.js';
import { spawnTarget } from './spawnPosition.js';
import { placeBase } from './basePlacer.js';
import { startMeasure, endMeasure } from '../../dev/performance/index.js';
import { CHAMPION_STARTING_HP, CHAMPION_MAX_HP, CHAMPION_BASE_MOVE, CHAMPION_SIGHT_RANGE, CHAMPION_STARTING_GOLD, MIN_BASE_DISTANCE_FLOOR, MIN_BASE_DISTANCE_RADIUS_FRACTION } from '../../params/game/championParams.js';
import { FACTION_COUNT, DEFAULT_POTENCY, OWN_FACTION_POTENCY } from '../../params/game/factionParams.js';

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
  startMeasure('placeChamps');

  const used = new Set();
  const placedBaseKeys = new Set();
  const N = champions.length;
  const minBaseDist = Math.max(MIN_BASE_DISTANCE_FLOOR, Math.floor(radius * MIN_BASE_DISTANCE_RADIUS_FRACTION));

  // When all 7 factions are present, pick a random Paley cycle to determine
  // angular positions. Each faction's clockwise neighbour on the map is then
  // either a faction it beats (CW cycle) or one that beats it (CCW cycle),
  // chosen 50/50.  Fall back to shuffle-index angles for partial games.
  let angIdx = null;
  if (N === FACTION_COUNT) {
    const cycle = PALEY_CYCLES[Math.floor(rand() * PALEY_CYCLES.length)];
    const rot = Math.floor(rand() * 7);
    angIdx = new Array(7);
    for (let j = 0; j < 7; j++) {
      angIdx[cycle[(j + rot) % 7]] = j;
    }
  }

  // Shuffle for base-placement order variety — does not affect angular positions
  const shuffledChamps = shuffle([...champions], rand);

  const championList = [];

  for (let i = 0; i < N; i++) {
    const entry = shuffledChamps[i];
    const target = spawnTarget(angIdx ? angIdx[entry.faction] : i, N, rand, radius);
    const baseKey = placeBase(tiles, target, used, placedBaseKeys, minBaseDist);

    // Place faction base
    used.add(baseKey);
    placedBaseKeys.add(baseKey);
    tiles[baseKey].terrain = 'plains';
    tiles[baseKey].feature = { kind: 'base', faction: entry.faction };

    // Place champion start adjacent to base
    const startKey = nearestOpenKey(tiles, parseKey(baseKey), used, false);
    used.add(startKey);
    const start = parseKey(startKey);

    const potencies = Array(FACTION_COUNT).fill(DEFAULT_POTENCY);
    potencies[entry.faction] = OWN_FACTION_POTENCY;
    championList.push({
      id: `champ-${entry.faction}-${i}`,
      name: `${FACTIONS[entry.faction].name} Champion`,
      faction: entry.faction,
      controller: entry.controller,
      pos: start,
      hp: CHAMPION_STARTING_HP,
      maxHp: CHAMPION_MAX_HP,
      baseMove: CHAMPION_BASE_MOVE,
      moves: 0,
      sight: CHAMPION_SIGHT_RANGE,
      gold: CHAMPION_STARTING_GOLD,
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

  endMeasure('placeChamps');
  return { champions: championList, used, placedBaseKeys };
}
