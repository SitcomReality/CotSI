=== Batch Analysis Report ===
Seeds: 500  |  Radii: 21, 50, 100

--- Radius 21 ---

Terrain distribution (mean % +/- stddev):
  Plains        37.0%  +/-14.71  (min 11.2%, max 73.3%)
  Forest         1.1%  +/- 1.44  (min 0.0%, max 6.9%)
  Deep wood      0.5%  +/- 0.59  (min 0.0%, max 3.2%)
  Desert        26.5%  +/- 7.97  (min 1.2%, max 42.2%)
  Marsh          0.1%  +/- 0.11  (min 0.0%, max 0.5%)
  Hill           0.0%  +/- 0.01  (min 0.0%, max 0.1%)
  Plateau        0.0%  +/- 0.00  (min 0.0%, max 0.0%)
  Impassable peaks   0.0%  +/- 0.00  (min 0.0%, max 0.0%)
  High peak      0.0%  +/- 0.00  (min 0.0%, max 0.0%)
  Floating isle   0.0%  +/- 0.00  (min 0.0%, max 0.0%)
  Broken water  34.8%  +/- 7.43  (min 18.2%, max 52.0%)
  Frozen surface   0.0%  +/- 0.01  (min 0.0%, max 0.1%)

Pooled Histograms (500 seeds × r=21):
  Elevation      p10=0.000  p25=0.040  p50=0.120  p75=0.240  p90=0.340  p99=0.500
  Moisture       p10=0.260  p25=0.340  p50=0.500  p75=0.640  p90=0.720  p99=0.800
  Temperature    p10=0.520  p25=0.540  p50=0.560  p75=0.600  p90=0.640  p99=0.700
  Slope          p10=0.000  p25=0.000  p50=0.000  p75=0.020  p90=0.020  p99=0.020

Frequency Verification:
  Elevation detail:
    config freq=0.02  octaves=4
    target: ~10-hex local relief
    zero-crossings=67  half-cycles=33.5
    effective λ=1wu  (~1.3 hexes)
  Ridge noise:
    config freq=0.008  octaves=3
    target: ~25-hex mountain chains
    zero-crossings=23  half-cycles=11.5
    effective λ=2wu  (~3.7 hexes)
  Moisture:
    config freq=0.006  octaves=4
    target: broad wet/dry bands
    zero-crossings=5  half-cycles=2.5
    effective λ=8wu  (~16.8 hexes)
  Temperature variation:
    config freq=0.08  octaves=1
    target: local temp noise
    zero-crossings=154  half-cycles=77.0
    effective λ=0wu  (~0.5 hexes)
  Region bias:
    config freq=0.003  octaves=3
    target: 4-6 biome regions on radius-50
    zero-crossings=2  half-cycles=1.0
    effective λ=21wu  (~42.0 hexes)

=== Snapshot Tests ===
Status: PASSED
Radius: 21  |  Seeds: 3

Seed "test-alpha" (1387 tiles):
  All distributions within tolerance.
  Measured: water=26.5%  mountain=0.0%  peak=0.0%  floatingIsland=0.0%

Seed "test-beta" (1387 tiles):
  All distributions within tolerance.
  Measured: water=45.0%  mountain=0.0%  peak=0.0%  floatingIsland=0.0%

Seed "test-gamma" (1387 tiles):
  All distributions within tolerance.
  Measured: water=22.6%  mountain=0.0%  peak=0.0%  floatingIsland=0.0%

=== Chunk-Seam Invariant Test ===
Status: PASSED
Seed: glut-17  |  Radius: 21
Invariant: elevationField & temperature are pure functions of (seed, q, r)
Moisture: adjusted (coastal boost) — recomputed from base fields + neighbor water
Formula: worldShape(dist, radius) × (detail×0.5 + ridges×0.5)

All tiles verified — stored fields match recomputed values.

=== Climate Coverage Report ===
Seed: glut-17  |  Radius: 21  |  Tiles: 1387

Biome distribution:
  biome_savanna: 483 tiles (34.8%)
  biome_brass_grave: 419 tiles (30.2%)
  biome_lush: 377 tiles (27.2%)
  biome_default: 108 tiles (7.8%)

biome_default tiles: 108 (coverage gaps)
Sample (elevationField, moisture) coordinates:
  (-11,0)  elev=0.2632  moist=0.6046
  (8,0)  elev=0.3286  moist=0.6169
  (9,-12)  elev=0.1764  moist=0.3395
  (10,-12)  elev=0.1818  moist=0.3469
  (10,-11)  elev=0.2073  moist=0.3544
  (10,-10)  elev=0.2367  moist=0.3608
  (10,-6)  elev=0.2469  moist=0.3928
  (10,-5)  elev=0.2553  moist=0.4062
  (11,-12)  elev=0.1830  moist=0.3539
  (11,-11)  elev=0.2084  moist=0.3598
  ... and 98 more

Note: Biome assignment is climate-driven with epicenter overrides.
biome_default tiles here are climate gaps or fallout from epicenter regions.
Gaps indicate climate zones with no natural biome match.

--- Radius 50 ---

Terrain distribution (mean % +/- stddev):
  Plains        39.3%  +/- 7.94  (min 18.1%, max 60.1%)
  Forest         2.9%  +/- 1.92  (min 0.1%, max 8.4%)
  Deep wood      0.9%  +/- 0.75  (min 0.0%, max 3.9%)
  Desert        21.6%  +/- 6.48  (min 5.3%, max 38.2%)
  Marsh          0.1%  +/- 0.16  (min 0.0%, max 0.9%)
  Hill           0.0%  +/- 0.01  (min 0.0%, max 0.1%)
  Plateau        0.0%  +/- 0.00  (min 0.0%, max 0.1%)
  Impassable peaks   0.0%  +/- 0.00  (min 0.0%, max 0.0%)
  High peak      0.0%  +/- 0.00  (min 0.0%, max 0.0%)
  Floating isle   0.0%  +/- 0.00  (min 0.0%, max 0.0%)
  Broken water  35.2%  +/- 4.98  (min 24.1%, max 55.2%)
  Frozen surface   0.0%  +/- 0.03  (min 0.0%, max 0.2%)

Pooled Histograms (500 seeds × r=50):
  Elevation      p10=0.020  p25=0.040  p50=0.120  p75=0.220  p90=0.340  p99=0.520
  Moisture       p10=0.240  p25=0.340  p50=0.480  p75=0.640  p90=0.740  p99=0.840
  Temperature    p10=0.520  p25=0.540  p50=0.560  p75=0.600  p90=0.640  p99=0.700
  Slope          p10=0.000  p25=0.000  p50=0.000  p75=0.000  p90=0.000  p99=0.000

Frequency Verification:
  Elevation detail:
    config freq=0.02  octaves=4
    target: ~10-hex local relief
    zero-crossings=408  half-cycles=204.0
    effective λ=0wu  (~0.5 hexes)
  Ridge noise:
    config freq=0.008  octaves=3
    target: ~25-hex mountain chains
    zero-crossings=62  half-cycles=31.0
    effective λ=2wu  (~3.2 hexes)
  Moisture:
    config freq=0.006  octaves=4
    target: broad wet/dry bands
    zero-crossings=41  half-cycles=20.5
    effective λ=2wu  (~4.9 hexes)
  Temperature variation:
    config freq=0.08  octaves=1
    target: local temp noise
    zero-crossings=871  half-cycles=435.5
    effective λ=0wu  (~0.2 hexes)
  Region bias:
    config freq=0.003  octaves=3
    target: 4-6 biome regions on radius-50
    zero-crossings=18  half-cycles=9.0
    effective λ=6wu  (~11.1 hexes)

=== Snapshot Tests ===
Status: PASSED
Radius: 21  |  Seeds: 3

Seed "test-alpha" (1387 tiles):
  All distributions within tolerance.
  Measured: water=26.5%  mountain=0.0%  peak=0.0%  floatingIsland=0.0%

Seed "test-beta" (1387 tiles):
  All distributions within tolerance.
  Measured: water=45.0%  mountain=0.0%  peak=0.0%  floatingIsland=0.0%

Seed "test-gamma" (1387 tiles):
  All distributions within tolerance.
  Measured: water=22.6%  mountain=0.0%  peak=0.0%  floatingIsland=0.0%

=== Chunk-Seam Invariant Test ===
Status: PASSED
Seed: glut-17  |  Radius: 21
Invariant: elevationField & temperature are pure functions of (seed, q, r)
Moisture: adjusted (coastal boost) — recomputed from base fields + neighbor water
Formula: worldShape(dist, radius) × (detail×0.5 + ridges×0.5)

All tiles verified — stored fields match recomputed values.

=== Climate Coverage Report ===
Seed: glut-17  |  Radius: 50  |  Tiles: 7651

Biome distribution:
  biome_lush: 2477 tiles (32.4%)
  biome_brass_grave: 2343 tiles (30.6%)
  biome_savanna: 2343 tiles (30.6%)
  biome_default: 481 tiles (6.3%)
  biome_arid: 7 tiles (0.1%)

biome_default tiles: 481 (coverage gaps)
Sample (elevationField, moisture) coordinates:
  (-26,-21)  elev=0.0219  moist=0.6141
  (-25,-17)  elev=0.0605  moist=0.6181
  (-23,-13)  elev=0.1189  moist=0.6140
  (-22,-16)  elev=0.0913  moist=0.6144
  (-22,-15)  elev=0.1006  moist=0.6143
  (-30,5)  elev=0.2872  moist=0.6080
  (-28,-11)  elev=0.1098  moist=0.6158
  (-24,-12)  elev=0.1276  moist=0.6141
  (-24,4)  elev=0.3411  moist=0.6020
  (-22,9)  elev=0.3467  moist=0.5932
  ... and 471 more

Note: Biome assignment is climate-driven with epicenter overrides.
biome_default tiles here are climate gaps or fallout from epicenter regions.
Gaps indicate climate zones with no natural biome match.

--- Radius 100 ---

Terrain distribution (mean % +/- stddev):
  Plains        42.9%  +/- 5.04  (min 29.4%, max 58.5%)
  Forest         3.1%  +/- 1.49  (min 0.1%, max 6.7%)
  Deep wood      0.9%  +/- 0.79  (min 0.0%, max 4.2%)
  Desert        18.0%  +/- 4.09  (min 8.9%, max 32.1%)
  Marsh          0.1%  +/- 0.15  (min 0.0%, max 1.0%)
  Hill           0.0%  +/- 0.00  (min 0.0%, max 0.0%)
  Plateau        0.0%  +/- 0.04  (min 0.0%, max 0.4%)
  Impassable peaks   0.0%  +/- 0.00  (min 0.0%, max 0.0%)
  High peak      0.0%  +/- 0.01  (min 0.0%, max 0.1%)
  Floating isle   0.0%  +/- 0.00  (min 0.0%, max 0.0%)
  Broken water  34.9%  +/- 6.73  (min 13.7%, max 51.6%)
  Frozen surface   0.0%  +/- 0.01  (min 0.0%, max 0.1%)

Pooled Histograms (500 seeds × r=100):
  Elevation      p10=0.020  p25=0.060  p50=0.140  p75=0.240  p90=0.340  p99=0.520
  Moisture       p10=0.300  p25=0.380  p50=0.480  p75=0.600  p90=0.680  p99=0.800
  Temperature    p10=0.520  p25=0.540  p50=0.560  p75=0.600  p90=0.640  p99=0.700
  Slope          p10=0.000  p25=0.000  p50=0.000  p75=0.000  p90=0.000  p99=0.000

Frequency Verification:
  Elevation detail:
    config freq=0.02  octaves=4
    target: ~10-hex local relief
    zero-crossings=1604  half-cycles=802.0
    effective λ=0wu  (~0.2 hexes)
  Ridge noise:
    config freq=0.008  octaves=3
    target: ~25-hex mountain chains
    zero-crossings=444  half-cycles=222.0
    effective λ=0wu  (~0.9 hexes)
  Moisture:
    config freq=0.006  octaves=4
    target: broad wet/dry bands
    zero-crossings=346  half-cycles=173.0
    effective λ=1wu  (~1.2 hexes)
  Temperature variation:
    config freq=0.08  octaves=1
    target: local temp noise
    zero-crossings=3481  half-cycles=1740.5
    effective λ=0wu  (~0.1 hexes)
  Region bias:
    config freq=0.003  octaves=3
    target: 4-6 biome regions on radius-50
    zero-crossings=105  half-cycles=52.5
    effective λ=2wu  (~3.8 hexes)

=== Snapshot Tests ===
Status: PASSED
Radius: 21  |  Seeds: 3

Seed "test-alpha" (1387 tiles):
  All distributions within tolerance.
  Measured: water=26.5%  mountain=0.0%  peak=0.0%  floatingIsland=0.0%

Seed "test-beta" (1387 tiles):
  All distributions within tolerance.
  Measured: water=45.0%  mountain=0.0%  peak=0.0%  floatingIsland=0.0%

Seed "test-gamma" (1387 tiles):
  All distributions within tolerance.
  Measured: water=22.6%  mountain=0.0%  peak=0.0%  floatingIsland=0.0%

=== Chunk-Seam Invariant Test ===
Status: PASSED
Seed: glut-17  |  Radius: 21
Invariant: elevationField & temperature are pure functions of (seed, q, r)
Moisture: adjusted (coastal boost) — recomputed from base fields + neighbor water
Formula: worldShape(dist, radius) × (detail×0.5 + ridges×0.5)

All tiles verified — stored fields match recomputed values.

=== Climate Coverage Report ===
Seed: glut-17  |  Radius: 100  |  Tiles: 30301

Biome distribution:
  biome_lush: 12035 tiles (39.7%)
  biome_savanna: 9634 tiles (31.8%)
  biome_brass_grave: 6678 tiles (22.0%)
  biome_default: 1880 tiles (6.2%)
  biome_arid: 74 tiles (0.2%)

biome_default tiles: 1880 (coverage gaps)
Sample (elevationField, moisture) coordinates:
  (-97,56)  elev=0.0106  moist=0.6102
  (-64,-29)  elev=0.0316  moist=0.6329
  (-52,-15)  elev=0.1451  moist=0.6320
  (-47,-17)  elev=0.1763  moist=0.6322
  (-41,-20)  elev=0.1781  moist=0.6344
  (-60,34)  elev=0.1774  moist=0.6075
  (-56,29)  elev=0.1931  moist=0.6069
  (-52,21)  elev=0.2265  moist=0.6117
  (-44,14)  elev=0.3538  moist=0.6024
  (-44,15)  elev=0.3470  moist=0.6106
  ... and 1870 more

Note: Biome assignment is climate-driven with epicenter overrides.
biome_default tiles here are climate gaps or fallout from epicenter regions.
Gaps indicate climate zones with no natural biome match.

=== Threshold Derivation ===
  500 seeds × radii [21, 50, 100]

Derived Thresholds (raw values at target percentiles):

  waterMaxElevation            0.0200  (p12, elevation)
  mountainThreshold            0.3400  (p90, elevation)
  peakThreshold                0.4600  (p97, elevation)
  floatingIslandThreshold      0.5600  (p99.5, elevation)
  hillElevationMin             0.1400  (p55, elevation)
  marshMaxElevation            0.0800  (p35, elevation)
  forestMinMoisture            0.6000  (p72, moisture)
  denseForestMinMoisture       0.6600  (p85, moisture)
  desertMaxMoisture            0.3400  (p20, moisture)
  marshMinMoisture             0.5200  (p58, moisture)
  freezeTempMax                0.5200  (p15, temperature)

Slope normalization:  0.0138  (95th percentile of per-tile avg deltas)

Quantile LUT sanity (raw → normalized):
  Elevation      raw:0.10→0.4415  0.50→0.9866  0.90→1.0000
  Moisture       raw:0.10→0.0009  0.50→0.5422  0.90→1.0000
  Temperature    raw:0.10→0.0000  0.50→0.0854  0.90→1.0000
  Slope          raw:0.10→1.0000  0.50→1.0000  0.90→1.0000

---
Thresholds are raw values at the target percentile of the pooled
distribution. They remain stable when Phases B/F change the composite.
Only the quantile LUTs need regeneration after those phases.