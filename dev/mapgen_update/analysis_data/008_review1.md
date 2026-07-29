Yes — several things make my game-dev sense tingle. Some are “tuning” issues, but a few look like structural/procedural-generation bugs where I’d pause feature work until they’re understood.

Ignoring the trader spawn issue, the biggest red flags are:

---

## 1. Chunk-seam invariant failures are the loudest alarm

The chunk-seam tests failing across almost every radius/seed is the thing I’d investigate first.

Examples:

```txt
(-100,0) baseMoisture: stored=0.71177709  recomputed=0.58568608
```

That is not tiny floating-point drift. That’s a materially different climate value.

Possible causes:

- field generation depends on **chunk-local coordinates** somewhere instead of world coordinates
- normalization/min-max scaling is being done **per chunk** or per generated region
- a post-processing pass mutates stored tiles but the invariant test recomputes only the “pure” generator
- neighbor-dependent calculations like slope/moisture smoothing are missing an apron/buffer at chunk edges
- generation order differs between batch/full-map and on-demand chunk generation

The radius 21 failures are especially interesting:

```txt
stored="plains" recomputed="hill"
stored="plains" recomputed="forest"
stored="plains" recomputed="desert"
```

That pattern — stored is repeatedly `plains` while recomputed is more specific — smells like one of:

- spawn/safe-zone clearing forcibly converting tiles to plains
- fallback/default terrain being stored before all passes complete
- a postprocessor flattening areas but not included in recomputation
- cached/stored terrain from an earlier config

If those are intentional post-generation mutations, the test may need to compare against the correct generation stage. But if not intentional, this could explain a lot of weird downstream behavior.

**Priority:** very high. Until this is fixed, distribution stats may be partially untrustworthy.

---

## 2. Your noise is much smoother than the comments/targets imply

The frequency verification is screaming that your intended scales and actual scales don’t match.

Example at radius 50:

```txt
Elevation detail target: ~10-hex local relief
effective λ = ~200 hexes
```

At radius 100:

```txt
Ridge noise target: ~25-hex mountain chains
effective λ = ~400 hexes
Moisture target: broad wet/dry bands
effective λ = ~400 hexes
```

That means your “detail” layer is behaving more like a continental macro-shape layer. This likely explains:

- very large terrain blobs
- low slope values
- huge connected peak/floating-island regions
- terrain distributions varying strongly by map radius
- r7/r21 maps being dominated by one climate regime

The config also scales frequencies downward as radius increases:

```txt
Elevation freq:
r7   0.03
r21  0.02
r50  0.012
r100 0.008
```

That means larger maps get smoother, not more detailed. Usually I’d expect the opposite structure:

- keep local terrain detail frequency mostly fixed in world units
- add separate lower-frequency macro layers for continent/biome shaping
- do not make mountains/hills/plains depend entirely on a radius-scaled macro field

Otherwise a radius 100 map becomes one enormous gentle sheet with only a few mega-blobs.

---

## 3. Slope looks functionally broken or over-smoothed

This is one of the biggest numerical weirdnesses:

```txt
Radius 50 Slope:
p10=0.000 p25=0.000 p50=0.000 p75=0.000 p90=0.000 p99=0.020

Radius 100 Slope:
p10=0.000 p25=0.000 p50=0.000 p75=0.000 p90=0.000 p99=0.000
```

Yet your terrain rules include:

```txt
plateauSlopeMin = 0.4
hillSlopeMin    = 0.25
Slope Normalization = 0.02
```

And derived slope normalization:

```txt
Slope normalization: 0.0133
Quantile LUT sanity:
Slope raw:0.10→1.0000 0.50→1.0000 0.90→1.0000
```

This suggests slope is either:

- computed from a heavily quantized/rounded elevation field
- computed after clamping many elevation values to 0
- normalized in a way that saturates too easily
- using too-smooth fields due to the frequency issue
- being reported after rounding that hides meaningful variation
- not computed consistently between radii

This likely explains:

```txt
Plateau 0.0% at r7/r21
Plateau 0.1% at r50
Hill 16.2% at r50 but only 4.1% at r100
```

If slope is supposed to create hills/plateaus, I’d inspect that pipeline closely.

---

## 4. Elevation appears heavily clamped/compressed

Elevation histograms show a lot of exact/near-zero values:

```txt
Radius 7:
Elevation p10=0.000 p25=0.000 p50=0.080

Radius 21:
Elevation p10=0.000 p25=0.020 p50=0.080

Radius 50:
Elevation p10=0.000 p25=0.020 p50=0.060

Radius 100:
Elevation p10=0.000 p25=0.020 p50=0.080
```

That’s not necessarily wrong, but combined with:

```txt
waterMaxElevation = 0.016
marshMaxElevation = 0.06
hillElevationMin = 0.08
mountainThreshold = 0.26
```

…it means a lot of terrain classification is happening inside a very narrow elevation band.

The quantile LUT sanity also shows:

```txt
Elevation raw:0.10→0.6565
Elevation raw:0.50→0.9937
Elevation raw:0.90→1.0000
```

So raw elevation `0.5` is basically “near maximum elevation” in practice. That may be fine if intentional, but the names/thresholds imply a 0–1-ish field while the actual useful domain seems closer to 0–0.5, with most land under 0.2.

This can be okay, but it makes thresholds brittle and hard to reason about.

---

## 5. Mountains/peaks look oddly classified

Snapshot failures include:

```txt
test-alpha:
mountain 0.0%
peak     3.0%

test-epsilon:
mountain 0.0%
peak     0.0%
```

At radius 21 aggregate:

```txt
Mountain 1.2% +/- 1.23
High peak 2.3% +/- 2.05
```

It’s a little weird for `peak` to often exceed `mountain`, depending on how you conceptualize those. Usually I’d expect:

- hills common
- mountains less common
- peaks as a subset/capstone of mountains

If peaks are separate terrain, that’s fine, but visually/gameplay-wise this could create “peak blobs” with not enough surrounding mountain foothills.

The spatial stats reinforce this:

```txt
peak patches=1.09 at r21, largest=99.5%
peak patches=1.44 at r50, largest=95.6%
peak patches=1.61 at r100, largest=95.3%
```

That means peaks are usually one giant contiguous patch, not scattered high points/ridges. Same for floating islands:

```txt
floatingIsland largest=97–100%
```

That feels suspicious. Floating islands especially probably should not generally form one mega-patch unless that is the intended “one broken skyland continent” behavior.

---

## 6. Desert is suspiciously dominant at small/medium radii

Radius 21:

```txt
Desert mean 31.9% +/- 12.99
min 6.1%, max 61.1%
```

Snapshot examples:

```txt
test-gamma desert 42.1%
test-epsilon desert 48.6%
```

Radius 7:

```txt
Desert mean 23.8% +/- 22.39
min 0.0%, max 58.6%
```

That variance is huge. Some small maps are basically not desert; some are mostly desert.

The confusing bit is this:

```txt
desertMaxMoisture = 0.14
```

But moisture histograms say:

```txt
Radius 21 Moisture p10=0.260 p25=0.340
Radius 21 Moisture land p10=0.200 p25=0.260
```

If desert were purely “moisture < 0.14”, you would not expect 30–60% desert. So either:

- biome rules are forcing desert terrain independently of moisture
- moisture is transformed before terrain classification
- desert classification is using a different moisture field
- thresholds are applied after density/normalization in a non-obvious way
- Brass Grave/Scorch/Sere-style biomes are overwriting terrain to desert

Not necessarily wrong, but the threshold name then becomes misleading. If desert is a biome-forced terrain, I’d separate “climatic desert” from “biome terrain palette produced desert.”

---

## 7. Ice/frozen surface looks overrepresented

Snapshot tests repeatedly fail ice:

```txt
test-alpha ice 12.0% out of range [0%, 7%]
test-beta  ice 11.3%
test-delta ice 9.2%
```

Aggregate:

```txt
r7   Frozen surface 25.1% +/-17.42
r21  Frozen surface 12.3% +/-4.79
r50  Frozen surface 13.9% +/-3.75
r100 Frozen surface 14.4% +/-2.07
```

Your snapshot range says 0–7%, but your actual generator seems to want 12–14% on real-sized maps and up to 25% on tiny maps.

So either:

- the tests are stale/too strict
- `freezeTempMax = 0.54` is too warm
- temperature is too compressed
- the frigid biome is over-applying frozen terrain
- map radius 7 is too small for global climate expectations

Temperature distribution is narrow:

```txt
Temperature mostly 0.52–0.70
```

With `freezeTempMax = 0.54`, a small numerical shift can freeze a large chunk of the map. I’d either widen the temperature range or lower the freeze threshold.

---

## 8. Radius dependence is very strong

Terrain distributions change a lot with radius:

```txt
Plains:
r7   8.2%
r21 10.5%
r50 15.3%
r100 25.9%

Hill:
r7  12.3%
r21 12.7%
r50 16.2%
r100 4.1%

Desert:
r7  23.8%
r21 31.9%
r50 18.1%
r100 20.6%

Frozen:
r7  25.1%
r21 12.3%
r50 13.9%
r100 14.4%
```

Some radius dependence is expected, especially for tiny maps, but this is a lot.

The likely culprit is the radius-specific frequency config. Because the same generator behaves differently depending on requested radius, balance and tests become hard. A faction starting on radius 21 may experience a very different ecology/resource map from radius 100.

I’d strongly consider making world-space noise scale independent of generated radius.

---

## 9. Plains and forest patch stats suggest “residual terrain” artifacts

Radius 100:

```txt
plains patches=20.87
plains singletons=6.32
plains mean=426.83
plains med=10.1
plains largest=64.3%
plains gini=0.8804

forest patches=12.53
forest singletons=3.07
forest mean=489.93
forest med=12.4
forest largest=89.9%
forest gini=0.8773
```

High mean but tiny median plus huge Gini usually means:

- one or two enormous regions
- many tiny scraps/singletons
- not many satisfying mid-sized patches

That can be okay for “plains as filler,” but visually it can feel blobby plus speckled. If plains are supposed to be a coherent terrain type, you may want a cleanup pass:

- remove singletons
- merge tiny patches into dominant neighbor
- apply biome-level terrain palettes first, then local variation second
- use cellular/region noise for biome masks and higher-frequency noise for tile detail

---

## 10. Biome default coverage may be higher than intended

Climate coverage:

```txt
r21 biome_default 11.2%
r50 biome_default 22.1%
r100 biome_default 18.5%
```

This line matters:

```txt
biome_default tiles here are climate gaps or fallout from epicenter regions.
Gaps indicate climate zones with no natural biome match.
```

If Default is meant to be a real baseline biome, this is fine.

If Default is meant as “fallback because nothing matched,” then 18–22% fallback is quite high. The sample default tiles are mostly reasonable mid-climate zones:

```txt
low/mid elevation, moisture around 0.5–0.6
```

That might mean your specialized biomes do not cover ordinary temperate middle ground well enough. Which may be okay if Default is “ordinary countryside.” But I’d distinguish:

- `biome_default` intentionally selected
- `biome_fallback_default` due to no biome match

Those should be reported separately.

Also, your current design list says biomes like:

- Default
- Brass Grave
- Scorch
- Painforest
- Sere Wastes
- Frigid Silence
- Mourning Marsh
- Unfinished Lands

But the report has:

```txt
biome_lush
biome_savanna
biome_arid
```

That may just be internal naming, but if not, it suggests the data/reporting and design taxonomy have drifted.

---

## 11. Champion spawns are less bad than traders, but still patterned at small radii

Ignoring traders, champion spawn heatmaps still show concentration at r7/r21.

Radius 7:

```txt
top champion hex 25.0%
second 22.0%
```

Radius 21:

```txt
top champion hex 8.4%
```

Radius 50/100 look much healthier:

```txt
r50 top 2.2%
r100 top 1.4%
```

So this may be acceptable for small maps, but the r7 concentration is high enough that I’d check whether spawn selection uses deterministic candidate ordering without sufficient per-seed tie-breaking.

Common cause:

```txt
candidates.sort(score)
pick first valid candidate
```

If many seeds produce similar score landscapes, the same coordinates win. Better:

```txt
sort by score + seeded jitter
or
sample weighted by score
or
shuffle candidates before tie resolution
```

Again, not as severe as the trader issue, but worth noting.

---

## 12. Snapshot tests may be too rigid for radius 21

The snapshot failures are useful, but some of the expected ranges may no longer match the generator’s actual design.

Example:

```txt
ice expected [0%, 7%]
actual mean at r21 = 12.3%
```

If 500-seed aggregate says ice is naturally around 12%, the snapshot range is stale.

Similarly:

```txt
desert expected [10%, 30%]
actual mean at r21 = 31.9%, max 61.1%
```

That range is almost right on the mean, so lots of seeds will fail.

I’d have separate thresholds for:

- smoke tests: “not catastrophically broken”
- balance tests: “within desired distribution”
- radius-specific expectations
- small-map exceptions

Right now the tests may be catching real issues, but they’re also mixing tuning opinions with structural failures.

---

# My suggested investigation order

If I were debugging this, I’d do it in this order:

## 1. Fix or explain the chunk-seam invariant failures

Before tuning anything else.

Break the comparison into stages:

```txt
raw noise fields
normalized fields
climate fields
biome assignment
base terrain
postprocessed terrain
spawn-safe terrain
final terrain
```

Then compare stage-to-stage. This will reveal whether mismatches are actual seam bugs or expected postprocessing.

---

## 2. Verify all procedural fields use world coordinates

Especially moisture and elevation. The boundary-heavy mismatches at:

```txt
-r, 0
-r, 1
-r, 2
...
```

strongly suggest coordinate-space or chunk-edge behavior.

---

## 3. Rework noise scale separation

Use separate layers for:

- continental/macro elevation
- mountain/ridge masks
- local elevation detail
- local slope/roughness detail
- biome-region bias

Do not scale local relief frequency down just because map radius increases.

---

## 4. Recheck slope using unrounded raw elevation

Make sure slope is calculated from continuous elevation, before display rounding and before severe clamping. Then tune `hillSlopeMin`, `plateauSlopeMin`, and `slopeNormalization` from real distributions.

---

## 5. Decide whether desert/ice are climate terrain or biome-forced terrain

Right now the reported thresholds do not intuitively explain the terrain output. That may be fine, but the report should separate:

```txt
desert from arid climate
desert from Brass Grave terrain palette
desert from Scorch/Sere biome override
```

Same for frozen surface.

---

## 6. Add terrain cleanup / patch smoothing

Especially for plains, forest, marsh, and denseForest. The patch stats suggest you may have huge blobs plus tiny speckles.

A simple cleanup pass can improve visual quality a lot:

- remove one-tile terrain islands
- convert tiny patches below N tiles to dominant neighbor terrain
- preserve special terrain like knots/peaks/water if desired
- run only after core terrain assignment

---

# Short version

The most interesting/noteworthy things are:

1. **Chunk-seam invariant failures look serious.**
2. **Noise frequencies are producing much larger features than intended.**
3. **Slope appears nearly dead at larger radii.**
4. **Desert and ice are overrepresented relative to stated thresholds/tests.**
5. **Peaks/floating islands are forming single giant patches.**
6. **Terrain distributions vary strongly by map radius.**
7. **Default biome coverage may be masking climate-rule gaps.**
8. **Champion spawns are patterned on small maps, though not as bad as traders.**

The data definitely has useful signal. My strongest instinct is: don’t tune feature placement yet. First make the raw world fields deterministic/seamless, then fix scale/slope, then revisit terrain and biome thresholds.