/**
 * chunkManager.js — Lazy chunk lifecycle for arbitrarily large maps.
 *
 * State model:
 *   state.chunks      — Map<ck, { tiles: Map<localKey, tile>, dirty, generated,
 *                                    biomeId, lastEntityDay }>
 *   state.chunkDeltas — Map<ck, Map<localKey, tile>> — gameplay modifications
 *                       extracted at eviction, re-applied on regeneration.
 *
 * Every chunk is fully reproducible from (seed, chunk coords, radius, biome),
 * so after eviction only the diff from the procedural base must be retained:
 * a pristine chunk evicts to nothing and regenerates identically on return.
 *
 * Generation is synchronous on demand (a read of an in-map tile materializes
 * its chunk) and amortized by background pre-generation of a buffer radius
 * ahead of each champion, scheduled by the runtime on the clock's 'bot' group.
 */
import { tileToChunk, chunkKey, chunkKeyFromTile, localCoord, localKey, hexesInChunk } from '../../../engine/rules/chunkGrid.js';
import { generateChunkTiles } from '../../rules/terrainGen/chunkGeneration.js';
import { getArchetype } from '../../rules/archetypes.js';
import { chunkKeysWithinCap, humanChampionPositions } from '../../../engine/rules/sightCull.js';
import { CHUNK_EVICTION_GRACE_DAYS } from '../../../params/game/chunkParams.js';

/** Whether a hex lies inside the map disc for the given radius. */
export function isInMap(state, q, r) {
  const s = -q - r;
  return Math.abs(q) <= state.radius && Math.abs(r) <= state.radius && Math.abs(s) <= state.radius;
}

/** Resolve the biome definition a chunk regenerates with. */
function biomeDefFor(state) {
  if (!state.biome || state.biome === 'multi_biome') return null;
  return getArchetype(state.biome) || getArchetype('biome_default');
}

/**
 * Generate the base tiles for a chunk from the seed (no deltas applied).
 * @returns {{ tiles: Map<string, object>, biomeId: string|null }}
 */
export function generateBaseChunk(state, cq, cr) {
  const biomeDef = biomeDefFor(state);
  const { tileMap, biomeId } = generateChunkTiles(state.seed, cq, cr, state.radius, biomeDef);
  return { tiles: new Map(tileMap), biomeId };
}

/**
 * Ensure a chunk exists: generate from seed if absent, then re-apply any
 * deltas stored at eviction. Idempotent. Synchronous — hot callers should
 * rely on background pre-generation so this rarely fires mid-refresh.
 *
 * @param {object} state - Game state
 * @param {number} cq    - Chunk q
 * @param {number} cr    - Chunk r
 * @returns {object|undefined} the chunk, or undefined if it has no in-map hexes
 */
export function ensureChunk(state, cq, cr) {
  const ck = chunkKey(cq, cr);
  const existing = state.chunks.get(ck);
  if (existing) return existing;

  // Skip chunks that contain no hexes inside the map disc.
  let touchesMap = false;
  for (const { q, r } of hexesInChunk(cq, cr)) {
    if (isInMap(state, q, r)) { touchesMap = true; break; }
  }
  if (!touchesMap) return undefined;

  const { tiles, biomeId } = generateBaseChunk(state, cq, cr);
  const deltas = state.chunkDeltas.get(ck);
  if (deltas) {
    for (const [lk, tile] of deltas) tiles.set(lk, tile);
    state.chunkDeltas.delete(ck);
  }
  const chunk = {
    tiles,
    dirty: false,
    generated: true,
    biomeId,
    lastEntityDay: state.day ?? 0,
  };
  state.chunks.set(ck, chunk);
  return chunk;
}

/**
 * Ensure the chunk containing a tile exists (used by tile access for lazy
 * generation on read). Out-of-map tiles never generate.
 * @returns {object|undefined}
 */
export function ensureChunkForTile(state, q, r) {
  if (!isInMap(state, q, r)) return undefined;
  const { cq, cr } = tileToChunk(q, r);
  return ensureChunk(state, cq, cr);
}

/**
 * Ensure every chunk within `chunkSteps` chunk cells of a hex exists.
 * @returns {object[]} the ensured chunks
 */
export function ensureChunksAround(state, q, r, chunkSteps) {
  const { cq, cr } = tileToChunk(q, r);
  const ensured = [];
  for (let dcq = -chunkSteps; dcq <= chunkSteps; dcq++) {
    for (let dcr = -chunkSteps; dcr <= chunkSteps; dcr++) {
      const chunk = ensureChunk(state, cq + dcq, cr + dcr);
      if (chunk) ensured.push(chunk);
    }
  }
  return ensured;
}

/**
 * Chunk cells within `chunkSteps` of a hex that are not yet generated —
 * the work list for background pre-generation scheduling.
 * @returns {{cq:number, cr:number}[]}
 */
export function missingChunksAround(state, q, r, chunkSteps) {
  const { cq, cr } = tileToChunk(q, r);
  const missing = [];
  for (let dcq = -chunkSteps; dcq <= chunkSteps; dcq++) {
    for (let dcr = -chunkSteps; dcr <= chunkSteps; dcr++) {
      const cq2 = cq + dcq;
      const cr2 = cr + dcr;
      if (!state.chunks.has(chunkKey(cq2, cr2))) {
        missing.push({ cq: cq2, cr: cr2 });
      }
    }
  }
  return missing;
}

/**
 * Chunk keys containing any live champion, mob, or trader.
 */
function occupantChunkKeys(state) {
  const set = new Set();
  const entities = [
    ...(state.champions || []),
    ...(state.mobs || []),
    ...(state.traders || []),
  ];
  for (const e of entities) {
    if (!e || !e.pos || e.alive === false) continue;
    set.add(chunkKeyFromTile(e.pos.q, e.pos.r));
  }
  return set;
}

/**
 * Extract the gameplay deltas of a chunk: regenerate the base from the seed
 * and keep every current tile that differs from it. A pristine chunk yields an
 * empty delta map and evicts to nothing.
 * @returns {Map<string, object>}
 */
function extractDeltas(state, ck, chunk) {
  const [cq, cr] = ck.split(',').map(Number);
  const base = generateBaseChunk(state, cq, cr);
  const deltas = new Map();
  for (const [lk, tile] of chunk.tiles) {
    const baseTile = base.tiles.get(lk);
    if (!baseTile || JSON.stringify(tile) !== JSON.stringify(baseTile)) {
      deltas.set(lk, tile);
    }
  }
  return deltas;
}

/**
 * Touch occupancy timestamps, then evict chunks that have had no entity for
 * CHUNK_EVICTION_GRACE_DAYS days and are outside every champion's render-cap
 * disc. Evicted chunks store their deltas in state.chunkDeltas and drop from
 * state.chunks; a later read regenerates them from the seed and re-applies
 * the deltas.
 *
 * With no living human champions (spectator), nothing is evicted.
 *
 * @param {object} state - Game state
 * @returns {number} number of chunks evicted
 */
export function evictChunks(state) {
  const day = state.day ?? 0;

  // Touch chunks containing entities so they are never evicted while occupied.
  for (const ck of occupantChunkKeys(state)) {
    const chunk = state.chunks.get(ck);
    if (chunk) chunk.lastEntityDay = day;
  }

  // No living humans → spectator keeps the whole generated world resident.
  if (humanChampionPositions(state.champions || []).length === 0) return 0;

  // Keep every chunk intersecting a champion's render-cap disc (the only
  // chunks that can be on screen), even if momentarily empty.
  const keep = occupantChunkKeys(state);
  for (const ck of chunkKeysWithinCap(state.champions)) keep.add(ck);

  const threshold = day - CHUNK_EVICTION_GRACE_DAYS;
  let evicted = 0;
  for (const [ck, chunk] of state.chunks) {
    if (keep.has(ck)) continue;
    if ((chunk.lastEntityDay ?? 0) > threshold) continue;

    const deltas = extractDeltas(state, ck, chunk);
    if (deltas.size > 0) state.chunkDeltas.set(ck, deltas);
    state.chunks.delete(ck);
    evicted++;
  }
  return evicted;
}
