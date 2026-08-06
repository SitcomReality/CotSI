# Common Tasks — How-To Recipes

## Add a UI Interaction

1. Put `data-action="foo"` on the element (in HTML or via `h(..., { dataAction: 'foo' })`)
2. Import `registerAction` from `src/shared/actionBus.js`
3. Call `registerAction('foo', (el, event) => { ... })` — handlers wiring multiple layers belong in `runtime/`

## Add a 3D Feature or Tile Type

- Map generation: `src/game/rules/terrainGen/` — chunked: `terrainGen/chunkGeneration.js`, flat: `terrainGen/flatGeneration.js` (terrain types in `src/game/rules/terrainTypes.js`)
- Hex math: `src/engine/rules/hexGrid.js`
- Feature geometry: `src/render/hexmap3d/features/geometries/` (one file per feature type)
- Feature meshes: `src/render/hexmap3d/features/descriptors/` (descriptor data + generic builder — new simple features are added as data), legacy builders in `features/trees/`
- Visibility/fog: `src/game/state/fogOfWar.js`

## Add a New Feature via the Geometry Editor

1. Serve the repo root (`python3 -m http.server`) and open `dev/geometryEditor.html`. Pick a similar object in the object select, or edit any descriptor into your shape (parts, cluster/size ranges, emphasis, material). Use **Occupied** to preview the displaced state.
2. **Download JSON** — saves `<id>.descriptor.json` (the full descriptor).
3. Add the gameplay archetype if needed: entry in `src/game/rules/archetypeData/features.js` whose `kind` matches the descriptor `id`.
4. Register the descriptor in `src/render/hexmap3d/features/descriptors/data/` — the JSON is JSON-safe, so paste it as a JS object literal into a data file (single-part features can use the `simpleFeature()` helper in `simpleFeatures.js`), then import it and add it to `ALL_DESCRIPTORS` in `data/index.js`.
5. Done — the editor list and the in-game renderer both read `data/index.js`, so no builder code is needed. Contract: descriptor `id` === archetype `kind` (the renderer resolves `tile.feature.kind` → `descriptorById(id)` in `gameBuilder.js`).

## Edit an Entity (Base / Champion / Mob / Trader) via the Geometry Editor

Entities (faction bases, champions, mobs, traders) are entity-driven descriptors: one object per hex, placed at the center, with variants and colors picked from entity state instead of the tile hash. The editor supports them the same way as features:

1. Open `dev/geometryEditor.html`. Pick the entity in the object select — the occupied/re-roll controls disappear (entities are occupants, not displaced decor) and an **Entity** panel appears.
2. Pick the variant: **Faction** (bases/champions — also sets the palette colors) and/or **Archetype** (mobs — picks the shape variant). Traders have one fixed look.
3. Edit parts as usual — edits target the active variant's parts (the parts the preview shows). Entity parts ignore stretch variation (no per-tile hash draws).
4. **Download JSON** — the export includes the full descriptor with all variants, so it is drop-in compatible with the data files.
5. Register the change in `src/render/hexmap3d/features/descriptors/data/` — paste the JSON into the matching data file (`bases.js` / `champions.js` / `mobs.js` / `traders.js`) and rebuild the file's variant map (e.g. new mob archetype → new entry in `MOB_VARIANTS`, plus a `MOB_TIER2_VARIANTS` entry if it is a tier-2 mob). No builder code — `baseMeshes.js` / `unitMeshes.js` render whatever the descriptors define.
6. Variant contract for entities: variant `id` === the selecting field (`variantRule 'faction'` → the faction short, `'archetype'` → the archetype shape key from `mob.archetypeName`). Unknown selections fall back to the first variant. Part ids must stay unique across variants — meshAssembly groups records by part id, so two variants sharing an id merge into one geometry.

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
