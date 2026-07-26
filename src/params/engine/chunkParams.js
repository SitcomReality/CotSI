/**
 * chunkParams.js — Chunk sizing for hex-grid spatial partitioning.
 * Pure config: no imports.
 */

/** Tile-to-chunk mapping offset that ensures origin tile (0,0) maps to chunk (0,0). */
export const TILE_TO_CHUNK_OFFSET = 0.5;

/** Tile count per chunk dimension (24x24 axial square). */
export const CHUNK_SIZE = 24;
