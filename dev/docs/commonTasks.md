# Common Tasks — How-To Recipes

## Add a UI Interaction

1. Put `data-action="foo"` on the element (in HTML or via `h(..., { dataAction: 'foo' })`)
2. Import `registerAction` from `src/shared/actionBus.js`
3. Call `registerAction('foo', (el, event) => { ... })` — handlers wiring multiple layers belong in `runtime/`

## Add a 3D Feature or Tile Type

- Map generation: `src/game/rules/terrainGen/` — chunked: `terrainGen/chunkGeneration.js`, flat: `terrainGen/flatGeneration.js` (terrain types in `src/game/rules/terrainTypes.js`)
- Hex math: `src/engine/rules/hexGrid.js`
- Feature geometry (new objects): add a descriptor in `src/render/hexmap3d/worldObjects/descriptors/data/` — one file per object (`<id>.js`), authored in the geometry editor (see below). The only hand-written builder left is `worldObjects/fruitTree/`.
- Feature meshes: `src/render/hexmap3d/worldObjects/descriptors/` (descriptor data + generic builder — new simple features are added as data), legacy builder in `worldObjects/fruitTree/`
- Visibility/fog: `src/game/state/fogOfWar.js`

## Add a New Feature via the Geometry Editor

1. Start the save server: `dev/tools/geometryEditor/saveServer.sh` (serves the repo at `127.0.0.1:8000`, including the save endpoint). Open `dev/tools/geometryEditor.html` from any dev server — Live Server works too; the Save button probes the page's own origin first, then falls back to `127.0.0.1:8000`. Pick a similar object in the object list, or build from ＋ Feature (parts, cluster/size ranges, emphasis, material). Use **Occupied** to preview the displaced state.
2. Give the object a real **ID** (the ID field under Object — new objects start with a session id) and a name.
3. **Save** — validates, strips defaults, writes `data/<id>.js`, and registers it in `data/index.js`. Both are immediately live: refresh the game to see the object.
4. Add the gameplay archetype if needed: entry in `src/game/rules/archetypeData/features.js` whose `kind` matches the descriptor `id`.
5. Done — no builder code; the generic descriptor pipeline renders whatever the data defines. Contract: descriptor `id` === archetype `kind` (the renderer resolves `tile.feature.kind` → `descriptorById(id)` in `src/render/hexmap3d/worldObjects/descriptors/gameBuilder.js`). Reload the editor page to browse a newly saved object.

Every non-entity object's record output is pinned by the golden snapshot
(`dev/tests/render/fixtures/descriptorData.snap.json`). **Save refreshes it
automatically** (server log: `[save] refreshed golden snapshot`), so editing
geometry never leaves the test suite red; to re-reconcile manually (e.g. after
reverting a data file) run `dev/scripts/regenerate_descriptor_snapshot.sh`.

**Download JSON** remains as a portable fallback (`<id>.descriptor.json`).

## Edit an Entity (Base / Champion / Mob / Trader) via the Geometry Editor

Entities (faction bases, champions, mobs, traders) are entity-driven descriptors: one object per hex, placed at the center, with variants and colors picked from entity state instead of the tile hash. The editor supports them the same way as features:

1. Open `dev/tools/geometryEditor.html`. Pick the entity in the object list — the occupied/re-roll controls disappear (entities are occupants, not displaced decor) and an **Entity** panel appears.
2. Pick the variant: **Faction** (bases/champions — also sets the palette colors) and/or **Archetype** (mobs — picks the shape variant). Traders have one fixed look.
3. Edit parts as usual — edits target the active variant's parts (the parts the preview shows). Entity parts ignore stretch variation (no per-tile hash draws).
4. **Save** — writes only the **active variant** back to the variant-scoped file (`data/bases/<faction>.js`, `data/champions/<faction>.js`, `data/mobs/<archetype>.js`); the table-driven barrels (`base.js` / `champion.js` / `mob.js`) are never rewritten. A 400 is returned only when no `activeVariant` is known (e.g. the mob `'default'` fallback).
5. Variant contract for entities: variant `id` === the selecting field (`variantRule 'faction'` → the faction short, `'archetype'` → the archetype shape key from `mob.archetypeName`). Unknown selections fall back to the first variant. Part ids must stay unique across variants — meshAssembly groups records by part id, so two variants sharing an id merge into one geometry.

## Change Win Conditions

Edit `src/game/state/victoryChecks.js` and the `objectives` object built in `src/ui/setupActions.js` and passed to `createGame()` in `src/game/state/gameFactory.js`.

## Schedule a Timed Operation

1. Import `getClock` from `src/shared/clockScheduler.js`
2. Pick the right speed group (`'bot'`, `'combat'`, `'animation'`, `'ui'`, `'default'`)
3. `getClock().setTimeout(fn, ms, group)` for one-shot, `getClock().setInterval(fn, ms, group)` for repeating
4. `await getClock().wait(ms, group)` for async/await flows
5. `getClock().onTick(fn)` for per-frame work (returns deregistration function)

See `dev/docs/clockScheduler.md` for full API.

## Use the Dev Tools Panel

Toggle with the backtick key (`` ` ``). Three tabs:

- **Cheats** — +gold, +HP, +relics, +knots, +potency; fill moves; teleport mode (intercepts hex clicks); deal damage; instant win
- **Performance** — FPS, frame time, named measurements (`refreshAll`, `mapRefresh`, `runBot`, `combatFlow`) with checkboxes. Add new measurements: `setMeasurementEnabled(name, true)` + wrap code in `startMeasure(name)` / `endMeasure(name)`
- **Bot Control** — toggle human/bot per champion, step-through mode, Play/Stop auto-advance

## Add Pause or Speed Controls

- **Pause:** `getClock().pause()` / `getClock().resume()`
- **Speed:** `getClock().setSpeed('combat', 2.0)` (1.0 = normal)
- **Granular:** `getClock().pauseGroup('bot')` freezes only bot turns

See `dev/docs/systemArchitecture.md` → Decision Guide (§5).
