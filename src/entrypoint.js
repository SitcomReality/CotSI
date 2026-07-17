/**
 * Champions of the Supernal Interregnum — Entry Point
 *
 * Single entrypoint that triggers bootstrap side-effects and sets
 * window‑level globals that are independent of game state.
 */
import './ui/bootstrapUI.js';
import './game/session/beginGame.js'; // side-effect: window.__beginGame
