/**
 * chunkGrid.js — Chunk coordinate math for the hex grid.
 * Pure: depends only on standard JS. No project imports.
 *
 * Defines how tile coordinates map to fixed-size chunks. A chunk is a 24×24
 * square in axial (q, r) space. This is the fundamental storage and generation
 * unit for large maps.
 *
 * The +0.5 offset in tileToChunk ensures the origin tile (0,0) maps to chunk
 * (0,0) rather than straddling a chunk boundary.
 */

import { CHUNK_SIZE, TILE_TO_CHUNK_OFFSET } from '../../params/engine/chunkParams.js';

/**
 * Map a tile's axial coordinate to its containing chunk.
 * @param {number} q
 * @param {number} r
 * @returns {{ cq: number, cr: number }}
 */
export function tileToChunk(q, r) {
  return {
    cq: Math.floor(q / CHUNK_SIZE + TILE_TO_CHUNK_OFFSET),
    cr: Math.floor(r / CHUNK_SIZE + TILE_TO_CHUNK_OFFSET),
  };
}

/**
 * Return a string key for a chunk coordinate.
 * @param {number} cq
 * @param {number} cr
 * @returns {string}
 */
export function chunkKey(cq, cr) {
  return `${cq},${cr}`;
}

/**
 * Convenience: chunk key directly from tile coordinates.
 * @param {number} q
 * @param {number} r
 * @returns {string}
 */
export function chunkKeyFromTile(q, r) {
  const { cq, cr } = tileToChunk(q, r);
  return chunkKey(cq, cr);
}

/**
 * Convert global tile coordinates to local coordinates within a chunk.
 * @param {number} cq - Chunk q
 * @param {number} cr - Chunk r
 * @param {number} q  - Global tile q
 * @param {number} r  - Global tile r
 * @returns {{ lq: number, lr: number }}
 */
export function localCoord(cq, cr, q, r) {
  return {
    lq: q - cq * CHUNK_SIZE,
    lr: r - cr * CHUNK_SIZE,
  };
}

/**
 * Convert local coordinates within a chunk back to global tile coordinates.
 * @param {number} cq - Chunk q
 * @param {number} cr - Chunk r
 * @param {number} lq - Local q
 * @param {number} lr - Local r
 * @returns {{ q: number, r: number }}
 */
export function globalCoord(cq, cr, lq, lr) {
  return {
    q: cq * CHUNK_SIZE + lq,
    r: cr * CHUNK_SIZE + lr,
  };
}

/**
 * Local coordinate key string for use as a Map key within a chunk.
 * @param {number} lq
 * @param {number} lr
 * @returns {string}
 */
export function localKey(lq, lr) {
  return `${lq},${lr}`;
}

/**
 * Return the 8 neighbouring chunk coordinates (including diagonals).
 * Useful for generation continuity — a chunk's generation may need to
 * sample noise or check terrain at the borders of adjacent chunks.
 * @param {number} cq
 * @param {number} cr
 * @returns {{ cq: number, cr: number }[]}
 */
export function chunkNeighbors(cq, cr) {
  return [
    { cq: cq - 1, cr: cr - 1 }, { cq: cq, cr: cr - 1 }, { cq: cq + 1, cr: cr - 1 },
    { cq: cq - 1, cr: cr     },                           { cq: cq + 1, cr: cr     },
    { cq: cq - 1, cr: cr + 1 }, { cq: cq, cr: cr + 1 }, { cq: cq + 1, cr: cr + 1 },
  ];
}

/**
 * Generate all global (q, r) coordinates within a chunk's bounds.
 * Returns coordinates for the full 24×24 axial square, regardless of
 * whether they fall within the map radius.
 * @param {number} cq
 * @param {number} cr
 * @returns {{ q: number, r: number }[]}
 */
export function hexesInChunk(cq, cr) {
  const results = [];
  // The +0.5 offset in tileToChunk means chunk (cq, cr) covers
  // q ∈ [cq*24 - 12, cq*24 + 12) and r ∈ [cr*24 - 12, cr*24 + 12).
  // Local coords within the chunk range from -12 to +11.
  const half = CHUNK_SIZE / 2; // 12
  const baseQ = cq * CHUNK_SIZE;
  const baseR = cr * CHUNK_SIZE;
  for (let lq = -half; lq < half; lq++) {
    for (let lr = -half; lr < half; lr++) {
      results.push({ q: baseQ + lq, r: baseR + lr });
    }
  }
  return results;
}
