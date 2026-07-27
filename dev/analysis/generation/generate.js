/**
 * generate.js — Pure map generation pipeline for the analysis page.
 *
 * No DOM access, no mutable state. Every function takes its inputs as
 * parameters and returns a result object.
 */
import { generateTiles } from '../../../src/game/rules/terrainGenerator.js';
import { makeRng, stringSeed } from '../../../src/engine/rules/seededRng.js';
import { hexFbm2D } from '../../../src/engine/rules/noise.js';
import { createChampions } from '../../../src/game/state/championFactory.js';
import { createMobs, createTraders } from '../../../src/game/state/entityFactory.js';
import { getArchetype } from '../../../src/game/rules/archetypes.js';
import { NOISE_ELEVATION, NOISE_MOISTURE } from '../../../src/params/game/worldParams.js';

/**
 * Default champion config: one per faction, in faction order.
 * The shuffle in createChampions will randomize them per-seed deterministically.
 */
export const DEFAULT_CHAMPIONS = [
  { faction: 0 }, { faction: 1 }, { faction: 2 },
  { faction: 3 }, { faction: 4 }, { faction: 5 }, { faction: 6 },
];

/**
 * Generate terrain, champions, mobs, and traders for a single seed.
 *
 * Mirrors the pipeline in gameFactory.js: tiles -> champs -> mobs -> traders.
 * Does NOT enrich tiles with noise data (use `enrichWithNoise` for that).
 *
 * @param {string}  seedText    - Seed string
 * @param {number}  radius      - Map radius in hexes
 * @param {object}  biomeDef    - Resolved biome archetype definition (null for multi-biome)
 * @param {object}  mapSettings - { heightVariation, wateriness, mountainousness }
 * @returns {{ tiles, champions, mobs, traders, baseKeys, biomeDef, radius, seed, biomeIds }}
 */
export function generateSingleSeed(seedText, radius, biomeDef, mapSettings) {
  const tiles = generateTiles(seedText, radius, biomeDef, mapSettings);
  const rng = makeRng(seedText);
  const rand = () => rng();

  const { champions, used } = createChampions({
    tiles, champions: DEFAULT_CHAMPIONS, rand, radius,
  });

  const baseKeys = new Set();
  for (const key of Object.keys(tiles)) {
    if (tiles[key].feature?.kind === 'base') baseKeys.add(key);
  }

  const mobs = createMobs({ tiles, rand, used, radius });
  const traders = createTraders({ tiles, rand, used, champions });

  // Collect unique biome IDs from tiles
  const biomeIds = new Set();
  for (const key of Object.keys(tiles)) {
    if (tiles[key].biomeId) biomeIds.add(tiles[key].biomeId);
  }

  return {
    tiles, champions, mobs, traders, baseKeys,
    biomeDef, radius, seed: seedText,
    biomeIds: [...biomeIds],
  };
}

/**
 * Enrich tiles with raw noise values (elevation, moisture) for overlay rendering.
 * Matches the FBM noise used in terrainGenerator.js.
 * Mutates tile objects in place.
 *
 * @param {object} tiles    - Flat tile map keyed by "q,r"
 * @param {string} seedText - Seed string (used to derive the noise seed)
 */
export function enrichWithNoise(tiles, seedText) {
  const seed = stringSeed(seedText);
  for (const key of Object.keys(tiles)) {
    const tile = tiles[key];
    tile.elevation = hexFbm2D(tile.q, tile.r, seed, NOISE_ELEVATION);
    tile.moisture = hexFbm2D(tile.q, tile.r, seed + 999, NOISE_MOISTURE);
  }
}
