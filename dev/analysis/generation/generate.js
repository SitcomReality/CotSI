/**
 * generate.js — Pure map generation pipeline for the analysis page.
 *
 * No DOM access, no mutable state. Every function takes its inputs as
 * parameters and returns a result object.
 */
import { generateTiles } from '../../../src/game/rules/terrainGen/index.js';
import { makeRng } from '../../../src/engine/rules/seededRng.js';
import { createChampions } from '../../../src/game/state/championFactory.js';
import { createMobs, createTraders } from '../../../src/game/state/entityFactory.js';
import { getArchetype } from '../../../src/game/rules/archetypes.js';

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
 * Tiles carry continuous fields (elevationField, moisture, temperature).
 *
 * @param {string}  seedText       - Seed string
 * @param {number}  radius         - Map radius in hexes
 * @param {object}  biomeDef       - Resolved biome archetype definition (null for multi-biome)
 * @param {object}  [params]       - Optional generation parameters
 * @param {boolean} [params.multiBiome] - If true, biomeDef is overridden to null
 * @returns {{ tiles, champions, mobs, traders, baseKeys, biomeDef, radius, seed, biomeIds, multiBiome }}
 */
export function generateSingleSeed(seedText, radius, biomeDef, params = {}) {
  const multiBiome = !!params.multiBiome;
  if (multiBiome) biomeDef = null;
  const tiles = generateTiles(seedText, radius, biomeDef);
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
    multiBiome,
  };
}


