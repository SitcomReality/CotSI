/**
 * gameFactory.js — World and champion creation.
 * Depends on world generation (map), factions, weather, RNG.
 */
import { FACTIONS, ARTIFACTS } from '../rules/factionData.js';
import { weatherForDay } from '../rules/weatherScript.js';
import { makeRng } from '../../engine/rules/seededRng.js';
import { distance, coordKey, parseKey } from '../../engine/rules/hexGrid.js';
import { generateTiles, nearestOpenKey, nearestOpenMultiRing, TERRAIN } from '../rules/terrainGeneration.js';
import { getArchetypesByType } from '../rules/archetypes.js';
import '../rules/archetypeData.js'; // side-effect: populate archetype registry
import { refreshVision } from './fogOfWar.js';
import { beginTurn } from './turnActions.js';

export function traderStock(rand) {
  return [
    { type: 'heal', name: 'Moonberry', cost: 14, heal: 10 },
    { type: 'potency', faction: Math.floor(rand() * 7), cost: 22 },
    {
      type: 'equip',
      slot: 'weapon',
      name: ['Thorn Brand', 'Chrono Quill', 'Masque Knife'][Math.floor(rand() * 3)],
      cost: 34,
      bonus: { secondary: 1 },
    },
  ];
}

export function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createGame({ seed = 'glut-17', radius = 7, champions = [], objectives = { relicRace: true, relicTarget: 7, lastStanding: true } }) {
  const tiles = generateTiles(seed, radius);
  const rng = makeRng(seed);
  const rand = () => rng();
  const state = {
    screen: 'world',
    seed,
    radius,
    day: 1,
    weather: weatherForDay(1),
    tiles,
    champions: [],
    mobs: [],
    traders: [],
    currentOrder: [],
    globalOrder: [],
    activeChampionId: '',
    objectives,
    logs: ['The page wakes. The Interregnum begins.'],
    selectedTile: null,
    reward: null,
    dispatch: null,
    notice: null,
    winnerId: null,
    victoryReason: '',
    turnLock: false,
    _rng: rng,
  };

  // ---- Spawn placement: shuffled, inward-biased, with clearings ----
  // Build candidate pool of tiles that are far enough from edge and not too central
  const allTileKeys = Object.keys(tiles);
  const candidatePool = shuffle(
    allTileKeys.filter(k => {
      const t = tiles[k];
      if (!TERRAIN[t.terrain].passable) return false;
      const d = distance({ q: 0, r: 0 }, parseKey(k));
      return d >= Math.max(1, Math.floor(radius / 3)) && d <= Math.max(3, radius - 2);
    }),
    rand
  );

  const used = new Set();
  const shuffledChamps = shuffle(champions, rand);

  for (const entry of shuffledChamps) {
    let baseKey = null;

    // Try clearRadius=2 first
    for (const poolKey of candidatePool) {
      if (used.has(poolKey)) continue;
      let clear = true;
      for (const otherKey of allTileKeys) {
        if (distance(parseKey(poolKey), parseKey(otherKey)) <= 2) {
          const ot = tiles[otherKey];
          if (!TERRAIN[ot.terrain].passable || used.has(otherKey) || ot.feature) {
            clear = false;
            break;
          }
        }
      }
      if (clear) {
        baseKey = poolKey;
        break;
      }
    }

    // Fallback: try clearRadius=1 (for small maps where clearRadius=2 is impossible)
    if (!baseKey) {
      for (const poolKey of candidatePool) {
        if (used.has(poolKey)) continue;
        let clear = true;
        for (const otherKey of allTileKeys) {
          if (distance(parseKey(poolKey), parseKey(otherKey)) <= 1) {
            const ot = tiles[otherKey];
            if (!TERRAIN[ot.terrain].passable || used.has(otherKey) || ot.feature) {
              clear = false;
              break;
            }
          }
        }
        if (clear) {
          baseKey = poolKey;
          break;
        }
      }
    }

    // Last resort: nearest open key from origin
    if (!baseKey) {
      baseKey = nearestOpenMultiRing(tiles, { q: 0, r: 0 }, used, 1)
        ?? nearestOpenKey(tiles, { q: 0, r: 0 }, used, true);
    }

    // Place faction base
    used.add(baseKey);
    tiles[baseKey].terrain = 'plains';
    tiles[baseKey].feature = { kind: 'base', faction: entry.faction };

    // Place champion start adjacent to base
    const startKey = nearestOpenKey(tiles, parseKey(baseKey), used, false);
    used.add(startKey);
    const start = parseKey(startKey);
    const potencies = Array(7).fill(1);
    potencies[entry.faction] = 3;
    state.champions.push({
      id: `champ-${entry.faction}-${shuffledChamps.indexOf(entry)}`,
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

  // mobs — created from archetype registry
  const mobArchetypes = getArchetypesByType('mob');
  const passable = Object.keys(tiles).filter(k => TERRAIN[tiles[k].terrain].passable && !tiles[k].feature && !used.has(k));
  const mobCount = Math.max(6, radius * 2);
  for (let i = 0; i < mobCount; i++) {
    if (!passable.length) break;
    const key = passable.splice(Math.floor(rand() * passable.length), 1)[0];
    const faction = Math.floor(rand() * 7);
    const potencies = Array(7)
      .fill(0)
      .map((_, c) => 3 + (c === faction ? 5 : 0) + ([1, 2, 4].includes((c - faction + 7) % 7) ? 1 : 0));
    // Pick a random mob archetype (occasionally a higher-tier variant)
    const archetype = mobArchetypes[Math.floor(rand() * mobArchetypes.length)];
    const base = archetype.baseStats;
    const hpRoll = Math.floor(rand() * (base.hp * 0.5));
    const goldRoll = Math.floor(rand() * (archetype.lootGold[1] - archetype.lootGold[0]));
    state.mobs.push({
      id: `mob-${i}`,
      name: archetype.name,
      archetypeName: archetype.archetypeShape,
      faction,
      pos: parseKey(key),
      hp: base.hp + hpRoll,
      maxHp: base.maxHp,
      potencies,
      alive: true,
      tier: base.tier,
      lootGold: archetype.lootGold[0] + goldRoll,
      aggressive: rand() < archetype.aggressiveChance,
      visualScale: archetype.visual.scale,
    });
  }

  // traders
  for (let i = 0; i < 3; i++) {
    const key = Object.keys(tiles).find(k => TERRAIN[tiles[k].terrain].passable && !tiles[k].feature && !used.has(k));
    if (!key) break;
    used.add(key);
    state.traders.push({
      id: `tr-${i}`,
      pos: parseKey(key),
      stock: traderStock(rand),
      targetBaseKey:
        Object.keys(tiles).filter(k => tiles[k].feature?.kind === 'base')[i % champions.length] || key,
      movesPerDay: 2,
    });
  }

  state.currentOrder = shuffle(
    [...state.champions.map(c => c.id)],
    rand
  );
  state.globalOrder = [...state.currentOrder];
  // Set herald for day 1 so it shows before the first champion's dispatch
  state.herald = {
    day: state.day,
    weather: { name: state.weather.name, text: state.weather.text, tint: state.weather.tint },
    order: [...state.currentOrder],
    champions: state.champions,
  };
  state.activeChampionId = state.currentOrder[0];
  refreshVision(state);
  beginTurn(state, state.activeChampionId);
  return state;
}