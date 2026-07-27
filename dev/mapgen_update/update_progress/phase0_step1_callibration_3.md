=== Multi-Seed Report ===
Seeds: 100  |  Radius: 100  |  Base seed: glut-17

Terrain distribution (mean % +/- stddev):
  Plains        83.1%  +/- 8.06  (min 65.2%, max 100.0%)
  Forest         8.5%  +/- 5.40  (min 0.0%, max 23.8%)
  Deep wood      0.4%  +/- 0.97  (min 0.0%, max 5.9%)
  Desert         2.3%  +/- 2.83  (min 0.0%, max 11.4%)
  Marsh          5.7%  +/- 5.15  (min 0.0%, max 18.2%)
  Impassable peaks   0.0%  +/- 0.03  (min 0.0%, max 0.3%)
  High peak      0.0%  +/- 0.00  (min 0.0%, max 0.0%)
  Floating isle   0.0%  +/- 0.00  (min 0.0%, max 0.0%)
  Broken water   0.0%  +/- 0.00  (min 0.0%, max 0.0%)


=== Frequency Verification ===
  radius=50  tiles=7651

Continent mask:
  config freq=0.00012  octaves=3
  target: 2-4 landmasses on radius-50
  zero-crossings=73  half-cycles=36.5
  effective λ=1wu  (~2.7 hexes)

Elevation detail:
  config freq=0.0025  octaves=4
  target: ~10-hex local relief
  zero-crossings=101  half-cycles=50.5
  effective λ=1wu  (~2.0 hexes)

Ridge noise:
  config freq=0.0012  octaves=3
  target: ~25-hex mountain chains
  zero-crossings=73  half-cycles=36.5
  effective λ=1wu  (~2.7 hexes)

Moisture:
  config freq=0.0008  octaves=4
  target: broad wet/dry bands
  zero-crossings=3  half-cycles=1.5
  effective λ=33wu  (~66.7 hexes)

Temperature variation:
  config freq=0.005  octaves=1
  target: local temp noise
  zero-crossings=3  half-cycles=1.5
  effective λ=33wu  (~66.7 hexes)

Region bias:
  config freq=0.003  octaves=3
  target: 4-6 biome regions on radius-50
  zero-crossings=18  half-cycles=9.0
  effective λ=6wu  (~11.1 hexes)

--- hexToWorld note ---
Adjacent hex spacing: ~1.0wu (q) / ~1.732wu (r)
Wavelength = 1/f world-units. f=0.0008 → λ=1250wu.
A radius-50 map spans ~100wu. At f=0.0008 that is ~0.08 cycles
— far from the "2-4 landmasses" target. If zero-crossings confirm
this, all frequencies need a downward revision.

=== Pooled Histograms (100 seeds × r=100) ===

Elevation      p10=0.120  p25=0.160  p50=0.240  p75=0.320  p90=0.380  p99=0.440
Moisture       p10=0.300  p25=0.380  p50=0.480  p75=0.600  p90=0.680  p99=0.740
Temperature    p10=0.460  p25=0.500  p50=0.560  p75=0.600  p90=0.620  p99=0.680
Slope          p10=0.000  p25=0.000  p50=0.000  p75=0.000  p90=0.000  p99=0.000

=== Quantile LUT Build ===
  source: 100 seeds × r=100

Elevation LUT (256 entries):
  [  0]=0.0000  [ 32]=0.1789  [ 64]=0.5567  [ 96]=0.9263  [128]=1.0000  [160]=1.0000  [192]=1.0000  [224]=1.0000  [255]=1.0000

  sanity: raw=0.10→0.0962  raw=0.50→1.0000  raw=0.90→1.0000

Moisture LUT (256 entries):
  [  0]=0.0000  [ 32]=0.0000  [ 64]=0.0384  [ 96]=0.2798  [128]=0.5421  [160]=0.8180  [192]=0.9942  [224]=1.0000  [255]=1.0000

  sanity: raw=0.10→0.0000  raw=0.50→0.5381  raw=0.90→1.0000

Temperature LUT (256 entries):
  [  0]=0.0000  [ 32]=0.0000  [ 64]=0.0000  [ 96]=0.0015  [128]=0.2893  [160]=0.9250  [192]=1.0000  [224]=1.0000  [255]=1.0000

  sanity: raw=0.10→0.0000  raw=0.50→0.2807  raw=0.90→1.0000

Slope LUT (256 entries):
  [  0]=0.0000  [ 32]=1.0000  [ 64]=1.0000  [ 96]=1.0000  [128]=1.0000  [160]=1.0000  [192]=1.0000  [224]=1.0000  [255]=1.0000

  sanity: raw=0.10→1.0000  raw=0.50→1.0000  raw=0.90→1.0000
