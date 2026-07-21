import {
  entityFor,
  recordPick,
  advancePhase,
  bothPicksIn,
  isPickingPhase,
  getAvailablePicks
} from '../../game/state/combat/index.js';
import { getCombatUI, getToast } from './combatUiState.js';
import { renderCombat } from './combatRenderer.js';
import { registerAction } from '../../shared/actionBus.js';
import { closeCombat } from './combatLifecycle.js';
import { runCombatFlow } from './combatFlow.js';
import { getGameState } from './combatUiState.js';

// ---- Pick ----
export function pickCombatPower(combat, side, factionIdx) {
  if (!combat || !isPickingPhase(combat)) return;

  const entity = entityFor(combat, side);
  if (!entity || entity.controller !== 'human') return; // not human's turn

  const available = getAvailablePicks(entity);
  if (!available.includes(factionIdx)) return; // no-repeat guard

  recordPick(combat, side, factionIdx);

  if (bothPicksIn(combat)) {
    advancePhase(combat);
  }

  renderCombat();
  runCombatFlow(); // resume sequencer (may handle next non-human or reveal)
}

// ---- Action bus wiring (called once, e.g. in initCombatModal) ----
export function wireCombatActions() {
  // Human pick: faction button click uses data-action and data-faction
  registerAction('combatPick', (el) => {
    const combat = getCombatUI();
    if (!combat || !isPickingPhase(combat)) return;

    const side = combat.awaitingSide;
    if (!side) return;

    const entity = entityFor(combat, side);
    if (!entity || entity.controller !== 'human') return;

    const f = Number(el.dataset.faction);
    if (!Number.isFinite(f)) return;

    pickCombatPower(combat, side, f);
  });

  registerAction('fleeCombat', () => {
    const toast = getToast();
    if (toast) toast('Fled from combat.', false);
    const _G = getGameState();
    if (_G) _G.turnLock = false;
    closeCombat();
  });
}