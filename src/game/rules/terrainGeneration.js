/**
 * terrainGeneration.js — Thin re-export barrel for backwards compatibility.
 *
 * Consumers should import directly from the specific module:
 *   - terrain types/config  → ./terrainTypes.js
 *   - spawn-placement helpers → ./tileQueries.js
 *   - terrain generation      → ./terrainGenerator.js
 */
export { TERRAIN, DEFAULT_THRESHOLDS, DEFAULT_FEATURES } from './terrainTypes.js';
export { nearestOpenKey, nearestOpenMultiRing } from './tileQueries.js';
export { generateTiles } from './terrainGenerator.js';
