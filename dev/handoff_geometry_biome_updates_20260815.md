# Hand-off — Geometry, decor, biome, feature and terrain updates

**Date:** 2026-08-15 · **Author:** AI dev hand-off
**Companion doc:** `dev/geometry_biome_updates_20260815.md` (the working notes this hand-off accompanies).

This document tells the next dev/agent exactly where things stand, what was implemented (with commits), what remains, and how to pick up without re-deriving the architecture. The full test suite is green (**666/666**) and all import checks pass — run them before and after any change:

```bash
node --test                          # full suite (zero-dependency node:test)
python3 dev/scripts/check_imports.py # src/ imports + layer boundaries
python3 dev/scripts/check_analysis_imports.py   # map analysis tool
python3 dev/scripts/check_geometry_editor_imports.py  # geometry editor
```

---

## 1. What has been implemented (in order)

| # | Commit | What |
|---|--------|------|
| 1 | `7efc977` | **Unified regrowth** into `src/game/state/features/featureRegrowth.js` (`depleteFeature`, `advanceRegrowth`, `refillOnRain`). Single ripe/unripe timer path. |
| 2 | `f3501e0` | **Blessed Font** replaces the Moonberry Tree (mechanically identical heal + 4-day regrow) + **rainy-day refill** (weatherScript `rainy` flag, Ash Rain). New descriptor `data/features/blessedFont.js`. |
| 3 | `508acdd` | Removed the `tree` **feature** — trees are pure decor (the grove). `tree.js`, the `solitary` variantRule and dead tree geometry constants deleted. |
| 4 | `80cb2c9` | **Supernatural terrain supersede**: `terrainOverrides` on biome archetypes (display name + uniform movement cost); `terrainCost(entity, terrain, biomeId)` strips faction bonuses there; tooltip/dispatch show override names. |
| 5 | `2a4bf97` `78de369` | **Plateau mesa height** (elevation 0.35→0.70) + **hill stacking**: `worldObjects/hillFloor.js` resolves the per-tile mound peak (`radius·(1−cos(thetaLength))·scaleY`); champions/bases/features lift onto it; the hill mound never sinks (it's the terrain bump). |
| 6 | `3c1977c` `a0f8319` `fc07491` | **Per-biome decor** (`biomeVariants` on descriptors — data-driven, validated), **`optionalGroups`** (independent per-tile include/exclude sub-objects), **canonical editor view** (variation-free preview flag on `recordsForDescriptor`/`nodeWorldFrames`). |
| 7 | `17c77be` `1dfc94a` | **Directory reorg**: `descriptors/data/{decor,features,items}` (+ entities top-level), `game/state/{features,movement,world,entities}` (+ `combat/`). `check_imports.py` TOLERATED_STATE_READS updated. |

**Quick wins (this pass):**

| Commit | What |
|--------|------|
| `0439447` | Renamed `biome_brass_grave`/`brass_grave`/`biomeBrassGrave` → `biome_titanstain`/`titanstain`/`biomeTitanstain.js` everywhere (src, analysis tool, docs, tests). |
| `313a809` | **Vivid supernatural palettes**: Titanstain = sickly titanflesh pinks + titanblood crimson; Unfinished Lands = cold electric ghost cyan. Both cover every terrain they can produce. Plus **biome decor override**: a `terrainOverrides` entry can name a decor descriptor (`decor: 'titanflesh'`); `gameFactory` collects `state.biomeDecorOverrides` (biome → terrain → decor id) and the render layer swaps the terrain-default decor for the biome's. Added 4 placeholder decor descriptors (`data/decor/titanflesh.js`, `titanblood.js`, `yetlands.js`, `forespring.js`) — they appear in the geometry editor's Decor browser. |
| `de16ecd` | Analysis tool biome-view colors updated to the new palettes (standard view already consumed biome palettes). **Geometry editor undo** button + Ctrl/Cmd+Z (`dev/tools/geometryEditor/history.js`; the `mutate()` flow snapshots pre-edit state, capped at 50). |

The trader's "Moonberry" heal item was renamed **"Healing Salve"** (`af91fdd`).

---

## 2. Where things live now (map for a new dev)

- **Biome archetypes:** `src/game/rules/archetypeData/biomes/` — each has `palette` (terrain→RGB ground color, consumed by `tileColor.js`), `colors` (primary/accent decor tint), `terrainOverrides` (`{ name, movementCost?, decor? }` per terrain), `terrainTags`, `features`.
- **Terrain overrides:** `src/game/rules/terrainOverrides.js` (`terrainOverride`, `terrainDisplayName`).
- **Decor resolution:** `src/render/hexmap3d/worldObjects/descriptors/gameBuilder.js` — the passes (mountain → feature → **biome decor override** → grove → hill → simple decor). The override map arrives as `biomeDecorOverrides` (render can't import `game/rules` — data flows via args, same pattern as `biomeColors`/`biomePalettes`).
- **Feature rewards + regrowth:** `src/game/state/features/featureRewards.js` (reward table/grant engine) + `featureRegrowth.js` (timer) — `featureRewards.js` is still ~500 lines; splitting it further (reward table vs grant application) is a known follow-up.
- **Descriptor pipeline:** `src/render/hexmap3d/worldObjects/descriptors/` — `recordsForDescriptor`/`nodeWorldFrames` (tile path), `schema.js` barrel, `descriptorValidation.js`, `descriptorNormalize.js`, `descriptorDenormalize.js`, `variantSelection.js`, `tileRecords.js`, `partScale.js`, `partColor.js`, `partFrames.js`. New descriptor fields added: `biomeVariants`, `optionalGroups`; `recordsForDescriptor(..., canonical)`.
- **Editor:** `dev/tools/geometryEditor/` — `state.js` (S), `history.js` (undo), `ui/previewSync.js` (canonical/biome/occupied toggles), `ui/projectControls.js` + `saveServer.mjs` (kind-aware save paths: `decor/`/`features/`/`items/`).

---

## 3. Still to implement (in priority order)

### A. ~~Growth states for features~~ ✅ IMPLEMENTED (2026-08-15, next pass)
Blessed Font shows empty vs full; Peridexion fruit grows/ripens; a daily step toward fully-grown. What landed:

- **State model:** features carry continuous `growth` 0..1 plus the maintained `ripe` boolean (ripe ⇔ growth = 1). `featureRegrowth.js` sets `growth = 0` on deplete (with `regrowDays`), steps `1/regrowDays` per world turn in `advanceRegrowth` (marking chunks dirty each day so the rebuild shows the new level), and `refillOnRain` sets growth = 1. `ripe`/`nextRewardDay` semantics are unchanged, so all existing consumers/tests kept working.
- **Descriptor data:** part-level `states.empty` keyframe — `{ scaleX?, scaleY?, scaleZ?, y?, localPos?, color? }` (shape leaves only, validated). The part's base values ARE the full state; the render lerps empty → base by growth (`partStates.js` `stateTransform`/`stateColor`, threaded through `recordsForDescriptor`/`nodeWorldFrames` → `leafScaleXYZ`/`tileColorForPart`/`nestedLeafFrameMatrix`). `gameBuilder` feeds `tile.feature.growth` on the feature pass; decor passes stay growth 1.
- **Descriptors:** Blessed Font `font-water` (tiny dull puddle low in the bowl → brimming vivid pool) and Peridexion Tree `sweet-fruit-1/2/3` (small unripe green berries → vivid ripe fruit).
- **Editor:** "State" toggle (full/empty) on the preview bar previews and edits the active keyframe — the Y/localPos/scale/color inspector rows write `states.empty` in empty mode (gizmo drags too), keyframed parts get a ◐ badge. Authoring reference: `descriptorAuthoring.md` §4.6.
- **Tests:** 680/680 green (`node --test`); new `dev/tests/render/descriptorGrowth.test.js` (9 tests: root + nested lerp, no-op guarantees, partial keyframes, validation); growth-step/rain-refill/deplete tests in `worldSimulation.test.js`/`featureRewards.test.js`.

Notes for the next dev: the `growth` value is game-driven (a feature's daily progress) — nothing animates in real time. Only features use it today, but the pipeline accepts any 0..1 growth per descriptor resolution, so decor/mountain kinds could keyframe too (e.g. a biome-driven decor stage) by passing a value in `gameBuilder`'s `runPass`. The snapshot fixture is unaffected (default growth renders the base records), but re-running `dev/scripts/regenerate_descriptor_snapshot.sh` after any descriptor edit is still the rule.

### B. ~~Per-biome decor authoring clarity (editor)~~ ✅ IMPLEMENTED (2026-08-15, next pass — revised)
The initial pass added editor pins for `biomeVariants`/`terrainVariants`; the
follow-up pass (the current one) tightened the model per design feedback:

- **One decor per terrain.** The decor's `id` IS the terrain's id: `plainsGrass`
  → `plains`, `marshReeds` → `marsh`, `plateauMound` → `plateau`, `desertScrub`
  → `desert`, `beachDriftwood` → `beach` (file + id + displayName + export
  renamed). `terrainVariants` is **removed entirely** — different terrains are
  separate descriptors, never variants of one another (normalize drops any
  interim `terrainVariants` field).
- **Tree grove split** into two descriptors, each with its own Painforest
  variant (and room for more biome alternates): `forest.js` (`round` default +
  `painforest` pinned) and `denseForest.js` (`tall` default + `painforest`
  pinned), each carrying its own moisture count range (`{ forest: [3,5] }` /
  `{ denseForest: [4,7] }`). `grove.js` deleted.
- **Variant model:** `variants[0]` is the DEFAULT look; `biomeVariants` pins
  alternates; precedence = explicit picker > biome pin > default. Biome-pinned
  descriptors never hash-roll. `variantRule: 'cluster'` fully retired
  (migrates to `'hash'`). Editor object controls list per-biome pins only;
  the preview bar's Biome/Terrain selectors render the pinned looks.
- The biome→decor **override** (different descriptor per biome) still works
  in-game (`gameBuilder` + `biomeDecorOverrides`) and needs no editor exposure
  — it's per-terrain-decor, not per-variant.

### C. ~~Decor redesigns + the designer contract~~ contract ✅ DONE — geometry still for the external designer
- ✅ **`featureDesign.md` is now the designer's contract** — new §8 "Authoring geometry" covers the whole toolkit: one-decor-per-terrain (decor id = terrain id), `variants[0]` default + `biomeVariants`, `optionalGroups`, the canonical view, growth states, the editor/save loop, and the test contract — with inline worked examples and pointers to shipped descriptor files. The stale content audit (Moonberry Tree → Blessed Font/Healing Salve, removed tree feature row, grove references) is done. `descriptorAuthoring.md` remains the deep field reference; only §8 is required reading.
- Still **for the external graphic designer** (the mechanisms they'll use are all shipped and documented):
  - Desert: cactus becomes one `optionalGroup` among several (per-instance include/exclude).
  - Plateau: lose mesa geometry → generic per-biome flora/debris.
  - Titanflesh/Yetlands: replace the placeholders with real crazy geometry.
  - Marsh/Plains: more distinctive geometry.

### D. Hill stacking follow-up — still deferred (needs in-game tuning)
- Off-center surface-normal orientation for dispersed/scattered items on hill tiles remains intentionally deferred. `hillFloor.js` handles the center/peak case; the normal math for off-center needs the mound's ellipsoid normal at the item's offset, and the visual result needs in-game tuning before it ships.

### E. Housekeeping — ✅ DONE
- **`featureRewards.js` split** — the ~550-line engine is now two files: `featureRewardTable.js` (the FEATURES reward table + canonical names + choice-card builders — pure data) and `featureRewards.js` (entry points + grant application). No behavior change; the 36 reward/arrival tests pin it.
- **`featureDesign.md` stale text audit** — done as part of C (Moonberry Tree → Blessed Font / Healing Salve, removed the deleted `tree` feature row, `fruitTree` → `blessedFont`, grove/solitary references, header status).

---

## 4. Gotchas for the next dev/agent

1. **Render cannot import `game/rules`** (`check_imports.py` enforces it). Biome data (palettes, colors, decor overrides) reaches render via `state.*` Maps collected in `gameFactory.js` and passed as args through `worldMeshes.js` → `gameBuilder.js`. Follow that pattern for any new biome-driven render data.
2. **Descriptor data files are editor-generated** ("Don't hand-edit" — the next editor Save overwrites). New descriptors authored by hand (like `blessedFont.js`, the 4 placeholders) round-trip fine but the user should open+Save them in the editor to adopt them.
3. **Round-trip + snapshot are pinned:** `descriptorRoundtrip.test.js` (normalize↔denormalize↔emit) and `descriptorData.snap.json` (records golden). Schema changes must update both; `dev/scripts/regenerate_descriptor_snapshot.sh` regenerates the snapshot.
4. **`tile.terrain` is a mechanics value** (movement cost, passability, feature terrain rules, river rules). Supernatural terrain differences must stay as *presentation* (palette/name/decor/movement via `terrainOverrides`), not new `TERRAIN` entries — confirmed with the user.
5. **Editor save paths are kind-aware** now (`projectControls.js` `targetFile` + `saveServer.mjs` `subfolderFor`): decor→`data/decor/`, features→`data/features/`, items→`data/items/`.
6. **Tests to run after touching the descriptor/biome systems:** `node --test` (full) plus the three `check_*_imports.py` scripts. The descriptor tests (`dev/tests/render/descriptor*`) and `dev/tests/game/terrainGen.test.js` are the ones most likely to catch regressions.
