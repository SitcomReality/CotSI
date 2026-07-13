// --- Pure State Management for Combat UI ---

let _G = null;
let _combatUI = null;
let _refreshAll = null;
let _toast = null;

export function setGameState(g) {
  _G = g;
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

export function setCallbacks(refreshAll, toast) {
  _refreshAll = refreshAll;
  _toast = toast;
}

export function getRefreshAll() {
  return _refreshAll;
}

export function getToast() {
  return _toast;
}