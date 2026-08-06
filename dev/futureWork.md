# Future Work & Deferred Items

Forward-looking tracker consolidated from three earlier documents
(`dev/auditBacklog.md`, `dev/mapgen_update/remaining_work.md`,
`dev/largeMapRoadmap.md`) in Aug 2026. It contains only work that is deferred,
still to be implemented, or worth keeping as future reference. Completed work —
including the audit backlog's finished phases §1–§8 — lives in git history, not
here.

---

## 1. Dev-tooling gating (deferred — from audit §2)

Dev tools ship in the prod build (there is no build step to strip them):

- `bootstrap.js` calls `enableAllMeasurements()` unconditionally — every named
  measurement runs `performance.mark/measure` on each render frame, hover, and
  pan in the shipped game.
- Gate dev tools behind `?dev=1`/localStorage: the `bootstrap.js` dev side-effect
  import, the `enableAllMeasurements()` call, `window.__perf`/`window.__devTools`
  exposure, and `panel/init.js` auto-init. ~17 dev-coupling imports across
  runtime/render/game become harmless without moving code. The capture harness
  itself (`frameProfiler.js`) is already properly gated behind explicit
  `startCapture`.

*Note:* The project is still in early development and these aren't immediate
concerns — right now the goal is expedient internal testing and iteration.

## 3. Optional structural follow-ups (from audit §3/§5)

- **Epicenter beach lookup chunk-seam inconsistency:** the chunk-local key→terrain
  index is O(1), but epicenter beach classification can differ across chunk seams
  — needs neighbor-chunk data to fully resolve. Documented deferred limitation.

## 4. Terrain-gen: tuning knobs & optional polish (from remaining_work.md)

### 4.1 Threshold recalibration

Target budgets for reference:

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

### 4.2 Biome topological smoothing (optional)

If playtesting shows single-hex biome speckles, apply a lightweight
outlier-reassignment post-pass: for each tile whose biome differs from all 6
neighbors AND the elevation difference is < 0.15 (no cliff), reassign to the
majority neighbor biome. Guard with elevation cliff detection to preserve genuine
transitions at mountain edges. Only implement if speckles are visibly
distracting.

### 4.3 Domain warping (optional)

If blob/camouflage noise artifacts persist after frequency tuning, apply
low-amplitude domain warping to elevation coordinates:

```js
const warpX = fbm2D(q * 0.02, r * 0.02, warpSeed) * 0.5;   // 0.5–1.5 hex units
const warpY = fbm2D(q * 0.02 + 100, r * 0.02 + 100, warpSeed) * 0.5;
// Use warped coords for main elevation FBM
```

Only if artifacts are visible after all other tuning.

### 4.5 Connectivity tuning

Spawn clearance and connectivity enforcement are implemented. Tune if needed:

- **`SPAWN_CLEARANCE_RING`** (default 2): reduce to 1 if clearings feel too
  large, increase to 3 if champions spawn next to impassable terrain.
- **Bridging terrain-cost weights**: water→marsh: 1, ice→plains: 1, mountain→hill:
  2, peak→hill: 4, floatingIsland: 100. Adjust if bridging produces unnatural
  corridors.
- **Water future-proofing**: when `TERRAIN[water].passable` becomes `true`
  (variable movement costs), connectivity auto-resolves through water — no
  bridging needed.

### 4.6 Frequency & composite weight tuning

Current frequencies target r=21. For other map sizes:

| Field | r=7 | r=21 (current) | r=50 |
|-------|-----|----------------|------|
| `ELEVATION_DETAIL` | 0.030 | 0.020 | 0.012 |
| `RIDGE` | 0.015 | 0.008 | 0.005 |
| `MOISTURE` | 0.010 | 0.006 | 0.004 |
| `REGION` | 0.004 | 0.0015 | 0.0008 |

Composite weights (`detail × W_D + ridges × W_R`, currently 0.50/0.50): adjust for
~30–40% of landmass with elevation variation, ~5–10% mountain/peak. Frequency
tuning should be visual ("do the landmasses look right?"), not algorithmic —
zero-crossing counting proved unreliable.

### 4.7 Feature density tuning

Phase E's density modulation changed effective spawn rates. Adjust each biome's
`features[].threshold` values so tree/bush/knot densities match intended feel.
Run feature spawn statistics across 10 seeds. (The fruit-tree fallthrough is
DONE: if the fruit-tree rule matches but the climate gate fails, the tile retries
the same roll against the remaining rules — covered by a regression test in
`tests/game/terrainGen.test.js`.)

### 4.8 Snapshot range tightening

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
