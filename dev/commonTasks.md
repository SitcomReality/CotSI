# Common Tasks — How-To Recipes

## Add a UI Interaction

1. Put `data-action="foo"` on the element (in HTML or via `h(..., { dataAction: 'foo' })`)
2. Import `registerAction` from `src/shared/actionBus.js`
3. Call `registerAction('foo', (el, event) => { ... })` — handlers wiring multiple layers belong in `runtime/`

## Add a 3D Feature or Tile Type

- Map generation: `src/game/rules/terrainGen/` — chunked: `terrainGen/chunkGeneration.js`, flat: `terrainGen/flatGeneration.js` (terrain types in `src/game/rules/terrainTypes.js`)
- Hex math: `src/engine/rules/hexGrid.js`
- Feature geometry: `src/render/hexmap3d/features/geometries/` (one file per feature type)
- Feature meshes: `src/render/hexmap3d/features/` (trees/, mountainMeshes.js, etc.)
- Visibility/fog: `src/game/state/fogOfWar.js`

## Change Win Conditions

Edit `src/game/state/victoryChecks.js` and the `objectives` object passed from `setupScreen.js`/`gameFactory.js`.

## Schedule a Timed Operation

1. Import `getClock` from `src/shared/clockScheduler.js`
2. Pick the right speed group (`'bot'`, `'combat'`, `'animation'`, `'ui'`, `'default'`)
3. `getClock().setTimeout(fn, ms, group)` for one-shot, `getClock().setInterval(fn, ms, group)` for repeating
4. `await getClock().wait(ms, group)` for async/await flows
5. `getClock().onTick(fn)` for per-frame work (returns deregistration function)

See `dev/clockScheduler.md` for full API.

## Use the Dev Tools Panel

Toggle with the backtick key (`` ` ``). Three tabs:

- **Cheats** — +gold, +HP, +relics, +knots, +potency; fill moves; teleport mode (intercepts hex clicks); deal damage; instant win
- **Performance** — FPS, frame time, named measurements (`refreshAll`, `mapRefresh`, `runBot`, `combatFlow`) with checkboxes. Add new measurements: `setMeasurementEnabled(name, true)` + wrap code in `startMeasure(name)` / `endMeasure(name)`
- **Bot Control** — toggle human/bot per champion, step-through mode, Play/Stop auto-advance

## Add Pause or Speed Controls

- **Pause:** `getClock().pause()` / `getClock().resume()`
- **Speed:** `getClock().setSpeed('combat', 2.0)` (1.0 = normal)
- **Granular:** `getClock().pauseGroup('bot')` freezes only bot turns

See `dev/systemArchitecture.md` → Decision Guide (§5).
