/**
 * gameFactory.js — Orchestration of world and champion creation.
 * Composes initial state, champion placement, entity generation,
 * turn order, and first-turn setup into a single `createGame` call.
 *
 * This is the only module that wires together the sub-factories;
 * it imports from game/state, game/rules, and engine/rules.
 *
 * Multi-biome mode: pass biome = 'multi_biome' to enable per-hex
 * biome assignment via FBM noise in terrainGenerator.js.
 */
import { makeRng, stringSeed } from '../../engine/rules/seededRng.js';
import { generateTiles, ensureSpawnClearance } from '../rules/terrainGen/index.js';
import { getArchetype } from '../rules/archetypes.js';
import '../rules/archetypeData/index.js'; // side-effect: populate archetype registry
import { shuffle } from '../../engine/rules/shuffle.js';
import { createInitialState } from './initialGameState.js';
import { createChampions } from './championFactory.js';
import { createMobs, createTraders } from './entityFactory.js';
import { refreshVision } from './fogOfWar.js';
import { beginTurn } from './turnActions.js';
import { rebuildSpatialIndex } from './spatialIndex.js';
import { createTileProxy } from './tileProxy.js';
import { tileToChunk, chunkKey, localCoord, localKey } from '../../engine/rules/chunkGrid.js';
import { startMeasure, endMeasure } from '../../dev/devPerformance.js';
import { spawnTarget } from './spawnPosition.js';

export function createGame({
  seed = 'glut-17',
  radius = 7,
  champions = [],
  objectives = { relicRace: true, relicTarget: 7, lastStanding: true },
  biome = 'multi_biome',
  mapSettings = {},
}) {
  const isMultiBiome = biome === 'multi_biome';

  // For single-biome mode, resolve once
  const singleBiomeDef = isMultiBiome ? null : (getArchetype(biome) || getArchetype('biome_default'));

  // Generate flat tiles — biomeDef=null for multi-biome (per-hex assignment
  // inside the generator), or a single biomeDef for single-biome mode
  const flatTiles = generateTiles(
    seed, radius,
    isMultiBiome ? null : singleBiomeDef,
    mapSettings,
  );

  // Post-classification: clear passable terrain around faction spawn targets.
  // Uses an independent RNG stream so the game-state RNG is unaffected.
  if (isMultiBiome) {
    const clearanceRng = makeRng(seed + ':clearance');
    const clearanceRand = () => clearanceRng();
    const championCount = champions.length;
    const spawnTargets = [];
    for (let i = 0; i < championCount; i++) {
      spawnTargets.push(spawnTarget(i, championCount, clearanceRand, radius));
    }
    ensureSpawnClearance(flatTiles, radius, spawnTargets);
  }

  const rng = makeRng(seed);
  const rand = () => rng();

  // Build biomePalettes: a Map of biomeId → palette for all biomes on this map
  const biomePalettes = new Map();
  for (const [, tile] of Object.entries(flatTiles)) {
    if (tile.biomeId && !biomePalettes.has(tile.biomeId)) {
      const def = getArchetype(tile.biomeId);
      if (def && def.palette) {
        biomePalettes.set(tile.biomeId, def.palette);
      }
    }
  }
  // Fallback: if no tile has a biomeId (single-biome mode), use the resolved biomeDef
  if (biomePalettes.size === 0 && singleBiomeDef?.palette) {
    biomePalettes.set(biome, singleBiomeDef.palette);
  }

  // --- Build the bare state skeleton ---
  const state = createInitialState({
    seed, radius, biome, mapSettings,
    biomePalettes,
    tiles: flatTiles, objectives, rng,
  });
  startMeasure('createGame');

  // --- Build chunk storage from flat tiles, then install the Proxy ---
  for (const [, tile] of Object.entries(flatTiles)) {
    const { cq, cr } = tileToChunk(tile.q, tile.r);
    const ck = chunkKey(cq, cr);
    let chunk = state.chunks.get(ck);
    if (!chunk) {
      // Inherit biomeId from the first tile
      chunk = { tiles: new Map(), dirty: false, generated: true, biomeId: tile.biomeId || null };
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

  // --- Build base key index for fast trader route selection ---
  state._baseKeys = new Set();
  for (const [, tile] of Object.entries(flatTiles)) {
    if (tile.feature?.kind === 'base') {
      state._baseKeys.add(`${tile.q},${tile.r}`);
    }
  }

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

  endMeasure('createGame');
  return state;
}
