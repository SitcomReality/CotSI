// src/render/overlays/derivedState.js
// Stores pre-computed derived data so overlay layers don't need to import
// from game/state/ directly. Populated by runtime/mapRefresh.js.

let _derivedHumanView = null;
let _derivedMoveHighlights = null;
let _interactionHighlights = null;  // Map<hexKey, { type, entity }>
let _hoveredKey = null;

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

/**
 * Store interaction-highlight data (adjacent hexes with interactive entities).
 * Called by runtime/mapRefresh.js.
 * @param {Map<string, {type: string, entity: any}>} map
 */
export function setInteractionHighlights(map) {
  _interactionHighlights = map;
}

export function getInteractionHighlights() {
  return _interactionHighlights;
}

/** Shared hover-state: the hex key the pointer is currently over. */
export function setHoveredKey(key) {
  _hoveredKey = key;
}

export function getHoveredKey() {
  return _hoveredKey;
}
