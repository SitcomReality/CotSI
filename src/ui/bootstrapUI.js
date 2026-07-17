/**
 * Bootstrap — DOM-ready startup wiring.
 * Owns only the "when the page is ready, kick things off" concern.
 */
import { initCombatModal } from './combat/combatui-index.js';
import { initModalActions } from './actionBus.js';
import { toast } from './hud.js';
import { refreshAll } from '../game/gameOrchestrator.js';

window.addEventListener('DOMContentLoaded', () => {
  initModalActions(() => window.__gameState);
  initCombatModal({
    refreshAll,
    toast,
  });

  // Delay setup init so gameOrchestrator.js is fully evaluated
  // and window.__beginGame exists.
  import('./setupUI.js').then((m) => m.initSetup());
});