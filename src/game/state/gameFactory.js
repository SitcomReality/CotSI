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
import { startingRegionChunkKeys } from '../rules/terrainGen/startingRegion.js';
import { getArchetype } from '../rules/archetypes.js';
import '../rules/archetypeData/index.js'; // side-effect: populate archetype registry
import { shuffle } from '../../engine/rules/shuffle.js';
import { createInitialState } from './initialGameState.js';
import { createChampions } from './entities/championFactory.js';
import { createMobs, createTraders } from './entities/entityFactory.js';
import { placeDungeons } from './features/dungeonPlacement.js';
import { refreshVision } from './world/fogOfWar.js';
import { beginTurn } from './turnActions.js';
import { rebuildSpatialIndex } from './entities/spatialIndex.js';
import { createTileProxy } from './world/tileProxy.js';
import { tileToChunk, chunkKey, localCoord, localKey } from '../../engine/rules/chunkGrid.js';
import { startMeasure, endMeasure } from '../../shared/measurements.js';
import { computeSpawnTargets } from './entities/spawnPosition.js';

/** Extract { terrain → decor id } from a biome's terrainOverrides (or null). */
function decorOverridesFrom(terrainOverrides) {
  if (!terrainOverrides) return null;
  const decor = {};
  for (const [terrain, entry] of Object.entries(terrainOverrides)) {
    if (entry?.decor) decor[terrain] = entry.decor;
  }
  return Object.keys(decor).length > 0 ? decor : null;
}

export function createGame({
  seed = 'glut-17',
  radius = 7,
  champions = [],
  objectives = { relicRace: true, relicTarget: 7, lastStanding: true },
  biome = 'multi_biome',
}) {
  const isMultiBiome = biome === 'multi_biome';

  // For single-biome mode, resolve once
  const singleBiomeDef = isMultiBiome ? null : (getArchetype(biome) || getArchetype('biome_default'));

  const rng = makeRng(seed);
  const rand = () => rng();

  // Precompute spawn targets with the same RNG draws the placement pass would
  // use, so the eager starting region can be generated around the ACTUAL
  // spawn positions before any tile queries run.
  const { shuffledChamps, targets: spawnTargets } = computeSpawnTargets({ champions, rand, radius });

  // Generate the starting region: all chunks touching the spawn discs, with
  // the global post-passes (rivers, connectivity, water rules) applied within
  // it. Everything beyond materializes lazily from the seed on demand.
  // biomeDef=null for multi-biome (per-hex assignment inside the generator),
  // or a single biomeDef for single-biome mode.
  const regionChunkKeys = startingRegionChunkKeys(
    spawnTargets.length > 0 ? spawnTargets : [{ q: 0, r: 0 }],
    radius,
  );
  const flatTiles = generateTiles(
    seed, radius,
    isMultiBiome ? null : singleBiomeDef,
    { chunkKeys: regionChunkKeys },
  );

  // Post-classification: clear passable terrain around the actual faction
  // spawn targets. Uses no RNG draws (targets already fixed above).
  if (isMultiBiome) {
    ensureSpawnClearance(flatTiles, radius, spawnTargets);
  }

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

  // Build biomeColors: biomeId → { primary, accent } — the signature colors
  // that tint terrain decor (per-part influence + neighbor blending, render
  // layer). Mirrors the biomePalettes collection.
  const biomeColors = new Map();
  for (const [, tile] of Object.entries(flatTiles)) {
    if (tile.biomeId && !biomeColors.has(tile.biomeId)) {
      const def = getArchetype(tile.biomeId);
      if (def?.colors?.primary && def.colors?.accent) {
        biomeColors.set(tile.biomeId, def.colors);
      }
    }
  }
  // Fallback: if no tile has a biomeId (single-biome mode), use the resolved biomeDef
  if (biomeColors.size === 0 && singleBiomeDef?.colors) {
    biomeColors.set(biome, singleBiomeDef.colors);
  }

  // Build biomeDecorOverrides: biomeId → { terrainKey → decor descriptor id }.
  // The render layer can't import game/rules, so the decor overrides the
  // supernatural biomes declare are collected here and passed in like the
  // palettes/colors (gameBuilder → terrain decor resolution).
  const biomeDecorOverrides = new Map();
  for (const [, tile] of Object.entries(flatTiles)) {
    if (tile.biomeId && !biomeDecorOverrides.has(tile.biomeId)) {
      const def = getArchetype(tile.biomeId);
      const decor = decorOverridesFrom(def?.terrainOverrides);
      if (decor) biomeDecorOverrides.set(tile.biomeId, decor);
    }
  }
  // Fallback: if no tile has a biomeId (single-biome mode), use the resolved biomeDef
  if (biomeDecorOverrides.size === 0) {
    const decor = decorOverridesFrom(singleBiomeDef?.terrainOverrides);
    if (decor) biomeDecorOverrides.set(biome, decor);
  }

  // --- Build the bare state skeleton ---
  const state = createInitialState({
    seed, radius, biome,
    biomePalettes, biomeColors, biomeDecorOverrides,
    tiles: flatTiles, objectives, rng,
  });
  startMeasure('createGame');

  // --- Build chunk storage from flat tiles, then install the Proxy ---
  for (const [, tile] of Object.entries(flatTiles)) {
    const { cq, cr } = tileToChunk(tile.q, tile.r);
    const ck = chunkKey(cq, cr);
    let chunk = state.chunks.get(ck);
    if (!chunk) {
      // Inherit biomeId from the first tile; lastEntityDay anchors eviction.
      chunk = {
        tiles: new Map(), dirty: false, generated: true,
        biomeId: tile.biomeId || null, lastEntityDay: state.day ?? 0,
      };
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
    tiles, champions: shuffledChamps, targets: spawnTargets, rand, radius,
  });
  state.champions = champEntries;

  // --- Build base key index for fast trader route selection ---
  state._baseKeys = new Set();
  for (const [, tile] of Object.entries(flatTiles)) {
    if (tile.feature?.kind === 'base') {
      state._baseKeys.add(`${tile.q},${tile.r}`);
    }
  }

  // --- Place dungeons (count = 1 + floor(radius / 22)); claim their hexes ---
  state._dungeonKeys = new Set(
    placeDungeons({ tiles, rand, used, radius }),
  );

  // --- Seed the map with mobs and traders ---
  state.mobs = createMobs({ tiles, rand, used, radius });
  state.traders = createTraders({ tiles, rand, used, baseKeys: [...state._baseKeys] });

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
