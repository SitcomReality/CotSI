# Audit Backlog — What Still Needs Addressing

Hand-off document from the full codebase audit (Aug 2026). Five parallel audit
passes covered: architecture/boundaries, fragility/correctness, test coverage,
dead code/stale seams, and documentation drift. The findings were synthesized
into this backlog. **Everything here is pending unless marked DONE.**

Verify tests with `/run/host/usr/bin/node --test` (node is not on PATH in the
VSCodium extension shell; the Flatpak fallback in `tests/run.sh` works).

---

## DONE (commit `d3bc9a9`)

- P1 combat test suite: 6 files under `tests/game/combat/` + shared fixture
  `tests/helpers/stateFixture.js` (53 tests; suite total 152, all green)
- Flee double-damage in auto-resolve — `combatAutoResolve.js`: flee checked
  before round damage; `fleeFromCombat` applies the round's damage once (1 HP cap)
- Interactive bot-flee dead code — `combatFlow.js`: flee check moved before
  `handleRoundEnd` (it zeroed roundScores, so bots never fled)
- `peak`/`peak` identical-branch ternary — `terrainClassification.js`; dead
  `snowLineMax` removed from `worldParams.js`; docstring corrected
- `/7` hardcode → `DAYS_PER_WEEK` — `combatScoring.js`
- Render-failure poisoning — `mapRefresh.js` (dirty flags clear only on success),
  `initMap3d.js` (failed init no longer sets `map3dInitialized`, next refresh retries)

---

## 1. Trivial fixes (high leverage, low risk) — DONE

Resolved in the trivial-fixes phase (uncommitted):

- **Reverse-layer import (hard-rule violation):** `interactBase` now returns
  `{ok, reason}`; `hexBridge.js:61` toasts at the caller. `baseInteraction.js` no longer
  imports `ui/` (the only game→ui import is gone; the file is now node-testable, per §4).
- **Dead-file deletions** (docs that named them updated: `systemArchitecture.md`,
  `clockScheduler.md`, `namingConventions.md`, `largeMapRoadmap.md`):
  - `src/runtime/turnPipeline.js` — dead barrel, deleted
  - `src/dev/devActionWiring.js`, `src/dev/devBotControl.js`, `src/dev/devCheats.js`,
    `src/dev/cheats/index.js` — orphaned backward-compat shim chain, deleted
  - `src/dev/devPerformance.js` shim — deleted; the 16 prod files importing it now
    import `dev/performance/index.js` (audit said 17; the actual count is 16)
  - `BEATS_MATRIX` in `src/game/rules/factionData.js:24` — **kept**: the audit's "zero
    importers" is outdated — `tests/game/paleyScoring.test.js` imports it (4 assertions);
    verified no in-file internal use, but removal would weaken that test
  - `src/render/overlays/graphicsSettings.js` — kept per the note (future UI redesign)
- **Dead measurement names:** `createGame`, `placeChamps`, `genTiles`, `fogMaskGen`
  registered in `src/dev/panel/init.js` — the 4 prod files' `startMeasure`/`endMeasure`
  calls are no longer no-ops.
- **`||` re-roll bug:** `combatFinalize.js:35` now uses `??` for `defender.lootGold`;
  regression test added (`lootGold: 0` mob → no re-roll) in `combatAutoResolve.test.js`.
- **Cosmetic:** `combatDamage.js:42` tie rounds now log "neither side takes damage"
  (tie test extended); `combatFx.js` fallback cleanup timer is cleared on `animationend`.
- **Housekeeping:** `src/render/hexmap3d/scene/webglsizebug.md` and the retired fonts
  (Cinzel-*, EBGaramond-*, UnifrakturCook-Bold.ttf) deleted; stale `Cinzel` CSS fallbacks
  replaced with `var(--font-display)` in `fxLayer.css`, `devTools.css`,
  `devToolsContent.css`, `bot-indicator.css`.

## 2. Dev-tooling gating (dev shipped in prod)

- `bootstrap.js:90` calls `enableAllMeasurements()` unconditionally — every named
  measurement runs `performance.mark/measure` on each render frame, hover, and pan
  in the shipped game (no build step to strip it).
- Gate dev tools behind `?dev=1`/localStorage: `bootstrap.js:27` side-effect,
  `bootstrap.js:90`, `panel/init.js:100-102` auto-init, `window.__perf`/`__devTools`
  exposure. ~17 dev-coupling imports across runtime/render/game become harmless
  without moving code. The capture harness itself (`frameProfiler.js`) is already
  properly gated behind explicit `startCapture`.
- *Note:* This project is still in early development and these aren't immediate
  concerns. Right now the goal is expedient internal testing and iteration.

## 3. Structural (bigger; do with tests in place) — DONE

All four items resolved (commit A: items 2–4; commit B: item 1).

- **Combat sequencer lives in `ui/` — deepest structural issue.** — DONE: the
  sequencer moved to `src/runtime/combat/` (`combatState.js` holder + combat wait,
  `combatLifecycle.js` start/close, `combatFlow.js` async round driver,
  `combatRoundEnd.js` resolution + FX, `combatActions.js` init + actionBus handlers,
  `index.js` barrel). `ui/combat/` keeps only view functions (`combatRenderer`,
  `combatReveal`, `combatFx`, `combatRewardUI`); `renderCombat`/`animateReveal` take
  combat as a param; the sequencer reads `liveGame.G` directly (the `beginGame`
  `setGameState` sync is gone); runtime reaches ui only via view calls; ui dispatches
  via `actionBus` (`combatPick`/`fleeCombat` registered in `combatActions.js`).
  Boundary debt 22 → 18. *Follow-up (optional): de-duplicate the round-driver shared
  between `combatFlow` and `combatAutoResolve` (they independently re-implement
  round-driving and once diverged on flee ordering).*
- **`check_imports.py` doesn't model reality:** — DONE: explicit allowlist for
  read-only rules-data (`factionData`/`terrainTypes`/`archetypes`/`archetypeData`)
  added to the checker, implementing the tolerance policy already stated in
  `systemArchitecture.md` §6; boundary report 44 → 22 (the remaining 22 are
  ui→game/state logic reads + dev instrumentation). The alternative — moving faction
  presentation fields into `params/` — remains available if zero debt is ever wanted.
- **Two writers of `window.__gameState`:** — DONE: there were actually **three** —
  `liveGame.js:16`, `combatUiState.js:17`, and `refreshAll.js:42` (missed by the
  audit). Removed the `combatUiState` + `refreshAll` writes; `liveGame` is the sole
  writer (AGENTS.md debug convention preserved).
- **render reads global state via `window`:** — DONE: `bootstrap.js:75` → `() => G`
  (already imported); `bindHeaderEvents` takes a `getState` arg (`beginGame` passes
  `() => G`); `handleMinimapClick` takes `G` as a param (minimap passes its cached
  `_lastG`); `hexMapRenderer.js:58` dropped the dead `setupUnitAnimations`
  window-getter (the stub is a no-op).

## 4. Test coverage next (from coverage audit) — DONE

All three tiers landed (commit 1: P5, commit 2: P3, commit 3: P2); suite
153 → 265. Coverage also caught two real bugs: the dispatch modal's weather
cards never rendered (`weatherEffects` missing from `CONTRIBUTORS`, fixed in
commit 1) and traders never moved (`traderMovement` used the target tile
object as coordinates → NaN distances, fixed in commit 3).

- **P2:** `gameFactory.js` (zero coverage over the whole world assembly — verify the
  `dev/devPerformance` import chain is node-safe first, `overlay.js` touches `document`),
  `worldSimulation.advanceTurn` (order → world turn → dead-champion branch → victory).
  — DONE (commit 3): full `createGame` invariants (7-faction world, bases,
  entity counts, spatial index, order/herald, determinism, human dispatch,
  single-biome + partial-game variants) and `finishTurn`/`advanceTurn` flows
  incl. world-turn side effects (mob harassment + death, tree regrowth,
  trader movement). Node-safety confirmed: the `dev/performance` barrel is
  import-time safe (`overlay.js` touches `document` only when enabled).
- **P3 (cheap, high bug-risk):** `championMovement`, `fogOfWar`, `digSystem`,
  `arrivalInteractions`, `entityQueries`/`spatialIndex`, `tileProxy`, `victoryChecks`,
  `deathTracker`. — DONE (commit 2): one test file per module (60 tests);
  `stateFixture.js` extended (`makeTile`, `chunks`/`_unripeTrees`/`winnerId`/
  `victoryReason`/`weather.dayLength`); dead `import { G } from './liveGame.js'`
  removed from `digSystem`/`factionAbilities`/`artifactDraft` (imported, never used).
- **P5 (trivial):** `engine/rules/shuffle.js` (only untested engine file),
  `weatherScript.js`, `logGrammar`/`logHelpers` (protect user-visible text),
  `dispatchReport.js` (biggest untested rules file). — DONE (commit 1):
  tests added for all five; `dispatchReport` tests exposed a real bug —
  `weatherEffects` was missing from `CONTRIBUTORS`, so weather potency/score
  stat cards never rendered in the Augur's Dispatch modal (dispatchModal.js
  reads exactly those `report.effects` entries). Fixed (one line).
- **Infra:** shared fixture pattern is `tests/helpers/stateFixture.js` (no `.test.js`
  suffix — safe from `node --test` discovery). `node --test` auto-discovers `*.test.js`
  from repo root; `baseInteraction.js`'s ui import keeps it untestable in node until
  §1's fix lands. — DONE: §1 removed the `ui/` import, so `baseInteraction` is
  node-testable if ever wanted; fixture grew `makeTile` + canonical state fields
  (`chunks`, `_unripeTrees`, `currentOrder`, `winnerId`/`victoryReason`,
  `weather.dayLength`, champion `baseMove`/`knot`/`weapon`/`armor`/`pendingDig`).

## 5. Fragility hardening (systemic patterns)

- **Magic numbers bypassing `src/params/`:** `chunkGeneration.js:243` (0.92 debris
  gate), `moistureAdjustment.js:26` (0.03 water boost), `featureDensity.js:21-67`
  (~12 constants), `sampleBaseFields.js:89-111` (0.50/0.50 mix, `^0.6` hypsometric),
  `epicenterPlacement.js:40-41` (noise freq, `maxAttempts`).
- **Threshold drift:** three different tree-moisture numbers — `featureDensity.js`
  0.72 ramp / 0.60 fruit-tree gate vs `worldParams.js` `forestMinMoisture: 0.58`.
- **Dead params:** `FLEE_MIN_HP`/`FLEE_ROUND_DELAY` never used (combatFlee hardcodes
  `hp - 1`, combatBotAI hardcodes `round <= 1`); `mapSettings` sliders (hv/wt/mt) flow
  into `generateTiles` but are explicitly unused in the new pipeline — sliders
  silently do nothing.
- **Silent fallbacks hiding bad data:** `terrainClassification.js:93`
  (`TERRAIN_ELEVATION[t] || 0`), `chunkGeneration.js:110` (`?? 0` sea-level),
  `epicenterPlacement.js:116` (`radiusFraction ?? radius/radius`).
- **Performance:** `epicenterPlacement.js:139-148` beach lookup scans all `tileMap`
  values per neighbor (O(6·N) × seeds) and only sees current-chunk core tiles →
  chunk-seam-inconsistent beach in epicenters; `flatGeneration.js:108` /
  `connectivityEnforcement.js:124-136` Dijkstra does a linear min-scan per step
  (O(V²) per isolated pocket) — use a priority queue; `minimap.js:41-45` renders
  overlay every frame while idle; `fogBlur.js:45` blur radius applied on a
  physical-pixel canvas (dpr× larger than param); `noise.js:20` `_permCache` unbounded.
- **Robustness:** `beginGame.js:26` raw `setTimeout` (only timer violation outside
  vendor/dev) + no re-entry guard (double-click runs `createGame` twice);
  `clockScheduler.js:63-72` timeout `task.fn()` not try/caught — a throwing timeout
  silently stops the interval's reschedule; `botTurnRunner.js:147` never resolves if
  the `'bot'` group is paused (permanent turn lock); `setupActions.js:119`
  `if (window.__beginGame)` with no else (Start silently dead if beginGame didn't
  load); `refreshAll.js:27` `document.querySelector('.modal[style*="flex"]')` fragile
  inline-style probe.

## 6. Placeholders that look like features

- **`placeholderCypress`** archetype wired into terrain gen + rendered with cone
  stand-ins (`archetypeData/features.js:98`, `biomeDefault.js:31`,
  `biomeUnfinishedLands.js:43`, `featureVisuals.js:66`) — decide: ship or remove.
- **Rain-shadow stub** still `return 0` (`moistureAdjustment.js:30`) — matches
  `mapgen_update/remaining_work.md` §6.
- **`registerAction('inspect')`** (`bootstrap.js:34`) shows a hint toast instead of
  real inspection.
- **Trading** remains placeholder per AGENTS.md.
- **Design quirks to decide on:** mob fights only score exchange 1 (a mob's only
  available faction is its own, so its exchange-2 pick is rejected as a repeat);
  `recordPick`'s exchange-2 flip-back leaves `awaitingSide` on a side that already
  picked (benign today, fragile).

## 7. Documentation drift (verdicts from the docs audit)

- **`systemArchitecture.md` — MAJOR:** `src/params/` (18 files, 133 imports) entirely
  undocumented; biome count wrong (11 + index, not 10); terrainGen count off; §6
  boundary debt understates reality (missing game→dev, render→dev, ui→game/state);
  §7 contradicts itself on the test runner; missing files (`engine/rules/noise.js`,
  `geometries/featureGeometries.js`, `ui/templates/*.inc`).
- **`clockScheduler.md`:** docs claim unknown speed groups "auto-create" — actually an
  unknown group makes the timer **silently never fire** (footgun; rewrite as warning);
  "Used by" column stale; document `start()`/`now()`/`isPaused()`/`setFrameMarker()`.
- **`namingConventions.md`:** `logHelpers.js` violates the banned "helpers" word;
  5 bare-domain dev files (`dev/cheats/{combat,map,state}.js`, `dev/botControl/state.js`,
  `dev/analysis/state.js`); banned-word list differs from AGENTS.md (`lib`, `handler`).
- **`aestheticConventions.md` — NOT obsolete** (contrary to earlier belief): token
  values match the CSS tokens ~95%. Fix 4 stale snippets (`--st-reveal`, crease
  widths, header class names, `:has()` pattern) and mark §11 (3D toon/outline) as
  unbuilt. Keep as the token source of truth.
- **Minor:** `commonTasks.md` references non-existent `terrainGenerator.js`;
  `gameMechanics.md` cites `biomes.js` (it's a directory) + stale `featureFrequencies`
  bullet; `cssConventions.md` documents phantom `rightPanel.css`/`stats.css` + dead
  `srcConventions.md` cross-ref; AGENTS.md layer table omits `src/params/`.

## 8. Environment / process

- Node is reachable only via `/run/host/usr/bin/node` from this interface — the
  Flatpak fallback `tests/run.sh` already handles this; document it in AGENTS.md's
  Test section.
- Consider adding a "Current Process" pointer in AGENTS.md to this backlog doc.
