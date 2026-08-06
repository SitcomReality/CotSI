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
import { MIN_MOB_COUNT, MOB_COUNT_RADIUS_MULTIPLIER, NUM_TRADERS, TRADER_MOVES_PER_DAY, MAX_SPAWN_SEARCH_RINGS, MOB_HP_VARIANCE_FRACTION } from '../../params/game/spawnParams.js';
import { FACTION_COUNT, MOB_BASE_POTENCY, MOB_OWN_FACTION_POTENCY_BONUS } from '../../params/game/factionParams.js';

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
    k => TERRAIN[tiles[k].terrain].passable && !TERRAIN[tiles[k].terrain].avoidSpawn && !tiles[k].feature && !used.has(k)
  );
  const mobCount = Math.max(MIN_MOB_COUNT, radius * MOB_COUNT_RADIUS_MULTIPLIER);
  const mobs = [];

  for (let i = 0; i < mobCount; i++) {
    if (!passable.length) break;
    const key = passable.splice(Math.floor(rand() * passable.length), 1)[0];
    const faction = Math.floor(rand() * FACTION_COUNT);
    const potencies = Array(FACTION_COUNT)
      .fill(0)
      .map(
        (_, c) =>
          MOB_BASE_POTENCY +
          (c === faction ? MOB_OWN_FACTION_POTENCY_BONUS : 0) +
          ([1, 2, 4].includes((c - faction + FACTION_COUNT) % FACTION_COUNT) ? 1 : 0)
      );
    // Pick a random mob archetype (occasionally a higher-tier variant)
    const archetype = mobArchetypes[Math.floor(rand() * mobArchetypes.length)];
    const base = archetype.baseStats;
    const hpRoll = Math.floor(rand() * (base.hp * MOB_HP_VARIANCE_FRACTION));
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

  const passable = Object.keys(tiles).filter(
    k => TERRAIN[tiles[k].terrain].passable && !TERRAIN[tiles[k].terrain].avoidSpawn && !tiles[k].feature && !used.has(k)
  );

  for (let i = 0; i < NUM_TRADERS; i++) {
    if (!passable.length) break;
    const key = passable.splice(Math.floor(rand() * passable.length), 1)[0];
    used.add(key);
    traders.push({
      id: `tr-${i}`,
      pos: parseKey(key),
      stock: traderStock(rand),
      targetBaseKey:
        Object.keys(tiles).filter(k => tiles[k].feature?.kind === 'base')[i % champions.length] || key,
      movesPerDay: TRADER_MOVES_PER_DAY,
    });
  }

  return traders;
}
