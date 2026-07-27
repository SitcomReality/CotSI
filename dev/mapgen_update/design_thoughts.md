This is a well-structured document — the pass ordering, shared sampler, and archetype-as-rulebook framing are all sound. But there are several concrete problems, roughly in descending order of severity:

## Calibration problems (the design as written won't produce its stated output)

1. **The elevation composite and the terrain thresholds are on incompatible scales.** `elevation = continent*0.60 + detail*0.25 + ridges*0.15*continent` is a weighted sum of mean-~0.5 fields, so it concentrates around ~0.46. Reaching `mountainThreshold: 0.905` requires continent ≈0.92 *and* detail ≈0.8 *and* ridges ≈0.9 simultaneously — effectively never. `peak` (0.96) and `floatingIsland` (0.985) are dead terrain types as calibrated. Worse, in deep ocean (continent ≈ 0), elevation = `0.25 * detail`, mean ≈ 0.125 — which is *above* `waterMaxElevation: 0.07`. So most of your ocean basins aren't even eligible to be water, before the moisture gate (see #3). The doc has frequency calibration notes but no **amplitude/distribution budget**. Recommendation: derive all thresholds from measured percentiles (run the analysis tool over N seeds, set mountainThreshold = 97th percentile, etc.) rather than absolute constants. This also makes tuning robust when the composite formula changes.

2. **The frequency table's numbers don't match its "Role" column.** Assuming `hexFbm2D` uses q,r at ~unit hex spacing, wavelength = 1/frequency, and a radius-50 map is ~100 hexes across:
   - Continent at 0.0008 → 1250-hex wavelength → **0.08 cycles across the map**, not "2–4 major landmasses." Off by ~an order of magnitude or more.
   - Region at 0.0015 → 667-hex wavelength → a single gradient across the whole map, not "4–6 regions." On radius-7 it's a constant.
   - Detail at 0.015 → 67-hex features, not "~10–15 hex" local relief.
   
   Either verify that `hexFbm2D` rescales coordinates internally (and document that), or raise these frequencies ~5–25×.

3. **Water is gated on moisture noise, so oceans aren't guaranteed.** `elevation < 0.07 && moisture > 0.50` means a low basin in a dry noise blob becomes plains/desert/marsh — "dry ocean," the same class of incoherence the motivation section criticizes. Combined with #1, intended oceans will be ~95% dry land. The standard fix: sea level as an elevation-only percentile threshold for oceans; moisture influences *lakes* and coasts, not whether basins contain water.

4. **The slope normalization constant (0.3) is unjustified.** Adjacent-hex elevation deltas from these fields are on the order of hundredths, so `slope` will cluster in a narrow low band and `hillSlopeMin: 0.10` / `plateauSlopeMin: 0.08` will sit near its ceiling — likely "no hills, all high ground is plateau" or the reverse depending on actual FBM amplitude. Same cure as #1: calibrate against a measured slope histogram.

5. **The 1-hex border ring is too narrow.** Pass 3 looks up provisional water within radius 2; computing slope for ring tiles (needed for edge classification/tagging) requires ring-of-ring elevations. The ring width should be the max lookup radius across all passes — currently 2, and it should be stated as an invariant, not hardcoded.

## Design logic issues

6. **`regionBias` shifts moisture and temperature by the *same* delta.** A region can only be "wetter AND hotter" or "drier AND colder." This never biases toward arid (hot+dry) or tundra (cold+wet) — it mostly just modulates lush vs. default. Use two independent bias fields, or shift per-biome thresholds instead of the climate inputs.

7. **`rainShadow(elevation)` is undefined and can't work as written.** A rain shadow requires a wind direction and cross-wind elevation gradient; a pure function of local elevation is just an altitude dryness penalty. Either spec it properly (wind vector + upwind sampling) or cut it from the pipeline diagram until designed.

8. **River moisture boost happens after classification, so "fertile river valleys" is cosmetic.** Passes 4–5 (biome, terrain) already ran; the boost only affects features/debris. If rivers should green their valleys, either trace rivers before final classification (with a water-mask estimate for termination) or revise the deliverable claim.

9. **`selectBiome` has large coverage gaps and ignores elevation.** Cold+dry, and most of the temperate-mid range, fall through to `biome_default`, which will dominate the map. Alpine biomes (high elevation at any latitude) are unreachable except indirectly via lapse rate. Add explicit coverage of the climate space (even if the row is "default") and target biome fractions validated in the analysis tool.

10. **§4.1's text contradicts its formula.** The "key insight" is mask × detail, but the formula *adds* detail everywhere — so ocean floors get the same bumpiness as land, and coastline water/land transitions will be speckled by 0.25-amplitude detail noise (the "camouflage blotch" artifact, relocated to the coast). Consider `land = smoothstep(continent)` and lerping between ocean floor and land elevation.

11. **River sources assume elevation > 0.75 exists** (see #1 — it may not), and `RIVER_SOURCE_COUNT = 25` doesn't scale with map area (25 sources on a 169-tile radius-7 map).

## Internal inconsistencies (smaller)

- §4.3 scales `tempVariation` by 0.15; §7's sampler uses raw FBM at 0.5 weight. The comment "latitude dominates" is false in both versions — weights are equal.
- `adjustMoisture` and rivers check for `'ocean'`, but the classifier only ever emits `'water'` — clarify whether ocean is a terrain type or only a `waterType` tag from Pass 7.
- Phase A item 2 ("replace with continent×detail composite") duplicates Phase B item 1 ("implement 3-layer composite"). Phase A's deliverable also implicitly depends on B's work.
- The coastal bonus is a neighbor *count* within radius 2 — the comment "decays with distance" is wrong; distance-2 water counts the same as adjacent water.
- Output schema lists `rawElevation`; backward-compat section promises `rawElev`/`rawMoist`. Pick one.
- Marsh at elevation < 0.07 is unreachable (subset of the water rule) — fine, but note the effective marsh band is [0.07, 0.35].
- Biome-specific `terrainRules` create threshold discontinuities at biome borders (forest at moisture 0.58 abruptly ends at the lush/default boundary). Probably masked by the palette change, but worth a conscious decision.

## Suggested additions

- **A calibration workflow as an explicit phase (before Phase A):** histograms of elevation/moisture/temperature/slope in the analysis tool, with thresholds expressed as percentiles and snapshot-tested target distributions (% water, % mountain, biome fractions).
- **Property tests for the two hard invariants:** (a) same global hex sampled via two different chunk origins yields identical fields; (b) same seed → identical output. Given the border-ring machinery, (a) is where bugs will live.
- **Seeded tie-breaking in river descent** (weight lower neighbors probabilistically rather than always picking the lowest) to avoid straight rivers locked to hex axes.
- **Optional temperature→moisture coupling** (e.g., effective moisture reduced at high temperature) — cheap way to get savanna/hot-dry transitions and reduce "hot wet jungle everywhere near the equator."

The meta-issue underlying #1–#4 is that every threshold in the doc is an absolute constant with no stated relationship to the actual output distributions. Adding the distribution-budget step would catch most of these before implementation.