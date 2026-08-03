import { FACTIONS } from '../../game/rules/factionData.js';
import { sideOf } from '../../game/state/combat/index.js';
import { svgIcon } from '../svgIcon.js';
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
import { SLOT_FLIP_WAIT_MS, CLASH_PAUSE_MS, COUNT_UP_DURATION_MS } from '../../params/ui/combatUiParams.js';

/**
 * Animate the simultaneous reveal of both sides' picks for a combat exchange.
 * Flips face-down slots, plays clash pulse, counts up running totals,
 * and floats delta scores.
 */
export async function animateReveal(combat, reveal) {
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
    slotA.replaceChildren(svgIcon(fac.glyphId, 20), ' ', fac.name);
    slotA.style.setProperty('--slot-color', fac.color);
    slotA.classList.add('face-down');
  }

  // --- Slot B (second's slot) ---
  const slotBId = exchangeIdx === 0 ? 'sB1' : 'sB2';
  const slotB = getSlot(slotBId);
  if (slotB && pickSecond != null) {
    const fac = FACTIONS[reveal.second.factionIdx];
    slotB.replaceChildren(svgIcon(fac.glyphId, 20), ' ', fac.name);
    slotB.style.setProperty('--slot-color', fac.color);
    slotB.classList.add('face-down');
  }

  // --- Flip both slots ---
  if (slotA) revealSlot(slotA, reveal.first.factionIdx);
  if (slotB) revealSlot(slotB, reveal.second.factionIdx);

  await wait(SLOT_FLIP_WAIT_MS); // let flips finish (--dur-slow)

  // --- Clash pulse: highlight winning/losing faction tokens ---
  const modalEl = document.getElementById('combatOverlay');
  clashPulse(reveal, modalEl);

  await wait(CLASH_PAUSE_MS);

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
      countUp(leftEl, curLeft, targetAttacker, COUNT_UP_DURATION_MS),
      countUp(rightEl, curRight, targetDefender, COUNT_UP_DURATION_MS),
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
      countUp(leftEl, curLeft, targetDefender, COUNT_UP_DURATION_MS),
      countUp(rightEl, curRight, targetAttacker, COUNT_UP_DURATION_MS),
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