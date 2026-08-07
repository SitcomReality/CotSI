# Goal contract — Terrain decor consolidation + biome-tinted decoration

Approved by the user (2026-08-07). This file is the full, authoritative spec for the goal.
The runtime goal objective references this file; read it before starting work.

## Objective

Consolidate CotSI's terrain decor into one system: every decor-producing terrain has exactly one named decor type, the round grove variant actually renders spherical canopies, all groves live in the descriptor pipeline, and decor parts are tinted by a per-tile *blended* biome color (primary or accent) with a per-part influence parameter.

## End state

1. **One decor per terrain** — display names identify their terrain unambiguously:
   - `forest` → **Forest Grove** (round/spherical canopy) · `denseForest` → **Deep Wood Grove** (tall/conical canopy)
   - `hill` → **Hill Mound** (exists) · `mountain` → **Mountain** (exists)
   - `marsh` → new **Marsh Reeds** · `plateau` → new **Plateau Mound** (hill-mound-like, flat top) · `plains` → new **Plains Grass** (blades of grass) · `desert` → new **Desert Scrub** (stones/scrub) · `beach` → new **Beach Driftwood**
   - `water`, `river`, `ice` → no decor (unchanged)

2. **Round canopy bug fixed.** The grove `round` variant renders sphere canopies in both the game and the geometry editor. Root cause is known: `src/render/hexmap3d/features/descriptors/meshAssembly.js` keys parts by id while grove variants share `trunk`/`canopy` ids, so the last variant's geometry (the cone) wins for every record. Fix per the convention documented in `descriptors/data/mountains.js` (unique part ids per variant) or by tagging records with their variant; add a test asserting geometry shape per variant.

3. **Painforest gnarled grove migrated** into the descriptor system as the Painforest variant of the grove decor; the legacy gnarled-grove path (`src/render/hexmap3d/features/trees/`) is removed. Painforest decor uses default part colors.

4. **Biome `primary` + `accent` colors** for all 11 biomes, added to the biome archetype defs (`src/game/rules/archetypeData/biomes/*.js`) and carried into state alongside `biomePalettes` (`src/game/state/gameFactory.js`). Fixed by user: Edenfall purple/**gold**, Scorch orange/**ash grey**, Unfinished Lands light pink/**electric blue**, Tundra deep blue/**near-white**. Proposed defaults (derived from each biome's existing palette, flagged for user review): Untouched meadow green/golden sand · Painforest deep green/dark teal · Sere Wastes tan/bone white · Dustbleed rusty red/turquoise · Brass Grave warm brass/patina teal · Frigid Silence frost grey/pale frost · Mourning Marsh deep marsh green/mournful blue.

5. **Per-part biome color influence.** Each decor part gains a biome-influence parameter (target `primary` or `accent`, strength 0–1). Strength 0 → the part's assigned default color, which is also what applies in Untouched and Painforest. The influence color is the tile's **blended** biome color, neighbor-averaged like the hex-surface gradients (`src/render/hexmap3d/terrain/cornerBlend.js` pattern: tile + sharing neighbors, water/river/unexplored excluded, `TERRAIN_BLEND_FACTOR`). So a tree on an Edenfall hex next to Painforest gets purple diluted by bleeding green. Applies to all descriptor parts, including mountain parts (vertex-color path); the migrated gnarled grove uses the same path.

6. **Per-biome size variation.** Parts may optionally define per-biome size factors (e.g. stunted Tundra groves) alongside the color influence.

## Done when (all of)

- `tests/run.sh` exits 0 — existing suite plus new coverage: variant geometry shape (round→sphere, tall→cone), terrain→exactly-one-decor mapping, all 11 biomes have valid `primary`+`accent`, blend/dilution math, influence math; the golden descriptor snapshot (`tests/render/fixtures/descriptorData.snap.json`) regenerated.
- `python3 dev/check_imports.py`, `python3 dev/check_analysis_imports.py`, `python3 dev/check_geometry_editor_imports.py` all exit 0.
- The geometry editor (which loads the same descriptors via `ALL_DESCRIPTORS`) shows the round Forest Grove, the new marsh/plateau/plains/desert/beach decor, and the migrated Painforest grove.
- The user approves the final biome color table and the in-game result.

## Scope

`src/render/hexmap3d/features/` (descriptors + legacy trees), `src/game/rules/archetypeData/biomes/`, `src/game/state/gameFactory.js`, `src/params/` as needed, `tests/`, `dev/geometryEditor/` if needed, `dev/analysis/render/theme.js` if it draws decor. Do **not** change terrain classification/generation thresholds, terrain types, biome climate ranges or feature rules, or anything outside decoration and its colors. Layer rules must hold (`game/` never imports `render/`/`ui/`).

## Loop

Run `tests/run.sh` + the three import checks after each phase; regenerate the golden snapshot whenever descriptors change; rerun until green. **Git commit after each completed phase (user-approved standing instruction).**

## Stop rule

If the round-canopy fix or the gnarled migration turns out deeper than expected, stop and report what was found instead of forcing a pass. If a proposed accent clashes with its biome's palette, pick a theme-consistent alternative and flag it in the report. When all automated checks pass, stop and present the results + the full biome color table for the user's review rather than continuing to polish.

## Reference map (from investigation, verify before relying)

- Descriptor registry / barrel: `src/render/hexmap3d/features/descriptors/data/index.js` (`ALL_DESCRIPTORS`); grove variants in `data/trees.js` (`ROUND_CANOPY` sphere / `TALL_CANOPY` cone / `WIDE_CANOPY` cone), hill mound `data/hills.js`, mountain `data/mountains.js`.
- Terrain→decor resolvers: `descriptors/gameBuilder.js` (`resolveDescriptorForTile`, `resolveGroveForTile`, `resolveHillForTile`, `resolveMountainForTile`, `GROVE_TERRAINS`).
- Bug: `descriptors/meshAssembly.js:27-31` (part-by-id map, last variant wins); records carry only `partId` (`recordBuilder.js:347-354`); variant selection in `recordBuilder.js:107-132` (forest→`round`, denseForest→`tall`).
- Biome defs: `src/game/rules/archetypeData/biomes/*.js` (`palette` per terrain, RGB 0–1 tuples); state flow `src/game/state/gameFactory.js:70-83` → `state.biomePalettes`; surface color `src/render/hexmap3d/terrain/tileColor.js`; blending `src/render/hexmap3d/terrain/cornerBlend.js` (`TERRAIN_BLEND_FACTOR = 0.8` in `src/params/render/terrainParams.js:23`).
- Terrain registry: `src/game/rules/terrainTypes.js` (12 types: plains, forest, denseForest, desert, marsh, hill, plateau, mountain, water, ice, beach, river).
- Legacy Painforest path: `src/render/hexmap3d/features/trees/` (`treeRecordsForTile.js` gnarled, `clusterTreeRecords.js`, `buildTreeMeshes.js`, `PAINFOREST_BIOME` constants).
- Tests: `tests/render/descriptorGameBuilder.test.js` (add variant geometry asserts), `descriptorData.test.js` (golden snapshot), `descriptorSchema.test.js`, `descriptorAllContent.test.js`, `descriptorRecordBuilder.test.js`, `tests/game/archetypes.test.js`, `tests/game/terrainTypes.test.js`.
- Naming: decor display names must be canonical and identify their terrain (per user: "Hills = hill mound, Mountain = Mountain" are fine); unique codebase-wide per `dev/namingConventions.md` §6.
