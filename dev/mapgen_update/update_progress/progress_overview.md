# Mapgen Update Progress Tracking

This file is a checklist for tracking progress in the update plan described in `dev/mapgen_update/overview.md`.

Detailed information about specific steps can be stored in `phase*_progress.md` if it might be pertinent to subsequent updates.

## Phase 0

Details in `phase0_progress.md`.

**Complete.**

## Phase A

Details in `phaseA_progress.md`.

**Complete.** Phase A delivers the climate-driven pipeline with jittered-grid epicenters. Elevation is still a single FBM field — Phase B builds the multi-scale additive composite.

**Threshold calibration:** Percentile-derived thresholds from 500-seed × 3-radius batch analysis applied to `DEFAULT_TERRAIN_RULES`. Slope discrimination thresholds (plateauSlopeMin, hillSlopeMin) and waterMinMoisture also tuned from the same batch data. See `dev/mapgen_update/analysis_data/batchanalysis_2026-07-28_23-28.md`.**

## Phase B

Details in `phaseB_progress.md`.

**Complete.** Phase B delivers the 2-layer additive elevation composite (detail + ridges × worldShape), slope-based mountain/plateau/hill discrimination, border ring sampling (no `fallbackT`), and updated analysis tool fields.

## Phase C

**Complete.** Phase C delivers elevation-based water classification, coastal moisture boost, `baseMoisture` stored alongside adjusted `moisture`, and analysis tool visualisation for both raw and adjusted moisture fields.

## Phase D

Details in `phaseD_rivers.md`.

1**Complete.**

## Phase E

Details in `phaseE_feature_density.md`.

**Complete.**

## Phase F

Details in `phaseF_ridged_noise.md`.

1. Add `ridgedFbm2D(x, y, seed, opts)` — ridged FBM producing sharp crests by taking `|noise|`, inverting, and squaring each octave — **src/engine/rules/noise.js** — **Done.**
2. Add `hexRidgedFbm2D(q, r, seed, opts)` — hex-coordinate convenience wrapper around `ridgedFbm2D` — **src/engine/rules/noise.js** — **Done.**
3. Add `offset: 0.9` field to `NOISE_RIDGE` config — shifts ridge baseline lower to reduce low-elevation ridge noise on flat terrain — **src/params/game/worldParams.js** — **Done.**
4. Swap ridge layer in `sampleBaseFields` from `hexFbm2D` to `hexRidgedFbm2D` — **sampleBaseFields.js** — **Done.**
5. Update barrel exports from `noise.js` to include new ridged functions — **noise.js** — **Done.**
6. Run Phase 0 calibration: regenerate quantile LUTs and elevation distribution for the new ridged composite — **calibration pipeline** — **Done. (250-seed × 3-radius batch analysis, 2026-07-29 — thresholds applied.)**
7. Update snapshot test tolerances if needed to pass with shifted elevation distribution — **snapshot tests** — **Done. (Tests pass within existing tolerances.)**
8. Verify: mountain ranges have sharp ridge crests visible in elevation overlay, elevation histogram reflects new distribution, snapshot tests pass after recalibration

## Phase G
