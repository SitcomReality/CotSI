## Phase‑0 — Preparation (create utility modules, do not alter existing files yet)

Three tiny utility files to underpin the entire refactor.

### **File 1:** `src/ui/utils/dom.js` – the `h()` DOM builder

### **File 2:** `src/ui/actionBus.js` – the single delegated event listener

### **File 3:** `src/ui/viewModels/championVM.js` – pure data shaping

    Extracted the calculations that were buried in `leftPanel.js` and later in `headerRenderer.js`.

---

## Phase 1 – `setupUI.js`: the faction‑roster screen

---

## Phase 2 – `modal.js`: artifact choice and generic rewards

---

## Phase 3 – `hud.js`: toasts and log bar

---

## Phase 4 – `headerRenderer.js`: the champion bar and detail card

---

## Phase 5 – `gameOrchestrator.js`: glue it all together

---

## Phase 6 – hex map tooltips
s
---

## Phase 7 – `combatRenderer.js`: combat modal

**Goal**: Remove the giant `combatantCard()` template string and the inline pickup slots. Use view models and `h()`.

### What to do

1. Create `getCombatVM()` that returns an object with attacker/defender name, color, HP info, potency lists, locked picks, etc.  
2. In `renderCombat()`, instead of setting `innerHTML` on `#leftCombat` and `#rightCombat`, clear the containers and rebuild them with `h()`, using the view model.  
3. The pickup slots (`sA1`, `sA2`, etc.) are also rebuilt with `h()`. The click handling already uses delegated `data-action`, so potency tokens will carry `data-action="pickCombatPower"` and `data-f`.  
4. Remove `wireCombatPotencyHover()` and replace with pure CSS `:hover` on `.ctok` class; you can keep the Paley highlight by using a CSS class toggle via `mouseenter` (still fine).  
5. Move any dynamic styles like background tint to CSS variables on the parent.

### CSS to add

```css
.ctok {
  border: 2px solid var(--faction-color);
  border-radius: 6px;
  padding: 4px;
  text-align: center;
  transition: transform 0.15s;
  cursor: pointer;
}
.ctok.pickable:hover {
  transform: scale(1.15);
  border-color: gold;
}
.ctok.used {
  opacity: 0.4;
  pointer-events: none;
}
```

This phase will touch **both** `combatRenderer.js` and likely `combatui-index.js` (which wires the click), but we can limit the new listener registration to `actionBus` by adding a `pickCombatPower` action. The combat UI code is already encapsulated, so that’s a single concern. We’ll note that in the phase.

---

## Phase 8 – `combatRewardUI.js` (if separate) or integrate with modal

If `combatRewardUI.js` uses `innerHTML` for reward popups, convert to the same template‑cloning pattern as in phase 2. Otherwise it will already be covered.

---

## Phase 9 – `heptagramWidget.js`

This likely renders an SVG/canvas and may have some `innerHTML` for a container. If it’s purely canvas, no change needed. If it inserts any HTML strings, replace with `h()`. The plan mentions it just in case.

---

## Final phase – cleanup and verify

After all files are refactored:

- **De-duplicate before you register.** `gameUIBindings.js` currently owns the c/r/+/− keydown shortcuts and the map-control button clicks, while the keyboard map in `actionBus.js` covers the same keys. Registering `zoomIn` / `centerChampion` / etc. on the bus *before* deleting the matching binding in `gameUIBindings.js` makes every key and button fire twice. For each action: register it on the bus and delete the old direct binding **in the same commit**. (Space→`endTurn` is already bus-owned — do not re-bind Space anywhere.)
- When end turn / inspect / zoom / center / reset have all moved to the bus, delete `gameUIBindings.js` and remove its import from `gameOrchestrator.js`.
- Remove the remaining legacy globals in the same pass: the inline `onclick="commitCombat()"` / `onclick="restartToSetup()"` / combat-modal "Flee" handler in `index.html`, `window.commitCombat`, `window.closeReward`, `window._onPaleyHover`, `window.__SUPERNAL__`, and the dead `#logMount` log-bar chevron handler (nothing renders into `#logMount` anymore).
- In `bootstrapUI.js`, import and call `registerAction` for the remaining actions (end turn, zoom, center champion, etc.).

### Smoke checklist — run after EVERY phase, not just this one

No test runner exists, so verify manually in the browser after each refactor phase:

1. Setup screen: toggle a faction, switch Human/Bot, change map size, Begin.
2. First-turn artifact draft opens; clicking a choice grants the artifact and closes the modal (check the champion card's Artifact line).
3. Move: click a highlighted hex; moves counter decreases. End Turn via **button** and via **Space** — exactly one turn ends per input (watch the Day counter and the log).
4. Zoom / reset / center via buttons and via the +/−/r/c keys.
5. Combat: attack a mob or champion — the modal renders both combatants, pick a power, Commit, reveal plays, rounds resolve.
6. Victory reward modal after a kill: Accept/Close dismisses it and the reward is granted.
7. Dig: end a turn on eligible empty ground; the dig reward modal appears and Accept clears it.
8. Header: hover a champion pill → detail card opens; event log updates; heptagram hover highlights beats lines.
9. Victory: reach a win condition → victory modal shows the winner's name without a console error → Return to Setup reloads.

---

This incremental plan respects the original architecture while systematically removing the dangerous `innerHTML` patterns. At each stage the game stays functional, and you only need to touch one behavior file at a time. The CSS additions are minimal and can be dropped in as you go.