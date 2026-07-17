## Step‑0 — Preparation (create utility modules, do not alter existing files yet)

Three tiny utility files to underpin the entire refactor.

### **File 1:** `src/ui/utils/dom.js` – the `h()` DOM builder

### **File 2:** `src/ui/actionBus.js` – the single delegated event listener

### **File 3:** `src/ui/viewModels/championVM.js` – pure data shaping

    Extracted the calculations that were buried in `leftPanel.js` and later in `headerRenderer.js`.

---

## Step 1 – `setupUI.js`: the faction‑roster screen

**Goal**: Replace `innerHTML` regeneration with a list built via `h()`, move hover/active styles to CSS, and make the “Begin” button use `data-action`.

### What to do in `setupUI.js`

1. Import `h` and `registerAction`.  
2. Replace `draw()` to build the roster with `h()` instead of string templates.  
3. Use `data-action` attributes on the control buttons and faction toggles instead of inline `onclick`.  
4. Register two actions: `'toggleFaction'` and `'toggleController'`.  
5. The “Begin” button gets `data-action="beginGame"`; move the whole logic there, reading DOM values only when clicked (no need for a separate state yet).  
6. Remove all `onclick` / `.onclick` assignments.

### Stylesheet note (corrected)

~~New stylesheet has been created: /styles/components/faction-options.css~~ — that file was never created. The roster styles already live in the existing sheets: `.fopt` / `.fopt.on` in `styles/pages/setup.css`, `.fctrl` in `styles/components/buttons.css` (note: `buttons.css` currently contains three conflicting `.fctrl` rules at lines ~87, ~183, ~196 — consolidate them when touching that file). The sample CSS below is therefore only a reference for what those rules should contain; do not create a new file.

```css
/* Faction option */
.fopt {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
}
.fopt.on {
  border-color: var(--faction-color);
  background: rgba(255,255,255,0.2);
}
.fctrl {
  margin-left: auto;
  font-size: 12px;
  padding: 2px 6px;
}
```

### How to test
The setup screen should look and behave identically, but now managed by the action bus.

---

## Step 2 – `modal.js`: artifact choice and generic rewards

**Goal**: Drop inline `onmouseenter` / `onmouseleave` styling, use CSS `:hover` and transitions.  
Replace `innerHTML` rendering of artifact choices with cloned `<template>` fragments.

### What to do in `modal.js`

1. In `index.html`, add a `<template id="modalChoiceOption">` with the structure.
2. Rewrite `setRewardModal` and `openArtifactChoiceModal` to:
   - Copy the template, fill text, set `data-action="chooseArtifact"` and `data-idx`.
   - Append to the modal body, no inline styles.
3. Remove inline style manipulation; rely on CSS classes like `.artifact-choice:hover`.
4. Register a global action `chooseArtifact` in `actionBus.js` that handles the choice (hide modal, call provided callback). Store the callback on the modal element using a `data` property.

### CSS to add, either to a relevant extant file, or in its own new file

```css
.artifact-choice {
  border: 2px solid #d0a86a;
  background: #fff7dfaa;
  border-radius: 10px;
  padding: 12px;
  margin: 8px 0;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.artifact-choice:hover {
  border-color: #b88728;
  background: #fff4cf;
}
```

---

## Step 3 – `hud.js`: toasts and log bar

**Goal**: Eliminate inline styles from toast creation. Use `h()` to build the toast element and attach it.  
The log‑bar toggle is already delegated; that can stay, but we’ll move any leftover inline styles to CSS.

### What was actually done in `hud.js` (corrected)

The implementation deviated from the original sketch, deliberately: instead of
creating/removing a toast element per message with `h()`, we keep the single
static `#toast` element already present in `index.html` and toggle its `.show`
class (`toast()` sets `textContent` and an optional error border color, then
removes the class after 1800 ms). Styles live in `styles/ui/overlays.css`
(`#toast`, `#toast.show`). This is simpler and avoids timer/element leaks on
rapid successive toasts, so the "CSS to add" block below is superseded — do not
add it.

Remaining cleanup for this step: `pulseEnd()` still targets a nonexistent
`#endTurnBtn` (dead code — the End Turn button lives in the left panel and now
uses `data-action="endTurn"`), and `showVictory()` still builds its content
with `innerHTML` and inline styles.

### CSS to add

```css
.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.8);
  color: #fff;
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 14px;
  z-index: 999;
  animation: toast-fade 2s forwards;
}
@keyframes toast-fade {
  0% { opacity: 0; }
  10% { opacity: 1; }
  80% { opacity: 1; }
  100% { opacity: 0; }
}
```

---

## Step 4 – `headerRenderer.js`: the champion bar and detail card

**Goal**: Full separation of view model and binding. The champion pills are now built using `h()`, and the detail dropdown is populated from `championVM()`.  
All layout and colors are driven by CSS and CSS variables.

### What to do

1. Create a new file `src/ui/bindHeader.js` (or add to the renderer) that:
   - Imports `championVM` and `h`.
   - Exports a function `refreshHeader(G)` that updates the header DOM.
   - The champion bar uses the static container `.header__champions` already present in HTML; we will rebuild its children using `h()` with `data-champ-id`.
2. Replace `renderHeader()` (which returned HTML strings) with `refreshHeader()` that directly updates the DOM.
3. The detail dropdown is filled using `championVM()` and remains bound to `mouseover` as before (we keep that logic, but now the populace is generated by `h()` so it’s pure nodes).  
4. All inline styles removed; classes like `.header__champion[data-state="current"]` handle state‑based colors.

**Important**: The header events remain in `bindHeaderEvents()`, but we’ll adjust them to query real nodes.

### CSS to add

```css
.header__champion { display: flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 4px; cursor: pointer; }
.header__champion[data-state="current"] { background: #fff3cd; }
.header__champion[data-state="played"] { opacity: 0.6; }
.header__champion[data-state="dead"] { display: none; }

.header__champion-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--faction-color); }
```

---

## Step 5 – `gameOrchestrator.js`: glue it all together

Now that all the individual renderers are refactored, `refreshAll()` can stop using `innerHTML`.

### What to do

1. Replace calls to `renderLeftPanel(G, ch)` with `bindLeftPanel(G, ch)` (we’ll write that binder inside `gameOrchestrator.js` or as a separate module).  
2. Replace `renderHeader(G)` → `refreshHeader(G)`.  
3. Update the right panel similarly (a binder that maps a few data‑ui elements).  
4. Remove any remaining `innerHTML = …` for those panels.  
5. The 3D map rendering (`renderHexMap3D`) remains untouched because it already uses canvas/WebGL.  
6. The comment about `map3dInitialized` etc. stays the same.

The binder for the left panel follows the exact skeleton we described earlier, using `data-ui` hooks.

### New file `src/ui/bindLeftPanel.js` (created in this step)

> **Prerequisite:** this binder only updates an *existing* skeleton. Before
> wiring it up, add the static champion-card markup with `data-ui` hooks
> (`data-ui="name"`, `hpValue`, `moves`, `gold`, `relics`, `knot`, `weapon`,
> `armor`, `artifact`) and a `.left-potency-bars` container into
> `#championCard` in `index.html`, and give the skeleton's buttons
> `data-action="inspect"` / `data-action="endTurn"`.
>
> Corrections vs. the first draft of this snippet: `currentChamp` is a module
> export of `gameOrchestrator.js`, **not** a method on the state object; the
> view-model import path is `./viewModels/…` (the file lives in `src/ui/`);
> `FACTIONS` must be imported; and `--champ-hp-pct` takes a plain number
> because the CSS is `calc(var(--champ-hp-pct) * 1%)`.

```js
// src/ui/bindLeftPanel.js
import { championVM } from './viewModels/championVM.js';
import { currentChamp } from '../game/gameOrchestrator.js';
import { FACTIONS } from '../core/factions.js';
import { h } from './utils/dom.js';

const el = document.getElementById('championCard');

export function bindLeftPanel(G) {
  const ch = currentChamp();
  if (!ch) {
    el.textContent = 'No active champion';
    return;
  }
  const vm = championVM(G, ch);
  el.style.setProperty('--faction-color', vm.factionColor);
  el.style.setProperty('--champ-hp-pct', vm.hpPct); // plain number; CSS multiplies by 1%

  // direct text updates
  const set = (sel, val) => { const n = el.querySelector(`[data-ui="${sel}"]`); if (n) n.textContent = val; };
  set('name', vm.name);
  set('hpValue', `${vm.hp}/${vm.maxHp}`);
  set('moves', `${vm.moves}/${vm.maxMoves}`);
  set('gold', vm.gold);
  set('relics', vm.relics);
  set('knot', vm.knot);
  set('weapon', vm.weapon);
  set('armor', vm.armor);
  set('artifact', vm.artifactLabel);

  // potency bars: rebuild with h() into the details container
  const container = el.querySelector('.left-potency-bars');
  if (container) {
    container.replaceChildren();
    vm.pots.forEach((v, i) => {
      const fac = FACTIONS[i];
      const row = h('div', { class: 'left-potency-row' },
        h('span', { class: 'left-potency-dot', style: { background: fac.color } }),
        h('span', { class: 'left-potency-track' },
          h('span', { class: 'left-potency-fill', style: { width: Math.min(100, v * 6) + '%', background: fac.color } })
        ),
        h('span', { class: 'left-potency-num' }, v)
      );
      container.appendChild(row);
    });
  }
}
```

**CSS addition**: You already have styles for those classes; just remove any JS‑inlined widths.

---

## Step 6 – hex map tooltips

### What to do

There is no `tooltip.js` in `src/ui/` — the original step title pointed at the wrong file. Two files are actually involved:

- **Content:** `getTooltipContent(gameState, key, activeChampion)` in `src/ui/mapView.js` builds the HTML string and contains the inline styles (`<span style="color:#b88728">● Reachable…`, `<i style="color:#7a5634">[Explored]</i>`). Replace those with classes (e.g. `.hex-tooltip__reachable`, `.hex-tooltip__explored`) and build the fragment with `h()`. Keep the function signature — `src/render/hexmap3d/interaction/hover.js` expects a string or `null`, so return `container.outerHTML` if you build with `h()`.
- **Shell:** `src/render/hexmap3d/interaction/tooltip.js` creates `#hexTooltip3d` with a long inline `style.cssText` block. Move those static styles into a stylesheet (e.g. a `#hexTooltip3d` rule in `styles/ui/overlays.css`); only `left`/`top`/visibility stay inline in JS because they are genuinely dynamic. Positioning logic (`showTooltip`/`hideTooltip`/`bindTooltipToContainer`) is otherwise fine as-is.

---

## Step 7 – `combatRenderer.js`: combat modal

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

This step will touch **both** `combatRenderer.js` and likely `combatui-index.js` (which wires the click), but we can limit the new listener registration to `actionBus` by adding a `pickCombatPower` action. The combat UI code is already encapsulated, so that’s a single concern. We’ll note that in the step.

---

## Step 8 – `combatRewardUI.js` (if separate) or integrate with modal

If `combatRewardUI.js` uses `innerHTML` for reward popups, convert to the same template‑cloning pattern as in Step 2. Otherwise it will already be covered.

---

## Step 9 – `heptagramWidget.js`

This likely renders an SVG/canvas and may have some `innerHTML` for a container. If it’s purely canvas, no change needed. If it inserts any HTML strings, replace with `h()`. The plan mentions it just in case.

---

## Final step – cleanup and verify

After all files are refactored:

- **De-duplicate before you register.** `gameUIBindings.js` currently owns the c/r/+/− keydown shortcuts and the map-control button clicks, while the keyboard map in `actionBus.js` covers the same keys. Registering `zoomIn` / `centerChampion` / etc. on the bus *before* deleting the matching binding in `gameUIBindings.js` makes every key and button fire twice. For each action: register it on the bus and delete the old direct binding **in the same commit**. (Space→`endTurn` is already bus-owned — do not re-bind Space anywhere.)
- When end turn / inspect / zoom / center / reset have all moved to the bus, delete `gameUIBindings.js` and remove its import from `gameOrchestrator.js`.
- Remove the remaining legacy globals in the same pass: the inline `onclick="commitCombat()"` / `onclick="restartToSetup()"` / combat-modal "Flee" handler in `index.html`, `window.commitCombat`, `window.closeReward`, `window._onPaleyHover`, `window.__SUPERNAL__`, and the dead `#logMount` log-bar chevron handler (nothing renders into `#logMount` anymore).
- In `bootstrapUI.js`, import and call `registerAction` for the remaining actions (end turn, zoom, center champion, etc.).

### Smoke checklist — run after EVERY step, not just this one

No test runner exists, so verify manually in the browser after each refactor step:

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