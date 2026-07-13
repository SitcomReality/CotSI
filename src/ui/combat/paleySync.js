import { onCombatTokenHover } from './renderer.js';
import { getCombatUI } from './state.js';

// Bidirectional Paley sync: paleyWidget → combat tokens
window._onPaleyHover = function (factionIdx) {
  if (getCombatUI()) {
    onCombatTokenHover(factionIdx);
  }
};