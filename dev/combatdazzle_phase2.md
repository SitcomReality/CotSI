## 1. Fix the imports in `combatLifecycle.js`

Make sure the imports match the actual exports from `combat-index.js` after Phase 1. Likely mismatches:

| Old import name | Real export name |
|----------------|------------------|
| `recordCombatPick` | `recordPick` |
| `advanceCombatPhase` | `advancePhase` |
| `isPickingPhase` | `isPickingPhase` (same) |
| `isRevealPhase` | `isRevealPhase` (same) |
| `bothPicksIn` | `bothPicksIn` (new) |
| `getActiveCombatant` | helper from `combatState.js` (should export `entityFor(combat, awaitingSide)`) |

If `getActiveCombatant` doesn’t exist, use `entityFor(combat, combat.awaitingSide)`.

---

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
```

---

## 3. Update `combatInteractions.js`

Modify `pickCombatPower` to work with the new state and remove `commitCombat`.

```javascript
// src/ui/combat/combatInteractions.js
import {
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
  if (!available.includes(factionIdx)) return; // no‑repeat guard

  recordPick(combat, side, factionIdx);

  if (bothPicksIn(combat)) {
    advancePhase(combat);
  }

  renderCombat();
  runCombatFlow(); // resume sequencer (may handle next non‑human or reveal)
}

// ---- Action bus wiring (called once, e.g. in initCombatModal) ----
export function wireCombatActions() {
  // Human pick: faction button click uses data‑action and data‑faction
  registerAction('combatPick', (el) => {
    const factionIdx = parseInt(el.dataset.faction, 10);
    pickCombatPower(factionIdx);
  });

  // Remove commitCombat – no longer needed
}

// ---- Bot/Mob pick ----
// This function is no longer needed; the sequencer handles it.
// But we keep a stub for compatibility (or remove if nothing calls it).
export function makeBotPick(entity) {
  // Not called directly anymore; sequencer uses botCombatPick internally.
  // Can be safely deleted if no external references.
}
```

**Important**: Remove the `registerAction('commitCombat', ...)` line (the commit button is already gone from HTML). Delete the old `continueCombatFlow` and `processRevealPhase` etc.

---

## 4. Adjust `combatStateManager.js` if needed

Make sure `getCombatUI`, `setCombatUI`, `getGameState`, `getRefreshAll`, `getToast` are exported and provided. If they don’t exist yet, create a simple module:

```javascript
// src/ui/combat/combatStateManager.js
let _combatUI = null;
let _G = null;
let _refreshAll = null;
let _toast = null;

export const getCombatUI = () => _combatUI;
export const setCombatUI = (ui) => { _combatUI = ui; };
export const getGameState = () => _G;
export const setGameState = (g) => { _G = g; };
export const getRefreshAll = () => _refreshAll;
export const setRefreshAll = (fn) => { _refreshAll = fn; };
export const getToast = () => _toast;
export const setToast = (fn) => { _toast = fn; };
```

(This is likely already present but check the actual file.)

---

## 5. What’s still tricky?

- **Hot‑seat with two humans**: Both players see both cards. The hidden‑slot mechanic works because `combatRenderer` renders opponent slots with `{ hidden: true }` until the exchange reveal. The sequencer breaks when it's a human’s turn; the action bus only allows the **correct** human to pick (by checking `controller === 'human'` and `awaitingSide`). In practice, the UI must block the wrong player from clicking – but that’s a UX detail beyond Phase 2.

- **Cancellation**: The sequencer must not leak after flee. Every `await` checks `getCombatUI()`. Also, startCombat uses `if (getCombatUI()) return;` to prevent double‑start.

- **Phase names**: Ensure `isPickingPhase` and `isRevealPhase` are implemented in `combatState.js` to match `'pick1'`, `'reveal1'`, etc. If not, you’ll need to add them.

- **botCombatPick**: The sequencer calls `botCombatPick(entity, opponentRevealedHistory, available)`. The function must not peek at current‑exchange picks. Make sure the Phase 1 implementation respects that.

- **processReveal return value**: Ensure it returns an object with `.first` and `.second` (each containing at least `factionIdx`). The placeholder `animateReveal` uses that.

- **nextCombatRound** re‑derives `first/second` from the updated `G.globalOrder`. It must accept the game state (not just combat) – passed via `G` from `getGameState()`.

---

## Summary of changes for Phase 2

| File | Change |
|------|--------|
| `combatLifecycle.js` | Rewrite as async sequencer; remove old `continueCombatFlow`; add `runCombatFlow`, `startCombat`, `closeCombat`, `handleRoundEnd`. |
| `combatInteractions.js` | Update `pickCombatPower` to use `recordPick` + `bothPicksIn` + `advancePhase`; remove `commitCombat`; wire action bus; remove or stub `makeBotPick`. |
| `combatStateManager.js` (if needed) | Export `getGameState`, `getCombatUI`, etc. |
| Imports | Fix names: `recordPick`, `advancePhase`, `bothPicksIn`, `entityFor`. |

The core logic you already traced in your rubberduck is correct. The only real challenge is making sure the async loop doesn’t interfere with the synchronous action bus – but the pattern of **breaking** the loop for human input and **re‑calling** `runCombatFlow` after the action bus does its work is standard and works fine.
