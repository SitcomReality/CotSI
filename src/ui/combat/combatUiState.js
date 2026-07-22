// --- Pure State Management for Combat UI ---

let _G = null;
let _combatUI = null;
let _refreshAll = null;
let _toast = null;
let _startMeasure = null;
let _endMeasure = null;

export function setGameState(g) {
  _G = g;
  // Also keep window.__gameState in sync for consistency
  if (typeof window !== 'undefined') {
    window.__gameState = g;
  }
}

export function getGameState() {
  return _G;
}

export function setCombatUI(ui) {
  _combatUI = ui;
}

export function getCombatUI() {
  return _combatUI;
}

export function setCallbacks(refreshAll, toast, startMeasure, endMeasure) {
  _refreshAll = refreshAll;
  _toast = toast;
  _startMeasure = startMeasure;
  _endMeasure = endMeasure;
}

export function getRefreshAll() {
  return _refreshAll;
}

export function getToast() {
  return _toast;
}

export function getMeasure() {
  return _startMeasure ? { start: _startMeasure, end: _endMeasure } : null;
}