import {
  entityFor,
  recordPick,
  advancePhase,
  bothPicksIn,
  isPickingPhase,
  getAvailablePicks,
  fleeFromCombat
} from '../../game/state/combat/index.js';
import { getCombatUI, getToast, getRefreshAll } from './combatUiState.js';
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
    const combat = getCombatUI();
    if (!combat) return;

    // Cannot flee before at least one full round has completed
    if (combat.round <= 1) {
      const toast = getToast();
      if (toast) toast('Cannot flee before the first exchange resolves.', true);
      return;
    }

    const _G = getGameState();
    if (!_G) return;

    // Determine which role the human plays (attacker or defender)
    const humanSide = combat.first?.controller === 'human' ? 'first' : 'second';
    const fleeingRole = humanSide === 'first'
      ? (combat.first === combat.attacker ? 'attacker' : 'defender')
      : (combat.second === combat.attacker ? 'attacker' : 'defender');

    fleeFromCombat(_G, combat, fleeingRole);

    _G.turnLock = false;
    closeCombat();
    const refresh = getRefreshAll();
    if (refresh) refresh();
  });
}