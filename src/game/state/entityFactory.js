/**
 * entityFactory.js — Mob and trader creation.
 * Reads the tile map and the used-hex set, populates the world with
 * mobs and traders on unclaimed passable tiles.
 */
import { parseKey } from '../../engine/rules/hexGrid.js';
import { TERRAIN } from '../rules/terrainTypes.js';
import { getArchetypesByType } from '../rules/archetypes.js';
import '../rules/archetypeData/index.js'; // side-effect: populate archetype registry
import { traderStock } from '../rules/traderStock.js';

/**
 * Create mobs on unclaimed passable tiles.
 *
 * @param {Object}   params.tiles  - Tile map keyed by "q,r"
 * @param {Function} params.rand   - Seeded RNG function returning [0, 1)
 * @param {Set}      params.used   - Set of claimed hex keys (mutated in place)
 * @param {number}   params.radius - Map radius in hexes
 * @returns {Array} mob entries
 */
export function createMobs({ tiles, rand, used, radius }) {
  const mobArchetypes = getArchetypesByType('mob');
  const passable = Object.keys(tiles).filter(
    k => TERRAIN[tiles[k].terrain].passable && !tiles[k].feature && !used.has(k)
  );
  const mobCount = Math.max(6, radius * 2);
  const mobs = [];

  for (let i = 0; i < mobCount; i++) {
    if (!passable.length) break;
    const key = passable.splice(Math.floor(rand() * passable.length), 1)[0];
    const faction = Math.floor(rand() * 7);
    const potencies = Array(7)
      .fill(0)
      .map(
        (_, c) =>
          3 +
          (c === faction ? 5 : 0) +
          ([1, 2, 4].includes((c - faction + 7) % 7) ? 1 : 0)
      );
    // Pick a random mob archetype (occasionally a higher-tier variant)
    const archetype = mobArchetypes[Math.floor(rand() * mobArchetypes.length)];
    const base = archetype.baseStats;
    const hpRoll = Math.floor(rand() * (base.hp * 0.5));
    const goldRoll = Math.floor(rand() * (archetype.lootGold[1] - archetype.lootGold[0]));
    const mob = {
      id: `mob-${i}`,
      name: archetype.name,
      archetypeName: archetype.archetypeShape,
      faction,
      pos: parseKey(key),
      hp: base.hp + hpRoll,
      maxHp: base.maxHp,
      potencies,
      alive: true,
      tier: base.tier,
      lootGold: archetype.lootGold[0] + goldRoll,
      aggressive: rand() < archetype.aggressiveChance,
      visualScale: archetype.visual.scale,
    };
    mobs.push(mob);
    used.add(key);
  }

  return mobs;
}

/**
 * Create traders on unclaimed passable tiles.
 *
 * @param {Object}   params.tiles   - Tile map keyed by "q,r"
 * @param {Function} params.rand    - Seeded RNG function returning [0, 1)
 * @param {Set}      params.used    - Set of claimed hex keys (mutated in place)
 * @param {number}   params.champions - Original champion configs array (for targetBaseKey)
 * @returns {Array} trader entries
 */
export function createTraders({ tiles, rand, used, champions }) {
  const traders = [];

  for (let i = 0; i < 3; i++) {
    const key = Object.keys(tiles).find(
      k => TERRAIN[tiles[k].terrain].passable && !tiles[k].feature && !used.has(k)
    );
    if (!key) break;
    used.add(key);
    traders.push({
      id: `tr-${i}`,
      pos: parseKey(key),
      stock: traderStock(rand),
      targetBaseKey:
        Object.keys(tiles).filter(k => tiles[k].feature?.kind === 'base')[i % champions.length] || key,
      movesPerDay: 2,
    });
  }

  return traders;
}
