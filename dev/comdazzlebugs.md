# Diagnosis & Fix Plan

I've identified **5 issues** from the error reports and code review. The three you experienced on the console are fully explained below, plus two more that would cause visible bugs.

---

## 🐛 Bug 1: `nextCombatRound` called with wrong arguments → crash

**Error:**  
`TypeError: can't access property "round", combat is undefined` at `combatDamage.js:41`

**Root Cause:**  
In `combatLifecycle.js` line ~195 in `handleRoundEnd`:

```javascript
nextCombatRound(combat); // ← WRONG: missing state argument
```

The function signature in `combatDamage.js` is:

```javascript
export function nextCombatRound(state, combat) { ... }
```

When called with only `combat`, `state` is `undefined`. Inside the function, `deriveOrder(state, ...)` immediately fails because `state` has no `globalOrder`.

**Fix:**  
Change the call to:

```javascript
nextCombatRound(_G, combat);
```

(The variable `_G` is available — it was defined earlier in `handleRoundEnd`.)

---

## 🐛 Bug 2: `data-action` attribute set to string `"undefined"` → phantom action bus warnings

**Error:**  
`[actionBus] No handler registered for action 'undefined'.`

**Root Cause:**  
In `combatRenderer.js`, `buildToken` sets `dataAction: undefined` on non-clickable tokens:

```javascript
return h('div', {
    class: classes.join(' '),
    dataAction: isClickable ? 'combatPick' : undefined,  // ← BUG
    dataFaction: pot.idx,
    ...
```

The `h()` helper in `dom.js` converts `dataAction` exactly as given:

```javascript
else if (key.startsWith('data'))
  el.setAttribute(key.replace(/[A-Z]/g, m => '-' + m.toLowerCase()), val);
// → setAttribute('data-action', undefined)
```

In the browser, `setAttribute` with `undefined` converts it to the **string** `"undefined"`. So every non-clickable token gets `data-action="undefined"`, and clicking it triggers the handler lookup for `'undefined'`.

(Additionally, clicking an opponent's or out-of-turn token on the left side fires the same — they all have `data-action="undefined"`.)

**Fix:**  
Only attach `data-action` when the token is actually pickable:

```javascript
const props = {
  class: classes.join(' '),
  dataFaction: pot.idx,
  mouseenter: () => setHeptagramHighlight(pot.idx),
  mouseleave: () => setHeptagramHighlight(-1),
};
if (isClickable) {
  props.dataAction = 'combatPick';
}
return h('div', props, /* children */);
```

---

## 🐛 Bug 3: No handler registered for `'fleeCombat'`

**Error:**  
`[actionBus] No handler registered for action 'fleeCombat'.`

**Root Cause:**  
The Flee button exists in `index.html` with `data-action="fleeCombat"` (line ~193), but `wireCombatActions()` in `combatInteractions.js` only registers `'combatPick'`. No handler was ever attached.

**Fix:**  
In `wireCombatActions()`, add:

```javascript
import { closeCombat } from './combatLifecycle.js';
import { getToast } from './combatStateManager.js';

registerAction('fleeCombat', () => {
  const toast = getToast();
  if (toast) toast('Fled from combat.', false);
  closeCombat();
});
```

---

## 🐛 Bug 4: Double-damage from redundant `resolveRoundDamage` call

**Location:** `combatLifecycle.js` inside `handleRoundEnd`, lines ~182-190.

```javascript
const result = resolveRoundDamage(_G, combat);   // 1st call — correct

if (result.defenderDead) { /* ... */ return; }
if (result.attackerDead) { /* ... */ return; }

const damageResult = resolveRoundDamage(_G, combat);  // 2nd call — APPLIES DAMAGE AGAIN
```

The code calls `resolveRoundDamage` a second time after the dead-check block, re-applying HP damage. This means the combatant loses **double** the intended HP.

**Fix:**  
Reuse the `result` variable for all damage/animation work. Delete the second `resolveRoundDamage` call entirely. The subsequent code should use `result` (which is already `{ damage, to, attackerDead, defenderDead }`).

---

## 🐛 Bug 5: `animateReveal` not awaited → phase advances before FX finish

**Location:** `combatLifecycle.js` `runCombatFlow`, reveal block:

```javascript
if (reveal) {
  animateReveal(reveal); // ← no await!
}
renderCombat();
await wait(900);
if (!getCombatUI()) return;
advancePhase(combat);
```

`animateReveal` is `async` and performs flips, clash pulses, and count-ups. Because it's not awaited, the subsequent `wait(900)` runs concurrently, likely finishing before `animateReveal` has completed its 420ms flip + 150ms pulse + 500ms count-up = 1070ms total. This results in overlapping/truncated effects.

**Fix:**  
Add `await`:

```javascript
if (reveal) {
  await animateReveal(reveal);
}
renderCombat();
await wait(1200); // give extra hold for the eye to register
if (!getCombatUI()) return;
advancePhase(combat);
```

---

## Summary of required changes (files & lines)

| File | Line(s) | Issue |
|------|---------|-------|
| `combatLifecycle.js` | ~195 | `nextCombatRound(combat)` → `nextCombatRound(_G, combat)` |
| `combatLifecycle.js` | ~182-190 | Remove redundant second `resolveRoundDamage` call |
| `combatLifecycle.js` | reveal block | Add `await` before `animateReveal(reveal)` |
| `combatRenderer.js` | `buildToken` | Remove `dataAction: undefined`, conditionally set only when pickable |
| `combatInteractions.js` | `wireCombatActions` | Register `'fleeCombat'` handler |