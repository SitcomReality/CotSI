# Refactor `gameOrchestrator.js` into single-purpose modules + implement domrefactorplan Step 5

## Goal

Split `src/game/gameOrchestrator.js` (currently 4 mixed concerns: live state, game startup, render orchestration, map lifecycle) into small single-purpose files, and in the same pass implement Step 5 of `dev/domrefactorplan.md` (static panel skeletons in `index.html` + `data-ui` binders, deleting the `innerHTML` panel renderers).

Every step below leaves the game fully runnable; run the smoke checklist from `dev/domrefactorplan.md` (lines 323-335) after each step.

## Current state (verified)

- `gameOrchestrator.js` exports `G`, `currentChamp()`, `__beginGame()`, `refreshAll()`; sets `window.__beginGame`.
- Importers of it: `src/game/turnController.js` (`G, currentChamp, refreshAll`), `src/game/hexInteraction.js` (same), `src/ui/gameUIBindings.js` (`currentChamp`), `src/ui/bootstrapUI.js` (`refreshAll`), `src/entrypoint.js` (side-effect only).
- `renderLeftPanel`/`renderRightPanel` are only used by `gameOrchestrator.js`; `renderLogEntries` only by `rightPanel.js`; `panels-index.js` is imported nowhere else. All three panel files become deletable.
- `initHeptagramWidget('paleyMount')` is re-run every `refreshAll()` only because `renderRightPanel` destroys `#paleyMount` via `innerHTML`. Once the panel is static, one init per game is correct.
- CSS already supports the binder approach: `.left-faction-dot`/`border-left` consume `var(--faction-color)`; `.left-hp-fill` uses `width: calc(var(--champ-hp-pct) * 1%)` -- but `styles/abstracts/reset.css` sets the default to `100%` (unit bug; must be unitless `100`).
- `endTurn` / `inspect` actions are already registered in `gameUIBindings.js` -- the static skeleton's buttons need no new registrations.
- `pulseEnd()` in `hud.js` targets `.left-endturn-btn` (alive, not dead code as the plan doc guessed) -- the class must stay in the static skeleton.
- Circular imports between `game/` and `ui/` are intentional per AGENTS.md; the split preserves them as runtime-only cycles.

## Target structure (recommended: `session/` subfolder)

```
src/game/
------ session/
--   ------ liveGame.js      # live G instance: G, setGameInstance(), currentChamp()
--   ------ beginGame.js     # __beginGame(config) + window.__beginGame
--   ------ refreshAll.js    # thin central refresh orchestrator
--   ------ mapRefresh.js    # 3D map init-once, per-refresh render, camera centering
--   ------ rewardPrompt.js  # pending reward -> artifact/generic modal dispatch
------ gameFactory.js, turnController.js, hexInteraction.js, â¦ (unchanged)
src/ui/panels/
------ bindLeftPanel.js     # champion-card binder (data-ui hooks, CSS vars, h() potency rows)
------ bindRightPanel.js    # right-sidebar binder (log entries)
------ logView.js           # buildLogEntries() -> h() nodes (no more HTML strings)
```

---

## Step 1 -- Extract the live game instance

Create the home for `G`/`currentChamp` with zero logic of its own.

- **Created:** `src/game/session/liveGame.js`
  - `export let G = null`, `export function setGameInstance(g)` (also sets `window.__gameState = g`), `export function currentChamp()`. No imports.
- **Modified:** `src/game/gameOrchestrator.js`
  - Remove the `G`/`currentChamp` definitions; import `{ G, currentChamp, setGameInstance }` from `./session/liveGame.js`. In `__beginGame`, replace `G = createGame(config); window.__gameState = G;` with `setGameInstance(createGame(config));`.
- **Modified:** `src/game/turnController.js`
  - Split the import: `G, currentChamp` from `./session/liveGame.js`; `refreshAll` still from `./gameOrchestrator.js` (until Step 6).
- **Modified:** `src/game/hexInteraction.js` -- same import split as turnController.
- **Modified:** `src/ui/gameUIBindings.js` -- `currentChamp` from `../game/session/liveGame.js`.

Smoke: full checklist (state moved; behavior identical).

## Step 2 -- Extract the 3D map refresh

Move the map init-once + render + camera-centering block out of `refreshAll`.

- **Created:** `src/game/session/mapRefresh.js`
  - `export function refreshMap()`; owns the `map3dInitialized` and `lastCenteredChampionId` module flags. Imports `initHexMap3D, renderHexMap3D, setupMapInteraction3D, getSceneContext, centerCameraOnHex` from `../../render/hexmap3d/hexmap3d-index.js`, `onHexClick` from `../hexInteraction.js`, `getTooltipContent` from `../../ui/mapView.js`, and `G, currentChamp` from `./liveGame.js` (the tooltip callback needs live bindings, not a captured `G`).
- **Modified:** `src/game/gameOrchestrator.js`
  - Replace the map block and camera-centering block in `refreshAll()` with `refreshMap()`. Drop now-unused imports (`initHexMap3D, renderHexMap3D, setupMapInteraction3D, centerCameraOnHex`, `getTooltipContent`). Keep `getSceneContext`/`resetCamera3D` (still used by `__beginGame` until Step 4).

Smoke: items 3-4 (move/zoom/center), camera centers on a new human champion's turn.

## Step 3 -- Extract the reward-modal dispatch

- **Created:** `src/game/session/rewardPrompt.js`
  - `export function showPendingReward(G)` containing the artifact-draft vs generic-reward branch. Imports `openArtifactChoiceModal` from `../../ui/combat/combatui-index.js`, `setRewardModal` from `../../ui/modal.js`.
- **Modified:** `src/game/gameOrchestrator.js`
  - Replace the reward block with `showPendingReward(G)`; drop the `openArtifactChoiceModal`/`setRewardModal` imports.

Smoke: items 2 and 7 (artifact draft, dig reward modal).

## Step 4 -- Extract game startup

- **Created:** `src/game/session/beginGame.js`
  - `export function __beginGame(config)` + `window.__beginGame = __beginGame`. Imports `createGame` (`../gameFactory.js`), `setGameInstance` (`./liveGame.js`), `setGameState` (`../../ui/combat/combatui-index.js`), `syncSize` (`../../render/effects/effectsOverlay.js`), `getSceneContext, resetCamera as resetCamera3D` (`../../render/hexmap3d/hexmap3d-index.js`), `bindGameUI` (`../../ui/gameUIBindings.js`), `bindHeaderEvents` (`../../ui/bindHeader.js`), and `refreshAll` (from `./gameOrchestrator.js`'s replacement -- import from `../gameOrchestrator.js` until Step 6).
- **Modified:** `src/game/gameOrchestrator.js`
  - Delete `__beginGame` and the `window.__beginGame` line; drop now-unused imports (`createGame`, `setGameState`, `syncSize`, `getSceneContext`, `resetCamera3D`, `bindGameUI`, `bindHeaderEvents`).
- **Modified:** `src/entrypoint.js`
  - Side-effect import becomes `import './game/session/beginGame.js'; // side-effect: window.__beginGame`.

Smoke: item 1 (setup -> Begin starts a game).

## Step 5 -- domrefactorplan Step 5: static panel skeletons + binders

Replaces both panel `innerHTML` renderers with static markup + `data-ui` binders.

- **Modified:** `index.html`
  - `#championCard`: replace the `<!-- JS will inject -->` placeholder with a static `.panel.left-champion-card` skeleton mirroring `leftPanel.js`'s markup -- header row (`.left-faction-dot`, `.left-champ-name[data-ui="name"]`, moves with `data-ui="moves"` span next to the `#i-move` icon), HP row (`.left-hp-track` > `.left-hp-fill` with **no inline width**, value span `data-ui="hpValue"`), resources row (`data-ui="relics"`, `"gold"`, `"knot"` next to their SVG icons), equipment row (`data-ui="weapon"`, `"armor"`, `"artifact"`), `<details class="left-potency-details">` with the existing summary and an empty `.left-potency-bars` container, and the actions row keeping classes `.left-inspect-btn`/`.left-endturn-btn` with `data-action="inspect"` / `data-action="endTurn"` (both already registered in `gameUIBindings.js`; `.left-endturn-btn` must stay for `pulseEnd()`).
  - `#rightPanel` aside: static skeleton -- `.panel.rt-heptagram-card` (`<h4>Paley Heptagram</h4>`, empty `<div id="paleyMount" class="rt-heptagram-svg"></div>`, `.rt-heptagram-hint`) and `.panel.rt-log-panel` (`<h4>Event Log</h4>`, `<div class="rt-log-entries">`).
- **Created:** `src/ui/panels/bindLeftPanel.js`
  - `export function bindLeftPanel(G)` per the plan-doc snippet, with these corrections: import `currentChamp` from `../../game/session/liveGame.js` (not gameOrchestrator); import `championVM` from `../viewModels/championVM.js`, `FACTIONS` from `../../core/factions.js`, `h` from `../utils/dom.js`; query `#championCard` **inside** the function (bindHeader style, not module top level); set `--faction-color` and `--champ-hp-pct` (unitless number) on the card element; null-champ guard must **not** do `el.textContent = â¦` (that would permanently destroy the static skeleton) -- instead fill the `data-ui` fields with `'--'`; potency rows rebuilt with `h()` per refresh via `replaceChildren()`, preserving the `is-primary` class on the primary faction's `.left-potency-num` (the plan snippet dropped it; `leftPanel.js` has it -- keep it to avoid a visual regression).
- **Created:** `src/ui/panels/bindRightPanel.js`
  - `export function bindRightPanel(G)`: replaces the children of `.rt-log-entries` with the nodes from logView. The heptagram card needs no per-refresh work.
- **Modified:** `src/ui/panels/logView.js`
  - Rename/convert `renderLogEntries(logs)` -> `buildLogEntries(logs)` returning DOM nodes built with `h()` and `textContent` (drop the now-unneeded `escapeHtml`; keep `classifyLogLine` and the same `log-view__*` classes).
- **Modified:** `src/game/gameOrchestrator.js`
  - In `refreshAll()`: replace the two `innerHTML` panel lines with `bindLeftPanel(G)` / `bindRightPanel(G)`; remove the `panels-index.js` import; remove the `initHeptagramWidget('paleyMount')` call (moves to beginGame).
- **Modified:** `src/game/session/beginGame.js`
  - Add `initHeptagramWidget('paleyMount')` (import from `../../ui/heptagramWidget.js`) -- runs once per game now that `#paleyMount` is static.
- **Modified:** `styles/abstracts/reset.css`
  - Change `--champ-hp-pct: 100%` -> `--champ-hp-pct: 100` so the `calc(var(--champ-hp-pct) * 1%)` default renders correctly before the first bind.
- **Deleted:** `src/ui/panels/leftPanel.js`, `src/ui/panels/rightPanel.js`, `src/ui/panels/panels-index.js`.

Smoke: items 1-4, 7 (champion card values update as you move/fight/dig, HP bar animates via CSS, potency accordion works, End Turn/Inspect via button and Space, log updates).

## Step 6 -- Final `refreshAll.js` home; delete `gameOrchestrator.js`

- **Created:** `src/game/session/refreshAll.js`
  - `export function refreshAll()` -- thin composition only: guard `if (!G)`, re-assert `window.__gameState`, then `refreshHeader(G)` (`../../ui/bindHeader.js`), `bindLeftPanel(G)`, `bindRightPanel(G)`, `refreshMap()` (`./mapRefresh.js`), `if (ch) refreshZoomDisplay()` (`../../ui/mapView.js`), `showPendingReward(G)` (`./rewardPrompt.js`), bot scheduling (`setTimeout(runBot, 620)` under the existing conditions, `runBot` from `../turnController.js`), and the victory tail (`checkVictory(G)` from `../victory.js`, `if (G.winnerId) showVictory(G)` from `../../ui/hud.js`).
- **Deleted:** `src/game/gameOrchestrator.js`
- **Modified:** `src/game/turnController.js` -- `refreshAll` from `./session/refreshAll.js`.
- **Modified:** `src/game/hexInteraction.js` -- `refreshAll` from `./session/refreshAll.js`.
- **Modified:** `src/ui/bootstrapUI.js` -- `refreshAll` from `../game/session/refreshAll.js` (also fix the stale comment referencing gameOrchestrator).
- **Modified:** `src/game/session/beginGame.js` -- `refreshAll` from `./refreshAll.js`.

Smoke: full 9-item checklist. Grep for `gameOrchestrator` afterwards -- only docs/comments may remain, and those get fixed in Step 7.

## Step 7 -- Keep docs in sync

- **Modified:** `AGENTS.md`
  - Code Organization: replace the `gameOrchestrator.js` bullet with the `game/session/` files; update `ui/panels/` listing.
  - Application Flow: `__beginGame` now lives in `game/session/beginGame.js`; `refreshAll` in `game/session/refreshAll.js`.
  - Update the "live game instance" import snippet and the circular-dependency note (cycle is now `session/refreshAll.js` â `turnController.js`/`hexInteraction.js` via `session/liveGame.js`).
- **Modified:** `dev/domrefactorplan.md`
  - Annotate Step 5 as implemented, noting deviations (binders live in `src/ui/panels/`, `currentChamp` comes from `game/session/liveGame.js`, `logView.js` builds nodes, heptagram init moved to once-per-game) -- matching the "corrected" annotation style already used for Steps 1-3.

---

## Notes / risks

- **Circular imports:** `session/refreshAll.js` â `turnController.js` / `hexInteraction.js` (via `mapRefresh.js` -> `hexInteraction.js`) remain runtime-only cycles, the pattern AGENTS.md explicitly sanctions. `liveGame.js` itself imports nothing, so `G`/`currentChamp` are always safe to import.
- **Heptagram behavior change (intentional):** init moves from every-refresh to once-per-game. Previously re-init was mandatory because `innerHTML` destroyed the SVG each refresh; with a static `#paleyMount`, hover bindings and highlight state now survive refreshes.
- **Entry order:** `entrypoint.js` imports `bootstrapUI.js` before `beginGame.js`, same as today's ordering with `gameOrchestrator.js`, so `window.__beginGame` still exists before `setupUI` needs it.
- **Out of scope** (later plan steps): `showVictory()` innerHTML/inline styles, `modal.js` `container.style.marginTop`, `#logMount` dead chevron handler, `gameUIBindings.js` deletion (final cleanup step of domrefactorplan).
