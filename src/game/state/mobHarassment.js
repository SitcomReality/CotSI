/**
 * mobHarassment.js — Mob harassment and wandering AI.
 *
 * Each living mob may harass an adjacent champion (damage + log)
 * or wander through its daily action-point pool to affordable neighboring
 * hexes (terrain costs per the mob's own archetype — dev/docs/movementDesign.md
 * §7, §11).
 */
import { coordKey, parseKey, neighbors, distance } from '../../engine/rules/hexGrid.js';
import { terrainCost, isTerrainBlocked } from '../rules/movementCosts.js';
import { occupiedByChampion, occupiedByMob, occupiedByTrader } from './entityQueries.js';
import { updateSpatialIndex } from './spatialIndex.js';
import { addLogEntry } from './gameLog.js';
import { LOG_CATEGORY } from '../rules/logGrammar.js';
import { buildChampionFactionMap, championSegment } from '../rules/logHelpers.js';
import { recordLedgerEntry } from './dispatchLedger.js';
import { recordDeath } from './deathTracker.js';
import { MOB_HARASS_CHANCE, MOB_HARASS_DMG_BASE, MOB_HARASS_DMG_RANGE, MOB_WANDER_CHANCE, MOB_DAILY_AP } from '../../params/game/worldParams.js';

/**
 * Run the mob harassment and wandering phase.
 * Each alive mob refills its AP pool, may attack an adjacent champion, or
 * wander hex by hex while its pool can afford the next step.
 * @param {object} state - Game state
 */
export function runMobHarassment(state) {
  const _factionMap = buildChampionFactionMap(state.champions);
  for (const mob of state.mobs.filter(m => m.alive)) {
    mob.actionPoints = MOB_DAILY_AP;
    const adj = state.champions.find(c => c.alive && c.faction !== 2 && distance(c.pos, mob.pos) === 1);
    if (adj && state._rng() < MOB_HARASS_CHANCE) {
      const dmg = MOB_HARASS_DMG_BASE + Math.floor(state._rng() * MOB_HARASS_DMG_RANGE);
      adj.hp -= dmg;
      addLogEntry(state, {
        category: LOG_CATEGORY.COMBAT,
        subject: { text: mob.name },
        verb: 'harasses',
        object: championSegment(adj.name, _factionMap),
        detail: { text: `for ${dmg} damage`, color: 'var(--crimson)' },
      });
      recordLedgerEntry(adj, `-${dmg} HP — ${mob.name} harassment`, 'loss', 'hp');
      if (adj.hp <= 0) {
        adj.alive = false;
        recordDeath(state, adj, 'was erased by marginalia');
      }
    } else if (mob.aggressive && state._rng() < MOB_WANDER_CHANCE) {
      while (mob.actionPoints > 0) {
        const opts = neighbors(mob.pos)
          .map(coordKey)
          .filter(
            k => {
              const tile = state.tiles[k];
              return tile &&
                !isTerrainBlocked(mob, tile.terrain) &&
                terrainCost(mob, tile.terrain) <= mob.actionPoints &&
                !tile.feature &&
                !occupiedByChampion(state, k) &&
                !occupiedByMob(state, k) &&
                !occupiedByTrader(state, k);
            }
          );
        if (!opts.length) break;
        const key = opts[Math.floor(state._rng() * opts.length)];
        mob.actionPoints -= terrainCost(mob, state.tiles[key].terrain);
        const oldKey = coordKey(mob.pos);
        mob.pos = parseKey(key);
        updateSpatialIndex(state, oldKey, coordKey(mob.pos), mob, 'mob');
      }
    }
  }
}
