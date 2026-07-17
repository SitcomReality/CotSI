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

---

## Audit findings that shape the plan

### A. Combat is functionally broken (verified first-hand)

- **Humans cannot pick powers.** `.ctok` tokens carry `data-f` but no `data-action` and no click handler anywhere (`combatRenderer.js:159-164`). `window.commitCombat` (`combatInteractions.js:33-50`) advances the phase without recording a pick, so `processReveal` always sees `pickA/pickB === undefined` and returns null.
- **`processRevealPhase()` (`combatLifecycle.js:30`) and `handleRoundEnd()` (`combatLifecycle.js:69`) are never called** (grep-verified: definitions only, zero call sites). Reveals never score, damage never resolves, rewards never fire.
- **`setPaleyHighlight` at `combatRenderer.js:19` is defined nowhere** â `ReferenceError` on the first `.ctok` hover. The intended target is evidently `setHeptagramHighlight` from `heptagramWidget.js`.
- **Dead champion branch:** `combatantCard` gates on `!!ent.Potencys` (capital P, `combatRenderer.js:136`); no entity has that property. `potencyWithPrimary(ent)` (`core/factions.js:26`) already implements the primary-power math and works for mobs.
- **Scoring bonuses never apply:** `applyFinalBonuses` gates `finalScoreBonus` on `A.tokens` (`combatScoring.js:39-40`) â no entity has `.tokens`, so Dueling Margin +2 and the Hollow (faction 6) bonus never fire, and the fallback adds the *opponent's* weather score (`state.weather.score[B.faction]`). `combatPicks.js:40-90` holds dead, divergent copies of `scorePickPair`/`applyFinalBonuses`/`processReveal` (gate on `faction===0` instead); the barrel re-exports only the `combatScoring.js` versions.
- **Reward contract mismatch:** `finalizeCombat` returns `{ gold, relic }` (`combatDamage.js:57`); `openRewardModal` expects `{ title, body, rewards, artifactChoice }` (`combatRewardUI.js:8-13`) â the modal always shows fallback text and no reward lines.
- **Flee leaks state:** inline `onclick` (`index.html:207`) hides the modal without `closeCombat()`; combat UI state survives. (Pending bot `setTimeout`s do bail on null UI â `combatInteractions.js:7` â so a proper `closeCombat()` is sufficient.)
- **Duplicate close controls** on the reward modal: static Accept (`index.html:218`) + dynamically appended Close (`combatRewardUI.js:43-47`).
- Dead code: `window.closeReward` (`combatInteractions.js:53-58`), `DECORATED_REWARD` (`combatRewardUI.js:6`), the exported duplicate `openArtifactChoiceModal` (`combatRewardUI.js:67-80`, verbatim copy of the callback at `:52-63`), `#combatOrder` (never written, `index.html:188`), write-only `combat.combatLog` array, unread `revealQueue`.
- CSS mismatches: `.combat-potencys` is emitted by JS but the grid rule is misnamed `.combat-tokens` (`styles/pages/combat.css:37`) â tokens currently render ungridded; `.ctok.used` / `.ctok.pickable` / `.potency-hover` are emitted/toggled but have no rules; `.ctok.sel` has a rule but is never applied; `.combatant .vs-cell` is a dead selector (sibling, not child); `#fff7dfaa` hardcoded in three places; `#5fbf7a` reveal glow hardcoded in JS.
- `renderCombat()` does not own `#csLeft`/`#csRight`/`#combatLog` â the dead lifecycle functions write them directly (`combatLifecycle.js:36-38, 81-88`).

### B. Completed-phase quality issues (remediation backlog)

1. **`h()` cannot set CSS custom properties** (`dom.js:10` uses `Object.assign(el.style, val)`; `--*` keys need `setProperty`). Consequence: `--faction-color` passed via `h()` at `bindHeader.js:128` silently no-ops â **header champion pills render gray** (`#888` fallback). `bindLeftPanel.js:29` shows the correct API.
2. **Dead bus keyboard map + duplicate keydown listener.** The bus maps `c/r/+/-` (`actionBus.js:23-32`) but nothing registers those actions; the real handlers are a second `window.keydown` listener in `gameUIBindings.js:69-105`. Registering the four actions without deleting that listener = every key fires twice. Migration must be atomic.
3. **`gameUIBindings.js`:** zoom/center bodies duplicated 4Ã; center math hardcodes hex size `1.0` instead of the shared `centerCameraOnHex` (used correctly at `mapRefresh.js:46`); `getSceneContext()` dereferenced without null checks; dead `#logMount` chevron listener (`:50-65`).
4. **`hud.js` barely refactored:** `showVictory` sets innerHTML containing two inline-styled spans (`hud.js:28`); toast border color hardcoded (`:8`, duplicates `overlays.css`); `pulseEnd` uses inline transform (`:17-18`).
5. **`modal.js`:** `setRewardModal` innerHTMLs a `<br>`-joined string (`modal.js:18` â `rewardPrompt.js:29`); `container.style.marginTop` (`:40`); the bus `closeReward` handler (`actionBus.js:43-50`) re-implements hide instead of calling `hideModal` and does not clear `pendingChoice`.
6. **`setupUI.js`:** size pills still use direct listeners (`:91-98`, comment admits the skip); `data-action="beginGame"` set from JS (`:55-59`) instead of living in `index.html`; presentational inline styles (`:28-30`); `--faction-color` never set on `.fopt` â the `setup.css:23` border rule is dead; native `alert()` (`:64`) instead of `toast()`; redundant `roster.controller` state.
7. **Tooltip chain:** `getTooltipContent` builds a DOM tree then returns `outerHTML` (`mapView.js:76`) which `tooltip.js:15` innerHTMLs back â pointless DOMâstringâDOM round trip; the `hex-tooltip__*` line classes have **no CSS rules** and `#hexTooltip3d` is `white-space:nowrap` â probable run-on tooltip; `movementRange()` BFS recomputed on every `pointermove` (`mapView.js:29` via `hover.js:43-45`); dead `window.getTooltipContent`/`window.refreshZoomDisplay` + stale `main.js` comments (`mapView.js:92-94`); dead `#tooltip` markup (`index.html:238`) and its CSS (`overlays.css:3`).
8. **`heptagramWidget.js`:** `window._onPaleyHover` is a dead hook â read at `:27,62,72`, never set anywhere; dead window aliases `setHeptagramHighlight`/`getHeptagramHighlight` (`:97-100`, zero callers â keep the *module* exports; the combat hover fix needs `setHeptagramHighlight`).
9. Misc: dead `escapeHtml` (`logView.js:50-53`); `buttons.css` duplication (`.size-pill` Ã3, `.fctrl` Ã3, `.btn-gold` Ã2, `.reward-btn` Ã2); `innerHTML=''` clear idiom in `bindHeader.js`/`setupUI.js` â `replaceChildren()`; listeners re-accumulate if `__beginGame` ever runs twice (currently masked by `location.reload()`); `championVM.hpPct` unclamped.
10. Noted but intentionally **not** changed (behavior/display decisions, out of scope): header potency rows skip zeros while the left panel shows them; header uses `champ.name` vs panel's `fac.name`; `#combatOrder` static text; `window.__beginGame`/`window.__gameState` stay (bootstrap timing + debug by design).

---

## The granular plan

### Phase 6.5 â Remediation of earlier phases (small, independent; any order) [COMPLETE]

- **6.5.1 `h()` custom properties** â in `dom.js`, route `style` keys starting with `--` through `el.style.setProperty`. Fixes the gray header pills (B1).
- **6.5.2 `hud.js`** â build `#victoryText` content with `h()` + classes (`--faction-color` for the winner name, a `.victory-sub` class for the secondary line); add `.toast--bad` modifier in CSS instead of hardcoded border colors; replace `pulseEnd`'s inline transform with a CSS class toggle (e.g. `.is-pulsing` + transition). (B4)
- **6.5.3 Reward body without innerHTML** â `rewardPrompt.js` passes a *lines array* instead of a `<br>`-joined string; `modal.js` `setRewardModal` builds line nodes with `h()`; move the choices-container margin to CSS; make the bus `closeReward` handler call `hideModal('rewardModal')` and clear `pendingChoice` (export a small `clearPendingChoice()` or fold the registration into `modal.js`). (B5)
- **6.5.4 `setupUI.js`** â size pills: add `data-action="selectSize"` + `data-size` in `index.html`, register on the bus, delete the direct listeners; move `data-action="beginGame"` into `index.html` markup; set `--faction-color` on each `.fopt` (revives the dead `setup.css:23` border); move presentational inline styles to CSS classes; `alert()` â `toast()`; derive `controller` from `human` at begin time and drop the duplicate field. (B6)
- **6.5.5 Tooltip chain** â `getTooltipContent` returns a DOM node; `tooltip.js` `replaceChildren(node)`; add the missing `hex-tooltip__*` CSS rules (`display:block` per line class); split hover updates: build tooltip content only on hex-key change, update position on `pointermove` (kills the per-mousemove BFS); delete the dead window globals, stale `main.js` comments, dead `#tooltip` markup + CSS. (B7)
- **6.5.6 `heptagramWidget.js`** â delete the `window._onPaleyHover` reads, the three dead window aliases, and the stale comment; **keep** the SVG-string `innerHTML` as a documented exception (`h()` builds HTML elements, not SVGNS nodes) â this closes old "Phase 9". (B8)
- **6.5.7 Misc sweep** â delete `escapeHtml`; `innerHTML=''` â `replaceChildren()`; de-duplicate `buttons.css`; clamp `championVM.hpPct` to 0â100. (B9)

[PHASE 6.5 IS COMPLETE]

### Phase 7 â Combat (repair first, then refactor, then unify rewards)

**7a. Make combat playable end-to-end** (minimal edits; the old innerHTML renderer stays for now):

1. *Scoring fix* (`combatScoring.js`): replace the `.tokens` gate â champions (detect via `'controller' in X` / `X.controller`) get `finalScoreBonus(state, X)`; mobs get their **own** faction's weather score (`state.weather.score[X.faction]||0`). Delete the dead duplicate functions from `combatPicks.js` (keep `recordCombatPick`, `advanceCombatPhase`, `botCombatPick`, `getAvailablePicks`) and the stale TODO comment.
2. *Flow driver* (`combatLifecycle.js`): add `continueCombatFlow()` â dispatches on phase: picking + active is bot â `setTimeout(makeBotPick, 500)`; reveal phase â wait for Commit (see 4); `round_end` â `handleRoundEnd()`. `openCombatModal`, `processRevealPhase`'s post-advance callback, `handleRoundEnd`'s next-round callback, and `makeBotPick` all route through it (replaces the three copy-pasted "if picking && bot" chains).
3. *Human picking* â `registerAction('pickCombatPower', ...)` at module level in `combatInteractions.js`: guard (ui exists â§ picking phase â§ active is human â§ `data-f` parses â§ pick not already in this round's `roundPicks[awaitingPick]` â§ pick is in `getAvailablePicks(entity)` â mirrors bot rules, i.e. potency-with-primary > 0) â `recordCombatPick` â `advanceCombatPhase` â `renderCombat` â `continueCombatFlow()`. Add `data-action="pickCombatPower"` to the existing template string so 7a is testable before 7b. (The synchronous advance makes double-clicks harmless: the second click fails the phase guard.)
4. *Commit = reveal trigger* â replace `onclick="commitCombat()"` with `data-action="commitCombat"` (`index.html:206`); handler: `if (isRevealPhase(ui)) processRevealPhase()`. Renderer enables it only during reveal phases, label "Reveal clash" / disabled "Waitingâ¦" otherwise. Delete `window.commitCombat`.
5. *Flee* â `data-action="fleeCombat"` (`index.html:207`) â `closeCombat()` (clears UI state; pending timeouts already bail on null). No game-logic penalty, matching current behavior.
6. *Hover ReferenceError* â `combatRenderer.js:19`: import and call `setHeptagramHighlight(factionIdx)` from `heptagramWidget.js`.
7. *Reward contract* â in `handleRoundEnd`'s `defenderDead` branch, shape the object `openRewardModal` expects: `{ title: 'Victory!', body: \`${attacker.name} has won the battle!\`, rewards: [\`+${rew.gold} gold\`, '+1 relic'] }` built from `finalizeCombat`'s return.
8. **Smoke-test combat hard** (setup â attack mob â pick â bot picks â Commit â reveal â round resolves â reward modal) *before* touching the renderer.

**7b. Renderer refactor** (the original Phase 7 intent):

1. New `src/ui/viewModels/combatVM.js`: `getCombatVM(ui)` â `{ roundLabel, phase, picking, activeSide, attacker: vm, defender: vm, slots: { a1, a2, b1, b2: { text, factionIdx|null, revealed } }, scores: { left, right }, log, commit: { enabled, label } }`; combatant vm = `{ name, factionColor, hp, maxHp, hpPct, pots: [{ idx, val, glyph, color, used, unavailable, pickable }] }` using `potencyWithPrimary`. Pure, no DOM.
2. `renderCombat()` builds everything from the VM: `replaceChildren()` + `h()` for both combatant cards (delete `combatantCard()`), tokens with `data-action="pickCombatPower"`, `--faction-color` via fixed `h()` (6.5.1), HP width as the one genuinely-dynamic inline style, and `ctok__val`/`ctok__glyph` classes instead of inline typography.
3. Pick slots (`#sA1â¦#sB2`) rebuilt with `h()`: faction accent via a `--slot-color` custom property, reveal glow via a `.revealed` class â no inline `borderColor`/`background`/`boxShadow`.
4. `renderCombat()` takes ownership of `#csLeft`/`#csRight`/`#combatLog` (values from the VM); `processRevealPhase`/`handleRoundEnd` stop writing the DOM and just call `renderCombat()` after mutating state.
5. Hover: delete `wireCombatPotencyHover`/`onCombatPotencyHover`. Scale = pure CSS (`.ctok.pickable:hover`). Cross-highlight (same-`data-f` tokens both sides + heptagram) via `mouseenter`/`mouseleave` passed as `h()` listener props at build time â safe because elements are rebuilt each render; toggles a `.potency-hover` class (now with an actual CSS rule) and calls `setHeptagramHighlight(idx / -1)`. Clicks stay guarded in the action handler, so no `pointerEvents` loops.
6. Commit button: `disabled` attribute + label only; opacity via a `:disabled` CSS rule.
7. CSS (`styles/pages/combat.css`): rename `.combat-tokens` â `.combat-potencys`; add `.ctok` transition, `.ctok.pickable:hover` (scale 1.15, gold border â as the original plan specified), `.ctok.used` (opacity .4), `.ctok.unavailable`, `.potency-hover`, `.play-slot.revealed` glow (move `#5fbf7a` to a token/class), `.ctok__val`/`__glyph`; delete dead `.ctok.sel` and `.combatant .vs-cell`; replace the three `#fff7dfaa` hardcodes with a token.
8. Show/hide through `showModal`/`hideModal` (`modal.js`) in `openCombatModal`/`closeCombat`.

**7c. Reward-modal unification** (absorbs old Phase 8; `combatRewardUI.js` *does* use innerHTML):

1. `modal.js`: add `fillRewardModal({ title, bodyLines, rewards })` building nodes with `h()`; reimplement `setRewardModal` over it (pairs with 6.5.3).
2. `combatRewardUI.openRewardModal` becomes a thin wrapper: `fillRewardModal(...)` + `showModal('rewardModal')`. Delete: the innerHTML body paragraph and inline styles (new `.reward-body`/`.reward-list` classes), the duplicate appended Close button (static Accept stays), `DECORATED_REWARD`, the dead exported `openArtifactChoiceModal` duplicate, and the unreachable `artifactChoice` branch â `modal.js`'s `openArtifactChoiceModal` is documented as the single artifact-draft entry if combat rewards ever offer one.
3. `openTrader` stays as-is (toast only).

### Phase 8 â Heptagram verification

Closed by 6.5.6 (dead-hook/dead-alias removal; SVG-string `innerHTML` documented as the deliberate exception). Phase 8 becomes: verify in browser that hover still toggles `rt-beats-win/lose` and that combat-token hover now highlights the widget (7a.6 / 7b.5).

### Phase 9 â Final cleanup & bus migration

1. *Map controls, atomically:* register `zoomIn`/`zoomOut`/`resetCamera`/`centerChampion` on the bus (handler uses `getSceneContext()` with null guards + `zoomCamera`/`resetCamera` + `centerCameraOnHex` â deleting the hardcoded `1.0` math â + `refreshZoomDisplay`); add matching `data-action` attributes to the four buttons in `index.html`; **in the same change** delete `gameUIBindings.js` entirely (button bindings, the `c/r/+/-` keydown listener, the dead `#logMount` chevron) and its call site/import (`beginGame.js:30`; verify no other importer).
2. Move the `endTurn`/`inspect` registrations (currently module-level side effects of `gameUIBindings.js`) into `bootstrapUI.js`.
3. `index.html`: victory button â `data-action="restartToSetup"` (registered in `bootstrapUI.js` as `location.reload()`); delete the dead `#tooltip` div (with 6.5.5).
4. Globals purge: `window.restartToSetup` and `window.__SUPERNAL__` from `entrypoint.js` (zero consumers â grep-verified); `window.commitCombat`/`window.closeReward` (done in 7a/7c); heptagram + mapView window aliases (done in 6.5.5/6.5.6). `window.__beginGame`/`__gameState` stay.
5. Listener-accumulation guard: module-level `wired` flag in `bindHeader.js` (`bindHeaderEvents` no-ops on second call); same for any surviving per-begin binding.
6. Update `AGENTS.md` where the repo has drifted (`gameUIBindings.js` deletion, new `combatVM.js`, `session/` layout, `combat/index` barrel reality) and note the new CSS tokens.
7. Run the full 9-step smoke checklist, with step 5 amended to: "attack a mob or champion â modal renders both combatants, pick a power, bot answers, Commit, reveal plays, rounds resolve, reward modal grants gold + relic."

### Execution notes (to keep in the doc)

- Commit discipline: every action migration registers the bus handler and deletes the old binding **in the same commit** (the doc's existing double-fire warning).
- Smoke checklist runs after **every** phase, not just the last.
- Order: 6.5 items are independent â 7a â 7b â 7c â 8 â 9.
