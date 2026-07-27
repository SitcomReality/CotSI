The code is already doing several important things well:

- Seeded and reproducible generation
- Continuous noise rather than purely random per-tile values
- Global coordinates for chunk seams
- Separate noise channels for different purposes
- A clean separation between terrain classification and feature placement
- Per-biome thresholds instead of hard-coding every rule

The main issue is conceptual: **the biome system currently selects a rule set independently of the world’s climate fields**.

Right now, the pipeline is roughly:

```text
choose biome randomly from biome noise
generate elevation independently
generate moisture independently
apply that biome's thresholds
```

That means a tile can randomly become “arid biome” while sitting beside a lush biome, even if both have nearly identical elevation and moisture. The terrain then changes because the *rules changed*, not because the world conditions changed.

That is probably why the systems feel disconnected.

---

# 1. Make biomes a result of climate, not an independent dice roll

Currently:

```js
hexBiomeId = biomeForRoll(
  hexFbm2D(q, r, seed + 1999, NOISE_BIOME)
);
```

This is effectively saying:

> “This location is lush because the biome noise said so.”

A more natural approach is:

```text
elevation + temperature + moisture + rainfall + latitude
                         ↓
                       biome
```

For example:

```js
const elevation = sampleElevation(q, r);
const temperature = sampleTemperature(q, r, elevation);
const moisture = sampleMoisture(q, r, elevation);
const biomeId = chooseBiome(temperature, moisture, elevation);
```

A simple biome table might look like:

| Conditions | Biome |
|---|---|
| Very low elevation + high moisture | Ocean |
| Low elevation + high moisture | Marsh |
| Low moisture + high temperature | Desert |
| Medium moisture + medium temperature | Plains |
| High moisture + moderate temperature | Forest |
| High elevation + low temperature | Alpine |
| Very high elevation | Mountain / peak |

The separate biome noise can still be useful, but use it for **variation or regional bias**, rather than the primary biome decision.

For example:

```js
const regionalBias = hexFbm2D(q, r, seed + NOISE_BIOME);
const adjustedMoisture = moisture + (regionalBias - 0.5) * 0.15;
```

That makes the biome emerge from climate while still allowing broad regional differences.

---

# 2. Use a climate model with temperature

You currently have:

- elevation
- moisture

Those are a good start, but adding temperature gives you much more believable results.

Temperature can be based on:

1. Latitude or distance from a world-equator
2. Elevation
3. A low-frequency temperature noise field

For a finite radial map, you might use distance along one axis as a simple latitude approximation:

```js
function sampleTemperature(q, r, elevation, radius, seed) {
  const latitude = Math.abs(r) / radius;
  const latitudeTemp = 1 - latitude;
  const variation = hexFbm2D(q, r, seed + NOISE_TEMPERATURE);
  const altitudeCooling = elevation * 0.35;

  return clamp01(
    latitudeTemp * 0.7 +
    variation * 0.3 -
    altitudeCooling
  );
}
```

Then biome choice becomes more expressive:

```js
function chooseBiome({ elevation, moisture, temperature }) {
  if (elevation < 0.08 && moisture > 0.55) return 'ocean';
  if (elevation > 0.82) return 'mountain';
  if (temperature < 0.25) return moisture > 0.5 ? 'tundra' : 'coldDesert';
  if (moisture < 0.2) return temperature > 0.55 ? 'desert' : 'dryPlains';
  if (moisture > 0.72) return temperature > 0.45 ? 'forest' : 'taiga';
  return 'plains';
}
```

Even with only three placeholder biomes, this would make them feel connected.

---

# 3. Separate “world fields” from “terrain classification”

At the moment, this line changes the meaning of elevation:

```js
const elevation = rawElev * T.heightMult;
```

The biome’s settings affect the physical elevation field itself. That can produce odd results: crossing a biome boundary can suddenly make the same underlying landform higher or lower.

A better model is:

```text
raw elevation field
      ↓
global elevation adjustment
      ↓
terrain classification
      ↓
biome-specific visual/gameplay interpretation
```

For example:

```js
const rawElevation = sampleElevation(q, r);
const elevation = remapElevation(rawElevation, params);
const terrain = classifyTerrain(elevation, climate);
```

Then a desert and a forest can occupy the same elevation range, while differing in moisture and temperature.

Biome definitions can still change:

- terrain thresholds
- available features
- terrain appearance
- movement costs
- resource tables
- special formations

But they should generally not redefine the world’s actual elevation field on a tile-by-tile basis.

---

# 4. Your elevation is currently being discarded

You calculate a continuous elevation:

```js
const elevation = rawElev * T.heightMult;
```

But then store:

```js
const elev = resolveElevation(terrain, T);
```

So the tile’s `elevation` becomes a fixed display/gameplay value associated with its terrain type.

That means two neighboring plains tiles may have completely different raw heights, but both store the same elevation. Conversely, a tile classified as mountain may be assigned a generic mountain height.

You should probably preserve both:

```js
{
  rawElevation,
  elevation,
  terrain
}
```

For example:

```js
const elevation = remapElevation(rawElev, params);
const terrain = classifyTerrain(elevation, moisture, temperature);

tileMap.set(key, {
  q,
  r,
  terrain,
  elevation,       // continuous physical value
  rawElevation,    // optional debugging/source value
  moisture,
  temperature,
  biomeId
});
```

If rendering needs a terrain-specific height, calculate that separately:

```js
tile.renderHeight = TERRAIN_ELEVATION[terrain] + elevationVariation;
```

This will let you create:

- foothills instead of abrupt mountain walls
- shallow and deep water
- rolling plains
- high and low forest
- plateaus
- valleys

---

# 5. Add a slope field

Elevation alone is not enough to describe terrain. Calculate local slope from neighboring elevation samples.

```js
function sampleSlope(q, r, elevationAt) {
  const center = elevationAt(q, r);
  let totalDifference = 0;

  for (const n of neighbors({ q, r })) {
    totalDifference += Math.abs(elevationAt(n.q, n.r) - center);
  }

  return totalDifference / 6;
}
```

Then classify using slope as well:

```js
if (elevation > 0.8 && slope < 0.12) return 'plateau';
if (elevation > 0.65 && slope > 0.25) return 'mountain';
if (slope > 0.16) return 'hills';
```

This is much more natural than:

```js
if (elevation > mountainThreshold) return 'mountain';
```

At present, every sufficiently high area becomes mountain, including broad flat highlands.

---

# 6. Make moisture depend on terrain

Your moisture field is currently independent:

```js
const rawMoist = hexFbm2D(q, r, seed + 999, NOISE_MOISTURE);
```

That creates arbitrary wet areas, which is fine for a first prototype, but it will not produce much geographic logic.

A more connected model could include:

- rainfall noise
- elevation
- distance from water
- downhill flow
- rain shadows
- local accumulation

A simple version:

```js
const rainfall = hexFbm2D(q, r, seed + NOISE_MOISTURE);
const proximityToWater = estimateWaterInfluence(q, r);
const moisture = clamp01(
  rainfall * 0.65 +
  proximityToWater * 0.25 +
  lowlandBonus * 0.10
);
```

A more advanced version would calculate a flow direction from elevation:

```text
each tile flows toward its lowest neighbor
       ↓
water accumulates downhill
       ↓
rivers and wet valleys emerge
```

You do not need full realistic hydrology immediately. Even a basic downhill pass would make water and moisture feel much more related.

---

# 7. Rivers would connect the systems dramatically

The biggest missing geographic connection is probably rivers.

A useful generation order is:

```text
1. Elevation
2. Mountains and watersheds
3. River sources
4. River flow downhill
5. Lakes and oceans
6. Moisture adjustment
7. Biomes
8. Features
```

Rivers then influence:

- moisture
- marshes
- forests
- settlement locations
- travel routes
- fertile plains
- biome boundaries

A simple river algorithm:

1. Choose high-elevation source tiles.
2. Repeatedly move to the lowest neighboring tile.
3. Stop at ocean, a lake, or a local sink.
4. Mark the visited tiles as river.
5. Increase moisture around the river.

```js
function traceRiver(start, elevationAt, isWater) {
  const path = [];
  const visited = new Set();
  let current = start;

  while (!isWater(current)) {
    const key = coordKey(current);
    if (visited.has(key)) break;

    visited.add(key);
    path.push(current);

    const next = neighbors(current)
      .filter(n => elevationAt(n) < elevationAt(current))
      .sort((a, b) => elevationAt(a) - elevationAt(b))[0];

    if (!next) break;
    current = next;
  }

  return path;
}
```

This is not perfect hydrology, but it will create much stronger world logic than independent water tiles.

---

# 8. Use domain warping to avoid “noise blobs”

FBM noise often creates recognizable cloudy blobs. One way to make terrain less artificial is to warp the coordinates before sampling.

```js
function warpedPosition(q, r, seed) {
  const warpX = hexFbm2D(q, r, seed + 3000, NOISE_WARP_X);
  const warpY = hexFbm2D(q, r, seed + 4000, NOISE_WARP_Y);

  return {
    q: q + (warpX - 0.5) * 8,
    r: r + (warpY - 0.5) * 8,
  };
}
```

Then:

```js
const p = warpedPosition(q, r, seed);
const elevation = hexFbm2D(p.q, p.r, seed, NOISE_ELEVATION);
```

Use this carefully. Too much warping makes the world look noisy and incoherent. A low-frequency, low-amplitude warp is usually enough.

---

# 9. Fix biome boundaries

Even if you keep biome noise, the boundaries will currently be abrupt because each tile gets one biome and that biome changes its thresholds.

That produces something like:

```text
forest forest forest desert desert desert
```

with possibly large terrain changes at the transition.

You can improve this in several ways.

## Option A: Climate-based transitions

Use continuous climate values and let terrain change naturally through thresholds.

## Option B: Transitional biomes

Add explicit transition types:

- forest edge
- scrubland
- savanna
- dry grassland
- wet grassland
- alpine meadow
- rocky foothills

For example:

```js
if (temperature > 0.55 &&
    moisture > 0.35 &&
    moisture < 0.55) {
  return 'savanna';
}
```

## Option C: Blend visual appearance separately

Keep a gameplay biome, but let rendering blend neighboring biome colors and textures.

```js
tile.biomeInfluence = {
  forest: 0.65,
  plains: 0.35
};
```

You do not necessarily need blended gameplay rules, but visual blending will make boundaries much less grid-like.

---

# 10. Be careful with chunk-local neighbor approximation

This is an important technical issue.

Inside a chunk, you use the actual generated tile:

```js
if (cq === chunkQ && cr === chunkR) {
  return tileMap.get(...);
}
```

Outside the chunk, you approximate terrain using `fallbackT`:

```js
const elevation = ...
const moisture = ...
const terrain = classifyTerrain(elevation, moisture, fallbackT);
```

The fallback uses one biome definition for every neighboring tile. In multi-biome mode, the real neighboring tile might use a different biome definition.

That can cause:

- incorrect mountain edge tagging
- different results near chunk boundaries
- incorrect water classification
- chunk-dependent behavior

A better approach is to create a deterministic, shared base sampler:

```js
function sampleBaseFields(seed, q, r, params) {
  const rawElev = hexFbm2D(q, r, seed, NOISE_ELEVATION);
  const rawMoist = hexFbm2D(q, r, seed + 999, NOISE_MOISTURE);
  const biomeRoll = hexFbm2D(q, r, seed + 1999, NOISE_BIOME);

  const biomeId = biomeForRoll(biomeRoll);
  const biomeDef = getArchetype(biomeId);

  return {
    biomeId,
    biomeDef,
    rawElev,
    rawMoist
  };
}
```

Then both normal generation and neighbor lookups use the same function.

Even better: generate a one-tile border around each chunk for analysis, while only returning the actual chunk tiles. This gives neighbor-dependent systems real data without needing global communication.

---

# 11. Water detection should not use a special independent approximation

This function:

```js
_noiseIsWater(seed, n.q, n.r, T)
```

reconstructs water from elevation and moisture, but it only uses the supplied `T`, which may not be the correct biome thresholds for that coordinate.

Instead, ask the same central terrain sampler:

```js
function sampleTerrain(seed, q, r, params) {
  const fields = sampleBaseFields(seed, q, r, params);
  const T = resolveThresholds(fields.biomeDef, params);

  const elevation = ...
  const moisture = ...

  return {
    ...fields,
    elevation,
    moisture,
    terrain: classifyTerrain(elevation, moisture, T)
  };
}
```

Then:

```js
const neighbor = sampleTerrain(seed, n.q, n.r, params);
const isWater = neighbor.terrain === 'water';
```

This avoids having multiple subtly different definitions of “water.”

---

# 12. Use a clear pipeline

I would restructure the generator around explicit stages:

```text
A. Sample deterministic continuous fields
   - elevation
   - rainfall
   - temperature
   - regional variation

B. Derive geographic values
   - slope
   - distance to coast
   - drainage
   - river membership
   - water depth

C. Select climate and biome
   - biome from temperature/moisture/elevation

D. Classify terrain
   - ocean
   - lake
   - river
   - beach
   - plains
   - forest
   - hill
   - mountain
   - peak

E. Add biome-specific features
   - trees
   - bushes
   - rocks
   - resources

F. Add decorative variation
   - grass
   - flowers
   - debris
```

The current code is already close to this shape, but biome selection and terrain classification need to be moved into a more unified model.

---

# 13. Suggested minimal refactor

You could make a meaningful improvement without rewriting everything.

First, create a common sampler:

```js
function sampleWorldFields(seed, q, r, radius, params) {
  const rawElev = hexFbm2D(q, r, seed, NOISE_ELEVATION);
  const rawMoist = hexFbm2D(q, r, seed + 999, NOISE_MOISTURE);
  const regional = hexFbm2D(q, r, seed + 1999, NOISE_BIOME);

  const latitude = Math.abs(r) / Math.max(1, radius);
  const temperatureNoise = hexFbm2D(q, r, seed + 2999, NOISE_TEMPERATURE);

  const elevation = rawElev;
  const temperature = clamp01(
    (1 - latitude) * 0.7 +
    temperatureNoise * 0.3 -
    elevation * 0.25
  );

  const moisture = clamp01(
    rawMoist * 0.8 +
    regional * 0.2
  );

  return {
    rawElev,
    rawMoist,
    elevation,
    temperature,
    moisture
  };
}
```

Then derive biome from the fields:

```js
function chooseBiome(fields) {
  const { elevation, temperature, moisture } = fields;

  if (elevation < 0.08 && moisture > 0.55) return 'water';
  if (elevation > 0.82) return 'mountain';

  if (temperature > 0.6 && moisture < 0.25) return 'biome_arid';
  if (moisture > 0.65) return 'biome_lush';

  return 'biome_default';
}
```

Then use the biome only for:

- feature definitions
- appearance
- special terrain rules
- local thresholds where appropriate

That alone should make the map feel more coherent.

---

# 14. Specific smaller observations

A few additional code-level points:

### `T` is scoped inside the first loop

In the feature pass, you correctly re-resolve it:

```js
const T = resolveThresholds(tileBiomeDef, params);
```

That is good. Do not accidentally move the first loop’s `T` outside the tile loop; each tile may have a different biome.

### `heightMult` can push values above 1

You clamp moisture, but not elevation:

```js
const elevation = rawElev * T.heightMult;
```

If thresholds assume `[0, 1]`, a multiplier greater than one may distort classification. Consider:

```js
const elevation = clamp01(rawElev * T.heightMult);
```

Or intentionally support values above one, but make that contract explicit.

### Terrain and biome are currently conflated

A biome should usually describe broad environmental conditions:

```text
desert, forest, tundra, savanna
```

Terrain should describe physical geography:

```text
water, plains, hill, mountain, marsh, river
```

A forest can contain plains, hills, and mountains. A desert can contain dunes, mesas, valleys, and rocky ground. Keeping those concepts separate will give you much more variety.

### Feature density should use continuous values

Instead of only:

```js
forest → dense
plains → medium
everything else → sparse
```

you could calculate density from moisture, temperature, slope, and biome:

```js
const density = clamp01(
  moisture * 0.7 +
  temperature * 0.1 -
  slope * 0.4
);
```

This produces gradual forest edges and thinner vegetation near hills or dry zones.

---

## The most important changes

If you only make five changes, I would prioritize these:

1. **Choose biomes from temperature, moisture, and elevation rather than biome noise alone.**
2. **Keep continuous elevation instead of replacing it with a terrain lookup value.**
3. **Add slope and use it to distinguish plains, hills, plateaus, and mountains.**
4. **Generate rivers or at least downhill water flow.**
5. **Use one shared deterministic sampler for normal tiles and cross-chunk neighbor lookups.**

Your current implementation is a solid framework, especially for seeded chunk generation. The biggest improvement is not “more noise”; it is making the fields influence one another in a deliberate order. That will make the world feel geographically generated rather than individually decorated tile by tile.