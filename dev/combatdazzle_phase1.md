# PHASE 1 — Engine rewrite (src/game/combat/, stateless rules)

## 1. `combatState.js` — New state shape + initiative

- [ ] **`createCombatState(state, attacker, defender)`**  
  Create a combat object with the following shape:
  ```javascript
  {
    attacker,
    defender,                       // kept for rewards/eligibility
    first,                          // entity ref (derived from globalOrder)
    second,                         // entity ref (derived from globalOrder)
    round: 1,
    phase: 'pick1',                 // pick1 → reveal1 → pick2 → reveal2 → roundEnd
    exchanges: [
      { picks: { first: null, second: null } },
      { picks: { first: null, second: null } }
    ],
    roundScores: { attacker: 0, defender: 0 },
    lastReveal: null,               // per-exchange breakdown payload for FX
    combatLog: [],
    awaitingSide: 'first'           // 'first' | 'second' | null
  }
  ```
- [ ] **`deriveOrder(state, attacker, defender)`**  
  Determine `first` and `second` based on order in `G.globalOrder`.  
  Mob vs champion → champion first.  
  Mob vs mob → deterministic fallback (attacker first).  
  `globalOrder` index decides earlier = first.
- [ ] **`sideOf(combat, entity)` / `entityFor(combat, side)`**  
  Convenience functions to map entity to side or side to entity.

## 2. `combatPicks.js` — Blind pick, record, phase advance

- [ ] **`recordPick(combat, side, factionIdx)`**  
  Write into the current exchange’s hidden slot for the given side.  
  Validate against `getAvailablePicks(entity)` and ensure no repeated faction for that entity across exchanges.
- [ ] **`advancePhase(combat)`**  
  Transition through `pick1 → reveal1 → pick2 → reveal2 → roundEnd`.  
  Set `awaitingSide` per exchange order:
    - Exchange 1: `awaitingSide` starts as `'first'` (both pick, then reveal).
    - Exchange 2: `awaitingSide` starts as `'second'` (reversed order).
  Use `isPickingPhase` helper (`phase.startsWith('pick')`) for guards.
- [ ] **`bothPicksIn(combat)`**  
  Return `true` when both picks in the current exchange are non-null.
- [ ] **Rewrite `botCombatPick(entity, revealedHistory, available)`**  
  Blind pick: prefer the available faction that beats the opponent's most‑potent revealed faction.  
  Tie‑break by own potency.  
  **Never read** the current exchange opponent pick.
- [ ] **Keep `getAvailablePicks(entity)` as-is** (no changes).

## 3. `combatScoring.js` — Scoring and reveal payload

- [ ] **Keep `scorePickPair` and `applyFinalBonuses` untouched** (no changes).
- [ ] **`processReveal(state, combat)`**  
  Score the current exchange (both picks now filled).  
  Write a rich `lastReveal` object for the FX layer:
  ```javascript
  {
    [side]: {
      factionIdx,
      basePotency,
      weatherMod,
      multiplier,
      beats,        // boolean
      score
    },
    runningTotals: { attacker: Number, defender: Number }
  }
  ```
  This includes every contributing element for animation.

## 4. `combatDamage.js` — Damage and round transition

- [ ] **Keep `resolveRoundDamage` and `moveDamagedBeforeDamager` as-is** (no changes).
- [ ] **`nextCombatRound(state, combat)`**  
  Accept `state` to re‑derive `first`/`second` from `G.globalOrder` (after round‑end reorder).  
  Reset `exchanges`, `scores`, `phase` back to `pick1`.  
  Calls `deriveOrder(state, attacker, defender)` again if needed.
- [ ] **Keep `finalizeCombat` as-is** (no changes).

## 5. `combat-index.js` — Barrel exports

- [ ] **Update barrel exports** to include all new function names from `combatState.js`, `combatPicks.js`, `combatScoring.js`, `combatDamage.js`.

## 📝 Review Notes (to implement alongside changes)

- [ ] **Note §1**: The old dead‑code branch `if (_combatUI.phase === 'picking')` is confirmed never‑true. Replace with new phase system (`pick1`, `reveal1`, etc.) and use `isPickingPhase` (starts‑with `'pick'`) for guards.
- [ ] **Note §2**: `nextCombatRound` now accepts `state` in order to re‑derive `first`/`second` from `G.globalOrder`. Update call site in `runCombatFlow` (likely in `combatLifecycle.js` or similar) to pass `G` (available via `getGameState()`). The old `handleRoundEnd` called it with just `(_combatUI)` — update this.
- [ ] **Note §3**: Mobs have no `controller` property (`undefined`), so `undefined !== 'human'` → true → auto‑pick. This is correct. `deriveOrder` also handles mob‑vs‑mob edge case (attacker‑first fallback).
- [ ] **Note §5**: `processReveal` no longer needs `combat.phase === 'reveal1' ? 0 : 1` to index into `roundPicks`. With the new `exchanges` array, always use the current exchange (the one where both picks are now filled).
- [ ] **Note §8**: The new `lastReveal` shape adds granularity (`potency number`, `weatherMod`, `multiplier badge`) for the FX layer. Ensure `combatVM.js` transforms all of these for the renderer.

---

**Next steps after this phase:**
- Wire the new stateless functions into the combat lifecycle (PHASE 2).
- Update UI layer (PHASE 3) to consume the refined `lastReveal` payload.