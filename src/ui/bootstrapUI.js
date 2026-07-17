/**
 * Bootstrap — DOM-ready startup wiring.
 * Owns only the "when the page is ready, kick things off" concern.
 */
import { registerAction, initModalActions } from './actionBus.js';
import { onEndTurn } from '../game/turnController.js';
import { initCombatModal } from './combat/combatui-index.js';
import { toast } from './hud.js';
import { refreshAll } from '../game/session/refreshAll.js';

// Action-bus registrations migrated from the now-deleted gameUIBindings.js
const INSPECT_HINT =
  'Click a highlighted hex to move. Adjacent foes to duel. End turn on empty parchment to dig.';
registerAction('endTurn', () => onEndTurn());
registerAction('inspect', () => toast(INSPECT_HINT));
registerAction('restartToSetup', () => location.reload());

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