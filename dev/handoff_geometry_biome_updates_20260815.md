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
| `313a809` | **Vivid supernatural palettes**: Titanstain = sickly titanflesh pinks + titanblood crimson; Unfinished Lands = cold electric ghost cyan. Both cover every terrain they can produce. Plus **biome decor override**: a `terrainOverrides` entry can name a decor descriptor (`decor: 'titanflesh'`); `gameFactory` collects `state.biomeDecorOverrides` (biome → terrain → decor id) and the render layer swaps the terrain-default decor for the biome's. Added 4 placeholder decor descriptors (`data/decor/titanflesh.js`, `titanblood.js`, `unfinishedScrap.js`, `forespring.js`) — they appear in the geometry editor's Decor browser. |
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

### A. Growth states for features (the big one — design agreed in the companion doc)
Goal: Blessed Font shows empty vs full; Peridexion fruit grows/ripens; a daily tween between exhausted and fully-grown.

- **Design (user-approved direction):** parts carry a *state range* (two keyframes, e.g. `{ empty: {scale, y, color}, full: {...} }`); the render picks a continuous **0..1 `growth`** value and lerps scale/position/color. Not hide/show.
- **Hooks that already exist:** `featureRegrowth.js` tracks `ripe` + `nextRewardDay`; `worldSimulation.js` advances the day; `refillOnRain` sets `ripe=true`. The boolean `ripe` should be promoted to a continuous `growth` (or the render computes it from `day` vs `nextRewardDay`). The descriptor pipeline (`recordsForDescriptor`/`collectPart`/`leafScaleXYZ`/`tileColorForPart`) already has the `canonical` flag pattern to copy for a `growth`/`state` param.
- **Editor:** needs a "state: empty/full" toggle to preview/edit the two keyframes (alongside canonical/variant).
- **Files to touch:** `featureRegrowth.js` (or a new growth module), `worldSimulation.js`, `gameBuilder.js`/`tileRecords.js` (thread `growth`), the Blessed Font + Peridexion descriptors, editor `previewSync.js` + a state toggle.

### B. Per-biome decor authoring clarity (editor)
- The editor only exposes `Variant` (one per-object list); `biomeVariants` is data-driven but **not editable in the UI**. Add editor support: pick a variant per biome.
- The grove's `variantRule: 'cluster'` conflates terrain (denseForest→tall, else→round) with biome (painforest→gnarled). Consider splitting into separate, clearly-named concepts so the editor stops "railroading" designs.
- The biome→decor **override** (different descriptor per biome) already works in-game (`gameBuilder` + `biomeDecorOverrides`); the editor doesn't need to expose it for authoring, just remember it exists when adding decor.

### C. Decor redesigns (for the external graphic designer)
- Desert: cactus becomes one `optionalGroup` among several (per-instance include/exclude).
- Plateau: lose mesa geometry → generic per-biome flora/debris.
- Titanflesh/Unfinished Lands: replace the 4 placeholders with real crazy geometry.
- Marsh/Plains: more distinctive geometry.
- **`featureDesign.md` must become the designer's contract** — it needs an "Authoring geometry" section covering: `variants`, `variantRule`, `biomeVariants`, `optionalGroups`, the canonical view, and (once built) growth states. Only that one doc should be required reading.

### D. Hill stacking follow-up
- Off-center surface-normal orientation for dispersed/scattered items on hill tiles was intentionally deferred (needs in-game tuning). `hillFloor.js` handles the center/peak case; the normal math for off-center needs the mound's ellipsoid normal at the item's offset.

### E. Housekeeping notes
- `featureRewards.js` (~500 lines) could be split further (reward table vs grant application + choice cards) — the regrowth half is already extracted.
- `featureDesign.md` may still contain stale text (e.g. "Moonberry Tree", biome table) — audit it when doing B/C.

---

## 4. Gotchas for the next dev/agent

1. **Render cannot import `game/rules`** (`check_imports.py` enforces it). Biome data (palettes, colors, decor overrides) reaches render via `state.*` Maps collected in `gameFactory.js` and passed as args through `worldMeshes.js` → `gameBuilder.js`. Follow that pattern for any new biome-driven render data.
2. **Descriptor data files are editor-generated** ("Don't hand-edit" — the next editor Save overwrites). New descriptors authored by hand (like `blessedFont.js`, the 4 placeholders) round-trip fine but the user should open+Save them in the editor to adopt them.
3. **Round-trip + snapshot are pinned:** `descriptorRoundtrip.test.js` (normalize↔denormalize↔emit) and `descriptorData.snap.json` (records golden). Schema changes must update both; `dev/scripts/regenerate_descriptor_snapshot.sh` regenerates the snapshot.
4. **`tile.terrain` is a mechanics value** (movement cost, passability, feature terrain rules, river rules). Supernatural terrain differences must stay as *presentation* (palette/name/decor/movement via `terrainOverrides`), not new `TERRAIN` entries — confirmed with the user.
5. **Editor save paths are kind-aware** now (`projectControls.js` `targetFile` + `saveServer.mjs` `subfolderFor`): decor→`data/decor/`, features→`data/features/`, items→`data/items/`.
6. **Tests to run after touching the descriptor/biome systems:** `node --test` (full) plus the three `check_*_imports.py` scripts. The descriptor tests (`dev/tests/render/descriptor*`) and `dev/tests/game/terrainGen.test.js` are the ones most likely to catch regressions.
