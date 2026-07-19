/**
 * gameFactory.js — World and champion creation.
 * Depends on world generation (map), factions, weather, RNG.
 */
import { FACTIONS, ARTIFACTS } from '../rules/factionData.js';
import { weatherForDay } from '../rules/weatherScript.js';
import { makeRng } from '../../engine/rules/seededRng.js';
import { hexRing, coordKey, parseKey } from '../../engine/rules/hexGrid.js';
import { generateTiles, nearestOpenKey, TERRAIN } from '../rules/terrainGeneration.js';
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
    notice: null,
    winnerId: null,
    victoryReason: '',
    _rng: rng,
  };

  const ring = hexRing(Math.max(2, radius - 2));
  const used = new Set();
  champions.forEach((entry, index) => {
    const baseGuess = ring[Math.floor((index / champions.length) * ring.length) % ring.length];
    const baseKey = nearestOpenKey(tiles, baseGuess, used, true);
    used.add(baseKey);
    tiles[baseKey].terrain = 'plains';
    tiles[baseKey].feature = { kind: 'base', faction: entry.faction };
    const startKey = nearestOpenKey(tiles, parseKey(baseKey), used, false);
    used.add(startKey);
    const start = parseKey(startKey);
    const potencies = Array(7).fill(1);
    potencies[entry.faction] = 3;
    state.champions.push({
      id: `champ-${entry.faction}-${index}`,
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
      lastActionCombat: false,
      alive: true,
      visible: [],
      explored: [],
    });
  });

  // mobs
  const mobNames = ['Ink Bear', 'Lunar Leopard', 'Snail Knight', 'Solar Tapir', 'Abusive Mushroom', 'Marginal Goose', 'Scorpiocelot'];
  const passable = Object.keys(tiles).filter(k => TERRAIN[tiles[k].terrain].passable && !tiles[k].feature && !used.has(k));
  const mobCount = Math.max(6, radius * 2);
  for (let i = 0; i < mobCount; i++) {
    if (!passable.length) break;
    const key = passable.splice(Math.floor(rand() * passable.length), 1)[0];
    const faction = Math.floor(rand() * 7);
    const potencies = Array(7)
      .fill(0)
      .map((_, c) => 3 + (c === faction ? 5 : 0) + ([1, 2, 4].includes((c - faction + 7) % 7) ? 1 : 0));
    state.mobs.push({
      id: `mob-${i}`,
      name: mobNames[i % mobNames.length],
      faction,
      pos: parseKey(key),
      hp: 36 + Math.floor(rand() * 18),
      maxHp: 52,
      potencies,
      alive: true,
      tier: 1,
      lootGold: 12 + Math.floor(rand() * 14),
      aggressive: rand() < 0.25,
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
  state.activeChampionId = state.currentOrder[0];
  refreshVision(state);
  beginTurn(state, state.activeChampionId);
  return state;
}