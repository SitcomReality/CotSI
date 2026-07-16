/**
 * Champions of the Supernal Interregnum — Entry Point
 *
 * Single entrypoint that triggers bootstrap side-effects and sets
 * window‑level globals that are independent of game state.
 */
import './ui/bootstrapUI.js';
import './game/gameOrchestrator.js'; // side-effect: window.__beginGame

/** Reload the page to return to the setup screen. */
window.restartToSetup = () => {
  location.reload();
};

import { potencyWithPrimary } from './core/factions.js';

/**
 * Global helper for computing Paley‑weave potency.
 * Does not depend on the game instance `G`.
 */
window.__SUPERNAL__ = { potencyWithPrimary };