/**
 * gameLog.js — Logging utility (no deps on state shape beyond the logs array).
 */

export function addLog(state, text){
  state.logs = [text, ...state.logs].slice(0, 18);
}