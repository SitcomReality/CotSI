# Terrain-Gen Design Notes

Reference for the procedural terrain generation pipeline (noise, calibration,
classification). This is not a to-do list — unimplemented work is tracked in
`dev/docs/futureWork.md`.

- **Calibration is re-runnable** — `dev/tools/analysis.html` has a "Derive
  Thresholds" button and "Run Tests" button. Any change to noise output
  distributions (composite changes, new layers) requires regenerating
  calibration data. Thresholds remain stable percentiles if/when LUT
  normalization is added.
- **Per-phase normalization** — the additive composite spans [0, 2] (two
  fields summed), divided by 2 for [0, 1]. Any future noise layer follows
  the same pattern; only LUTs need regeneration.
- **Frequencies scale with map radius** — noise frequencies are scaled by
  1/radius, so terrain at a coordinate differs across radii; cross-radius
  tile equality is not an invariant (the seam invariant is per-chunk
  determinism at a fixed radius). Calibration/LUTs are radius-specific.
- **Frequency separation** — detail (0.020) and ridge (0.008) layers are
  separated by ~2.5×; new layers should maintain comparable separation.
- **Slope normalization gotcha** — `SLOPE_NORMALIZATION` uses the 95th
  percentile of aggregate per-tile mean delta (sum of 6 neighbor deltas /
  6), not individual deltas. Using the wrong statistic clusters slope near 0.
- **Rain shadow** — if the upwind average elevation (along
  `RAIN_SHADOW_WIND`, sampled at `RAIN_SHADOW_DISTANCES`) rises at least
  `RAIN_SHADOW_ELEV_THRESHOLD` above local elevation, the tile dries by
  (surplus − threshold) × `RAIN_SHADOW_DRYING`. Constants in
  `src/params/game/terrainGenParams.js`; applied in
  `src/game/rules/terrainGen/classification/moistureAdjustment.js`.
- **Supernatural biome pattern** — to add a supernatural biome: (1) define
  archetype with `origin: 'supernatural'` + `epicenter` config; (2) add to
  `SUPERNATURAL_BIOMES`; (3) no `climateRange` (never climate-selected);
  (4) `fieldModifiers` alter local environment before terrain
  classification; (5) no pipeline code changes.
- **Testing** — the analysis tool runs snapshot, seam, and climate coverage
  tests in-browser via "Run Batch Analysis" (distribution histogram +
  threshold overlay). No Node.js dependency.
