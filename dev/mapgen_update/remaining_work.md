# Terrain Generation — Remaining Work & Future Reference

The terrain generation redesign is substantially complete. The pipeline now produces climate-driven biomes from a multi-scale elevation composite (detail + ridged FBM × world shape), with slope discrimination, water-adjusted moisture, downhill rivers, continuous feature density, and two supernatural epicenter biomes. Spawn clearance and connectivity enforcement are implemented.

This document captures what remains and preserves design notes worth keeping.

---

## 1. Threshold Recalibration

Target budgets for reference (from Phase 0):

| Terrain | Budget |
|---------|--------|
| Water | 8–15% |
| Mountain | 5–10% |
| Peak | 1–3% |
| Floating island | 0–1% |
| Forest | 15–25% |
| Desert | 8–15% |
| Marsh | 3–8% |
| Hill | 10–18% |
| Plateau | 3–8% |

---

## 2. New Terrain Type: Beach

**Done:** Land tiles adjacent to water reclassified as `beach` with new `TERRAIN` in `terrainTypes.js`:

---

## 3. New Biomes: Tundra (Done)

**Added `biome_tundra`** — cold + wet climate zone with `maxTemperature: 0.35`, `minMoisture: 0.60`. Includes a decorative Snowperson feature (non-functional, two-sphere mesh).

---

## 4. Biome Topological Smoothing (Optional)

If playtesting shows single-hex biome speckles, apply a lightweight outlier-reassignment post-pass:

For each tile whose biome differs from all 6 neighbors AND the elevation difference is < 0.15 (no cliff), reassign to the majority neighbor biome. Guard with elevation cliff detection to preserve genuine transitions at mountain edges.

Only implement if speckles are visibly distracting.

---

## 5. Domain Warping (Optional)

If blob/camouflage noise artifacts persist after frequency tuning, apply low-amplitude domain warping to elevation coordinates:

```js
const warpX = fbm2D(q * 0.02, r * 0.02, warpSeed) * 0.5;   // 0.5–1.5 hex units
const warpY = fbm2D(q * 0.02 + 100, r * 0.02 + 100, warpSeed) * 0.5;
// Use warped coords for main elevation FBM
```

Only if artifacts are visible after all other tuning.

---

## 6. Rain Shadow

A stub exists in `src/game/rules/terrainGen/classification/moistureAdjustment.js` — `computeRainShadow()` returns 0.

Either implement: sample upwind elevation (wind direction: `{q: -1, r: 0}`, check distances 1–3), if upwind average > local elevation by at least 0.2, apply drying effect `(elevDiff - 0.2) × 0.3`. Apply in moisture pass: `moisture = clamp01(baseMoisture + coastalBoost - rainShadow)`.

Or document as permanently deferred with rationale.

---

## 7. Supernatural Biome Tuning

**Mostly done:** Supernatural biomes are pretty good at the moment.

---

## 8. Connectivity Tuning

Spawn clearance and connectivity enforcement are implemented. Tune if needed:

- **`SPAWN_CLEARANCE_RING`** (default 2): Reduce to 1 if clearings feel too large, increase to 3 if champions spawn next to impassable terrain.
- **Bridging terrain-cost weights**: water→marsh: 1, ice→plains: 1, mountain→hill: 2, peak→hill: 4, floatingIsland: 100. Adjust if bridging produces unnatural corridors.
- **Water future-proofing**: When `TERRAIN[water].passable` becomes `true` (variable movement costs), connectivity auto-resolves through water — no bridging needed.

---

## 9. Frequency & Composite Weight Tuning

Current frequencies target r=21. For other map sizes:

| Field | r=7 | r=21 (current) | r=50 |
|-------|-----|----------------|------|
| `ELEVATION_DETAIL` | 0.030 | 0.020 | 0.012 |
| `RIDGE` | 0.015 | 0.008 | 0.005 |
| `MOISTURE` | 0.010 | 0.006 | 0.004 |
| `REGION` | 0.004 | 0.0015 | 0.0008 |

Composite weights (`detail × W_D + ridges × W_R`, currently 0.50/0.50): adjust for ~30–40% of landmass with elevation variation, ~5–10% mountain/peak.

Frequency tuning should be visual ("do the landmasses look right?"), not algorithmic — zero-crossing counting proved unreliable in Phase 0.

---

## 10. Feature Density Tuning

Phase E's density modulation changed effective spawn rates. Adjust each biome's `features[].threshold` values so tree/bush/knot densities match intended feel. Run feature spawn statistics across 10 seeds.

Also address the **fruit-tree fallthrough**: if the fruit tree rule matches the noise roll but the climate gate (`canSpawnFruitTree`) fails, the tile gets `feature: null` — lower-priority rules (bush, etc.) don't get a chance. Add rule retry logic.

---

## 11. Snapshot Range Tightening

Once thresholds are recalibrated, tighten the intentionally wide snapshot ranges:

| Terrain | Wide (current) | Tight (target) |
|---------|----------------|----------------|
| Water | 6–20% | 8–15% |
| Mountain | 3–15% | 5–10% |
| Peak | 0–5% | 1–3% |
| Floating island | 0–2% | 0–1% |
| Forest | 0–100% | 15–25% |
| Desert | 0–100% | 8–15% |
| Marsh | 0–100% | 3–8% |

---

## 12. Known Limitations (Post-G)

These are explicitly deferred past the current tuning phase:

| Item | Notes |
|------|-------|
| Ecotone blending (smooth biome transitions) | Smoothstep at boundaries; nontrivial without breaking determinism |
| Player terraforming | Requires modification overlay on deterministic base |
| River tributaries and meandering | Current simple downhill trace is adequate for v1 |
| Endorheic lake formation at river termini | Dead-end rivers at local minima are acceptable |
| Supernatural biome gameplay mechanics | Design-dependent, not generation-dependent |
| Quantile LUT normalization in runtime | Thresholds are absolute values tuned against raw distributions |

---

## Design Notes for Future Reference

### Calibration is re-runnable
`dev/analysis.html` has a "Derive Thresholds" button and "Run Tests" button. Any change to noise output distributions (composite changes, new layers) requires regenerating calibration data. Thresholds remain stable percentiles if/when LUT normalization is added.

### Per-phase normalization
The additive composite naturally spans [0, 2] (two fields summed), divided by 2 for [0, 1]. When ridged FBM replaced regular FBM, the formula was unchanged — only LUTs needed regeneration. Same pattern applies to any future noise layer additions.

### Frequency separation
Detail (0.020) and ridge (0.008) layers are separated by ~2.5×. New layers should maintain comparable separation from existing ones.

### Slope normalization gotcha
`SLOPE_NORMALIZATION` uses the 95th-percentile of aggregate per-tile mean delta (sum of 6 neighbor deltas / 6), not individual deltas. Using the wrong statistic causes slope values to cluster near 0.

### Supernatural biome pattern
To add a supernatural biome:
1. Define archetype with `origin: 'supernatural'` and `epicenter` config
2. Add to `SUPERNATURAL_BIOMES` list
3. No `climateRange` (never selected by climate)
4. `fieldModifiers` alter local environment before terrain classification
5. No pipeline code changes needed

### Testing
The analysis tool runs snapshot, seam, and climate coverage tests in-browser via "Run Batch Analysis". Distribution histogram view with threshold overlay lines. All browser-based — no Node.js dependency.
