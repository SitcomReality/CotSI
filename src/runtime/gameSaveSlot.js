/**
 * gameSaveSlot.js — Browser-storage save slot for an in-progress game.
 *
 * Wraps the pure persistence core (serializeGame/deserializeGame) with the
 * localStorage adapters. No UI here — entry points get wired later; for now
 * these are callable from the console (window.__gameState is the live G).
 */
import { G, setGameInstance } from '../game/state/liveGame.js';
import { serializeGame, deserializeGame } from '../game/state/persistence/saveDocument.js';
import { readStoredJson, writeStoredJson } from './storageIo.js';

export const GAME_SAVE_KEY = 'cotsi-save-v1';

/**
 * Serialize a live game state into the save slot.
 * @param {object} [state] - defaults to the live G
 * @param {Storage|null} [storage] - injected backend; defaults to localStorage
 * @returns {boolean} true when saved
 */
export function saveGameToSlot(state = G, storage = null) {
  if (!state) return false;
  try {
    return writeStoredJson(GAME_SAVE_KEY, serializeGame(state), storage);
  } catch {
    return false;
  }
}

/**
 * Load the save slot and make it the live game instance.
 * @param {Storage|null} [storage] - injected backend; defaults to localStorage
 * @returns {object|null} the restored state, or null when absent/corrupt
 */
export function loadGameFromSlot(storage = null) {
  try {
    const doc = readStoredJson(GAME_SAVE_KEY, storage);
    if (doc == null) return null;
    const state = deserializeGame(doc);
    setGameInstance(state);
    return state;
  } catch {
    return null;
  }
}

/** Check whether a parseable save slot exists. */
export function hasSavedGame(storage = null) {
  return readStoredJson(GAME_SAVE_KEY, storage) != null;
}
