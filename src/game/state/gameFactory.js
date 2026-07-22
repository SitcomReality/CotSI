/**
 * gameFactory.js — Orchestration of world and champion creation.
 * Composes initial state, champion placement, entity generation,
 * turn order, and first-turn setup into a single `createGame` call.
 *
 * This is the only module that wires together the sub-factories;
 * it imports from game/state, game/rules, and engine/rules.
 */
import { makeRng } from '../../engine/rules/seededRng.js';
import { generateTiles } from '../rules/terrainGenerator.js';
import { getArchetype } from '../rules/archetypes.js';
import '../rules/archetypeData/index.js'; // side-effect: populate archetype registry
import { shuffle } from '../../engine/rules/shuffle.js';
import { createInitialState } from './initialGameState.js';
import { createChampions } from './championFactory.js';
import { createMobs, createTraders } from './entityFactory.js';
import { refreshVision } from './fogOfWar.js';
import { beginTurn } from './turnActions.js';

export function createGame({
  seed = 'glut-17',
  radius = 7,
  champions = [],
  objectives = { relicRace: true, relicTarget: 7, lastStanding: true },
  biome = 'biome_default',
  mapSettings = {},
}) {
  const biomeDef = getArchetype(biome) || getArchetype('biome_default');
  const biomePalette = biomeDef?.palette || null;
  const tiles = generateTiles(seed, radius, biomeDef, mapSettings);
  const rng = makeRng(seed);
  const rand = () => rng();

  // --- Build the bare state skeleton ---
  const state = createInitialState({
    seed, radius, biome, mapSettings, biomePalette, tiles, objectives, rng,
  });

  // --- Place factions and build champion entries ---
  const { champions: champEntries, used } = createChampions({
    tiles, champions, rand, radius,
  });
  state.champions = champEntries;

  // --- Seed the map with mobs and traders ---
  state.mobs = createMobs({ tiles, rand, used, radius });
  state.traders = createTraders({ tiles, rand, used, champions });

  // --- Turn order, herald, and first-turn setup ---
  state.currentOrder = shuffle(
    [...state.champions.map(c => c.id)],
    rand,
  );
  state.globalOrder = [...state.currentOrder];

  state.herald = {
    day: state.day,
    weather: {
      name: state.weather.name,
      text: state.weather.text,
      tint: state.weather.tint,
    },
    order: [...state.currentOrder],
    champions: state.champions,
    deathOrder: [],
  };

  state.activeChampionId = state.currentOrder[0];
  refreshVision(state);
  beginTurn(state, state.activeChampionId);

  return state;
}
