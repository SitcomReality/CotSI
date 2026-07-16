/**
 * Bootstrap — DOM-ready startup wiring.
 * Owns only the "when the page is ready, kick things off" concern.
 */
import { initCombatModal } from './combat/combatui-index.js';
import { toast } from './hud.js';
import { refreshAll } from '../game/gameOrchestrator.js';

window.addEventListener('DOMContentLoaded', () => {
  initCombatModal({
    refreshAll,
    toast,
  });

  // Delay setup init so gameOrchestrator.js is fully evaluated
  // and window.__beginGame exists.
  import('./setup.js').then((m) => m.initSetup());
});