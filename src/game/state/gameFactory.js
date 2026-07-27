/**
 * gameFactory.js — Orchestration of world and champion creation.
 * Composes initial state, champion placement, entity generation,
 * turn order, and first-turn setup into a single `createGame` call.
 *
 * This is the only module that wires together the sub-factories;
 * it imports from game/state, game/rules, and engine/rules.
 *
 * Multi-biome mode: pass biome = 'multi_biome' to enable per-chunk
 * biome assignment via NOISE_CHANNEL_BIOME.
 */
import { makeRng, stringSeed, seededNoise } from '../../engine/rules/seededRng.js';
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
import { startMeasure, endMeasure } from '../../dev/devPerformance.js';
import { NOISE_CHANNEL_BIOME } from '../../params/game/worldParams.js';

/** Simple threshold-based biome distribution for noise roll [0, 1). */
const BIOME_DISTRIBUTION = [
  { limit: 0.40, id: 'biome_default' },
  { limit: 0.70, id: 'biome_lush' },
  { limit: 1.00, id: 'biome_arid' },
];

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

  // Build biome lookup for multi-biome mode
  let biomeLookup = null;

  if (isMultiBiome) {
    // Seed the noise lookup so it's deterministic
    const seedInt = stringSeed(seed);
    biomeLookup = (chunkQ, chunkR) => {
      const roll = seededNoise(seedInt, chunkQ, chunkR, NOISE_CHANNEL_BIOME);
      for (const entry of BIOME_DISTRIBUTION) {
        if (roll < entry.limit) {
          return getArchetype(entry.id) || getArchetype('biome_default');
        }
      }
      return getArchetype('biome_default');
    };
  }

  // Generate flat tiles — pass biomeLookup for multi-biome, or a single biomeDef otherwise
  const flatTiles = generateTiles(
    seed, radius,
    isMultiBiome ? null : singleBiomeDef,
    mapSettings,
    isMultiBiome ? biomeLookup : null,
  );

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
      // Inherit biomeId from the first tile (all tiles in a chunk share a biome)
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
