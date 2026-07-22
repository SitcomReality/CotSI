// src/render/overlays/derivedState.js
// Stores pre-computed derived data so overlay layers don't need to import
// from game/state/ directly. Populated by runtime/mapRefresh.js.

let _derivedHumanView = null;
let _derivedMoveHighlights = null;

/**
 * Store pre-computed derived data.
 * Called by runtime/mapRefresh.js.
 * @param {{ visible: Set<string>, explored: Set<string> }} humanView
 * @param {string[]} moveHighlights — hex keys from adjacentPassable
 */
export function setDerivedState(humanView, moveHighlights) {
  _derivedHumanView = humanView;
  _derivedMoveHighlights = moveHighlights;
}

export function getDerivedHumanView() {
  return _derivedHumanView;
}

export function getDerivedMoveHighlights() {
  return _derivedMoveHighlights;
}
