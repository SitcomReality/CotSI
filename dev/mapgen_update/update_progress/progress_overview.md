# Mapgen Update Progress Tracking

Keep this file concise, used as an overview that points to more specific progress tracking files if necessary.

## Phase 0

Details in `phase0_progress.md`.

1. Frequency verification — **Done.**
2. Histogram collection — **Done.**
3. Quantile LUT builder — **Done.**
4. Calibration UI — **Done.**
5. Calibrate quantile LUTs — **Invalidated**
6. Derive threshold percentiles — **Done.**
7. Snapshot tests — **Done.**
8. Seam test — **Done.**
9. Climate coverage test — **Done.**
10. Wire tests into analysis page — **Done.**
11. Distributions tab in analysis page — **Done.**
12. Output calibration_v1.json — **Done.**
13. Re-run Phase 0 calibration after Phase B/F composite changes — **Deferred** (Phase B dependency).

**Key findings for future phases:**
- Continent mask removed from design — root cause of compressed elevation, zero slope, and calibration complexity. Replaced with explicit `worldShape(dist, radius)` function.
- Slope should now work directly from the additive composite without a dedicated micro-relief channel or low-pass filtering.
- Temperature range widened (~0.65 spread with new convex formula) — addressed in Phase A §4.3.
- Quantile LUTs from the old multiplicative composite are invalidated. Re-run calibration after Phase B with the additive composite.
- **`DEFAULT_TERRAIN_RULES` thresholds are uncalibrated.** Current values (0.12 water, 0.905 mountain, etc.) use placeholders from the old pipeline's elevation distribution. The single-FBM Phase A field has a different distribution — terrain-type percentages may be off-target. Recalibration deferred to Phase B when the full composite is in place.

## Phase A

Details in `phaseA_progress.md`.

1. Noise Config & Seed Offsets (`worldParams.js`) — **Done.**
2. `ice` terrain type added — **Done.**
3. `sampleBaseFields` migration to `terrainGenerator.js` — **Done.**
4. `selectBiome()` + `BIOME_PRIORITY_ORDER` — **Done.**
5. `classifyTerrain` rewrite (climate-aware, temperature/ice gates) — **Done.**
6. Biome archetype updates (`origin`, `climateRange`, `terrainRules`, remove `moistureBias`) — **Done.**
7. `generateChunkTiles` restructure (new pipeline wired in, dead code removed) — **Done.**
8. Epicenter system (jittered-grid supernatural biome placement, `biome_brass_grave`) — **Done.**
9. Analysis tool update (new tile fields, rewritten seam test, removed `enrichWithNoise`) — **Done.**
10. Remove old exports from `worldParams.js` (`NOISE_ELEVATION`, `NOISE_BIOME`, `NOISE_CHANNEL_*`, etc.) — **Done.**

**Complete.** Phase A delivers the climate-driven pipeline: `sampleBaseFields` → `selectBiome` → `classifyTerrain`, plus jittered-grid epicenters for supernatural biome placement. Elevation is still a single FBM field with ridges=0 and slope=0 — Phase B builds the multi-scale additive composite on top.

### Post-review refinements (2026-07-27)

After a full architecture review, the following were addressed in Phase A:

| Fix | Issue | Impact |
|-----|-------|--------|
| **`_noiseIsWater` passes real radius** | Hardcoded `9999` inflated polar temperature → water-type BFS misclassified cold water tiles | Correct lake/ocean typing on larger maps |
| **`biome_savanna` added** | Large climate gap at `{ m: 0.22–0.60, t: > 0.60 }` fell to `biome_default` | Climate space now has 4 natural biomes covering hot+dry → hot+transitional → wet+warm |
| **Supernatural field write-back** | `applySupernaturalOverrides` modified fields locally for `classifyTerrain` but didn't persist them on the tile | Downstream phases (C–E) now see modified climate on supernatural tiles |
| **`DEFAULT_THRESHOLDS` removed** | Dead code from old `resolveThresholds()` pipeline, removed in A7 | Cleanup — no consumers |
| **`classifyTerrain` accepts optional `slope`** | Phase B needs to add a `slope` parameter; this avoids a breaking signature change | Phase B can pass real slope without touching call sites |
| **Phase C pass reorder documented** | JSDoc on `generateChunkTiles` now notes that Phase C splits Pass 1 into multi-pass | Future implementer knows the plan |
| **`biome_brass_grave` has placeholder palette** | Empty palette meant Brass Grave tiles fell back to `biome_default` colours — invisible during testing | Brass Grave regions now render in distinct warm-metallic tones |

**Still pending (Phase B dependency):**
- Threshold values in `DEFAULT_TERRAIN_RULES` use placeholders matching old standalone constants. The elevation distribution changed (single additive FBM vs old multiplicative composite), so terrain percentages may be off-target. Recalibration deferred to Phase B when the full `worldShape × (detail + ridges)` composite is in place.

## Phase B

## Phase C

## Phase D

## Phase E

## Phase F

## Phase G
