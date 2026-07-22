/**
 * deathTracker.js — Centralized death recording.
 *
 * Called at every death point (combat, mob harassment, etc.) to:
 *  - Append to state.deathOrder (for elimination-order tracking)
 *  - Set state.deathEvent (triggers the death announcement modal)
 *  - Add a log entry
 */
import { addLog, addLogEntry } from './gameLog.js';
import { buildChampionFactionMap, championSegment } from '../rules/logHelpers.js';

/**
 * Record a champion's death in game state.
 *
 * Only tracks champions (entities in state.champions). Mobs and other
 * non-champion entities are silently skipped — their deaths are already
 * logged by the combat system.
 *
 * @param {Object} state       — Live game state (G)
 * @param {Object} champ       — The champion entity that died
 * @param {string} cause       — Short human-readable cause, e.g. "fell in combat against X"
 */
export function recordDeath(state, champ, cause) {
  if (!champ || !champ.id) return;
  // Guard: only track actual champions, not mobs or other entities
  if (!state.champions.includes(champ)) return;

  state.deathOrder.push(champ.id);

  const factionMap = buildChampionFactionMap(state.champions);
  const plainText = `${champ.name} has fallen — ${cause}`;
  addLogEntry(state, plainText, [
    championSegment(champ.name, factionMap),
    ` has fallen — ${cause}`,
  ], 'death', { isDeath: true });

  // Support multiple simultaneous deaths (e.g. double knockout in combat)
  if (!state.deathEvent) {
    state.deathEvent = { deadChamps: [] };
  }
  state.deathEvent.deadChamps.push({ championId: champ.id, cause });
}
