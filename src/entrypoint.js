/**
 * Champions of the Supernal Interregnum — Entry Point
 *
 * Single entrypoint that triggers bootstrap side-effects and sets
 * window‑level globals that are independent of game state.
 */
import './ui/bootstrap.js';
import './game/gameOrchestrator.js'; // side-effect: window.__beginGame

/** Reload the page to return to the setup screen. */
window.restartToSetup = () => {
  location.reload();
};

/**
 * Global helper for computing Paley‑weave potency.
 * Does not depend on the game instance `G`.
 */
window.__SUPERNAL__ = {
  potencyWithPrimary(ch) {
    const t = ch.tokens.slice();
    t[ch.faction] += ch.relics || 0;
    let w = Math.min(...t.filter((_, i) => i !== ch.faction));
    if (!isFinite(w)) w = 0;
    t[ch.faction] += w;
    return t;
  },
};