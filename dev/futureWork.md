# Future Work & Deferred Items

Forward-looking tracker consolidated from three earlier documents
(`dev/auditBacklog.md`, `dev/mapgen_update/remaining_work.md`,
`dev/largeMapRoadmap.md`) in Aug 2026. It contains only work that is deferred,
still to be implemented, or worth keeping as future reference. Completed work —
including the audit backlog's finished phases §1–§8 — lives in git history, not
here.

---

## 0. Terrain-gen: design notes for future reference

- **Calibration is re-runnable** — `dev/analysis.html` has a "Derive Thresholds"
  button and "Run Tests" button. Any change to noise output distributions
  (composite changes, new layers) requires regenerating calibration data.
  Thresholds remain stable percentiles if/when LUT normalization is added.
- **Per-phase normalization** — the additive composite naturally spans [0, 2]
  (two fields summed), divided by 2 for [0, 1]. When ridged FBM replaced regular
  FBM, the formula was unchanged — only LUTs needed regeneration. Same pattern
  applies to any future noise layer additions.
- **Frequency separation** — detail (0.020) and ridge (0.008) layers are separated
  by ~2.5×. New layers should maintain comparable separation from existing ones.
- **Slope normalization gotcha** — `SLOPE_NORMALIZATION` uses the 95th-percentile
  of aggregate per-tile mean delta (sum of 6 neighbor deltas / 6), not individual
  deltas. Using the wrong statistic causes slope values to cluster near 0.
- **Supernatural biome pattern** — to add a supernatural biome: (1) define
  archetype with `origin: 'supernatural'` and `epicenter` config; (2) add to
  `SUPERNATURAL_BIOMES` list; (3) no `climateRange` (never selected by climate);
  (4) `fieldModifiers` alter local environment before terrain classification;
  (5) no pipeline code changes needed.
- **Testing** — the analysis tool runs snapshot, seam, and climate coverage tests
  in-browser via "Run Batch Analysis", with a distribution histogram view +
  threshold overlay lines. All browser-based — no Node.js dependency.

## 1. Large-map: reference & future scale (from largeMapRoadmap.md)

The large-map roadmap's phases 1–4 (algorithmic decoupling, chunk infrastructure,
chunked rendering, scale-up) are complete; many values in the original (e.g. map
sizes) are out of date. What remains below is reference and future-scale material.

### 1.1 "Infinite" world (not actually infinite — more like "unknowably large")

The current game design (six other players to interact with) isn't mechanically
compatible with truly infinite maps, but the goal is to support extremely large
maps of any arbitrary size.

Implemented (2026-08): chunked storage (`src/game/state/chunkManager.js`) with
lazy per-chunk generation from seed, a background buffer around the champion
(clock-scheduled, `'bot'` speed group), eviction of empty chunks after a grace
period (deltas extracted and re-applied on regen), and an eager starting region
around spawns so global post-passes keep working. Rendering is bounded by the
sight-5 render cap; the minimap is a fixed-pixel champion-centered window with
a 1px/hex floor; spawn searches no longer scan the map (materialized-set
guards + candidate pools). Remaining:

- **Persistence** — save seed + list of dirty tiles with their deltas; everything
  else regenerates. Only the diff from procedural generation.
- **Infinite-appropriate AI** — local exploration biased toward resource
  gradients and away from recently visited areas; victory conditions may need
  rethinking.

### 1.2 What NOT to do (yet)

- Don't add worker threads for generation — single-threaded JS with
  clock-scheduled chunk generation is sufficient for maps up to R=200.
- Don't implement LOD unless profiling shows it's needed — InstancedMesh +
  frustum culling handles R=100 comfortably.
- **NO ACTUAL INFINITY** — create systems with the perspective of "How would it
  need to work if the map were infinite?" not to actually have infinite maps,
  but to ensure our mechanics and rendering etc. work with any arbitrarily large
  map size. Players eventually finding each other and fighting is core to design.

### 1.3 Still-open scale concerns

- **Bot directionality** — bots radius-limit their targeting but have no global
  strategy. A simple bias toward unexplored tiles / nearest God's Knot / enemy
  prevents circle-wandering. Design task as much as performance; bots keep very
  basic behaviors for testing during dev.
- **Camera caps + fog are tuned to current map scale** — zoom is capped
  (`ZOOM_MAX_FRUSTUM=20`, `DEFAULT_REFERENCE_FRUSTUM=40` in
  `src/params/render/cameraParams.js`), as are `CAMERA_FAR=200` and the scene
  fog (`sceneSetup.js`, 60–160). Shadows are radius dependent. A "conceptually
  infinite map" still needs terrain-gen's radius semantics removed (`worldShape`
  falloff, noise config scaled by 1/radius, latitude term, distance clamp) plus
  camera-driven chunk streaming (see §3.1).

---

## 2. Geometry editor — deferred content (descriptor migration gaps)

The descriptor pipeline is live: the game's feature/decor meshes now resolve
through `features/descriptors/` (data + recordBuilder + gameBuilder), and the
editor (`dev/geometryEditor.html`) edits the same data. Migrated to descriptor
data (see `src/render/hexmap3d/features/descriptors/data/`): all simple feature
archetypes, tree groves, solitary + elder trees, hill mounds, mountains, knots,
and the entity kinds — faction bases (7 faction variants), champions
(per-faction variants), mobs (per-archetype variants incl. the tier-2 elder/queen),
and traders. `baseMeshes.js` / `unitMeshes.js` / `unitGeometries.js` render these
through the generic record → InstancedMesh pipeline.
Reported parity gaps (stop-rule report) — content still on hard-coded builders
(`features/trees/`):

- **fruitTree** — the procedural fruit tree (`fruitTreeRecords.js`) grows 2–3
  snaking trunk segments, forked branches, and fruit, all per-tree hash-driven.
  Beyond the static-parts descriptor model; keeps its hard-coded builder. To
  migrate: add procedural/part-instancing to the descriptor model.
- **painforest groves** — gnarled twisted trees (`gnarledTreeRecords.js`) replace
  grove members in the Painforest biome. Keeps its hard-coded builder until
  biome-driven variant selection or procedural parts exist.
- **Mountain variant roll** — descriptors use the generic hash variant roll
  (50/50 classic/offpeak); per-tile assignments may differ from the legacy
  MOUNTAIN_HASH_SEEDS roll. The range reads identically.
- **Tree canopy anchor** — descriptor canopies use a fixed lift; the legacy
  builders tie the canopy bottom to the trunk top via the per-tree stretch draw.
  Canopy sits ~0.1 world units higher/lower relative to the trunk as stretch
  varies — visually identical at game scale.

Entity-kind notes (by design, not regressions):

- **2D icon caps** (`units/pieceIcons.js`) still render on top of mob/trader
  bodies; they're destined to be replaced by full 3D geometry. Cap height rides
  the top of each archetype's body part — an approximation (tall shapes like the
  goose float the icon high; entity part `stretch` is ignored, entities have no
  per-tile hash draws).
- **Champion accents** are minimal per-faction placeholders (a small part per
  faction); richer looks are authorable in the editor. Same for the tier-2 mob
  accents (elder crown, queen gem).
