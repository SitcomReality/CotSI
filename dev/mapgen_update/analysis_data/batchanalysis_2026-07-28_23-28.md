=== Batch Analysis Report ===
Seeds: 500  |  Radii: 21, 50, 100

--- Radius 21 ---

Terrain distribution (mean % +/- stddev):
  Plains        14.9%  +/- 4.98  (min 5.3%, max 31.7%)
  Forest         8.1%  +/- 3.51  (min 0.9%, max 18.5%)
  Deep wood      4.3%  +/- 1.93  (min 0.6%, max 9.4%)
  Desert        10.0%  +/- 4.07  (min 0.6%, max 23.6%)
  Marsh          1.3%  +/- 1.42  (min 0.0%, max 7.4%)
  Hill          48.1%  +/- 8.80  (min 26.5%, max 61.1%)
  Plateau        0.0%  +/- 0.00  (min 0.0%, max 0.0%)
  Impassable peaks   1.4%  +/- 1.77  (min 0.0%, max 8.4%)
  High peak      0.6%  +/- 0.95  (min 0.0%, max 4.1%)
  Floating isle   0.1%  +/- 0.31  (min 0.0%, max 1.8%)
  Broken water   4.1%  +/- 1.20  (min 1.4%, max 8.9%)
  Frozen surface   6.9%  +/- 3.20  (min 2.7%, max 21.2%)

Champion spawn heatmap (top 15 hexes by seed count):
      10,1  52/500  (10.4%)
      1,11  49/500  (9.8%)
     -8,-5  49/500  (9.8%)
    12,-10  45/500  (9.0%)
     2,-11  45/500  (9.0%)
      11,1  45/500  (9.0%)
     10,-8  44/500  (8.8%)
     11,-9  42/500  (8.4%)
      1,10  41/500  (8.2%)
       9,1  41/500  (8.2%)
      1,12  40/500  (8.0%)
    -10,15  40/500  (8.0%)
     -9,12  40/500  (8.0%)
    -11,14  40/500  (8.0%)
     -16,8  40/500  (8.0%)

Pooled Histograms (500 seeds × r=21):
  Elevation      p10=0.000  p25=0.040  p50=0.120  p75=0.240  p90=0.340  p99=0.500
  Moisture       p10=0.260  p25=0.340  p50=0.500  p75=0.640  p90=0.720  p99=0.800
  Temperature    p10=0.520  p25=0.540  p50=0.560  p75=0.600  p90=0.640  p99=0.700
  Slope          p10=0.000  p25=0.000  p50=0.000  p75=0.020  p90=0.020  p99=0.020

Frequency Verification:
  Elevation detail:
    config freq=0.02  octaves=4
    target: ~10-hex local relief
    zero-crossings=28  half-cycles=14.0
    effective λ=2wu  (~3.0 hexes)
  Ridge noise:
    config freq=0.008  octaves=3
    target: ~25-hex mountain chains
    zero-crossings=29  half-cycles=14.5
    effective λ=1wu  (~2.9 hexes)
  Moisture:
    config freq=0.006  octaves=4
    target: broad wet/dry bands
    zero-crossings=7  half-cycles=3.5
    effective λ=6wu  (~12.0 hexes)
  Temperature variation:
    config freq=0.08  octaves=1
    target: local temp noise
    zero-crossings=151  half-cycles=75.5
    effective λ=0wu  (~0.6 hexes)
  Region bias:
    config freq=0.003  octaves=3
    target: 4-6 biome regions on radius-50
    zero-crossings=31  half-cycles=15.5
    effective λ=1wu  (~2.7 hexes)

=== Snapshot Tests ===
Status: FAILED
Radius: 21  |  Seeds: 3

Seed "test-alpha" (1387 tiles):
  FAIL: water: 4.6% out of range [6%, 50%]
  Measured: water=4.6%  mountain=0.0%  peak=1.2%  floatingIsland=0.0%

Seed "test-beta" (1387 tiles):
  FAIL: water: 3.5% out of range [6%, 50%]
  Measured: water=3.5%  mountain=2.3%  peak=0.3%  floatingIsland=0.0%

Seed "test-gamma" (1387 tiles):
  FAIL: water: 3.5% out of range [6%, 50%]
  Measured: water=3.5%  mountain=0.0%  peak=0.0%  floatingIsland=0.0%

=== Chunk-Seam Invariant Test ===
Status: PASSED
Seed: glut-17  |  Radius: 21
Invariant: elevationField & temperature are pure functions of (seed, q, r)
Moisture: adjusted (coastal boost) — recomputed from base fields + neighbor water
Formula: worldShape(dist, radius) × (detail×0.5 + ridges×0.5)

All tiles verified — stored fields match recomputed values.

=== Climate Coverage Report ===
Seed: glut-1685  |  Radius: 21  |  Tiles: 1387

Biome distribution:
  biome_brass_grave: 424 tiles (30.6%)
  biome_frigid_silence: 301 tiles (21.7%)
  biome_lush: 282 tiles (20.3%)
  biome_default: 272 tiles (19.6%)
  biome_savanna: 108 tiles (7.8%)

biome_default tiles: 272 (coverage gaps)
Sample (elevationField, moisture) coordinates:
  (-21,11)  elev=0.0000  moist=0.3902
  (-19,3)  elev=0.0310  moist=0.5978
  (-21,12)  elev=0.0000  moist=0.3783
  (-21,13)  elev=0.0000  moist=0.3666
  (-21,14)  elev=0.0000  moist=0.3549
  (-20,12)  elev=0.0145  moist=0.3722
  (-20,13)  elev=0.0144  moist=0.3593
  (-20,14)  elev=0.0139  moist=0.3465
  (-20,15)  elev=0.0133  moist=0.3339
  (-19,13)  elev=0.0258  moist=0.3519
  ... and 262 more

Climate cells covered only by biome_default: 4
  elev [0.5, 0.6]  moist [0.6, 0.7]  (1 tiles)
  elev [0.1, 0.2]  moist [0.4, 0.5]  (25 tiles)
  elev [0.2, 0.3]  moist [0.5, 0.6]  (14 tiles)
  elev [0.1, 0.2]  moist [0.5, 0.6]  (18 tiles)

Note: Biome assignment is climate-driven with epicenter overrides.
biome_default tiles here are climate gaps or fallout from epicenter regions.
Gaps indicate climate zones with no natural biome match.

--- Radius 50 ---

Terrain distribution (mean % +/- stddev):
  Plains        13.0%  +/- 4.29  (min 3.0%, max 26.8%)
  Forest         8.2%  +/- 3.04  (min 0.8%, max 19.3%)
  Deep wood      2.0%  +/- 1.76  (min 0.2%, max 9.9%)
  Desert         9.8%  +/- 3.22  (min 2.3%, max 23.6%)
  Marsh          1.5%  +/- 0.84  (min 0.1%, max 5.1%)
  Hill          47.7%  +/- 4.62  (min 29.5%, max 59.8%)
  Plateau        0.0%  +/- 0.00  (min 0.0%, max 0.0%)
  Impassable peaks   3.2%  +/- 1.70  (min 0.0%, max 9.0%)
  High peak      1.3%  +/- 1.16  (min 0.0%, max 4.2%)
  Floating isle   0.6%  +/- 0.72  (min 0.0%, max 2.8%)
  Broken water   3.2%  +/- 1.00  (min 1.3%, max 8.5%)
  Frozen surface   9.5%  +/- 3.00  (min 3.1%, max 19.7%)

Champion spawn heatmap (top 15 hexes by seed count):
   -22,-11  13/500  (2.6%)
      29,3  12/500  (2.4%)
    31,-24  12/500  (2.4%)
    30,-22  12/500  (2.4%)
     33,-3  12/500  (2.4%)
   -19,-16  11/500  (2.2%)
    34,-26  11/500  (2.2%)
      26,5  11/500  (2.2%)
    -38,19  11/500  (2.2%)
   -19,-18  11/500  (2.2%)
      29,1  11/500  (2.2%)
      4,28  11/500  (2.2%)
   -20,-17  11/500  (2.2%)
      1,34  10/500  (2.0%)
    -20,33  10/500  (2.0%)

Pooled Histograms (500 seeds × r=50):
  Elevation      p10=0.020  p25=0.040  p50=0.120  p75=0.220  p90=0.340  p99=0.520
  Moisture       p10=0.240  p25=0.340  p50=0.500  p75=0.640  p90=0.740  p99=0.840
  Temperature    p10=0.520  p25=0.540  p50=0.560  p75=0.600  p90=0.640  p99=0.700
  Slope          p10=0.000  p25=0.000  p50=0.000  p75=0.000  p90=0.000  p99=0.000

Frequency Verification:
  Elevation detail:
    config freq=0.02  octaves=4
    target: ~10-hex local relief
    zero-crossings=300  half-cycles=150.0
    effective λ=0wu  (~0.7 hexes)
  Ridge noise:
    config freq=0.008  octaves=3
    target: ~25-hex mountain chains
    zero-crossings=87  half-cycles=43.5
    effective λ=1wu  (~2.3 hexes)
  Moisture:
    config freq=0.006  octaves=4
    target: broad wet/dry bands
    zero-crossings=31  half-cycles=15.5
    effective λ=3wu  (~6.5 hexes)
  Temperature variation:
    config freq=0.08  octaves=1
    target: local temp noise
    zero-crossings=860  half-cycles=430.0
    effective λ=0wu  (~0.2 hexes)
  Region bias:
    config freq=0.003  octaves=3
    target: 4-6 biome regions on radius-50
    zero-crossings=75  half-cycles=37.5
    effective λ=1wu  (~2.7 hexes)

=== Snapshot Tests ===
Status: FAILED
Radius: 21  |  Seeds: 3

Seed "test-alpha" (1387 tiles):
  FAIL: water: 4.6% out of range [6%, 50%]
  Measured: water=4.6%  mountain=0.0%  peak=1.2%  floatingIsland=0.0%

Seed "test-beta" (1387 tiles):
  FAIL: water: 3.5% out of range [6%, 50%]
  Measured: water=3.5%  mountain=2.3%  peak=0.3%  floatingIsland=0.0%

Seed "test-gamma" (1387 tiles):
  FAIL: water: 3.5% out of range [6%, 50%]
  Measured: water=3.5%  mountain=0.0%  peak=0.0%  floatingIsland=0.0%

=== Chunk-Seam Invariant Test ===
Status: PASSED
Seed: glut-17  |  Radius: 21
Invariant: elevationField & temperature are pure functions of (seed, q, r)
Moisture: adjusted (coastal boost) — recomputed from base fields + neighbor water
Formula: worldShape(dist, radius) × (detail×0.5 + ridges×0.5)

All tiles verified — stored fields match recomputed values.

=== Climate Coverage Report ===
Seed: glut-1685  |  Radius: 50  |  Tiles: 7651

Biome distribution:
  biome_lush: 2374 tiles (31.0%)
  biome_frigid_silence: 1864 tiles (24.4%)
  biome_default: 1728 tiles (22.6%)
  biome_savanna: 862 tiles (11.3%)
  biome_brass_grave: 823 tiles (10.8%)

biome_default tiles: 1728 (coverage gaps)
Sample (elevationField, moisture) coordinates:
  (-45,5)  elev=0.0352  moist=0.5933
  (-44,2)  elev=0.0402  moist=0.5877
  (-44,3)  elev=0.0418  moist=0.5792
  (-43,2)  elev=0.0487  moist=0.5869
  (-43,3)  elev=0.0504  moist=0.5777
  (-42,2)  elev=0.0574  moist=0.5857
  (-42,3)  elev=0.0591  moist=0.5756
  (-41,2)  elev=0.0671  moist=0.5836
  (-40,1)  elev=0.0771  moist=0.5923
  (-40,2)  elev=0.0761  moist=0.5807
  ... and 1718 more

Note: Biome assignment is climate-driven with epicenter overrides.
biome_default tiles here are climate gaps or fallout from epicenter regions.
Gaps indicate climate zones with no natural biome match.

--- Radius 100 ---

Terrain distribution (mean % +/- stddev):
  Plains        18.5%  +/- 3.38  (min 7.9%, max 26.4%)
  Forest         5.7%  +/- 2.59  (min 0.5%, max 14.5%)
  Deep wood      0.4%  +/- 0.30  (min 0.0%, max 1.8%)
  Desert         7.5%  +/- 1.88  (min 2.8%, max 14.4%)
  Marsh          1.8%  +/- 0.64  (min 0.3%, max 4.3%)
  Hill          47.2%  +/- 2.94  (min 39.3%, max 58.6%)
  Plateau        0.0%  +/- 0.01  (min 0.0%, max 0.1%)
  Impassable peaks   3.6%  +/- 1.32  (min 0.7%, max 8.3%)
  High peak      1.7%  +/- 0.67  (min 0.1%, max 4.0%)
  Floating isle   0.7%  +/- 0.56  (min 0.0%, max 2.0%)
  Broken water   3.2%  +/- 1.12  (min 0.3%, max 6.8%)
  Frozen surface   9.9%  +/- 1.77  (min 5.4%, max 15.5%)

Champion spawn heatmap (top 15 hexes by seed count):
   -65,-30  11/500  (2.2%)
     18,75  9/500  (1.8%)
    18,-92  9/500  (1.8%)
     77,13  9/500  (1.8%)
     16,76  9/500  (1.8%)
    93,-70  8/500  (1.6%)
    92,-73  8/500  (1.6%)
     86,-3  7/500  (1.4%)
     85,-1  7/500  (1.4%)
    94,-68  7/500  (1.4%)
    -96,32  7/500  (1.4%)
     21,73  7/500  (1.4%)
    -63,95  6/500  (1.2%)
    -75,94  6/500  (1.2%)
    89,-79  6/500  (1.2%)

Pooled Histograms (500 seeds × r=100):
  Elevation      p10=0.020  p25=0.060  p50=0.120  p75=0.240  p90=0.340  p99=0.520
  Moisture       p10=0.300  p25=0.380  p50=0.480  p75=0.600  p90=0.680  p99=0.800
  Temperature    p10=0.520  p25=0.540  p50=0.560  p75=0.600  p90=0.640  p99=0.700
  Slope          p10=0.000  p25=0.000  p50=0.000  p75=0.000  p90=0.000  p99=0.000

Frequency Verification:
  Elevation detail:
    config freq=0.02  octaves=4
    target: ~10-hex local relief
    zero-crossings=1411  half-cycles=705.5
    effective λ=0wu  (~0.3 hexes)
  Ridge noise:
    config freq=0.008  octaves=3
    target: ~25-hex mountain chains
    zero-crossings=469  half-cycles=234.5
    effective λ=0wu  (~0.9 hexes)
  Moisture:
    config freq=0.006  octaves=4
    target: broad wet/dry bands
    zero-crossings=307  half-cycles=153.5
    effective λ=1wu  (~1.3 hexes)
  Temperature variation:
    config freq=0.08  octaves=1
    target: local temp noise
    zero-crossings=3472  half-cycles=1736.0
    effective λ=0wu  (~0.1 hexes)
  Region bias:
    config freq=0.003  octaves=3
    target: 4-6 biome regions on radius-50
    zero-crossings=181  half-cycles=90.5
    effective λ=1wu  (~2.2 hexes)

=== Snapshot Tests ===
Status: FAILED
Radius: 21  |  Seeds: 3

Seed "test-alpha" (1387 tiles):
  FAIL: water: 4.6% out of range [6%, 50%]
  Measured: water=4.6%  mountain=0.0%  peak=1.2%  floatingIsland=0.0%

Seed "test-beta" (1387 tiles):
  FAIL: water: 3.5% out of range [6%, 50%]
  Measured: water=3.5%  mountain=2.3%  peak=0.3%  floatingIsland=0.0%

Seed "test-gamma" (1387 tiles):
  FAIL: water: 3.5% out of range [6%, 50%]
  Measured: water=3.5%  mountain=0.0%  peak=0.0%  floatingIsland=0.0%

=== Chunk-Seam Invariant Test ===
Status: PASSED
Seed: glut-17  |  Radius: 21
Invariant: elevationField & temperature are pure functions of (seed, q, r)
Moisture: adjusted (coastal boost) — recomputed from base fields + neighbor water
Formula: worldShape(dist, radius) × (detail×0.5 + ridges×0.5)

All tiles verified — stored fields match recomputed values.

=== Climate Coverage Report ===
Seed: glut-1685  |  Radius: 100  |  Tiles: 30301

Biome distribution:
  biome_frigid_silence: 7554 tiles (24.9%)
  biome_lush: 6357 tiles (21.0%)
  biome_unfinished_lands: 6043 tiles (19.9%)
  biome_default: 4679 tiles (15.4%)
  biome_brass_grave: 3770 tiles (12.4%)
  biome_savanna: 1886 tiles (6.2%)
  biome_arid: 12 tiles (0.0%)

biome_default tiles: 4679 (coverage gaps)
Sample (elevationField, moisture) coordinates:
  (-85,19)  elev=0.0871  moist=0.5808
  (-98,55)  elev=0.0109  moist=0.6054
  (-97,55)  elev=0.0162  moist=0.5422
  (-96,55)  elev=0.0218  moist=0.5085
  (-96,56)  elev=0.0222  moist=0.5761
  (-95,54)  elev=0.0272  moist=0.4678
  (-95,55)  elev=0.0282  moist=0.4743
  (-95,56)  elev=0.0287  moist=0.5113
  (-95,57)  elev=0.0291  moist=0.5485
  (-95,58)  elev=0.0294  moist=0.5856
  ... and 4669 more

Note: Biome assignment is climate-driven with epicenter overrides.
biome_default tiles here are climate gaps or fallout from epicenter regions.
Gaps indicate climate zones with no natural biome match.

=== Threshold Derivation ===
  500 seeds × radii [21, 50, 100]

Derived Thresholds (raw values at target percentiles):

  waterMaxElevation            0.0200  (p12, elevation)
  mountainThreshold            0.3400  (p90, elevation)
  peakThreshold                0.4400  (p97, elevation)
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
  Elevation      raw:0.10→0.4419  0.50→0.9873  0.90→1.0000
  Moisture       raw:0.10→0.0008  0.50→0.5404  0.90→1.0000
  Temperature    raw:0.10→0.0000  0.50→0.0842  0.90→1.0000
  Slope          raw:0.10→1.0000  0.50→1.0000  0.90→1.0000

---
Thresholds are raw values at the target percentile of the pooled
distribution. They remain stable when Phases B/F change the composite.
Only the quantile LUTs need regeneration after those phases.