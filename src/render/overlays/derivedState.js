// src/render/overlays/derivedState.js
// Stores pre-computed derived data so overlay layers don't need to import
// from game/state/ directly. Populated by runtime/mapRefresh.js.

let _derivedHumanView = null;
let _derivedMoveHighlights = null;
let _interactionHighlights = null;  // Map<hexKey, { type, entity }>
let _hoveredKey = null;
let _pathPreview = null;            // { keys: string[], cost: number } | null

// Bumped by every setter that feeds a static overlay layer, so the overlay
// registry can skip redrawing static layers while nothing has changed.
let _contentRevision = 0;

/**
 * Monotonic revision of the data consumed by static overlay layers.
 * @returns {number}
 */
export function getOverlayContentRevision() {
  return _contentRevision;
}

/**
 * Store pre-computed derived data.
 * Called by runtime/mapRefresh.js.
 * @param {{ visible: Set<string>, explored: Set<string> }} humanView
 * @param {string[]} moveHighlights — reachable hex keys (weighted AP range)
 */
export function setDerivedState(humanView, moveHighlights) {
  _derivedHumanView = humanView;
  _derivedMoveHighlights = moveHighlights;
  _contentRevision++;
}

export function getDerivedHumanView() {
  return _derivedHumanView;
}

export function getDerivedMoveHighlights() {
  return _derivedMoveHighlights;
}

/**
 * Store the path-preview overlay data (hovered or click-previewed route).
 * @param {{ keys: string[], cost: number } | null} preview
 */
export function setPathPreview(preview) {
  _pathPreview = preview;
  _contentRevision++;
}

export function getPathPreview() {
  return _pathPreview;
}

/**
 * Store interaction-highlight data (adjacent hexes with interactive entities).
 * Called by runtime/mapRefresh.js.
 * This layer is animated, so it redraws every frame and needs no revision bump.
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
  _contentRevision++;
}

export function getHoveredKey() {
  return _hoveredKey;
}
