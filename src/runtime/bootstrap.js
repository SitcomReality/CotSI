/**
 * Bootstrap — DOM-ready startup wiring.
 * Owns only the "when the page is ready, kick things off" concern.
 */
import { registerAction, initModalActions } from '../shared/actionBus.js';
import { onEndTurn } from './turnPipeline.js';
import { initCombatModal } from '../ui/combat/combatModal.js';
import { toast } from '../ui/hud.js';
import { refreshAll } from './refreshAll.js';
import './mapControlActions.js'; // side-effect: registers zoom/camera [data-action] handlers

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

  // Delay setup init so beginGame.js is fully evaluated
  // and window.__beginGame exists.
  import('../ui/setupScreen.js').then((m) => m.initSetup());
});