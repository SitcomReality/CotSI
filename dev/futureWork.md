# Future Work & Deferred Items

Forward-looking tracker consolidated from three earlier documents
(`dev/auditBacklog.md`, `dev/mapgen_update/remaining_work.md`,
`dev/largeMapRoadmap.md`) in Aug 2026. It contains only work that is deferred,
still to be implemented, or worth keeping as future reference. Completed work —
including the audit backlog's finished phases §1–§8 — lives in git history, not
here.

---

## 2. Terrain-gen: tuning knobs & optional polish (from remaining_work.md)

### 4.9 Known limitations (Post-G, explicitly deferred)

| Item | Notes |
|------|-------|
| Ecotone blending (smooth biome transitions) | Smoothstep at boundaries; nontrivial without breaking determinism |
| Player terraforming | Requires modification overlay on deterministic base |
| River tributaries and meandering | Current simple downhill trace is adequate for v1 |
| Endorheic lake formation at river termini | Dead-end rivers at local minima are acceptable |
| Supernatural biome gameplay mechanics | Design-dependent, not generation-dependent |
| Quantile LUT normalization in runtime | Thresholds are absolute values tuned against raw distributions |

## 5. Terrain-gen: design notes for future reference

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

## 6. Large-map: reference & future scale (from largeMapRoadmap.md)

The large-map roadmap's phases 1–4 (algorithmic decoupling, chunk infrastructure,
chunked rendering, scale-up) are complete; many values in the original (e.g. map
sizes) are out of date. What remains below is reference and future-scale material.

### 6.1 "Infinite" world (not actually infinite — more like "unknowably large")

The current game design (six other players to interact with) isn't mechanically
compatible with truly infinite maps, but the goal is to support extremely large
maps of any arbitrary size.

- **Chunk manager (load / generate / evict)** — `src/game/state/chunkManager.js`:
  pre-generate a buffer radius (e.g. 3 chunks ahead); evict chunks with no entity
  for M turns (serialize deltas, drop from memory); regenerate from seed +
  re-apply deltas on return.
- **Persistence** — save seed + list of dirty tiles with their deltas; everything
  else regenerates. Only the diff from procedural generation.
- **Streaming** — background generation during idle frames via the clock
  scheduler (`'bot'` speed group); smoothly add chunk meshes as they enter view.
- **Infinite-appropriate AI** — local exploration biased toward resource
  gradients and away from recently visited areas; victory conditions may need
  rethinking.

### 6.2 What NOT to do (yet)

- Don't premature-optimise the minimap — it works for now; chunk-based rendering
  naturally limits what it needs to draw.
- Don't add worker threads for generation — single-threaded JS with
  clock-scheduled chunk generation is sufficient for maps up to R=200.
- Don't implement LOD unless profiling shows it's needed — InstancedMesh +
  frustum culling handles R=100 comfortably.
- **NO ACTUAL INFINITY** — create systems with the perspective of "How would it
  need to work if the map were infinite?" not to actually have infinite maps,
  but to ensure our mechanics and rendering etc. work with any arbitrarily large
  map size. Players eventually finding each other and fighting is core to design.

### 6.3 Still-open scale concerns

- **Spawn placement scans** — `nearestOpenKey`/`nearestOpenMultiRing`
  (`src/game/rules/tileQueries.js:18/55`, used by `championFactory.js` and
  `basePlacer.js`) do radial distance-based searches that scale with map size.
  Fine at r=21; would become startup bottlenecks at r=50+ — replace with
  chunk-local placement if map sizes grow.
- **Bot directionality** — bots radius-limit their targeting but have no global
  strategy. A simple bias toward unexplored tiles / nearest God's Knot / enemy
  prevents circle-wandering. Design task as much as performance; bots keep very
  basic behaviors for testing during dev.
- **Minimap scalability** — at large sizes the minimap becomes too small to be
  useful; consider a fixed-pixel local-area minimap if scale-up happens.
- **Camera caps + fog are tuned to current map scale** — zoom is capped
  (`ZOOM_MAX_FRUSTUM=15`, `DEFAULT_REFERENCE_FRUSTUM=40` in
  `src/params/render/cameraParams.js`), as are `CAMERA_FAR=200` and the scene
  fog (`sceneSetup.js`, 60–160). Shadows are radius dependent. A "conceptually
  infinite map" still needs terrain-gen's radius semantics removed (`worldShape`
  falloff, noise config scaled by 1/radius, latitude term, distance clamp) plus
  camera-driven chunk streaming (see §6.1).
