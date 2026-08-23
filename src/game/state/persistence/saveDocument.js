/**
 * persistence/saveDocument.js — Save-document serializer and loader.
 *
 * A save document is a plain JSON-safe snapshot of a live game: the map
 * identity (seed/radius/biome), the RNG counter, gameplay deltas for every
 * modified hex (both evicted-chunk deltas and resident-chunk diffs), and the
 * mutable entity/order/log state. Everything derived or transient (chunks,
 * spatial index, explored caches, selection/notice fields) is rebuilt or
 * dropped on load.
 */
import { createGame } from '../gameFactory.js';
import { collectChunkDeltas } from '../world/chunkManager.js';
import { refreshVision } from '../world/fogOfWar.js';
import { rebuildSpatialIndex } from '../entities/spatialIndex.js';

export const SAVE_FORMAT_VERSION = 1;

/**
 * Snapshot a live game into a plain JSON-safe document.
 * @param {object} state - live game state
 * @returns {object}
 */
export function serializeGame(state) {
  const deltas = collectChunkDeltas(state);
  return {
    format: 'cotsi-save',
    version: SAVE_FORMAT_VERSION,
    map: { seed: state.seed, radius: state.radius, biome: state.biome },
    day: state.day,
    weather: structuredClone(state.weather),
    rngState: typeof state._rng?.getState === 'function' ? state._rng.getState() : null,
    chunkDeltas: [...deltas].map(([ck, tiles]) => [
      ck,
      [...tiles].map(([lk, tile]) => [lk, structuredClone(tile)]),
    ]),
    baseKeys: [...state._baseKeys],
    dungeonKeys: [...state._dungeonKeys],
    regrowingFeatures: [...state._regrowingFeatures],
    champions: structuredClone(state.champions),
    mobs: structuredClone(state.mobs),
    traders: structuredClone(state.traders),
    currentOrder: [...state.currentOrder],
    globalOrder: [...state.globalOrder],
    activeChampionId: state.activeChampionId,
    objectives: structuredClone(state.objectives),
    logs: structuredClone(state.logs),
    deathOrder: [...state.deathOrder],
    winnerId: state.winnerId,
    victoryReason: state.victoryReason,
  };
}

/**
 * Rebuild a live game state from a save document. The world regenerates from
 * the seed; saved tile deltas are merged over it (resident chunks get their
 * tiles patched immediately, evicted ones re-apply on regeneration).
 * @param {object} doc - document as produced by serializeGame
 * @returns {object} live game state
 */
export function deserializeGame(doc) {
  if (!doc || doc.format !== 'cotsi-save') {
    throw new Error('Not a CotSI save document');
  }
  if ((doc.version ?? 0) > SAVE_FORMAT_VERSION) {
    throw new Error(`Unsupported save format version: ${doc.version}`);
  }

  const state = createGame({
    seed: doc.map.seed,
    radius: doc.map.radius,
    biome: doc.map.biome,
    champions: [],
    objectives: structuredClone(doc.objectives),
  });

  // Overlay the mutable simulation state.
  state.day = doc.day;
  state.weather = structuredClone(doc.weather);
  state.champions = structuredClone(doc.champions);
  state.mobs = structuredClone(doc.mobs);
  state.traders = structuredClone(doc.traders);
  state.currentOrder = [...doc.currentOrder];
  state.globalOrder = [...doc.globalOrder];
  state.activeChampionId = doc.activeChampionId;
  state.logs = structuredClone(doc.logs);
  state.deathOrder = [...doc.deathOrder];
  state.winnerId = doc.winnerId;
  state.victoryReason = doc.victoryReason;

  // Transient fields never survive a save.
  state.turnLock = false;
  state.screen = 'world';
  state.selectedTile = null;
  state.reward = null;
  state.dispatch = null;
  state.notice = null;
  state.deathEvent = null;

  if (typeof state._rng.setState === 'function' && doc.rngState != null) {
    state._rng.setState(doc.rngState);
  }

  state._baseKeys = new Set(doc.baseKeys);
  state._dungeonKeys = new Set(doc.dungeonKeys);
  state._regrowingFeatures = new Set(doc.regrowingFeatures);

  for (const [ck, entries] of doc.chunkDeltas ?? []) {
    const tiles = entries.map(([lk, tile]) => [lk, structuredClone(tile)]);
    const deltaMap = new Map(tiles);
    state.chunkDeltas.set(ck, deltaMap);
    // Patch currently resident chunks so terrain reflects gameplay changes
    // without waiting for an eviction/regeneration cycle.
    const chunk = state.chunks.get(ck);
    if (chunk) for (const [lk, tile] of tiles) chunk.tiles.set(lk, tile);
  }

  // Herald mirrors the loaded day/weather/orders, like gameFactory builds it.
  state.herald = {
    day: state.day,
    weather: {
      name: state.weather.name,
      text: state.weather.text,
      tint: state.weather.tint,
    },
    order: [...state.currentOrder],
    champions: state.champions,
    deathOrder: [...state.deathOrder],
  };

  refreshVision(state);
  rebuildSpatialIndex(state);
  return state;
}
