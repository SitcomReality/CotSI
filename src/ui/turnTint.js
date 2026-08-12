/**
 * turnTint.js — Current-turn chrome tinting.
 *
 * Sets root-level custom properties (--turn-*) from the active champion's
 * faction so every piece of chrome can show whose turn it is at a glance.
 * Pure DOM + static rules data (FACTIONS) — no state mutation.
 *
 * Design rules:
 *   - Herald's Prognosis is a global/neutral message by design — its modal
 *     never consumes --turn-* (it overrides back to neutral gold/ink).
 *   - The death announcement is neutral/somber — it never consumes --turn-*.
 *   - Everything else (header, panels, modals) may consume --turn-*.
 */
import { FACTIONS } from '../game/rules/factionData.js';

/** Root-level custom properties written on <html>. */
const TURN_PROPS = ['--turn-color', '--turn-glow', '--turn-base'];

/**
 * Apply the active champion's faction tint to the document root.
 * Safe to call on every refreshAll — only writes when values change
 * meaningfully (it always writes; cost is a few style sets per refresh).
 *
 * @param {Object|null} G — live game state (or null during setup).
 */
export function applyTurnTint(G) {
  const root = document.documentElement;
  const champ = G?.activeChampionId
    ? (G.champions || []).find((c) => c.id === G.activeChampionId)
    : null;
  const fac = champ ? FACTIONS[champ.faction] : null;

  if (!fac) {
    // Setup screen / no active champion — clear back to neutral chrome.
    for (const p of TURN_PROPS) root.style.removeProperty(p);
    root.removeAttribute('data-turn-faction');
    root.classList.remove('turn-owner--human', 'turn-owner--bot');
    return;
  }

  root.style.setProperty('--turn-color', fac.uiColor || fac.color);
  root.style.setProperty('--turn-glow', fac.uiGlow || fac.glow);
  root.style.setProperty('--turn-base', fac.base);
  root.dataset.turnFaction = fac.short.toLowerCase();
  root.classList.toggle('turn-owner--human', champ.controller === 'human');
  root.classList.toggle('turn-owner--bot', champ.controller !== 'human');
}
