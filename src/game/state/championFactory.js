/**
 * championFactory.js — Faction base placement and champion creation.
 * Orchestrates spawn positioning, base tile placement, and entity
 * construction for all champion factions.
 */
import { FACTIONS } from '../rules/factionData.js';
import { parseKey } from '../../engine/rules/hexGrid.js';
import { nearestOpenKey } from '../rules/tileQueries.js';
import { placeBase } from './basePlacer.js';
import { startMeasure, endMeasure } from '../../shared/measurements.js';
import { CHAMPION_STARTING_HP, CHAMPION_MAX_HP, CHAMPION_BASE_AP, CHAMPION_SIGHT_RANGE, CHAMPION_STARTING_GOLD, MIN_BASE_DISTANCE_FLOOR, MIN_BASE_DISTANCE_RADIUS_FRACTION } from '../../params/game/championParams.js';
import { FACTION_COUNT, DEFAULT_POTENCY, OWN_FACTION_POTENCY } from '../../params/game/factionParams.js';
/**
 * Place champions on the map with even radial distribution.
 *
 * Spawn targets are precomputed by computeSpawnTargets (gameFactory) so the
 * eager starting region can be generated around them; this pass only runs
 * placement (base, champion start) against the generated tiles.
 *
 * @param {Object}  params.tiles      - The generated tile map keyed by "q,r"
 * @param {Array}   params.champions  - Champion configs in placement (shuffled) order
 * @param {Array}   params.targets    - Precomputed spawn target per champion (parallel to champions)
 * @param {Function} params.rand      - Seeded RNG function returning [0, 1)
 * @param {number}  params.radius     - Map radius in hexes
 * @returns {{ champions: Array, used: Set<string>, placedBaseKeys: Set<string> }}
 */
export function createChampions({ tiles, champions, targets, rand, radius }) {
  startMeasure('placeChamps');

  const used = new Set();
  const placedBaseKeys = new Set();
  const N = champions.length;
  const minBaseDist = Math.max(MIN_BASE_DISTANCE_FLOOR, Math.floor(radius * MIN_BASE_DISTANCE_RADIUS_FRACTION));

  // Materialized hex keys of the eager starting region. Guarding the spawn
  // searches with this set keeps them from triggering lazy chunk generation,
  // so placement cost is bounded by the region, never the map radius.
  const materialized = new Set(Object.keys(tiles));

  const championList = [];

  for (let i = 0; i < N; i++) {
    const entry = champions[i];
    const target = targets[i];
    const baseKey = placeBase(tiles, target, used, placedBaseKeys, minBaseDist, materialized);

    // Place faction base
    used.add(baseKey);
    placedBaseKeys.add(baseKey);
    tiles[baseKey].terrain = 'plains';
    tiles[baseKey].feature = { kind: 'base', faction: entry.faction };

    // Place champion start adjacent to base
    const startKey = nearestOpenKey(tiles, parseKey(baseKey), used, false, materialized);
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
      baseActionPoints: CHAMPION_BASE_AP,
      actionPoints: 0,
      sight: CHAMPION_SIGHT_RANGE,
      gold: CHAMPION_STARTING_GOLD,
      knot: 0,
      relics: 0,
      potencies,
      artifact: null,
      armor: 'worn linen',
      weapon: 'ash staff',
      buffs: { attack: 0, defense: 0 },
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
