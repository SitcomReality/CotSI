import { getCombatUI, setCombatUI, getGameState } from './combatStateManager.js';
import { getActiveCombatant, getAvailablePicks, botCombatPick, recordCombatPick, advanceCombatPhase, isPickingPhase, isRevealPhase } from '../../game/combat/combat-index.js';
import { renderCombat } from './combatRenderer.js';
import { continueCombatFlow, processRevealPhase } from './combatLifecycle.js';
import { registerAction } from '../actionBus.js';

// ── Human click-to-pick via action bus ──
registerAction('pickCombatPower', (el) => {

  console.log("pickCombatPower 1");

  const _combatUI = getCombatUI();
  if (!_combatUI || !isPickingPhase(_combatUI)) return;
  const entity = getActiveCombatant(_combatUI);
  if (!entity || entity.controller !== 'human') return;

  console.log("pickCombatPower 2");

  const pick = parseInt(el.dataset.f, 10);
  if (isNaN(pick) || pick < 0 || pick > 6) return;

  console.log("pickCombatPower 3");

  // Guard: not already picked this round
  const currentPicks = _combatUI.roundPicks[_combatUI.awaitingPick];
  if (currentPicks.includes(pick)) return;

  console.log("pickCombatPower 4"); // we see this log

  // Guard: available per bot rules (potencyWithPrimary > 0)
  const available = getAvailablePicks(entity);
  if (!available.includes(pick)) return;

  console.log("pickCombatPower 5"); // we never see this log

  recordCombatPick(_combatUI, pick);
  advanceCombatPhase(_combatUI);
  renderCombat();
  continueCombatFlow();
});

// ── Commit reveals via action bus ──
registerAction('commitCombat', () => {
  const _combatUI = getCombatUI();
  if (!_combatUI || !isRevealPhase(_combatUI)) return;
  processRevealPhase();
});

export function makeBotPick() {
  const _combatUI = getCombatUI();
  if (!_combatUI || !isPickingPhase(_combatUI)) return;
  const entity = getActiveCombatant(_combatUI);
  if (!entity || entity.controller !== 'bot') return;

  const opponentPicks = _combatUI.awaitingPick === 'attacker'
    ? _combatUI.roundPicks.defender
    : _combatUI.roundPicks.attacker;

  const available = getAvailablePicks(entity);
  const pick = botCombatPick(entity, opponentPicks, available);
  if (pick == null) return;

  recordCombatPick(_combatUI, pick);
  advanceCombatPhase(_combatUI);
  renderCombat();
  continueCombatFlow();
}