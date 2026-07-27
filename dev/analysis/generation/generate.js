/**
 * generate.js — Pure map generation pipeline for the analysis page.
 *
 * No DOM access, no mutable state. Every function takes its inputs as
 * parameters and returns a result object.
 */
import { generateTiles } from '../../../src/game/rules/terrainGenerator.js';
import { makeRng, stringSeed, seededNoise } from '../../../src/engine/rules/seededRng.js';
import { createChampions } from '../../../src/game/state/championFactory.js';
import { createMobs, createTraders } from '../../../src/game/state/entityFactory.js';
import { getArchetype } from '../../../src/game/rules/archetypes.js';
import {
  NOISE_CHANNEL_ELEVATION,
  NOISE_CHANNEL_MOISTURE,
  NOISE_CHANNEL_BIOME,
} from '../../../src/params/game/worldParams.js';

/**
 * Default champion config: one per faction, in faction order.
 * The shuffle in createChampions will randomize them per-seed deterministically.
 */
export const DEFAULT_CHAMPIONS = [
  { faction: 0 }, { faction: 1 }, { faction: 2 },
  { faction: 3 }, { faction: 4 }, { faction: 5 }, { faction: 6 },
];

/** Simple threshold-based biome distribution for noise roll [0, 1). */
const BIOME_DISTRIBUTION = [
  { limit: 0.40, id: 'biome_default' },
  { limit: 0.70, id: 'biome_lush' },
  { limit: 1.00, id: 'biome_arid' },
];

/**
 * Build a biomeLookup callback for multi-biome generation.
 *
 * @param {string} seedText - Seed string for deterministic noise
 * @returns {(chunkQ: number, chunkR: number) => object|null}
 */
export function buildBiomeLookup(seedText) {
  const seedInt = stringSeed(seedText);
  return (chunkQ, chunkR) => {
    const roll = seededNoise(seedInt, chunkQ, chunkR, NOISE_CHANNEL_BIOME);
    for (const entry of BIOME_DISTRIBUTION) {
      if (roll < entry.limit) {
        return getArchetype(entry.id) || getArchetype('biome_default');
      }
    }
    return getArchetype('biome_default');
  };
}

/**
 * Generate terrain, champions, mobs, and traders for a single seed.
 *
 * Mirrors the pipeline in gameFactory.js: tiles -> champs -> mobs -> traders.
 * Does NOT enrich tiles with noise data (use `enrichWithNoise` for that).
 *
 * @param {string}  seedText    - Seed string
 * @param {number}  radius      - Map radius in hexes
 * @param {object}  biomeDef    - Resolved biome archetype definition
 * @param {object}  mapSettings - { heightVariation, wateriness, mountainousness }
 * @param {object}  [options]   - { multiBiome: boolean }
 * @returns {{ tiles, champions, mobs, traders, baseKeys, biomeDef, radius, seed, multiBiome, biomeIds }}
 */
export function generateSingleSeed(seedText, radius, biomeDef, mapSettings, { multiBiome = false } = {}) {
  const biomeLookup = multiBiome ? buildBiomeLookup(seedText) : null;
  const tiles = generateTiles(seedText, radius, multiBiome ? null : biomeDef, mapSettings, biomeLookup);
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
    multiBiome,
    biomeIds: [...biomeIds],
  };
}

/**
 * Enrich tiles with raw noise values (elevation, moisture) for overlay rendering.
 * Mutates tile objects in place.
 *
 * @param {object} tiles    - Flat tile map keyed by "q,r"
 * @param {string} seedText - Seed string (used to derive the noise seed)
 */
export function enrichWithNoise(tiles, seedText) {
  const seed = stringSeed(seedText);
  for (const key of Object.keys(tiles)) {
    const tile = tiles[key];
    tile.elevation = seededNoise(seed, tile.q, tile.r, NOISE_CHANNEL_ELEVATION);
    tile.moisture = seededNoise(seed, tile.q, tile.r, NOISE_CHANNEL_MOISTURE);
  }
}
