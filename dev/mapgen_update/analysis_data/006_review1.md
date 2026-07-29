First off, huge congratulations on getting the Chunk-Seam Invariant tests to pass! Ensuring that elevation and temperature are pure, chunk-seamless functions is the hardest structural hurdle in hex-based infinite generation. The fact that moisture can be recomputed locally from base fields + neighbor water without breaking seams is a massive architectural win.

However, looking at the measurement data, there are several glaring numerical and logical anomalies. The calibration tool has essentially caught the system in the act of compromising its own design principles. Here are my thoughts and intuitions on what's going wrong:

### 1. The Trader Spawn Logic has a Massive Left-Edge Bias
This is the most immediately visible bug in the data. Look at the Trader heatmaps:
*   **Radius 7:** Top spawns are all at `q = -6` (the western edge of a radius-7 hex map).
*   **Radius 21:** Top spawns are at `q = -21`, `-19`, `-20`.
*   **Radius 50:** Top spawns are at `q = -50`, `-47`, `-46`.
*   **Radius 100:** Top spawns are at `q = -100`, `-94`, `-95`.

Traders are spawning almost exclusively on the left/western boundary of the map, and their probability drops off sharply as you move inward. This screams an off-by-one error or a bounds-clamping bug in the spawn algorithm. It's likely picking a random `q` in the range `[-radius, radius]`, failing a validation check (perhaps checking passability before `r` is properly bounded), and defaulting to the minimum `q` value (-radius) where it finds a safe edge tile. 

### 2. The "Broken Water" and `waterMaxElevation = 0.0` Paradox
The Threshold Derivation section calculates `waterMaxElevation: 0.0000 (p12, elevation)`. Yet, the terrain distribution shows 7-8% "Broken water". How can water exist if the threshold is 0.0?

Look at the Chunk-Seam formula provided: `worldShape(dist, radius) × (detail×0.5 + ridges×0.5)`. 
Noticeably absent from this formula is `clamp01()`. FBM noise (detail and ridges) naturally outputs values in the range `[-1, 1]`. If `worldShape` is a positive radial mask, multiplying it by a negative noise sum results in a **negative elevation**. 

Because `waterMaxElevation` is calibrated to 0.0, any hex where the noise dips slightly below 0 becomes water. Because this is driven by high-frequency detail noise rather than the low-frequency continent mask, you aren't getting oceans—you are getting thousands of tiny, scattered 1-hex ponds. Hence the terrain name "Broken water." 
**Fix:** You need to clamp the noise sum before applying the world shape, or shift the noise to a `[0, 1]` range. `waterMaxElevation` should realistically sit somewhere around `0.05` to `0.10` for coherent bodies of water.

### 3. Mountains are Vanishing Due to a Slope Mismatch
The snapshot tests show a bizarre distribution: `mountain=0.0%` while `peak=3.0%`. How can you have peaks but zero mountains? Furthermore, across all radii, `Plateau` sits at `0.0%`.

The issue lies in the Slope calibration. The derivation says: `Slope normalization: 0.0133 (95th percentile of per-tile avg deltas)`. 
But if you look at the Pooled Histograms for Slope, `p90 = 0.020` and `p99 = 0.100`. This means the *raw* average elevation delta is incredibly tiny. 

If your generation code is still using the design doc's hardcoded `SLOPE_NORMALIZATION = 0.3`, dividing these tiny raw deltas by 0.3 makes the final slope values microscopic. The `plateauSlopeMin` (0.08) and `hillSlopeMin` (0.10) thresholds are never reached. 
Because the slope never crosses the threshold, the terrain classifier hits `elevation > mountainThreshold` and returns `'plateau'`... but wait, Plateau is 0.0%! This implies there's a logic error in `classifyTerrain` where failing the slope check for a mountain causes it to fall through to the next block (Hills) rather than returning `'plateau'`. It gets classified as a Hill or Forest instead. 
**Fix:** Update the `SLOPE_NORMALIZATION` constant in the code to the derived `0.0133`. Verify that `elevation > mountainThreshold && slope <= plateauSlopeMin` strictly returns `'plateau'`.

### 4. Temperature is Dangerously Compressed
Look at the Temperature Pooled Histograms across all map sizes:
`p10 = 0.520 | p90 = 0.660`

The entire temperature range of your world spans a mere `0.14`. There are no real hot zones and no real cold zones. Because the `freezeTempMax` is derived at `0.5400 (p15)`, about 15% of the map just barely dips into "frozen," but you will never see a true "scorching desert" because the temperature literally cannot reach the high end of the biome climate ranges.

Why is this happening? Recall the formula: `latitudeTerm * 0.50 + tempVariation * 0.15 - elevation * 0.40`. 
If the base latitude term is supposed to go from `1.0` at the center to `0.0` at the edge, the center of the map should be pushing `0.50 + 0.075 - (small elevation penalty) = ~0.55`. This perfectly matches your p50 of 0.580. 
The problem is that the latitude term isn't scaling properly with the radius. If the game is treating `radius` as infinite or very large during these calculations, `1 - (dist / radius)` stays locked at `1.0` everywhere, flattening the latitude effect. 
**Fix:** You need to ensure the `radius` parameter in `sampleBaseFields` is actually the playable map radius, not a global/infinite constant. If it is the playable radius, the edges of the map should be dropping to near 0.0 temperature. The fact that p10 is 0.520 means the edges aren't getting cold.

### 5. Dynamic Frequency Scaling Breaks Physical Consistency
The Frequency Verification section reveals that the noise frequencies are changing depending on the map radius:
*   **Elevation Detail:** R7 uses freq 0.03, R21 uses 0.02, R50 uses 0.012, R100 uses 0.008.
*   **Ridge Noise:** R7 uses 0.015, R100 uses 0.003.

You are dynamically lowering the noise frequency as the map gets bigger. This is a massive anti-pattern. A hex should represent a fixed physical area. A mountain range should be the same width in hexes whether you are playing on a tiny map or a huge map. 

By scaling frequency with radius, a "hill" on a radius-7 map is a tiny bump, but a "hill" on a radius-100 map is a sprawling sub-continent. This makes gameplay scaling completely unintuitive and breaks the design principle of deterministic, scale-independent sampling. 
**Fix:** Pick a single frequency target (likely the R50 or R100 values, which actually match your "targets" better) and hardcode them in `worldParams.js`. A small map will simply show a cropped window of the infinite noise field.

### 6. The Climate Coverage Gap (`biome_default`)
On the larger maps, `biome_default` makes up 15-18% of all tiles. The sample coordinates tell a clear story:
`elev=0.02 to 0.05, moist=0.50 to 0.60`

This is the temperate coastal/flatland zone. Your `biome_lush` likely requires moisture > 0.60, and `biome_savanna` likely requires moisture < 0.50 or temperature > something. The exact middle of your moisture distribution (0.50) is falling into a gap. 
**Fix:** You don't necessarily need a new biome, but you should widen the `climateRange` of either `biome_lush` (down to 0.50 moisture) or `biome_savanna` (up to 0.60 moisture) for low elevations so this temperate band gets claimed by a proper archetype rather than the fallback.

### Summary of Next Steps
1. **Debug the Trader Spawner:** Fix the bounds/clamping issue pulling them to `q = -radius`.
2. **Fix the Elevation Formula:** Clamp the FBM noise so elevation doesn't go negative, allowing `waterMaxElevation` to float up to a natural p12 value (~0.05) and creating coherent oceans.
3. **Inject Calibration Constants:** Ensure the derived `0.0133` slope normalization is actually being used in the generation code, not the old `0.3` placeholder.
4. **Stop Scaling Frequency by Radius:** Lock the noise frequencies to fixed physical scales.
5. **Fix Latitude Falloff:** Ensure temperature actually drops at the edges of finite maps by verifying the `radius` parameter isn't being overwritten by an infinite-map fallback.