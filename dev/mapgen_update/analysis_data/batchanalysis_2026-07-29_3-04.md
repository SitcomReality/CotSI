=== Batch Analysis Report ===
Seeds: 250  |  Radii: 21, 50, 100

--- Radius 21 ---

Terrain distribution (mean % +/- stddev):
  Plains        12.1%  +/- 4.98  (min 2.2%, max 28.5%)
  Forest        10.0%  +/- 4.30  (min 2.2%, max 19.5%)
  Deep wood      4.1%  +/- 1.85  (min 0.4%, max 8.9%)
  Desert        11.8%  +/- 4.43  (min 1.5%, max 24.4%)
  Marsh          2.4%  +/- 1.77  (min 0.3%, max 8.3%)
  Hill          36.0%  +/-10.42  (min 20.2%, max 55.4%)
  Plateau        0.0%  +/- 0.00  (min 0.0%, max 0.0%)
  Impassable peaks   0.7%  +/- 0.92  (min 0.0%, max 5.0%)
  High peak      0.8%  +/- 0.80  (min 0.0%, max 2.9%)
  Floating isle   0.3%  +/- 0.28  (min 0.0%, max 0.9%)
  Broken water  10.8%  +/- 3.34  (min 3.9%, max 21.5%)
  Frozen surface  11.0%  +/- 4.94  (min 3.2%, max 23.8%)

Trader position heatmap (top 15 hexes by seed count):
     -21,0  55/250  (22.0%)
     -19,0  47/250  (18.8%)
     -21,3  44/250  (17.6%)
     -21,2  44/250  (17.6%)
     -19,1  37/250  (14.8%)
     -21,1  36/250  (14.4%)
     -19,2  36/250  (14.4%)
     -19,3  31/250  (12.4%)
     -21,4  29/250  (11.6%)
     -19,4  28/250  (11.2%)
     -20,1  27/250  (10.8%)
     -20,0  25/250  (10.0%)
     -20,2  21/250  (8.4%)
     -19,5  19/250  (7.6%)
     -20,3  17/250  (6.8%)

Champion spawn heatmap (top 15 hexes by seed count):
     12,-9  25/250  (10.0%)
     11,-9  23/250  (9.2%)
      1,10  23/250  (9.2%)
     10,-8  22/250  (8.8%)
     -7,-5  21/250  (8.4%)
     -14,7  21/250  (8.4%)
     4,-13  21/250  (8.4%)
    -11,14  21/250  (8.4%)
     -8,-6  21/250  (8.4%)
     2,-10  20/250  (8.0%)
      2,10  19/250  (7.6%)
      10,1  19/250  (7.6%)
      2,11  19/250  (7.6%)
     -9,13  19/250  (7.6%)
      1,11  19/250  (7.6%)

Pooled Histograms (250 seeds × r=21):
  Elevation      p10=0.000  p25=0.020  p50=0.080  p75=0.160  p90=0.280  p99=0.500
  Moisture       p10=0.260  p25=0.340  p50=0.480  p75=0.640  p90=0.720  p99=0.800
  Temperature    p10=0.520  p25=0.540  p50=0.580  p75=0.620  p90=0.660  p99=0.700
  Slope          p10=0.000  p25=0.000  p50=0.000  p75=0.020  p90=0.020  p99=0.040

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
  Measured: water=16.9%  mountain=0.0%  peak=1.1%  floatingIsland=0.0%

Seed "test-beta" (1387 tiles):
  All distributions within tolerance.
  Measured: water=10.4%  mountain=0.3%  peak=1.6%  floatingIsland=0.0%

Seed "test-gamma" (1387 tiles):
  All distributions within tolerance.
  Measured: water=9.6%  mountain=0.0%  peak=0.0%  floatingIsland=0.4%

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
  biome_brass_grave: 419 tiles (30.2%)
  biome_lush: 360 tiles (26.0%)
  biome_frigid_silence: 244 tiles (17.6%)
  biome_default: 229 tiles (16.5%)
  biome_savanna: 135 tiles (9.7%)

biome_default tiles: 229 (coverage gaps)
Sample (elevationField, moisture) coordinates:
  (-18,3)  elev=0.0387  moist=0.6029
  (-18,4)  elev=0.0373  moist=0.6119
  (-17,9)  elev=0.0372  moist=0.5855
  (-12,-6)  elev=0.0308  moist=0.5408
  (-11,-7)  elev=0.0323  moist=0.5346
  (-11,-6)  elev=0.0445  moist=0.4475
  (-10,-8)  elev=0.0347  moist=0.5259
  (-10,-7)  elev=0.0465  moist=0.4395
  (-10,-6)  elev=0.0594  moist=0.4430
  (-9,-9)  elev=0.0383  moist=0.5143
  ... and 219 more

Note: Biome assignment is climate-driven with epicenter overrides.
biome_default tiles here are climate gaps or fallout from epicenter regions.
Gaps indicate climate zones with no natural biome match.

--- Radius 50 ---

Terrain distribution (mean % +/- stddev):
  Plains        15.6%  +/- 5.11  (min 5.4%, max 29.8%)
  Forest        12.9%  +/- 3.93  (min 3.8%, max 26.5%)
  Deep wood      2.8%  +/- 2.56  (min 0.2%, max 13.1%)
  Desert        14.3%  +/- 4.79  (min 3.4%, max 25.7%)
  Marsh          2.6%  +/- 1.35  (min 0.5%, max 7.7%)
  Hill          27.9%  +/- 4.18  (min 17.8%, max 41.4%)
  Plateau        0.0%  +/- 0.01  (min 0.0%, max 0.1%)
  Impassable peaks   0.7%  +/- 0.52  (min 0.0%, max 2.6%)
  High peak      0.5%  +/- 0.44  (min 0.0%, max 1.5%)
  Floating isle   0.2%  +/- 0.19  (min 0.0%, max 0.7%)
  Broken water   9.9%  +/- 2.93  (min 4.5%, max 19.2%)
  Frozen surface  12.6%  +/- 3.52  (min 4.3%, max 23.7%)

Trader position heatmap (top 15 hexes by seed count):
     -47,1  31/250  (12.4%)
     -47,2  31/250  (12.4%)
     -47,0  30/250  (12.0%)
     -50,1  22/250  (8.8%)
     -50,2  22/250  (8.8%)
     -47,3  20/250  (8.0%)
     -50,0  19/250  (7.6%)
     -50,3  18/250  (7.2%)
     -46,0  17/250  (6.8%)
     -46,3  16/250  (6.4%)
     -46,1  15/250  (6.0%)
     -47,6  15/250  (6.0%)
     -46,7  14/250  (5.6%)
     -47,5  14/250  (5.6%)
     -45,9  13/250  (5.2%)

Champion spawn heatmap (top 15 hexes by seed count):
    -33,16  9/250  (3.6%)
    -38,19  7/250  (2.8%)
   -19,-17  7/250  (2.8%)
      0,30  7/250  (2.8%)
      4,29  7/250  (2.8%)
    -36,20  7/250  (2.8%)
      3,33  7/250  (2.8%)
      32,0  7/250  (2.8%)
    32,-30  7/250  (2.8%)
     6,-32  7/250  (2.8%)
    -29,37  7/250  (2.8%)
    33,-30  6/250  (2.4%)
      28,1  6/250  (2.4%)
    -34,13  6/250  (2.4%)
    31,-24  6/250  (2.4%)

Pooled Histograms (250 seeds × r=50):
  Elevation      p10=0.000  p25=0.020  p50=0.080  p75=0.140  p90=0.240  p99=0.460
  Moisture       p10=0.240  p25=0.320  p50=0.480  p75=0.640  p90=0.740  p99=0.840
  Temperature    p10=0.520  p25=0.560  p50=0.580  p75=0.620  p90=0.660  p99=0.700
  Slope          p10=0.000  p25=0.000  p50=0.000  p75=0.000  p90=0.000  p99=0.020

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
  Measured: water=16.9%  mountain=0.0%  peak=1.1%  floatingIsland=0.0%

Seed "test-beta" (1387 tiles):
  All distributions within tolerance.
  Measured: water=10.4%  mountain=0.3%  peak=1.6%  floatingIsland=0.0%

Seed "test-gamma" (1387 tiles):
  All distributions within tolerance.
  Measured: water=9.6%  mountain=0.0%  peak=0.0%  floatingIsland=0.4%

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
  biome_lush: 1890 tiles (24.7%)
  biome_brass_grave: 1461 tiles (19.1%)
  biome_unfinished_lands: 1384 tiles (18.1%)
  biome_default: 1279 tiles (16.7%)
  biome_savanna: 860 tiles (11.2%)
  biome_frigid_silence: 777 tiles (10.2%)

biome_default tiles: 1279 (coverage gaps)
Sample (elevationField, moisture) coordinates:
  (-42,25)  elev=0.0365  moist=0.5848
  (-42,26)  elev=0.0351  moist=0.5936
  (-42,27)  elev=0.0338  moist=0.6031
  (-41,18)  elev=0.0532  moist=0.5581
  (-41,19)  elev=0.0521  moist=0.5604
  (-41,20)  elev=0.0515  moist=0.5620
  (-41,21)  elev=0.0501  moist=0.5636
  (-41,22)  elev=0.0473  moist=0.5663
  (-41,23)  elev=0.0442  moist=0.5706
  (-41,24)  elev=0.0417  moist=0.5768
  ... and 1269 more

Note: Biome assignment is climate-driven with epicenter overrides.
biome_default tiles here are climate gaps or fallout from epicenter regions.
Gaps indicate climate zones with no natural biome match.

--- Radius 100 ---

Terrain distribution (mean % +/- stddev):
  Plains        21.0%  +/- 4.24  (min 10.5%, max 32.8%)
  Forest         9.8%  +/- 3.42  (min 1.8%, max 19.1%)
  Deep wood      0.8%  +/- 0.85  (min 0.0%, max 4.5%)
  Desert        14.1%  +/- 3.17  (min 6.6%, max 24.4%)
  Marsh          3.0%  +/- 1.13  (min 0.7%, max 7.4%)
  Hill          26.2%  +/- 2.80  (min 19.3%, max 33.7%)
  Plateau        0.1%  +/- 0.10  (min 0.0%, max 0.6%)
  Impassable peaks   0.6%  +/- 0.28  (min 0.0%, max 1.6%)
  High peak      0.4%  +/- 0.22  (min 0.0%, max 1.0%)
  Floating isle   0.1%  +/- 0.09  (min 0.0%, max 0.4%)
  Broken water  11.5%  +/- 1.78  (min 6.8%, max 16.4%)
  Frozen surface  12.4%  +/- 1.67  (min 8.4%, max 17.0%)

Trader position heatmap (top 15 hexes by seed count):
    -100,0  27/250  (10.8%)
    -100,1  18/250  (7.2%)
     -94,1  18/250  (7.2%)
    -100,2  17/250  (6.8%)
     -93,2  16/250  (6.4%)
     -93,8  14/250  (5.6%)
     -93,9  14/250  (5.6%)
    -94,11  14/250  (5.6%)
     -92,0  13/250  (5.2%)
     -94,2  12/250  (4.8%)
     -94,0  12/250  (4.8%)
     -95,0  12/250  (4.8%)
     -93,1  12/250  (4.8%)
     -93,0  11/250  (4.4%)
    -100,4  11/250  (4.4%)

Champion spawn heatmap (top 15 hexes by seed count):
     86,-4  4/250  (1.6%)
    -92,48  4/250  (1.6%)
    23,-80  4/250  (1.6%)
    80,-63  4/250  (1.6%)
    76,-69  4/250  (1.6%)
    -88,36  4/250  (1.6%)
    15,-77  4/250  (1.6%)
     78,12  4/250  (1.6%)
    29,-93  4/250  (1.6%)
    -86,39  4/250  (1.6%)
   -57,-33  4/250  (1.6%)
      5,71  4/250  (1.6%)
   -62,-29  4/250  (1.6%)
    -66,91  4/250  (1.6%)
   -48,-40  4/250  (1.6%)

Pooled Histograms (250 seeds × r=100):
  Elevation      p10=0.000  p25=0.020  p50=0.080  p75=0.140  p90=0.220  p99=0.400
  Moisture       p10=0.300  p25=0.380  p50=0.480  p75=0.600  p90=0.680  p99=0.800
  Temperature    p10=0.520  p25=0.560  p50=0.580  p75=0.620  p90=0.660  p99=0.700
  Slope          p10=0.000  p25=0.000  p50=0.000  p75=0.000  p90=0.000  p99=0.020

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
  Measured: water=16.9%  mountain=0.0%  peak=1.1%  floatingIsland=0.0%

Seed "test-beta" (1387 tiles):
  All distributions within tolerance.
  Measured: water=10.4%  mountain=0.3%  peak=1.6%  floatingIsland=0.0%

Seed "test-gamma" (1387 tiles):
  All distributions within tolerance.
  Measured: water=9.6%  mountain=0.0%  peak=0.0%  floatingIsland=0.4%

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
  biome_lush: 8293 tiles (27.4%)
  biome_unfinished_lands: 6078 tiles (20.1%)
  biome_default: 4744 tiles (15.7%)
  biome_savanna: 4423 tiles (14.6%)
  biome_frigid_silence: 3460 tiles (11.4%)
  biome_brass_grave: 3303 tiles (10.9%)

biome_default tiles: 4744 (coverage gaps)
Sample (elevationField, moisture) coordinates:
  (-93,29)  elev=0.0216  moist=0.6045
  (-93,30)  elev=0.0224  moist=0.6050
  (-93,31)  elev=0.0227  moist=0.6074
  (-93,32)  elev=0.0225  moist=0.6111
  (-93,33)  elev=0.0224  moist=0.6154
  (-91,21)  elev=0.0216  moist=0.6127
  (-92,37)  elev=0.0252  moist=0.5463
  (-92,38)  elev=0.0237  moist=0.5811
  (-91,37)  elev=0.0282  moist=0.4598
  (-91,38)  elev=0.0264  moist=0.4952
  ... and 4734 more

Note: Biome assignment is climate-driven with epicenter overrides.
biome_default tiles here are climate gaps or fallout from epicenter regions.
Gaps indicate climate zones with no natural biome match.

=== Threshold Derivation ===
  250 seeds × radii [21, 50, 100]

Derived Thresholds (raw values at target percentiles):

  waterMaxElevation            0.0000  (p12, elevation)
  mountainThreshold            0.2200  (p90, elevation)
  peakThreshold                0.3200  (p97, elevation)
  floatingIslandThreshold      0.4800  (p99.5, elevation)
  hillElevationMin             0.0800  (p55, elevation)
  marshMaxElevation            0.0400  (p35, elevation)
  forestMinMoisture            0.5800  (p72, moisture)
  denseForestMinMoisture       0.6600  (p85, moisture)
  desertMaxMoisture            0.3400  (p20, moisture)
  marshMinMoisture             0.5200  (p58, moisture)
  freezeTempMax                0.5400  (p15, temperature)

Slope normalization:  0.0152  (95th percentile of per-tile avg deltas)

Quantile LUT sanity (raw → normalized):
  Elevation      raw:0.10→0.6370  0.50→0.9967  0.90→1.0000
  Moisture       raw:0.10→0.0008  0.50→0.5482  0.90→1.0000
  Temperature    raw:0.10→0.0000  0.50→0.0342  0.90→1.0000
  Slope          raw:0.10→1.0000  0.50→1.0000  0.90→1.0000

---
Thresholds are raw values at the target percentile of the pooled
distribution. They remain stable when Phases B/F change the composite.
Only the quantile LUTs need regeneration after those phases.