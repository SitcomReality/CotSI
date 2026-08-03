/**
 * combatState.js — Runtime combat state holder.
 *
 * Holds the active combat object (_combatUI) and the bootstrap-injected
 * finishAttackerTurn closure. G itself is read directly from liveGame by
 * the combat modules — there is no second game-state reference to sync.
 */
import { getClock } from '../../shared/clockScheduler.js';

let _combatUI = null;
let _finishAttackerTurn = null;

export function setCombatUI(ui) {
  _combatUI = ui;
}

export function getCombatUI() {
  return _combatUI;
}

export function setFinishAttackerTurn(fn) {
  _finishAttackerTurn = fn;
}

export function getFinishAttackerTurn() {
  return _finishAttackerTurn;
}

/**
 * Wait for `ms` virtual milliseconds in the combat speed group.
 * @param {number} ms
 * @param {string} [group='combat']
 * @returns {Promise<void>}
 */
export const wait = (ms, group = 'combat') => getClock().wait(ms, group);
