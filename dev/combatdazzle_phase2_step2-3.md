## 2. Rewrite `combatLifecycle.js` – the async sequencer

The core logic:

- Loop through phases.
- If `isPickingPhase(combat)`:
  - Get the side that should pick (`awaitingSide`).
  - If the entity is **not** human → auto‑pick after `450 ms`, record, check `bothPicksIn`, advance phase if needed, re‑render, then **continue** the loop (to possibly handle the other side or enter reveal).
  - If the entity **is** human → **break** the loop. The action bus handler (`pickCombatPower`) will call `recordPick`, check `bothPicksIn`/advance, render, and then call `runCombatFlow()` again.
- If `isRevealPhase(combat)`:
  - Call `processReveal(G, combat)` and capture the `lastReveal`.
  - Animate (placeholder for Phase 4).
  - Wait `900 ms`, check cancellation, advance phase, re‑render, **continue**.
- If `phase === 'roundEnd'`:
  - Apply final bonuses, resolve damage, check deaths.
  - On death→close combat, reward modal, return.
  - On no death→wait `1200 ms`, `nextCombatRound`, re‑render, **continue**.

**Cancellation guard**: after every `await`, check `if (!getCombatUI()) return;`.

**Re‑entry guard**: at the top of `startCombat`, `if (getCombatUI()) return;`.

Here’s the full new `combatLifecycle.js`:

```javascript
// src/ui/combat/combatLifecycle.js
import {
  isPickingPhase,
  isRevealPhase,
  recordPick,
  advancePhase,
  bothPicksIn,
  getAvailablePicks,
  botCombatPick,
  processReveal,
  applyFinalBonuses,
  resolveRoundDamage,
  nextCombatRound,
  finalizeCombat,
  entityFor
} from '../../game/combat/combat-index.js';

import {
  getCombatUI,
  setCombatUI,
  getGameState,
  getRefreshAll,
  getToast
} from './combatStateManager.js';

import { renderCombat } from './combatRenderer.js';
import { openRewardModal } from './combatRewardUI.js';
import { showModal, hideModal } from '../modal.js';

// ---- helpers ----

const wait = (ms) => new Promise(r => setTimeout(r, ms));

function getOpponentRevealedHistory(combat, awaitingSide) {
  // Returns pick indices from previous exchanges that belong to the opponent
  const exchangeIdx = combat.phase === 'pick1' ? 0 : 1;
  if (exchangeIdx === 0) return [];
  const previous = combat.exchanges[0];
  const opponentSide = awaitingSide === 'first' ? 'second' : 'first';
  const pick = previous.picks[opponentSide];
  return pick !== null ? [pick] : [];
}

// ---- async sequencer ----

export async function runCombatFlow() {
  while (getCombatUI()) {
    const combat = getCombatUI();

    // ---------- PICK PHASE ----------
    if (isPickingPhase(combat)) {
      const side = combat.awaitingSide;
      const entity = entityFor(combat, side);
      if (!entity) break; // safety

      // Non‑human (bot or mob – mobs have no controller)
      if (entity.controller !== 'human') {
        await wait(450);
        if (!getCombatUI()) return; // cancelled (e.g. flee)

        const history = getOpponentRevealedHistory(combat, side);
        const available = getAvailablePicks(entity);
        const pick = botCombatPick(entity, history, available);
        if (pick == null) break; // no valid pick (shouldn't happen)

        recordPick(combat, side, pick);
        if (bothPicksIn(combat)) {
          advancePhase(combat);
        }
        renderCombat();
        continue; // loop again – maybe second side is picking, or enter reveal
      }

      // Human – stop the loop; action bus will call runCombatFlow again
      break;
    }

    // ---------- REVEAL PHASE ----------
    if (isRevealPhase(combat)) {
      const _G = getGameState();
      const reveal = processReveal(_G, combat); // writes combat.lastReveal
      if (reveal) {
        animateReveal(reveal); // Phase 4 placeholder
      }
      renderCombat();
      await wait(900);
      if (!getCombatUI()) return;

      advancePhase(combat);
      continue;
    }

    // ---------- ROUND END ----------
    if (combat.phase === 'roundEnd') {
      await handleRoundEnd();
      // if handleRoundEnd returned normally, continue
      if (getCombatUI()) continue;
      return;
    }

    // Unknown phase – stop
    break;
  }
}

async function handleRoundEnd() {
  const combat = getCombatUI();
  if (!combat || combat.phase !== 'roundEnd') return;

  const _G = getGameState();
  const { attacker, defender, roundScores } = combat;

  // Apply final bonuses (Crucible, weather, margin, Hollow)
  const { scoreA, scoreB } = applyFinalBonuses(
    _G, attacker, defender, roundScores.attacker, roundScores.defender
  );
  combat.roundScores.attacker = scoreA;
  combat.roundScores.defender = scoreB;

  // TODO(PHASE 4): trigger damage/floating text FX here

  const result = resolveRoundDamage(_G, combat);

  if (result.defenderDead) {
    const rewards = finalizeCombat(_G, attacker, defender, true);
    closeCombat();
    openRewardModal(attacker, {
      title: 'Victory!',
      body: `${attacker.name} has won the battle!`,
      rewards: [`+${rewards.gold} gold`, '+1 relic']
    });
    const refresh = getRefreshAll();
    if (refresh) refresh();
    return; // sequencer stops (combat UI cleared)
  }

  if (result.attackerDead) {
    closeCombat();
    const toast = getToast();
    if (toast) toast('You were defeated.', true);
    const refresh = getRefreshAll();
    if (refresh) refresh();
    return;
  }

  await wait(1200);
  if (!getCombatUI()) return;

  nextCombatRound(combat); // re‑derives first/second from updated G.globalOrder
  renderCombat();
  // control returns to runCombatFlow loop
}

// ---- combat lifecycle functions ----

export function startCombat(attacker, defender) {
  if (getCombatUI()) return; // re‑entry guard

  const _G = getGameState();
  const combat = createCombatState(_G, attacker, defender); // from Phase 1
  setCombatUI(combat);
  openCombatModal();
}

export function openCombatModal() {
  showModal('combatModal');
  renderCombat();
  runCombatFlow(); // start the sequence
}

export function closeCombat() {
  hideModal('combatModal');
  setCombatUI(null);
}

// ---- Phase 4 placeholder ----
function animateReveal(reveal) {
  // Minimal: add a CSS class to the revealed token slots
  // reveal has shape { first: { factionIdx, ... }, second: { factionIdx, ... } }
  const allSlots = document.querySelectorAll('.ctok');
  allSlots.forEach(el => {
    const ownIdx = parseInt(el.dataset.f, 10);
    if (ownIdx === reveal.first.factionIdx || ownIdx === reveal.second.factionIdx) {
      el.classList.add('reveal-pulse');
      setTimeout(() => el.classList.remove('reveal-pulse'), 1000);
    }
  });
}