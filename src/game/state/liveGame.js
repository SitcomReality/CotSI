/**
 * liveGame — The live game instance singleton.
 *
 * Exports the mutable `G` binding (used at runtime by game/ and ui/ modules),
 * a `currentChamp()` helper, and `setGameInstance()` for initialization.
 *
 * This module imports nothing, so it is always safe to import.
 */
export let G = null;

/**
 * Set the game instance and expose it on window for debugging.
 */
export function setGameInstance(g) {
  G = g;
  window.__gameState = g;
}

/**
 * Return the active champion, or null if no game or no active champion.
 */
export function currentChamp() {
  return G ? G.champions.find((c) => c.id === G.activeChampionId) : null;
}

/**
 * Set or clear the turn lock.
 * When locked, no new bot turn or human end-turn may begin.
 */
export function setTurnLock(locked) {
  if (G) G.turnLock = locked;
}

/**
 * Check whether a turn is currently in progress.
 */
export function isTurnLocked() {
  return G ? !!G.turnLock : false;
}