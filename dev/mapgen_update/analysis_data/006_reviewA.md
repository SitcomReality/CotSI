Great data — the tooling is genuinely good (land-vs-all moisture split, seam test, frequency verification, threshold derivation are all the right instruments). But almost every instrument is reading red, and the report presents them neutrally. Here's what I see.

---

## The headline: your fields are scale-locked, and that's backwards

Look at what the frequency verification is actually telling you. Note that `half-cycles` is mislabelled — the math works out to λ = mapWidth / half_cycles, so those numbers are **cycles across the map**:

| Field | Cycles across map (r=21 / 50 / 100) | Target |
|---|---|---|
| Ridge | 0.5 / 0.5 / 0.5 | ~8 at r=100 |
| Moisture | 1.5 / 1.5 / 1.5 | ~4–6 |
| Region bias | 1.0 / 1.0 / 1.0 | 4–6 (stated) |
| Detail | 1.0 / 1.0 / 2.5 | ~20 at r=100 |
| Temp variation | 3.0 / 6.5 / 14.5 | (only absolute field) |

Three fields are *perfectly* scale-locked — you're scaling frequency with radius so every map has the same number of features. That's the right instinct for continents and biome regions and completely wrong for local terrain. And the one field you left absolute is the one that should be smoothest.

Concretely:

- **Ridge noise at 0.5 cycles is a quarter-wave. It's a ramp.** It cannot produce a mountain chain at any map size, ever. Functionally it's acting as a per-seed elevation offset, which is why `test-alpha` has 16.5% water and 0.0% mountain while `test-beta` has 7.0% water and 2.8% mountain. Those aren't different worlds, they're the same world with the dial turned.
- **Moisture at 1.5 cycles = one wet blob and one dry blob.** That's your `denseForest` σ=3.00 on a mean of 2.6% at r=100 — variance that *should* have collapsed by law-of-large-numbers at 30k tiles but didn't, because the whole map is one sample.
- **Region bias at 1.0 cycle = one region.** The target in your own tool says 4–6. It has never hit it and, being scale-locked at 1.0, never will.
- **Detail is 3–10× too coarse.** Target "~10-hex local relief," measured 42–100 hexes.

The estimator is trustworthy where it has data — temperature at r=100 has 29 crossings and gives λ=13.8 vs 1/f=12.5, a 10% error. So `λ ≈ 1/f` is a valid mental model, and the rows reporting 1 crossing are simply unresolvable (and `λ=Infinity` for region at r=7 should be an error, not a number).

**The fix:** split the config into two classes.

```
ABSOLUTE (fixed frequency at every radius — a 10-hex hill is 10 hexes on every map)
  detail    λ≈10   → f≈0.10     (currently 0.008–0.03)
  ridge     λ≈25   → f≈0.04     (currently 0.003–0.015)
  moisture  λ≈50   → f≈0.02
  tempNoise λ≈40   → f≈0.025    (currently 0.08 — make it SMOOTHER, see below)

RELATIVE (scale with radius)
  worldShape/continent   λ ≈ 1.5–2 × mapWidth
  regionBias             λ ≈ mapWidth / 2.2   (≈2.2 cycles → ~5 regions in 2D)
```

Bigger maps should get *more* mountains, not *bigger* mountains.

---

## Consequence #1: slope is dead, and it takes hill/plateau/mountain with it

```
Slope p50 → r=7: 0.040   r=21: 0.000   r=50: 0.000   r=100: 0.000
Slope p99 → r=7: 0.100   r=21: 0.040   r=50: 0.020   r=100: 0.000
Quantile LUT: raw 0.10 → 1.0000 (saturated at the 10th percentile of the axis)
```

At r=100 the entire slope field is below the histogram's 0.02 bin. Your derived `SLOPE_NORMALIZATION` is **0.0133** against a doc value of 0.3 — you're dividing by 22× too much, so everything clamps to zero.

The gameplay result is a hard scale dependency:

| | r=7 | r=21 | r=50 | r=100 |
|---|---|---|---|---|
| Hill | 13.0% | 13.2% | 16.2% | **4.1%** |
| Plateau | 0.0% | 0.0% | 0.1% | **1.6%** |
| Plains | 8.2% | 10.5% | 15.3% | **26.1%** |
| Impassable | 3.1% | 1.3% | 2.5% | **0.9%** |

Plateau/mountain **inverts** between r=21 and r=100 — the slope threshold is straddling the noise floor, so which side you land on is decided by map size. And a radius-100 map is 26% plains + 21% desert + 16% forest with 0.9% impassable terrain: no chokepoints, no barriers, no strategic geography. Pathfinding is a straight line.

Fixing the frequencies fixes most of this automatically (local relief returns → slope becomes real). But also: **the 0.02 histogram bin is too coarse for slope** — you need ~0.002 bins or a log axis, or you're deriving a threshold from five buckets.

---

## Consequence #2: elevation lives in [0, 0.52] with a point mass at zero

```
Elevation  p10=0.000  p25=0.020  p50=0.080  p75=0.140  p90=0.240  p99=0.480
LUT: raw 0.10→0.6528   0.50→0.9936   0.90→1.0000
Derived: waterMaxElevation = 0.0000 (p12)
```

Three separate problems:

1. **`waterMaxElevation = 0.0000` is a degenerate output.** ≥10% of tiles are *exactly* zero (clamped), so you cannot place a p12 threshold — the derivation is returning the point mass. This is the clamp01 issue biting exactly where predicted. Water needs to come from somewhere other than a percentile of a clamped field.
2. **The top half of the range is unreachable**, and the LUT saturates: raw 0.50 and raw 0.90 both normalize to ~1.0. Mountain, peak, and floating island are indistinguishable in normalized space.
3. **The formula suppresses contrast.** `worldShape × (detail×0.5 + ridges×0.5)` — averaging two [0,1] fields *reduces* variance to σ/√2, then multiplying by worldShape (≤1) crushes it further. Median 0.08 is the arithmetic working as written.

Also note: **`peak` > `mountain` at every single radius** (r=100: 3.0% vs 0.9%; `test-alpha`: 3.0% peak, 0.0% mountain). If `peak` is checked before `mountain` on the same axis, peak must be a strict subset — this is geometrically impossible. Either the thresholds are inverted, `peak` is gated on something else (temperature? given "Frozen surface" exists), or the live config differs from what the derivation assumes.

Which brings me to a real tooling gap: **the report never echoes the config it measured with.** The "Derived Thresholds" block is an *output*, but the terrain distributions above it were produced by some *other*, unprinted set of thresholds. The two halves of the report can't be reconciled by a reader. Print the full active config (weights, formula, thresholds) at the top.

**Suggested fix for elevation:** renormalize the land distribution to span [0,1], then apply an explicit hypsometric curve (`pow`) so you control the shape directly rather than inheriting whatever the multiply produces. And don't let it clamp at zero — put the sea floor at a negative or use a separate ocean mask.

---

## Consequence #3: every map is the same island

`Formula: worldShape(dist, radius) × (detail×0.5 + ridges×0.5)`

The continent layer is gone — replaced by a deterministic radial function. So the coastline is a circle on every seed. Evidence:

- Water is 7.2–8.6% at every radius with tight σ (±3.13 at r=100).
- Elevation percentiles are near-identical across all four radii.
- **Champion spawns cluster in an annulus.** The r=100 top-15 are at hex distance 85–95 almost without exception (`-62,92`, `-68,94`, `86,-70`, `22,-92`, `-93,50`). That's not a placement bug — that's your circular coastline showing through. Fix the shape and the ring fixes itself.

Multiply `worldShape` by a low-frequency continent mask, or domain-warp the distance input. Otherwise the macro silhouette carries zero seed variety.

---

## The trader placement is a straight-up bug

```
r=7:   -6,1 (24.7%)  -6,2  -6,0  -6,5  -6,4  -5,0 ...
r=21:  -21,0 (18.3%) -21,2 -21,1 -19,0 ...
r=50:  -50,2 (13.8%) -50,0 -50,1 -47,0 ...
r=100: -100,1 (9.5%) -100,2 -100,0 -94,2 ...
```

Top-3 at **every** radius is `q = -radius`, `r ∈ {0,1,2,3}` — the exact west corner of the hex map, the first cell in a `for q = -R; q <= R` scan. This is first-match-wins in iteration order, or an argmax where ties are common and the first tie wins. The secondary cluster ~6% inboard (`-47`, `-94`) is where the corner is water on some seeds and it walks in one step.

Players will learn "walk west" on every single map. Unlike the champion ring, this one won't fix itself.

---

## Biomes: two problems, both structural

**Supernatural biomes are ~30% of the world.**

| Radius | brass_grave | unfinished_lands | Combined |
|---|---|---|---|
| 7 | **89.3%** | — | 89.3% |
| 21 | 30.2% | — | 30.2% |
| 50 | 19.1% | 18.1% | 37.2% |
| 100 | 10.9% | 20.1% | 31.0% |

A whole radius-7 map is one Brass Grave. This is thresholded-noise placement doing exactly what thresholded noise does — you cannot control region count or size with a threshold. It's also why `unfinished_lands` doesn't exist at all below r=50: content availability is a function of map size. Divine-war scars should be ~2–5% and 1–3 discrete sites. Move to a jittered-grid / Poisson point set with a noise-warped radial falloff; you get exact density, organic shapes, chunk-locality, and per-site type selection by hash (which also avoids the concentric-ring problem when two supernatural biomes share one field).

**The `biome_default` gap is the most common climate on the map.**

15–18% of tiles at every radius, and the samples are all `elev ≈ 0.02–0.06, moist ≈ 0.44–0.61` — dead centre of both distributions. The missing biome is *temperate lowland grassland*. Not an edge case; the single most ordinary place in the world has no archetype. With only three natural biomes (lush, frigid_silence, savanna) that's unsurprising, but it means one-sixth of every map is the fallback.

Also: the coverage report runs on **one seed** (`glut-17`). Given `test-alpha`/`beta`/`gamma` vary by 2.4× in water, biome shares almost certainly vary wildly too. Run it over the 1000-seed set and report mean ± σ per biome, plus the fraction of seeds where any biome is >40% or <1%.

---

## Temperature is nearly constant, and its noise is the only texture left

```
Temperature p10=0.520 ... p99=0.700 — identical at r=7, 21, 50, and 100
LUT: raw 0.10→0.0000  0.50→0.0369  0.90→1.0000
```

0.18 of total range, and the shape doesn't move at all with map size — the latitude term is contributing essentially nothing. No polar caps, no climate bands. So "Frozen surface" at 12–14% is being driven by `tempNoise` at λ=14 hexes hitting a hard threshold, which means it's **speckle**, not tundra. And `freezeTempMax = 0.54` sits 0.02 above p10 — one histogram bucket. That boundary will swing wildly on any config change.

At r=7 frozen is 23.8% ± 16.68 with max 60.4%, because a 14-hex-wide map is smaller than one wavelength of every field — each map is a single sample. Same story for desert at r=7 (23.1% ± 22.70, range 0→58%). **Radius 7 is not a viable map size with these frequencies.** Fixing the absolute/relative split helps; you may still want a minimum radius.

---

## Threshold derivation: three fixable methodology issues

1. **Derive from land-only distributions.** You already compute `Moisture (land)` — you're just not using it. All-tile moisture p50 = 0.50 vs land p50 = 0.38–0.44; the coastal boost inflates the wet tail with tiles that then get classified as water. Every moisture threshold is biased wet, and every elevation threshold is biased low by the ocean mass.
2. **Pooling across radii is dominated by r=100.** 1000×30301 vs 1000×169 — the r=7 maps contribute 0.4% of the sample. Given the terrain mix drifts so hard with radius, you're deriving "thresholds for r=100" and applying them everywhere. Derive per-radius first; if they differ materially, that's itself the finding.
3. **0.02 bins are too coarse.** Every derived threshold is quantized to 0.02, and `forestMinMoisture` (0.64) → `denseForestMinMoisture` (0.70) is a three-bucket band. Sort the samples and take exact quantiles.

---

## Tooling gaps worth closing

- **The seam test says `Radius: 21` under all four sections**, including "--- Radius 50 ---" and "--- Radius 100 ---". It's copy-pasted; seams are untested at 50 and 100. One seed, too.
- **The seam invariant excludes moisture, biome, terrain, and rivers.** It tests the two passes least likely to break and skips the ones most likely to.
- **The snapshot tolerance is uselessly wide** — it passes a seed with 16.5% water and 0.0% mountain *and* a seed with 7.0% water and 2.8% mountain. 16.5% is 2.7σ from the pooled r=21 mean. A test that can't fail isn't a test.
- **No spatial statistics.** Terrain % tells you nothing about whether the map *looks* like anything. 20% desert as one region and 20% as speckle are the same number. Add: mean/median patch size per terrain, count of size-1 patches, largest-patch fraction, and number of connected components. Given moisture λ = map width and temp λ = 14 hexes, I'd bet you have giant biome blobs with frozen confetti scattered over them — and nothing in this report would reveal that.
- **No cross-field correlations.** `corr(elevation, temperature)` should be strongly negative from the lapse rate. Is it? A 2D joint histogram of (elevation, moisture) with biome overlay would have shown the `biome_default` gap instantly.
- **Placement heatmaps need normalization.** Report concentration vs. uniform-over-*valid*-tiles (Gini, or KL divergence), so you can distinguish "placement bug" from "terrain availability." Right now the trader bug and the champion ring look similar in the output but have completely different causes.
- **Naming drift.** Snapshot says `mountain`/`peak`; pooled says "Impassable peaks"/"High peak". And "Frozen surface" isn't in the design doc's terrain table at all.

---

## What I'd fix, in order

1. **Split noise config into absolute and relative classes** and set frequencies from `f ≈ 1/λ_target`. This is one change that fixes slope, hill/plateau, mountain ranges, terrain scale-drift, and the r=7 variance blowout simultaneously.
2. **Fix the trader scan-order bug.** Smallest change, clearest player-facing win.
3. **Renormalize elevation** (kill the zero point-mass, span the range, apply an explicit hypsometric curve) and re-derive `waterMaxElevation` from something that isn't a clamped percentile.
4. **Add a low-frequency continent mask to `worldShape`** so coastlines vary per seed.
5. **Replace epicenter thresholding with a point-set** and add the missing temperate-lowland biome.
6. **Then re-run the whole battery** — everything above changes every distribution, and the derived thresholds in this report are already stale.

The one thing I'd add to the report before re-running: **echo the active config**, and add patch-size stats. Without those two you'll be in the same position next time — a page of numbers that can't be reconciled with the code that produced them.

# Developer's Note

## No continents

This review was provided by someone who hasn't seen the code and might assume the concept of "continents" is a core part of terrain generation.

Our maps are designed to be one contiguous landmass that all champions share and explore together, eventually having to confront and battle each other. We want our terrain gen system to be capable of creating a single continent/island surrounded by water, peaking in the center, or a crater that's surrounded by mountains around the edge, or just a land with its own organic topography.