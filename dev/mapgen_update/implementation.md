# Map Generation Redesign — Implementation Tracker

**Design doc:** `dev/mapgen_update/design.md`

---

## Phase A: Foundation — Climate-Driven Classification

**Goal:** Replace independent biome noise with climate-driven selection. Restructure classifyTerrain to use all axes.

- [ ] Add `NOISE_CONTINENT` and `NOISE_ELEVATION_DETAIL` to `worldParams.js`
- [ ] Replace single `NOISE_ELEVATION` usage with continent×detail composite
- [ ] Add temperature derivation (lapse rate) in shared sampler
- [ ] Add `selectBiome(elevation, moisture, temperature, regionBias)` function
- [ ] Rewrite `classifyTerrain` to use elevation + moisture + temperature + tree line
- [ ] Replace `BIOME_DISTRIBUTION` with `selectBiome`
- [ ] Repurpose `NOISE_BIOME` as `NOISE_REGION` for subtle bias
- [ ] Update `gameFactory.js` to match new API
- [ ] Store continuous `elevation` as primary field on tiles (not `resolveElevation` collapse)
- [ ] Update analysis tool (`dev/analysis/generation/generate.js`)
- [ ] Add `climateRange` and `terrainRules` to biome archetypes
- [ ] Run `python3 dev/check_imports.py` — must pass
- [ ] Run `python3 dev/check_analysis_imports.py` — must pass
- [ ] User playtest — verify biome boundaries follow climate

---

## Phase B: Multi-Scale Elevation + Slope

**Goal:** Split elevation into continent mask × detail. Add slope-based classification (mountain vs plateau, hills).

- [ ] Implement 3-layer elevation composite in `sampleBaseFields`
- [ ] Add slope computation using 1-hex border ring
- [ ] Add `hill` and `plateau` to `TERRAIN` in `terrainTypes.js`
- [ ] Update classifier to use slope for mountain/plateau/hill distinction
- [ ] Add border-ring sampling to `generateChunkTiles`
- [ ] Eliminate `fallbackT` — use real sampled data for neighbor lookups
- [ ] Run `python3 dev/check_imports.py` — must pass
- [ ] Run `python3 dev/check_analysis_imports.py` — must pass
- [ ] User playtest — verify mountain ranges, plateaus, hills

---

## Phase C: Water-Adjusted Moisture

**Goal:** Two-pass moisture: base noise → adjust near water → final classify.

- [ ] Split generation pass into: sample → provisional classify → adjust moisture → final classify
- [ ] Implement near-water moisture boost (radius-2 neighbor check)
- [ ] Reclassify terrain with adjusted moisture
- [ ] Run `python3 dev/check_imports.py` — must pass
- [ ] Run `python3 dev/check_analysis_imports.py` — must pass
- [ ] User playtest — verify coastal wetness, lake greenery

---

## Phase D: Rivers

**Goal:** Downhill river tracing with moisture boost.

- [ ] Add `traceRiver()` function
- [ ] Implement river source selection (high-elevation, high-moisture)
- [ ] Store `isRiver: true` on river tiles
- [ ] Apply moisture boost along river paths
- [ ] Add river config to `worldParams.js`
- [ ] Run `python3 dev/check_imports.py` — must pass
- [ ] Run `python3 dev/check_analysis_imports.py` — must pass
- [ ] User playtest — verify rivers flow downhill to water

---

## Phase E: Feature Density from Climate

**Goal:** Features spawn from continuous climate values, not terrain enum alone.

- [ ] Tree density scales with moisture and elevation
- [ ] Rocks more common on slopes / low moisture
- [ ] Fruit trees require moist + below-tree-line
- [ ] Replace density enum with continuous density value
- [ ] Run `python3 dev/check_imports.py` — must pass
- [ ] User playtest — verify gradual forest edges, varied density

---

## Phase F: Ridged Noise for Mountains

**Goal:** Add ridged FBM variant for sharp mountain ridges.

- [ ] Implement `ridgedFbm2D()` in `noise.js`
- [ ] Swap ridge layer from regular FBM to ridged FBM in elevation composite
- [ ] Run `python3 dev/check_imports.py` — must pass
- [ ] User playtest — verify sharper, more natural mountain ridges

---

## Phase G: Tuning & Polish

**Goal:** Iterate on parameters. Optional enhancements.

- [ ] Tune noise frequencies for common map sizes (R=7, R=21, R=50)
- [ ] Optional: domain warping on elevation
- [ ] Optional: new terrain types (beach, scrubland, tundra, taiga)
- [ ] Final playtest pass

---

## Notes

- Each phase checkmark = code written, import checks pass, ready for user testing.
- "User playtest" items are verification steps — the user tests and reports.
- Phases are ordered by dependency. A later phase can start before the previous phase's playtest feedback arrives if the code is isolated enough.
