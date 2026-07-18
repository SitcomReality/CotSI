import { FACTIONS } from '../../core/factions.js';
import { getCombatUI } from './combatStateManager.js';
import { sideOf } from '../../game/combat/combat-index.js';
import {
  wait,
  revealSlot,
  clashPulse,
  countUp,
  floatText,
  getSlot,
  getFxLayer,
  getCard,
} from './combatFx.js';

/**
 * Animate the simultaneous reveal of both sides' picks for a combat exchange.
 * Flips face-down slots, plays clash pulse, counts up running totals,
 * and floats delta scores.
 */
export async function animateReveal(reveal) {
  const combat = getCombatUI();
  if (!combat || !reveal) return;

  const fxLayer = getFxLayer();

  // Determine which exchange we're revealing (0 or 1)
  const exchangeIdx = combat.phase === 'reveal1' ? 0 : 1;

  // Get the picks for this exchange
  const exchange = combat.exchanges[exchangeIdx];
  const pickFirst = exchange.picks.first;
  const pickSecond = exchange.picks.second;

  // --- Slot A (first's slot) ---
  const slotAId = exchangeIdx === 0 ? 'sA1' : 'sA2';
  const slotA = getSlot(slotAId);
  if (slotA && pickFirst != null) {
    const fac = FACTIONS[reveal.first.factionIdx];
    slotA.textContent = fac.glyph + ' ' + fac.name;
    slotA.style.setProperty('--slot-color', fac.color);
    slotA.classList.add('face-down');
  }

  // --- Slot B (second's slot) ---
  const slotBId = exchangeIdx === 0 ? 'sB1' : 'sB2';
  const slotB = getSlot(slotBId);
  if (slotB && pickSecond != null) {
    const fac = FACTIONS[reveal.second.factionIdx];
    slotB.textContent = fac.glyph + ' ' + fac.name;
    slotB.style.setProperty('--slot-color', fac.color);
    slotB.classList.add('face-down');
  }

  // --- Flip both slots ---
  if (slotA) revealSlot(slotA, reveal.first.factionIdx);
  if (slotB) revealSlot(slotB, reveal.second.factionIdx);

  await wait(420); // let flips finish (--dur-slow)

  // --- Clash pulse: highlight winning/losing faction tokens ---
  clashPulse(reveal);

  await wait(150);

  // --- Count-up the running totals ---
  const leftEl = document.getElementById('csLeft');
  const rightEl = document.getElementById('csRight');

  const curLeft = parseInt(leftEl?.textContent, 10) || 0;
  const curRight = parseInt(rightEl?.textContent, 10) || 0;
  const targetAttacker = reveal.runningTotals.attacker;
  const targetDefender = reveal.runningTotals.defender;

  const attSide = sideOf(combat, combat.attacker);

  if (attSide === 'first') {
    // attacker = left, defender = right
    await Promise.all([
      countUp(leftEl, curLeft, targetAttacker, 500),
      countUp(rightEl, curRight, targetDefender, 500),
    ]);
    const deltaAtt = targetAttacker - curLeft;
    const deltaDef = targetDefender - curRight;
    if (deltaAtt > 0 && fxLayer && leftEl) {
      floatText(fxLayer, leftEl, `+${deltaAtt}`, 'score');
    }
    if (deltaDef > 0 && fxLayer && rightEl) {
      floatText(fxLayer, rightEl, `+${deltaDef}`, 'score');
    }
  } else {
    // attacker = right, defender = left
    await Promise.all([
      countUp(leftEl, curLeft, targetDefender, 500),
      countUp(rightEl, curRight, targetAttacker, 500),
    ]);
    const deltaDef = targetDefender - curLeft;
    const deltaAtt = targetAttacker - curRight;
    if (deltaDef > 0 && fxLayer && leftEl) {
      floatText(fxLayer, leftEl, `+${deltaDef}`, 'score');
    }
    if (deltaAtt > 0 && fxLayer && rightEl) {
      floatText(fxLayer, rightEl, `+${deltaAtt}`, 'score');
    }
  }
}