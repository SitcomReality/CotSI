/**
 * entityFactory.js — Mob and trader creation.
 * Reads the tile map and the used-hex set, populates the world with
 * mobs and traders on unclaimed passable tiles.
 */
import { parseKey } from '../../engine/rules/hexGrid.js';
import { collectSpawnCandidates } from '../rules/tileQueries.js';
import { listArchetypes, getArchetype } from '../rules/archetypes.js';
import '../rules/archetypeData/index.js'; // side-effect: populate archetype registry
import { traderStock } from '../rules/traderStock.js';
import { MIN_MOB_COUNT, MOB_COUNT_RADIUS_MULTIPLIER, NUM_TRADERS, TRADER_DAILY_AP, TRADER_NAMES, MOB_HP_VARIANCE_FRACTION } from '../../params/game/spawnParams.js';
import { MOB_DAILY_AP } from '../../params/game/worldParams.js';
import { FACTION_COUNT, MOB_BASE_POTENCY, MOB_OWN_FACTION_POTENCY_BONUS } from '../../params/game/factionParams.js';
import { terrainCost, isTerrainBlocked } from '../rules/movementCosts.js';

/**
 * Create mobs on unclaimed tiles the mob's archetype can actually enter.
 *
 * Terrain passability follows each mob's own effective movement cost
 * (dev/docs/movementAndOccupation.md §4): waterbound mobs may spawn on water/river
 * tiles; everyone else only on base-passable land.
 *
 * Samples from the materialized spawn candidates (collectSpawnCandidates) —
 * bounded by the generated region, never a full-map scan.
 *
 * @param {Object}   params.tiles  - Tile map keyed by "q,r"
 * @param {Function} params.rand   - Seeded RNG function returning [0, 1)
 * @param {Set}      params.used   - Set of claimed hex keys (mutated in place)
 * @param {number}   params.radius - Map radius in hexes
 * @returns {Array} mob entries
 */
export function createMobs({ tiles, rand, used, radius }) {
  const mobDefs = listArchetypes('mob').map((id) => ({ id, def: getArchetype(id) }));
  const landPool = collectSpawnCandidates(tiles).filter(
    k => !tiles[k].feature && !used.has(k)
  );
  // Water/river tiles (excluded from the land pool by passable/avoidSpawn)
  // are offered to archetypes that can actually enter them.
  const waterPool = [];
  for (const key of Object.keys(tiles)) {
    const t = tiles[key];
    if (t && (t.terrain === 'water' || t.terrain === 'river') && !t.feature && !used.has(key)) {
      waterPool.push(key);
    }
  }
  const mobCount = Math.max(MIN_MOB_COUNT, radius * MOB_COUNT_RADIUS_MULTIPLIER);
  const mobs = [];

  for (let i = 0; i < mobCount; i++) {
    if (!mobDefs.length) break;
    const archetype = mobDefs[Math.floor(rand() * mobDefs.length)];
    const def = archetype.def;
    const pseudo = { archetypeId: archetype.id }; // shape for terrainCost lookup

    const land = landPool.filter(k => !used.has(k) && !isTerrainBlocked(pseudo, tiles[k].terrain));
    const water = waterPool.filter(k => !used.has(k) && Number.isFinite(terrainCost(pseudo, tiles[k].terrain, tiles[k].biomeId)));
    const pool = [...land, ...water];
    if (!pool.length) break;

    const key = pool[Math.floor(rand() * pool.length)];
    const faction = Math.floor(rand() * FACTION_COUNT);
    const potencies = Array(FACTION_COUNT)
      .fill(0)
      .map(
        (_, c) =>
          MOB_BASE_POTENCY +
          (c === faction ? MOB_OWN_FACTION_POTENCY_BONUS : 0) +
          ([1, 2, 4].includes((c - faction + FACTION_COUNT) % FACTION_COUNT) ? 1 : 0)
      );
    const base = def.baseStats;
    const hpRoll = Math.floor(rand() * (base.hp * MOB_HP_VARIANCE_FRACTION));
    const goldRoll = Math.floor(rand() * (def.lootGold[1] - def.lootGold[0]));
    const mob = {
      id: `mob-${i}`,
      name: def.name,
      archetypeName: def.archetypeShape,
      archetypeId: archetype.id,
      faction,
      pos: parseKey(key),
      hp: Math.min(base.maxHp, base.hp + hpRoll),
      maxHp: base.maxHp,
      potencies,
      alive: true,
      tier: base.tier,
      lootGold: def.lootGold[0] + goldRoll,
      aggressive: rand() < def.aggressiveChance,
      visualScale: def.visual.scale,
      actionPoints: MOB_DAILY_AP,
    };
    mobs.push(mob);
    used.add(key);
  }

  return mobs;
}

/**
 * Create traders on unclaimed passable tiles.
 *
 * Samples from the materialized spawn candidates (collectSpawnCandidates) —
 * bounded by the generated region, never a full-map scan. `baseKeys` is the
 * pre-built index of faction base keys (state._baseKeys), so no tile rescan is
 * needed to pick trader targets.
 *
 * @param {Object}   params.tiles    - Tile map keyed by "q,r"
 * @param {Function} params.rand     - Seeded RNG function returning [0, 1)
 * @param {Set}      params.used     - Set of claimed hex keys (mutated in place)
 * @param {Array}    params.baseKeys - Faction base hex keys (for targetBaseKey)
 * @returns {Array} trader entries
 */
export function createTraders({ tiles, rand, used, baseKeys = [] }) {
  const traders = [];

  const passable = collectSpawnCandidates(tiles).filter(
    k => !tiles[k].feature && !used.has(k)
  );

  for (let i = 0; i < NUM_TRADERS; i++) {
    if (!passable.length) break;
    const key = passable.splice(Math.floor(rand() * passable.length), 1)[0];
    used.add(key);
    traders.push({
      id: `tr-${i}`,
      name: TRADER_NAMES[i % TRADER_NAMES.length],
      pos: parseKey(key),
      stock: traderStock(rand),
      targetBaseKey: (baseKeys.length ? baseKeys[i % baseKeys.length] : null) || key,
      actionPoints: TRADER_DAILY_AP,
    });
  }

  return traders;
}
