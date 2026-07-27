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

=== Histogram Collection ===
  seed=glut-17  radius=50  tiles=7651

Elevation:
  p10=0.160  p25=0.180  p50=0.240
  p75=0.300  p90=0.340  p95=0.340  p99=0.340

Moisture:
  p10=0.380  p25=0.420  p50=0.480
  p75=0.560  p90=0.600  p95=0.600  p99=0.620

Temperature:
  p10=0.460  p25=0.500  p50=0.560
  p75=0.600  p90=0.620  p95=0.640  p99=0.640

Slope:
  p10=0.000  p25=0.000  p50=0.000
  p75=0.000  p90=0.000  p95=0.000  p99=0.000

--- Noted uses ---
waterMaxElevation (p12)     → target ~0.12
mountainThreshold (p90)     → top 10% elevation
peakThreshold (p97)         → top 3% elevation
floatingIsland (p99.5)      → top 0.5% elevation

=== Quantile LUT Build ===
  source: 3 seeds × r=50

Elevation LUT (256 entries):
  [  0]=0.0000  [ 32]=0.1228  [ 64]=0.5544  [ 96]=0.9640  [128]=1.0000  [160]=1.0000  [192]=1.0000  [224]=1.0000  [255]=1.0000

  sanity: raw=0.10→0.0274  raw=0.50→1.0000  raw=0.90→1.0000

Moisture LUT (256 entries):
  [  0]=0.0000  [ 32]=0.0000  [ 64]=0.0000  [ 96]=0.1701  [128]=0.5671  [160]=0.9321  [192]=1.0000  [224]=1.0000  [255]=1.0000

  sanity: raw=0.10→0.0000  raw=0.50→0.5607  raw=0.90→1.0000

Temperature LUT (256 entries):
  [  0]=0.0000  [ 32]=0.0000  [ 64]=0.0000  [ 96]=0.0000  [128]=0.2882  [160]=0.9457  [192]=1.0000  [224]=1.0000  [255]=1.0000

  sanity: raw=0.10→0.0000  raw=0.50→0.2787  raw=0.90→1.0000

Slope LUT (256 entries):
  [  0]=0.0000  [ 32]=1.0000  [ 64]=1.0000  [ 96]=1.0000  [128]=1.0000  [160]=1.0000  [192]=1.0000  [224]=1.0000  [255]=1.0000

  sanity: raw=0.10→1.0000  raw=0.50→1.0000  raw=0.90→1.0000

