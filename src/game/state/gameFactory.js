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
import { rebuildSpatialIndex } from './spatialIndex.js';
import { createTileProxy } from './tileAccess.js';
import { tileToChunk, chunkKey, localCoord, localKey } from '../../engine/rules/chunkGrid.js';

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
  const flatTiles = generateTiles(seed, radius, biomeDef, mapSettings);
  const rng = makeRng(seed);
  const rand = () => rng();

  // --- Build the bare state skeleton ---
  const state = createInitialState({
    seed, radius, biome, mapSettings, biomePalette, tiles: flatTiles, objectives, rng,
  });

  // --- Build chunk storage from flat tiles, then install the Proxy ---
  for (const [, tile] of Object.entries(flatTiles)) {
    const { cq, cr } = tileToChunk(tile.q, tile.r);
    const ck = chunkKey(cq, cr);
    let chunk = state.chunks.get(ck);
    if (!chunk) {
      chunk = { tiles: new Map(), dirty: false, generated: true };
      state.chunks.set(ck, chunk);
    }
    const { lq, lr } = localCoord(cq, cr, tile.q, tile.r);
    chunk.tiles.set(localKey(lq, lr), tile);
  }
  // Replace the flat state.tiles with a Proxy backed by chunk storage
  state.tiles = createTileProxy(state);

  // Use the proxy as the tiles reference for downstream consumers
  const tiles = state.tiles;

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
  rebuildSpatialIndex(state);

  return state;
}
