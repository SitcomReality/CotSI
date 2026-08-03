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

## 2. Dev-tooling gating (dev shipped in prod) — DEFERRED

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

## 5. Fragility hardening (systemic patterns) — DONE

All four tiers landed (commit 1: mapgen constants → `params/` + moisture drift,
commit 2: dead params + silent fallbacks, commit 3: performance, commit 4: runtime
robustness); suite 265 → 269 (+4 heap tests). One deliberate removal: the setup
screen's mapSettings sliders (hv/wt/mt) — they silently did nothing against the new
pipeline; re-add when the pipeline has real knobs (noted in `gameMechanics.md`).

- **Magic numbers bypassing `src/params/`:** `chunkGeneration.js:243` (0.92 debris
  gate), `moistureAdjustment.js:26` (0.03 water boost), `featureDensity.js:21-67`
  (~12 constants), `sampleBaseFields.js:89-111` (0.50/0.50 mix, `^0.6` hypsometric),
  `epicenterPlacement.js:40-41` (noise freq, `maxAttempts`). — DONE (commit 1): all
  moved into `worldParams.js` — `DEBRIS_SPAWN_THRESHOLD`, `WATER_MOISTURE_BOOST`,
  `FEATURE_DENSITY` object (15 keys), `ELEVATION_DETAIL_MIX`/`HYPSOMETRIC_EXPONENT` +
  temperature terms (`TEMP_BASE`/`TEMP_LATITUDE_WEIGHT`/`TEMP_VARIATION_WEIGHT`/
  `TEMP_ELEVATION_LAPSE`), `EPICENTER_CONFIG.noiseFrequency`/`maxAttemptsPerTarget`/
  `minAbsDist`. Values verbatim — terrain-gen pipeline tests pin identical output.
- **Threshold drift:** three different tree-moisture numbers — `featureDensity.js`
  0.72 ramp / 0.60 fruit-tree gate vs `worldParams.js` `forestMinMoisture: 0.58`.
  — DONE (commit 1): the family now lives together — `FEATURE_DENSITY.moistRamp`
  (0.72) / `fruitTreeMinMoisture` (0.60) beside `DEFAULT_TERRAIN_RULES.forestMinMoisture`
  (0.58), with a comment documenting the relationship (dense-forest ramp above the
  forest floor; fruit gate ≥ floor). Values unchanged.
- **Dead params:** `FLEE_MIN_HP`/`FLEE_ROUND_DELAY` never used (combatFlee hardcodes
  `hp - 1`, combatBotAI hardcodes `round <= 1`); `mapSettings` sliders (hv/wt/mt) flow
  into `generateTiles` but are explicitly unused in the new pipeline — sliders
  silently do nothing. — DONE (commit 2): `FLEE_MIN_HP`/`FLEE_ROUND_DELAY` wired into
  `combatFlee`/`combatBotAI`/`combatActions`/`combatViewModel` (values unchanged — tests
  pin the 1/1 behavior). Sliders **removed** per decision: the 3 range inputs, their
  wiring, the dead `mapSettings` threading through `gameFactory`/`initialGameState`/
  `generateTiles`/`generateChunkTiles`, and `DEFAULT_HV/WT/MT` are gone — also removing
  a latent unbound-`DEFAULT_HV` ReferenceError in `setupActions`; `gameMechanics.md`
  updated to match.
- **Silent fallbacks hiding bad data:** `terrainClassification.js:93`
  (`TERRAIN_ELEVATION[t] || 0`), `chunkGeneration.js:110` (`?? 0` sea-level),
  `epicenterPlacement.js:116` (`radiusFraction ?? radius/radius`).
  — DONE (commit 2): `resolveElevation` warns once per unknown terrain (an explicit
  `=== undefined` check, so render-domain `TERRAIN_ELEVATION` gaps can't masquerade as
  sea level); `chunkGeneration` border sampling uses the named `SEA_LEVEL_ELEVATION`
  param with a comment (missing border entries are expected, not bad data);
  `epicenterPlacement` falls back to legacy `ep.radius` via a warn-once helper.
- **Performance:** `epicenterPlacement.js:139-148` beach lookup scans all `tileMap`
  values per neighbor (O(6·N) × seeds) and only sees current-chunk core tiles →
  chunk-seam-inconsistent beach in epicenters; `flatGeneration.js:108` /
  `connectivityEnforcement.js:124-136` Dijkstra does a linear min-scan per step
  (O(V²) per isolated pocket) — use a priority queue; `minimap.js:41-45` renders
  overlay every frame while idle; `fogBlur.js:45` blur radius applied on a
  physical-pixel canvas (dpr× larger than param); `noise.js:20` `_permCache` unbounded.
  — DONE (commit 3): epicenter beach lookup is O(1) via a chunk-local key→terrain
  index kept in sync on reclassification (the chunk-seam inconsistency is documented
  as a deferred limitation — needs neighbor-chunk data); Dijkstra in
  `connectivityEnforcement` uses a new `engine/rules/binaryHeap.js` min-heap
  (O(V log V), duplicate-entry + stale-skip; +4 tests); minimap overlay redraw is
  dirty-checked (camera + entity fingerprint) and skipped when unchanged; fog blur
  radius is dpr-scaled so `FOG_BLUR_RADIUS` renders as CSS px; `_permCache` is
  capped at 64 seeds with oldest-first eviction.
- **Robustness:** `beginGame.js:26` raw `setTimeout` (only timer violation outside
  vendor/dev) + no re-entry guard (double-click runs `createGame` twice);
  `clockScheduler.js:63-72` timeout `task.fn()` not try/caught — a throwing timeout
  silently stops the interval's reschedule; `botTurnRunner.js:147` never resolves if
  the `'bot'` group is paused (permanent turn lock); `setupActions.js:119`
  `if (window.__beginGame)` with no else (Start silently dead if beginGame didn't
  load); `refreshAll.js:27` `document.querySelector('.modal[style*="flex"]')` fragile
  inline-style probe.
  — DONE (commit 4): `beginGame` starts the clock and defers via
  `getClock().setTimeout(..., 'ui')` (the raw `setTimeout` is gone), with a
  `gameStarting` re-entry guard reset in `finally`; `clockScheduler` wraps each due
  timer's fn+reschedule in try/catch (mirrors the onTick guard); the bot movement
  pacing wait uses the `'animation'` group so pausing the bot group can't deadlock
  the turn lock mid-move; `setupActions` gained an else branch that console-errors
  and toasts when `__beginGame` is missing; `anyModalOpen` now uses computed style
  (catches every show mechanism, not just inline `style*="flex"`).

## 6. Placeholders that look like features — DEFERRED

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

## 7. Documentation drift (verdicts from the docs audit) — DONE

All items resolved in one docs commit (with §8). Every verdict was re-checked against the
codebase before editing; the audit's stale claims are noted inline.

- **`systemArchitecture.md` — MAJOR:** — DONE: `src/params/` (18 files, imports nothing
  project-local) added to §2 + the file tree; biome count fixed (11 files + barrel, not
  10); terrainGen count fixed (20, not 19); `engine/rules/noise.js` and
  `engine/rules/binaryHeap.js` (postdates the audit) added to the tree; the 12
  `ui/templates/*.inc` files documented; §6 boundary debt rewritten with the real
  18-import breakdown (7 ui→game/state, 7 render→dev, 4 game→dev); §7 test-runner
  self-contradiction fixed. *Stale audit claim:* `geometries/featureGeometries.js` was
  already documented — no change.
- **`clockScheduler.md`:** — DONE: unknown-group footgun rewritten as a warning (an
  unrecognized group makes timers **silently never fire** — control ops auto-create dead
  groups instead of erroring); "Used by" column updated (`animation` →
  `botTurnRunner.js` movement pacing, no longer "reserved"); `start()`/`now()`/
  `isPaused()`/`setFrameMarker()` documented.
- **`namingConventions.md`:** — DONE: known-exceptions note added for `logHelpers.js`
  (banned "helpers" — renaming it is a code change, deferred) and the 5 bare-domain
  dev files.
- **`aestheticConventions.md` — NOT obsolete:** — DONE: 4 stale snippets fixed
  (`--st-reveal` → `color-mix(...)`, crease widths → `--hair/--edge/--edge-bold/--edge-heavy`,
  header classes → `header-panel__champion[data-state=…]`, `:has()` cross-highlight →
  `html[data-cross-highlight]`); §11 (3D toon/outline) marked aspirational/unbuilt.
- **Minor:** — DONE: `commonTasks.md` `terrainGenerator.js` → `terrainGen/`;
  `gameMechanics.md` `biomes.js` → `biomes/` + stale `featureFrequencies` bullet →
  `features`; `cssConventions.md` dead `srcConventions.md` cross-ref →
  `systemArchitecture.md`, phantom `rightPanel.css`/`stats.css` dropped, 9 missing
  component files added; AGENTS.md layer table gained `src/params/`, banned words
  aligned with `namingConventions.md` (`lib`, `handler`).

## 8. Environment / process — DONE

- **Node path:** — DONE: AGENTS.md's Test section now documents
  `/run/host/usr/bin/node` and the `tests/run.sh` Flatpak fallback.
- **Current Process pointer:** — DONE: AGENTS.md now points to this backlog as the
  active work tracker (the map-gen tuning doc is kept alongside).
