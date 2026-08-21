# Terrain-Gen Design Notes

Reference for the procedural terrain generation pipeline (noise, calibration,
classification). This is not a to-do list — unimplemented features are tracked
in `dev/docs/futureWork.md`; deferred-by-decision scale guidance lives in
the "Scale / generation guardrails" section of `dev/docs/futureWork.md`.

- **Calibration is re-runnable** — the batch panel in `dev/tools/analysis.html` has a
  "Run Batch Analysis" button and a "Derive thresholds" checkbox (threshold derivation
  runs as part of the batch). Any change to noise output distributions (composite
  changes, new layers) requires regenerating calibration data. Thresholds remain stable
  percentiles if/when LUT normalization is added.
- **Per-phase normalization** — the additive composite spans [0, 2] (two
  fields summed), divided by 2 for [0, 1]. Any future noise layer follows
  the same pattern; only LUTs need regeneration.
- **Some frequencies scale with map radius** — RIDGE, MOISTURE, and REGION
  frequencies scale by 1/radius, so terrain at a coordinate differs across
  radii; ELEVATION_DETAIL and TEMP_VARIATION are absolute (unscaled).
  Cross-radius tile equality is not an invariant (the seam invariant is
  per-chunk determinism at a fixed radius). Threshold derivation pools
  histograms across radii (per-radius stats are kept separately).
- **Frequency separation** — detail (0.10) and ridge (0.04) layers are
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
