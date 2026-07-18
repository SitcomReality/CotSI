import {
  entityFor,
  recordPick,
  advancePhase,
  bothPicksIn,
  isPickingPhase,
  getAvailablePicks
} from '../../game/combat/combat-index.js';
import { getCombatUI } from './combatStateManager.js';
import { renderCombat } from './combatRenderer.js';
import { registerAction } from '../actionBus.js';
import { runCombatFlow } from './combatLifecycle.js';

// ---- Pick ----
export function pickCombatPower(factionIdx) {
  const combat = getCombatUI();
  if (!combat || !isPickingPhase(combat)) return;

  const side = combat.awaitingSide;
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
    const factionIdx = parseInt(el.dataset.faction, 10);
    pickCombatPower(factionIdx);
  });
}
