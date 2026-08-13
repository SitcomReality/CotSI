/**
 * combatActions.js — Combat action-bus wiring and init.
 *
 * Registers the human combat interactions (pick a power, flee) with the
 * shared action bus. ui dispatches via [data-action]; the sequencer here
 * drives the combat flow. Called once from bootstrap via initCombat().
 */
import {
  entityFor,
  recordPick,
  advancePhase,
  bothPicksIn,
  isPickingPhase,
  getAvailablePicks,
  fleeFromCombat
} from '../../game/state/combat/index.js';
import { G } from '../../game/state/liveGame.js';
import { getCombatUI, setFinishAttackerTurn } from './combatState.js';
import { toast } from '../../ui/hud.js';
import { FLEE_ROUND_DELAY } from '../../params/game/combatParams.js';
import { renderCombat } from './combatRender.js';
import { registerAction } from '../../shared/actionBus.js';
import { closeCombat } from './combatLifecycle.js';
import { runCombatFlow } from './combatFlow.js';
import { refreshAll } from '../refreshAll.js';

// ---- Pick ----
function pickCombatPower(combat, side, factionIdx) {
  if (!combat || !isPickingPhase(combat)) return;

  const entity = entityFor(combat, side);
  if (!entity || entity.controller !== 'human') return; // not human's turn

  const available = getAvailablePicks(entity);
  if (!available.includes(factionIdx)) return; // no-repeat guard

  recordPick(combat, side, factionIdx);

  if (bothPicksIn(combat)) {
    advancePhase(combat);
  }

  renderCombat(combat);
  runCombatFlow(); // resume sequencer (may handle next non-human or reveal)
}

// ---- Action bus wiring (called once, e.g. in initCombat) ----
export function initCombat(deps) {
  if (deps.finishAttackerTurn) setFinishAttackerTurn(deps.finishAttackerTurn);

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

    // Cannot flee before FLEE_ROUND_DELAY rounds have completed
    if (combat.round <= FLEE_ROUND_DELAY) {
      toast('Cannot flee before the first exchange resolves.', true);
      return;
    }

    if (!G) return;

    // Determine which role the human plays (attacker or defender)
    const humanSide = combat.first?.controller === 'human' ? 'first' : 'second';
    const fleeingRole = humanSide === 'first'
      ? (combat.first === combat.attacker ? 'attacker' : 'defender')
      : (combat.second === combat.attacker ? 'attacker' : 'defender');

    fleeFromCombat(G, combat, fleeingRole);

    G.turnLock = false;
    closeCombat();
    refreshAll();
  });
}
