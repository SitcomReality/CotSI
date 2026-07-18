## 1. Fix the imports in `combatLifecycle.js`

---

## 2. Rewrite `combatLifecycle.js` – the async sequencer

---

## 3. Update `combatInteractions.js`

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
