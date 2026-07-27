Below is a structured critique. I've split it into things that will actually break, arithmetic that doesn't work, internal contradictions, and process gaps. The diagnosis in §1 is correct and the overall shape (fields → climate → biome → terrain) is right — most of the problems are in the details and in claims the architecture doesn't actually support.

---

## A. Architectural problems that will bite

**A1. Principle 4 (pure function of `(seed, q, r)`) is violated by three of your own passes.**
Rivers, water-type BFS, and epicenter region growth are all non-local. The document asserts determinism as a foundation and then adds global passes without reconciling them.

- **Rivers**: `RIVER_MAX_LENGTH = 200` on 24×24 chunks with a 3-wide ring. A river sourced in chunk A flows into chunk B; when B is generated independently it can't know. Worse, you *deliberately moved rivers before terrain classification* so they change moisture → terrain. That converts a cosmetic overlay into a seam-producing global dependency. Source selection is also global (`N = ceil(mapTileCount × fraction)` + deterministic shuffle), which is unimplementable chunk-locally.
- **`waterType` ocean vs lake** = "connects to the map boundary." That is a global connectivity query. It cannot be answered from a border ring of any fixed width, and "map boundary" is undefined for a streamed/infinite world.
- The `MAX_LOOKUP_RADIUS` block lists `3, // water-type BFS depth` — a fixed BFS depth does not compute connectivity. That comment is masking an unsolved problem.

**A2. `MAX_LOOKUP_RADIUS` uses `max()` where it needs a chained sum, and the prose contradicts the code.**
Prose says "currently 2"; the code computes 3. Neither is right. Trace the dependency chain: `terrain(x)` needs `slope(x)` (elevation ±1) **and** `moisture(x)` (water within 2 → elevation ±2). `mountainType(x)` needs `terrain(±1)` → elevation ±3. So the minimum is 3 *before* BFS, and the justification given for 3 is the wrong one. Also: "Ring hexes are fully classified (through provisional water)" contradicts "the ring provides real data for … mountain tagging, water BFS" — mountain tagging needs ring tiles to have *final terrain*, not provisional water. Document the radius as a chained sum with a comment per pass, and add a unit test that generates two adjacent chunks independently and asserts identical values on shared coordinates.

**A3. There is no phase that implements Pass 4b.**
The dependency graph (§12) and the file table (§14) contain nothing for epicenter noise, `applySupernaturalOverrides`, or the `origin` field. An entire pipeline pass, plus its data-model change, has no owner. Same for Pass 7 (structural tags) and the border-ring infrastructure itself — neither appears in the phase graph.

**A4. `radius` is an input to `sampleBaseFields`, so tiles are not stable under map growth.**
`temperature` depends on `radius`. Given the chunk-streaming roadmap in your references, this is a landmine: a world that grows changes the temperature (and therefore biome and terrain) of already-generated tiles. Either bake radius into the world seed permanently or replace latitude with a noise/world-space field now.

---

## B. Arithmetic that doesn't work

**B1. Temperature can never exceed 0.65, and most of the map clamps to 0.**
`0.50·lat + 0.15·noise − 0.40·elev`. At the rim (lat=0), elev=0.5, noise=0.5: `0 + 0.075 − 0.2 = −0.125 → 0`. At mid-radius: `0.125`. At dead centre: `0.375`. So the realized range is roughly [0, 0.4] with a large point mass at 0. `biome_lush`'s `minTemperature: 0.25` matches only near the map origin. Any `maxTemperature > 0.65` is dead code. The weights need to be a convex combination around 0.5, e.g. `clamp01(0.5 + 0.35(lat−0.5) + 0.10(noise−0.5) − 0.30(elev−seaLevel))`.

**B2. The elevation composite makes water and mountains essentially impossible.**
`0.60·c + 0.25·d + 0.15·r·c` with three FBM fields each roughly N(0.5, ~0.13) gives elevation ≈ N(0.46, ~0.085). Then:
- `waterMaxElevation = 0.07` is **4.6σ below the mean** → ~0.0002% water.
- `mountainThreshold = 0.905` is **5.2σ above** → zero mountains.
- `floatingIslandThreshold = 0.985` → never.

The map is 100% plains/forest/desert. This is the additive-vs-multiplicative issue: with `c = 0` (mid-ocean) you still get `0.25·d ≈ 0.125 > 0.07`, so the continent mask cannot produce ocean. Note also that §3's pipeline says `elevation = continentMask × (base + detail + ridges)` while §5's code is additive — **two different formulas in the same document**, and §3 lists four elevation layers (`continentMask`, `elevationBase`, `detail`, `ridges`) while the code and `rawLayers` have three. Pick the multiplicative/masked form if you want real coastlines.

**B3. Slope, as defined, measures high-frequency noise roughness, not topography.**
For an FBM with lacunarity 2 / gain 0.5, every octave contributes roughly equally to the *gradient*, so the mean neighbour-|Δ| is dominated by the finest octave. `plateauSlopeMin` and `hillSlopeMin` therefore become knobs on `NOISE_ELEVATION_DETAIL`'s top octave, not on whether a place is actually steep. Mountain-vs-plateau will come out as spatial noise sprinkled through the highlands rather than structure. Compute slope from a low-passed elevation (continent + ridge only), or as a finite-difference gradient magnitude over radius 2.

Related: `SLOPE_NORMALIZATION` is defined as the "95th-percentile *neighbour* delta" but is used to normalize the *mean of six* deltas — those are different statistics, and the mean will sit far below the 95th percentile of the individuals. Normalize against the distribution of the aggregate you actually compute.

**B4. `classifyTerrain` takes `temperature` and never uses it.**
Motivation §1.3 is "the classifier uses variables in isolation," and the new classifier still ignores temperature entirely — no snow line, no tundra, no frozen water, and `peak` ("snow-capped") is elevation-only. Temperature only affects biome selection, which is *disabled* in single-biome mode (§15). Also note mountains still ignore moisture, so root cause #3 is only half-addressed.

**B5. The "latitude correction" makes things worse, not better.**
`hexDistance(q,r,0,0)` is integer-valued and its iso-contours are **hexagons**, not circles. You'll get a hexagonal bullseye with sharp axis-aligned corners and quantized temperature rings. Straight latitude bands are the physically correct model for a map; the real bug in `Math.abs(r)/radius` was using axial `r` instead of world-space Y (row/column spacing differ). The fix is `hexToWorld(q,r).y / worldRadiusY`, optionally warped by very-low-frequency noise — which is also chunk-friendly and radius-independent (see A4).

**B6. River source density is off by 1–2 orders of magnitude.**
Coverage ≈ `RIVER_SOURCE_FRACTION × averageLength`. At 0.003 and an average length of even 50, that's **15% of all tiles are river**; at 200, 60%. You want ~1e-4 to 1e-5, or better: pick sources per unit *land area above the elevation threshold* and cap total river tiles.

---

## C. Internal contradictions

| Location | Contradiction |
|---|---|
| §3 Pass 2 vs §7.2 | "Oceans are pure elevation" vs `classifyTerrain` gating *all* water on `moisture > waterMinMoisture` (0.50). Half your ocean becomes salt flat, at sea level, adjacent to water. |
| §3 Pass 2 vs §7.2 | Provisional water (elevation only) ≠ final water (elevation + moisture). Which one feeds `nearWaterBoost`, the BFS, and river termination? Undefined for all three. |
| §5 vs §7.1 | `biome_default` is described as "no `climateRange`, therefore skipped" *and* "always last in priority, always matches." It's actually a hardcoded `return` — which quietly contradicts "no hardcoded thresholds / fully data-driven." |
| §7.1 | Region bias is applied *inside* `selectBiome` only. Pass 6 classifies with the **unbiased** moisture/temperature, so a hex can be assigned `biome_lush` on biased moisture 0.62 and then classified `desert` by that biome's own rules on unbiased 0.57. Apply the bias to the field in Pass 1/3. |
| Pass 4 vs Pass 6 | Biome is selected on pre-river moisture; terrain is classified on post-river moisture. Deliberate? Undocumented either way. |
| §3 Pass 6 vs §7.2 | Pass 6 passes `biomeDef.terrainRules`; the function signature expects `biomeDef` and does `biomeDef?.terrainRules`. |
| §7.3 vs §11 | The Brass Grave declares `terrainTags: ['brass']` and `terrainElevation: { brass: 0.10 }`, but `brass` is not in the terrain table and `classifyTerrain` has no mechanism to emit it. See E1. |
| §6 vs §7.1/§8 | "All noise parameters live in worldParams" — but the elevation composite weights (0.60/0.25/0.15), the temperature weights, the region-bias strength (0.10), `SLOPE_NORMALIZATION`, and the near-water boost magnitude/radius are all hardcoded elsewhere or missing entirely. |
| §5 | `ridges` is sampled with `hexFbm2D`, i.e. ordinary FBM, while Pass 1 says "ridged FBM." As written the ridge layer is just a third plain FBM. |

---

## D. The calibration strategy has a structural flaw

**D1. Calibrating thresholds once in Phase 0 doesn't survive Phases B and F.** Principle 7 says "adding or changing a noise layer triggers re-calibration," but the graph shows a single Phase 0 and then B (multi-scale elevation) and F (ridged noise) both change the elevation distribution. Every threshold set in A–E is invalidated. Calibration needs to be a re-runnable tool invoked at the end of each phase, and the graph should show the loop.

**D2. Rescaling thresholds is the wrong fix; normalize the fields instead.** Fit a CDF/quantile transform per field (a fixed lookup table baked from an ensemble of seeds) so every field is genuinely uniform on [0,1]. Then thresholds *are* percentiles, they're stable when you add a layer, they're readable ("mountain = top 5%"), and `climateRange` values in archetype data become meaningful. As it stands, §6 marks terrain rules as "percentile-calibrated" but the `climateRange` numbers authored in `biomes.js` are absolute and are never mentioned in the calibration plan — they'll silently break.

**D3. `clamp01` creates point masses that break percentile logic.** With the current temperature formula a large fraction of tiles sit at exactly 0; any threshold below that percentile is meaningless. Clamp only as a final safety, and construct the fields so clamping is rare.

**D4. Percentile-calibrated thresholds remove seed variety.** If sea level is "the 12th percentile," every map has exactly 12% ocean forever. No archipelago seeds, no pangaea seeds. Calibrate against the *ensemble* to get fixed constants, then add an explicit per-seed `seaLevelOffset` / `continentality` roll for variety.

---

## E. Extensibility claims that don't hold

**E1. "No pipeline code changes for either" is false for supernatural biomes.**
- Adding one requires "register it with the epicenter pass" — that *is* a pipeline change unless there's a data-driven registry (`epicenter: { threshold, frequency, minRadius }` on the archetype).
- `terrainRules` can only re-threshold *existing* terrain enums. It cannot introduce `brass`. You need a `terrainMap: { plains: 'brass', hill: 'brassDune' }` alias layer, or the ability for an archetype to supply its own classifier.
- Multiple supernatural biomes thresholding one shared epicenter field produce **concentric rings** (biome A as a halo around biome B), which is almost certainly not intended. Each needs its own seed, or you need a categorical hash to pick a type per epicenter.

**E2. Thresholded low-frequency FBM gives no control over event count.** "Target ~1–3 event regions" is not achievable by a threshold; you'll get 0 on some seeds and 7 on others, plus single-hex speckle at the contour. A jittered-grid / Poisson-disk point set with per-cell hashing gives you exact density, organic shapes via a noise-warped radial falloff, *and* chunk-locality. That also solves the "epicenter growth algorithm" deferred item up front rather than in Phase G.

**E3. Supernatural biomes will be palette swaps.** They override rules but not *fields*. A Brass Grave dropped in a wet temperate zone has the same elevation, moisture, slope and rivers as its surroundings. Give archetypes a field-modifier hook (crater elevation profile, moisture multiplier, temperature offset) applied before Pass 5, or they won't read as events. Also: nothing prevents an epicenter landing entirely in the ocean.

**E4. `BIOME_PRIORITY_ORDER` as a separate list is a second source of truth.** An archetype not added to the list silently never appears. Put `priority` on the archetype and add a startup assertion that every `type: 'biome'` archetype is present exactly once. Also drop supernatural biomes from a list that explicitly skips them — that's just confusing.

---

## F. Frequency/scale problems in §6

- **The frequencies are unusable until the hex→world question is resolved.** You flag this as TBD, but the whole table is built on it. Also decide whether you sample in axial space (which *shears* the noise ~30°) or convert to world space (and then rescale to keep it isotropic).
- **Continent frequency 0.0008 → wavelength ~1250 units.** If a unit ≈ a hex, one continent lobe is 1250 hexes across. For a 24×24-chunk world your entire map lies inside a fraction of one lobe: the continent mask degenerates to a near-constant offset, and every seed is "all land" or "all ocean." Same for `REGION` (0.0015, ~650 hexes) and `MOISTURE` (0.006, ~167 hexes — larger than several chunks, so moisture is effectively constant per chunk and biomes become vast monocultures). Macro frequencies should be expressed relative to map radius, not as absolute constants.
- **"Ridge and detail are now well-separated (~2.5×)" is not true once you account for octave spans.** Detail (4 octaves from 0.020) spans 0.020–0.16; ridge (3 octaves from 0.008) spans 0.008–0.032. They overlap in 0.020–0.032. Continent (0.0008–0.0032) overlaps region (0.0015–0.003). Principle 3's "each frequency band has a clear role" isn't upheld.
- **`TEMP_VARIATION` at 0.08 (≈12-hex wavelength) with weight 0.15** injects high-frequency noise directly into a *classification* input → salt-and-pepper biome boundaries and isolated single-hex tundra. That's the root cause of the "biome topological smoothing" item you deferred to Phase G. Make climate noise low-frequency and you won't need the smoothing pass.
- **Ecotones can't be smoothstepped.** The deferred item says "smoothstep blending over 2–3 hex transition zone" — you cannot interpolate an enum. What you actually want is domain-warping the classification inputs, or a per-hex hash dither on the threshold. The deferred item as written isn't actionable.

---

## G. Plan / process gaps

- **Phase A classifies before Phase B computes slope**, yet `classifyTerrain` needs slope for mountain/plateau/hill. So Phase A ships a stub classifier that Phase B rewrites — the file table confirms `terrainGenerator.js` is **rewrite** in both A and B, and `worldParams.js` is **rewrite** in both 0 and A. Consider merging A+B or doing elevation/slope first.
- **Phase F is not optional.** Thresholding a near-Gaussian additive field at the 95th percentile yields small round blobs, not ranges. Mountain aesthetics and the `mountainType: 'range'` tag are load-bearing on ridged noise. Treating F as "parallel, can run before or after" understates it.
- **Phase G is a dumping ground**, not a phase: rain shadow, ecotones, beaches, three new biomes, domain warping, the epicenter growth algorithm, supernatural tuning, biome smoothing, and infinite-map temperature. Several are load-bearing for features shipped earlier. Split it.
- **The file table is suspiciously small.** Adding `hill`, `plateau`, and `brass` touches every downstream consumer of the terrain enum: movement cost / pathfinding, rendering meshes, minimap colours, UI legend, save schema, per-biome palettes and `terrainElevation` in *every* archetype. None of these appear. Enumerate the consumers before Phase B.
  - Also: Phase E changes feature spawning to continuous density, but the density rules live in archetype `features: [...]` — and `biomes.js` is marked untouched in Phase E. The archetype format in §7.3 still shows static `threshold`/`compare` with no way to express "scales with moisture."
- **No validation strategy.** Given how much of this is statistical, you want, in CI: (1) a chunk-seam test; (2) a climate-cube coverage test that reports unmatched volume and each biome's realized share; (3) a terrain histogram assertion (nothing <0.5% or >40%) across N seeds; (4) golden-image regression. Phase 0 gives you histograms but no gates.
- **No performance budget.** Ring width 3 on 24×24 = 900 samples vs 576 (+56%), ×~7 FBM fields × up to 4 octaves ≈ 16k noise calls/chunk. Probably fine — but rivers are unbounded and the whole-map source scan isn't budgeted at all. Also `rawLayers` on *every* tile in the canonical schema is a real memory cost for large maps; make it debug-only/opt-in.

---

## H. Smaller issues

- `{ ...DEFAULT_TERRAIN_RULES, ...biomeDef?.terrainRules }` allocates per tile. Precompute merged rules per archetype.
- Seeds as `baseSeed + 100` etc. can collide across worlds (`seed=X+100` with `SEED_CONTINENT` ≡ `seed=X` with `SEED_DETAIL`) and, depending on your simplex implementation, adjacent integer seeds may produce correlated fields. Use `hash32(baseSeed ^ PRIME_k)`.
- `hexDistance(q, r, 0, 0)` assumes the map is centred on the origin. Verify against `chunkGrid`'s indexing convention.
- `distFromCenter / radius` exceeds 1 at the corners of a rectangular map → negative latitude, silently clamped.
- The desert branch is unbounded in elevation: a dry tile at elevation 0.90 (just under `mountainThreshold`) is classified `desert`. Above the tree line, wet tiles fall through to `plains` (no alpine/tundra type).
- Rivers: no sink filling, so on a smooth field most traces die at a local minimum in the middle of nowhere; no confluence/flow accumulation, so no width or ordering, and two rivers can run adjacent; `isRiver` on a `mountain` tile is impassable; `isRiver` on a `water` tile is meaningless.
- `RIVER_MOISTURE_BOOST = 0.10` against thresholds spaced 0.13 apart (`forest` 0.72 → `denseForest` 0.85) may or may not do anything — it depends entirely on the moisture σ that Phase 0 will measure. It's a pre-calibration constant that should be Phase-0-derived.
- Missing config entries entirely: near-water boost magnitude and radius, epicenter thresholds/radii, region-bias strength, elevation composite weights, temperature weights.
- `checkRange` misbehaves on `null` (`null !== undefined`, then `value < null` coerces). Use `min != null`.
- §5's "two adjacent chunks produce identical values at their shared hexes" — 24×24 chunks don't share hexes. The invariant you want is: a hex generated as a core tile of chunk A equals the same hex generated as a ring tile of chunk B.
- §15 doesn't say whether supernatural overrides apply in single-biome mode, and single-biome mode disables the very system Phase A delivers — if single-biome is the default launch path, Phase A ships largely untested.
- No mention of save-format versioning for the new tile schema.

---

## I. If I had to pick five things to change before writing code

1. **Resolve determinism first.** Decide whether rivers and lake/ocean tagging are chunk-local (and re-scope them accordingly: bounded-length rivers with chunk-local sources; ocean-by-depth-threshold rather than by connectivity) or accept a whole-map generation step and drop the chunk-seamless claim for those passes.
2. **Quantile-normalize every field** so all thresholds — including `climateRange` in archetype data — are true percentiles, and calibration is re-runnable after B and F.
3. **Fix the three formulas**: multiplicative continent mask, convex temperature combination centred on 0.5, and slope from low-passed elevation.
4. **Give Pass 4b a phase**, with a jittered-grid epicenter point set, a per-archetype `epicenter` data block, a `terrainMap` alias layer so supernatural biomes can emit new terrain names, and a field-modifier hook so they're more than palette swaps.
5. **Add the seam test and the climate-coverage test to Phase 0**, before anything depends on them.