/** chunkParams.js — Lazy chunk generation and background pre-generation parameters. */

// ---------------------------------------------------------------------------
// Lazy chunk management (state/chunkManager.js)
// ---------------------------------------------------------------------------

/**
 * Eager-generation radius (hexes) around each spawn target. The starting
 * region (all chunks touching these discs) is generated at creation with the
 * global post-passes; everything beyond generates lazily from the seed.
 * Maps with radius ≤ STARTING_REGION_RADIUS + spawn slack generate entirely
 * eager, preserving the classic full-map behavior.
 */
export const STARTING_REGION_RADIUS = 20;

/** Days a generated chunk may sit with no entities before eviction. */
export const CHUNK_EVICTION_GRACE_DAYS = 10;

/** Buffer (chunk cells) of background pre-generation around a champion. */
export const BACKGROUND_BUFFER_CHUNKS = 2;

/** Milliseconds between background chunk generations (frame spread). */
export const BACKGROUND_GEN_SPREAD_MS = 8;
