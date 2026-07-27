# Phase A Progress

## A1. Noise Configuration (`worldParams.js`)

**Done.** Added the Phase A noise config and seed offsets to `src/params/game/worldParams.js`.

### Changes

| Export | Source | Notes |
|--------|--------|-------|
| `NOISE_PHASE_A_ELEVATION` | `noiseConfig.js` ELEVATION_DETAIL | { octaves: 4, lacunarity: 2.0, gain: 0.5, frequency: 0.020 }
| `NOISE_TEMP_VARIATION` | `noiseConfig.js` TEMP_VARIATION | { octaves: 1, lacunarity: 2.0, gain: 0.5, frequency: 0.08 }
| `NOISE_REGION` | `noiseConfig.js` REGION | { octaves: 3, lacunarity: 2.0, gain: 0.5, frequency: 0.003 } — replaces old NOISE_BIOME
| `NOISE_MOISTURE` | Updated from f=0.005 → f=0.006 | Calibrated value from Phase 0 (noiseConfig.js MOISTURE)
| Seed offsets | `noiseConfig.js` hex values | SEED_MOISTURE through SEED_DEBRIS_KIND (7 exports)
| `DEFAULT_TERRAIN_RULES` | Phase A §4.1 spec | 13 fields: elevation thresholds (calibration placeholders), moisture, temperature gates

### Key decisions

- **Hex seed offsets kept** (0x8C6E4F1A etc.) from `noiseConfig.js` — not the sequential 300/400/... from the original Phase A spec draft. The hex values match the calibration pipeline that already ran.
- **Old exports preserved** (`NOISE_ELEVATION`, `NOISE_BIOME`, `NOISE_CHANNEL_*`, `FLOATING_ISLAND_THRESHOLD`, etc.) — terrainGenerator.js still uses them. They'll be removed when the generator is rewritten.
- **Elevation percentile values** in `DEFAULT_TERRAIN_RULES` use reasonable placeholders (0.12, 0.985, 0.96, 0.905) matching the old standalone constants. During Phase A's `classifyTerrain` rewrite, these should be confirmed against `calibration_v1.json` from the "Derive Thresholds" run.

### Consumed by

- `terrainGenerator.js` rewrite (next steps) — `NOISE_PHASE_A_ELEVATION`, seed offsets
- `classifyTerrain` rewrite — `DEFAULT_TERRAIN_RULES`
- `sampleBaseFields` migration from `histograms.js` → `terrainGenerator.js`
- Analysis tool `sampleBaseFields` — already imports from `noiseConfig.js` (not worldParams.js), so no change needed there

---

## A2. `ice` Terrain Type

**Done.** Added `ice` as a new terrain type to support frozen water (returned by Phase A's `classifyTerrain` when `temperature < freezeTempMax` on water tiles).

### Files changed

| File | Change |
|------|--------|
| `src/game/rules/terrainTypes.js` | Added `ice` entry to `TERRAIN`: impassable, movementCost Infinity, fill `#b8d8f0`
| `src/render/hexmap3d/terrain/terrainMesh.js` | Added `ice` to `TERRAIN_COLOR`: `[0.649, 0.820, 0.957]`
| `src/params/render/terrainParams.js` | Added `ice: -0.12` to `TERRAIN_ELEVATION` (slightly above water's -0.15)

### Notes for later steps

- Biome palettes (`biomes.js`) do **not** yet have an `ice` key. When Phase A's `classifyTerrain` starts returning `'ice'`, each biome that can produce frozen water should get `ice` in its palette. Without it, the render falls back to `TERRAIN_COLOR.ice` (global fallback), so ice tiles will render correctly anyway, just without biome-specific colour.
- The `terrainTags` in each biome may need `'ice'` added if any game logic checks terrain tags.
- `lake` vs `ocean` distinction for ice is not yet defined — in Phase A, ice tiles aren't water-typed and won't get waterType tagging. This is fine since ice is impassable either way.

---

## A3. `sampleBaseFields` Migration

**Done.** Added the `sampleBaseFields` function to `src/game/rules/terrainGenerator.js`,
ported from the provisional implementation in `dev/analysis/generation/histograms.js`
(verified during Phase 0 calibration).

### Changes

| File | Change |
|------|--------|
| `src/params/game/worldParams.js` | Added `SEED_ELEVATION = 0x7B2C1E8D` (same value as `noiseConfig.js` SEED_DETAIL) |
| `src/game/rules/terrainGenerator.js` | Added imports (`hexToWorld`, Phase A noise configs, seed offsets, `DEFAULT_TERRAIN_RULES`); added `sampleBaseFields` export |

### Function details

```js
sampleBaseFields(baseSeed, q, r, noiseConfig, radius)
  → { elevation, rawLayers: { detail, ridges }, baseMoisture, temperature, regionBiasM, regionBiasT }
```

- **Signature** takes a `noiseConfig` parameter (generic, reusable by analysis tool and game pipeline)
- **Elevation:** single additive FBM using `NOISE_PHASE_A_ELEVATION` (f=0.020, 4 octaves) + `SEED_ELEVATION`; ridge weight = 0 until Phase B
- **Moisture:** raw FBM using `NOISE_MOISTURE` (f=0.006, 4 octaves) + `SEED_MOISTURE`; no water adjustment yet (Phase C)
- **Temperature:** world-space Y latitude + lapse rate (`DEFAULT_TERRAIN_RULES.waterMaxElevation` = 0.12 reference) + local temp variation (f=0.08, 1 octave)
- **Region bias:** two independent low-frequency fields using `NOISE_REGION` (f=0.003, 3 octaves)
- **Output shape** includes `rawLayers: { detail, ridges }` for future Phase B composite

### Key decisions

- **`hexToWorld` imported** from `src/engine/rules/noise.js` — already exported, same source as `histograms.js`.
- **`noiseConfig` parameter kept** rather than hardcoding worldParams references — allows the analysis tool to call `sampleBaseFields` with its own `noiseConfig.js` in Phase A (switches to terrainGenerator.js import in A9).
- **Temperature uses `DEFAULT_TERRAIN_RULES.waterMaxElevation`** as the sea-level reference in the lapse-rate term, replacing the hardcoded `0.12` in the histograms.js provisional version.
- **`ridges` hardcoded to 0** — full composite (detail + ridges) + worldShape arrives in Phase B.
- **Additive change** — `generateChunkTiles` and `generateTiles` are unchanged. No existing code path uses the new function yet (consumed in A7).

### Verification

```bash
python3 dev/check_imports.py
# OK — all imports resolve, all named exports verified (235 files checked)
```

---

## A4. `selectBiome()` — Natural Biome Selection

**Done.** Added data-driven biome selection to `src/game/rules/terrainGenerator.js`.

### Changes

| File | Change |
|------|--------|
| `src/game/rules/terrainGenerator.js` | Added `BIOME_PRIORITY_ORDER`, `SUPERNATURAL_BIOMES`, `selectBiome` export |

### Function details

```js
selectBiome(elevation, moisture, temperature, regionBiasM, regionBiasT)
  → biome archetype ID string
```

- **`BIOME_PRIORITY_ORDER`**: `['biome_arid', 'biome_lush', 'biome_default']` — natural biomes in specificity order, `biome_default` last as catch-all.
- **`SUPERNATURAL_BIOMES`**: Empty for now (commented out) — populated in Phase G when Brass Grave and Unfinished Lands archetypes are fully defined.
- **Regional bias**: Applies ±5% jitter per axis via `0.10 * (regionBias - 0.5)`, so biome boundaries follow the low-frequency wobble of `NOISE_REGION` fields.
- **`!R` guard**: Biomes without `climateRange` (none have it yet — A6 adds it) are skipped in the loop, falling through to `biome_default`. This means `selectBiome` currently always returns `'biome_default'` — correct transitional behavior.
- **Pure function**: No state, no side effects, deterministic from inputs.

### Key decisions

- **`SUPERNATURAL_BIOMES` included now** even though it's empty — the constant is consumed by `applySupernaturalOverrides` (A8) and defining it now avoids an A4-to-A8 series of small constant additions. The list stays commented until Phase G when actual supernatural archetype content lands.
- **No `validateBiomeLists()` startup assertion yet** — it reads `origin` field from biome defs, which doesn't exist until A6. Added in A6 with the biome archetype updates.
- **Additive change** — same pattern as A3. Existing `generateChunkTiles` still uses the old `biomeForRoll()` + `BIOME_DISTRIBUTION` table. The new `selectBiome` is consumed by A7 when `generateChunkTiles` is rewritten.

### Verification

```bash
python3 dev/check_imports.py
# OK — all imports resolve, all named exports verified (235 files checked)
```

---

## A5. `classifyTerrain` Rewrite (Climate-Aware)

**Done.** Replaced the old private `classifyTerrain(elevation, moisture, T)` with a new exported `classifyTerrain(elevation, moisture, temperature, biomeDef)` in `src/game/rules/terrainGenerator.js`.

### Changes

| File | Change |
|------|--------|
| `src/game/rules/terrainGenerator.js` | Renamed old `classifyTerrain` → `_classifyTerrainLegacy`; updated its 2 callers in `generateChunkTiles`; added new exported `classifyTerrain` |

### New function details

```js
classifyTerrain(elevation, moisture, temperature, biomeDef)
  → terrain type string
```

- **Signature** takes `temperature` (used by ice/snow gates) and `biomeDef` (read for `terrainRules`), unlike the old function which took a pre-resolved thresholds object `T`.
- **`DEFAULT_TERRAIN_RULES` + `biomeDef.terrainRules` shallow merge** — every biome inherits defaults and can override selectively.
- **Temperature gates:** if `elevation < waterMaxElevation` AND `temperature < freezeTempMax` → `'ice'`. If `elevation > peakThreshold` AND `temperature < snowLineMax` → `'peak'` (snow-capped).
- **Tree line:** `forest` and `denseForest` require `elevation < treeLineMax` (0.85).
- **Flow order:** water/ice → snow-capped peak → floatingIsland → peak → mountain → forests (tree line gated) → desert → marsh → plains fallthrough.
- **No floating-island opt-in gate** (unlike old function's `supportsFloatingIslands`). The biome's `terrainRules` can override `floatingIslandThreshold` instead.

### Coexistence with old pipeline

The old `_classifyTerrainLegacy` and the old `resolveThresholds` (`biomeDef?.terrainThresholds`) are still used by `generateChunkTiles`. After A6 renames `terrainThresholds` → `terrainRules` in biome defs, `resolveThresholds` falls through to `DEFAULT_THRESHOLDS` (which is identical to what `biome_default` used). biome_lush and biome_arid temporarily lose their custom threshold overrides — acceptable because the old pipeline is replaced in A7.

### Key decisions

- **Different function name for the old one** (`_classifyTerrainLegacy`) rather than naming the new one differently — keeps the final `classifyTerrain` name on the production function from the start.
- **No `supportsFloatingIslands` check** — biomes control floating islands via `terrainRules.floatingIslandThreshold` override instead. If a biome doesn't want them, set threshold to 2.0 (so never triggers).
- **Ice returns before water** — the temperature gate is checked first, so a cold water tile becomes `'ice'`, not `'water'`. This avoids a downstream step having to overwrite `'water'` → `'ice'`.

### Verification

```bash
python3 dev/check_imports.py
# OK — all imports resolve, all named exports verified (235 files checked)
```

---

## A6. Biome Archetype Updates (`origin`, `climateRange`, `terrainRules`)

**Done.** Updated all three natural biomes with the new flat structure required by Phase A. Removed `moistureBias` and the unused `buildDefaultThresholds()` helper.

### Changes

| Biome | Origin | climateRange | terrainRules (flat) | Removed |
|-------|--------|-------------|---------------------|---------|
| `biome_default` | `'natural'` | — (no climateRange — catch-all) | `{}` (inherits all from `DEFAULT_TERRAIN_RULES`) | `terrainThresholds`, `moistureBias: 0` |
| `biome_lush` | `'natural'` | `{ minMoisture: 0.62, minTemperature: 0.25 }` | `forestMinMoisture: 0.55, denseForestMinMoisture: 0.80, desertMaxMoisture: 0.08, marshMinMoisture: 0.50, marshMaxElevation: 0.40, mountainThreshold: 0.920` | `terrainThresholds`, `moistureBias: 0.05` |
| `biome_arid` | `'natural'` | `{ maxMoisture: 0.22, minTemperature: 0.65 }` | `mountainThreshold: 0.890, waterMaxElevation: 0.04, waterMinMoisture: 0.70, forestMinMoisture: 0.85, desertMaxMoisture: 0.35, marshMinMoisture: 0.75, marshMaxElevation: 0.20` | `terrainThresholds`, `moistureBias: -0.08` |

### File changed

| File | Change |
|------|--------|
| `src/game/rules/archetypeData/biomes.js` | Added `origin`, `climateRange`, flat `terrainRules` to all biomes; removed `moistureBias` from all biomes; removed `buildDefaultThresholds()` |

### How it works

- **`origin: 'natural'`** marks these as climate-driven biomes. `'supernatural'` (coming in Phase A8/G) means epicenter-only placement.
- **`climateRange`** defines the climate cube volume a biome claims. `selectBiome` iterates `BIOME_PRIORITY_ORDER` and returns the first biome whose `climateRange` constraints all match.
- **`terrainRules`** are flat keys (e.g. `forestMinMoisture: 0.55`) merged into `DEFAULT_TERRAIN_RULES`. The new `classifyTerrain` reads these. Values match the spec §4.6 table.
- **`moistureBias` removed** — the biome is chosen because the climate already matches, not because the biome modifies the climate.

### Impact on old pipeline

`resolveThresholds()` reads `biomeDef?.terrainThresholds || DEFAULT_THRESHOLDS`. After the rename:
- `biome_default.terrainRules` → `terrainThresholds` not found → falls back to `DEFAULT_THRESHOLDS` — which matches `buildDefaultThresholds()` exactly. No behavioral change.
- `biome_lush` / `biome_arid` → lose their custom thresholds until A7. Acceptable — the old pipeline is in transition.

### Verification

```bash
python3 dev/check_imports.py
# OK — all imports resolve, all named exports verified (235 files checked)
```

---

## A7. `generateChunkTiles` Restructure

**Done.** Rewrote Pass 1 of `generateChunkTiles` to use the new `sampleBaseFields` → `selectBiome` → `classifyTerrain` pipeline. Updated cross-chunk helper functions. Removed dead code from the old pipeline.

### Changes

**File:** `src/game/rules/terrainGenerator.js`

| Change | Details |
|--------|---------|
| Pass 1 rewrite | `biomeForRoll(hexFbm2D(...))` → `selectBiome(...)`, raw `hexFbm2D` calls → `sampleBaseFields()`, `_classifyTerrainLegacy` → `classifyTerrain()` |
| Tile shape | Renamed/added: `elevationField` (continuous), `moisture`, `temperature`, `slope`, `isRiver`, `rawLayers`. Removed: `rawElev`, `rawMoist`. Kept: `elevation` as 3D height (renderer compat). |
| `tileLookup` (Pass 2) | Out-of-chunk terrain uses `sampleBaseFields` + `classifyTerrain` with `biome_default` instead of old raw `hexFbm2D` + `_classifyTerrainLegacy` |
| `_noiseIsWater` | Rewritten to use `sampleBaseFields` + `classifyTerrain`; checks for `'water'` or `'ice'` |
| `waterTypeForTile` | Signature changed: `(seed, q, r, radius, noiseConfig, tileLookup)` — dropped old `T` param |
| Features pass (Pass 4) | Inlined feature lookup (`biomeDef?.features \|\| DEFAULT_FEATURES`) — no more `resolveThresholds` |
| Pass 1b placeholder | Commented block for `applySupernaturalOverrides` (A8) |
| `resolveElevation` | Updated signature to take `biomeDef` instead of old resolved-thresholds object `T` |
| `NOISE_CONFIG` | Added module-level constant bundling the Phase A noise configs |
| Removed dead code | `BIOME_DISTRIBUTION`, `biomeForRoll()`, `resolveThresholds()`, `_classifyTerrainLegacy()` |
| Removed dead imports | `NOISE_ELEVATION`, `NOISE_BIOME`, `FLOATING_ISLAND_THRESHOLD`, `PEAK_THRESHOLD`, `DENSE_FOREST_MIN_MOISTURE`, `DEFAULT_THRESHOLDS` |
| Docstrings | Updated file header and `generateChunkTiles` JSDoc to describe new pipeline |

### New tile object fields

```js
{
  q, r, terrain, feature: null, debris: null,
  mountainType: null, waterType: null,
  elevation:         0.18,              // 3D height (renderer reads this)
  elevationField:    0.723,             // continuous [0,1] elevation
  moisture:          0.514,             // continuous [0,1] moisture
  temperature:       0.362,             // continuous [0,1] temperature
  slope:             0,                 // Phase B
  isRiver:           false,             // Phase D
  rawLayers:         { detail, ridges }, // Phase B composite
  biomeId:           'biome_lush',
}
```

### Key decisions

- **`elevation` stays as 3D height**, not the continuous field value, because `terrainMesh.js:resolveElev()` reads it. The continuous field goes in `elevationField`.
- **`NOISE_CONFIG` is a module-level constant** rather than a parameter — shared by `generateChunkTiles`, `tileLookup`, `_noiseIsWater`, and `waterTypeForTile`.
- **`params` parameter kept** in the function signature for backward compatibility, but unused in the new pipeline. Removed in a later cleanup phase.
- **`_noiseIsWater` passes `radius=9999`** to `sampleBaseFields` because it only needs relative elevation/temperature, not map-edge clamping. The radius is only used in the latitude term of temperature, where a huge radius means latitude stays near-equatorial (≈0.5) — acceptable for a water-detection helper.

### Impact on consumers

| Consumer | Impact |
|----------|--------|
| `generateTiles()` wrapper | No change — delegates to generateChunkTiles |
| `gameFactory.js` | No change — reads `tile.biomeId` |
| `terrainMesh.js` | No change — reads `tile.elevation` (still 3D height) |
| `dev/analysis/generation/generate.js` | **Breaks at runtime** — reads `rawElev`/`rawMoist` which no longer exist. Fixed in A9. |

### Verification

```bash
python3 dev/check_imports.py
# OK — all imports resolve, all named exports verified (235 files checked)
python3 dev/check_analysis_imports.py
# OK — all analysis imports resolve, all named exports verified (30 files checked)
```

---

## A8. Epicenter System (Supernatural Biome Placement)

**Done.** Implemented the jittered-grid epicenter system for supernatural biome placement.
Added `biome_brass_grave` as the first supernatural biome.

### Changes

| File | Change |
|------|--------|
| `src/engine/rules/seededRng.js` | Added `hash32(n)` export — splitmix 32-bit hash finalizer for numeric inputs |
| `src/params/game/worldParams.js` | Added `EPICENTER_GRID` constant (`cellSize: 45`, `jitterAmplitude: 0.40`) |
| `src/game/rules/archetypeData/biomes.js` | Added `biome_brass_grave` archetype: `origin: 'supernatural'`, `epicenter` block, `fieldModifiers`, shifted `terrainRules` |
| `src/game/rules/terrainGenerator.js` | Added `hashSeedOffset`, `seededJitter`, `hashBiomeIndex`, `applySupernaturalOverrides`; populated `SUPERNATURAL_BIOMES` with `'biome_brass_grave'`; uncommented Pass 1b |

### Epicenter system design

The system places supernatural biomes via deterministic grid seeds rather than climate matching:

1. **Grid placement:** Epicenter seeds are placed on a jittered grid (`cellSize: 45`, `jitterAmplitude: 0.40`). Each grid cell gets one seed at a deterministically jittered position — a pure function of `(baseSeed, gridQ, gridR)`.
2. **Biome assignment:** Each cell's seed is assigned to a supernatural biome by `hashBiomeIndex(baseSeed, cellQ, cellR, SUPERNATURAL_BIOMES.length)`. With one biome (brass_grave), all seeds use it.
3. **Region growth:** Noise-modulated radial falloff from each seed. Radius noise uses a per-biome seed offset (`hashSeedOffset(biomeId, 'epicenterRadius')`) so each supernatural biome gets independent radius variation.
4. **Field modifiers:** On match, `fieldModifiers` are applied to `tile.elevationField`, `tile.moisture`, and `tile.temperature` before calling `classifyTerrain` with the supernatural biome's `terrainRules`. The tile's `biomeId`, `terrain`, and 3D `elevation` are all overwritten.
5. **First-match wins:** Tiles are checked against all epicenter seeds; the first match within the effective radius claims the tile. The `break` prevents overlapping supernatural biomes from reclassifying a tile twice.

### `hash32` utility

Added to `src/engine/rules/seededRng.js` as a pure leaf utility. Implements the splitmix finalizer pattern — a well-known 32-bit hash for numeric inputs. Used by `seededJitter` (two hashes per grid cell) and `hashBiomeIndex` (one hash per cell). No overlap with `stringSeed` (FNV1a for strings).

### `biome_brass_grave` archetype

| Field | Value | Purpose |
|-------|-------|---------|
| `origin` | `'supernatural'` | Never selected by climate — placed only by epicenter |
| `epicenter.radius` | `12` | Base region radius in hexes |
| `epicenter.radiusNoise` | `0.30` | FBM noise modulates radius for irregular boundaries |
| `epicenter.noiseScale` | `0.04` | Frequency of radius-modulation noise |
| `fieldModifiers.elevationOffset` | `-0.05` | Slightly lower terrain |
| `fieldModifiers.moistureMultiplier` | `0.50` | Halves moisture → much drier |
| `fieldModifiers.temperatureOffset` | `-0.15` | Colder climate |
| `terrainRules.mountainThreshold` | `0.85` | More mountains (lower threshold) |
| `terrainRules.forestMinMoisture` | `0.92` | Very rare forests |
| `terrainRules.desertMaxMoisture` | `0.45` | Large barren areas |
| `terrainRules.waterMaxElevation` | `0.06` | Less water |

No `terrainMap` — custom terrain names (brassPlains, etc.) deferred to Phase G. Standard terrain types are used with shifted thresholds for a distinct feel. The palette is empty (falls back to `biome_default` colours); dark metallic palette deferred to Phase G.

### Chunk-locality

The `applySupernaturalOverrides` function regenerates epicenter seeds for the grid cells whose epicenters could affect the current chunk. Grid range is `radius / cellSize + maxEpicenterRadius / cellSize + 1`. Seeds outside the map radius are filtered out. The function operates on the chunk's `tileMap` in-place and is a pure function of `(baseSeed, radius)` — no global state, no inter-chunk coordination.

### When skipped

Pass 1b is guarded by `if (!biomeDef)` — when `generateChunkTiles` is called in single-biome mode, supernatural overrides are skipped. The epicenter pass only runs in multi-biome mode (the normal game path).

### Verification

```bash
python3 dev/check_imports.py
# OK — all imports resolve, all named exports verified (235 files checked)
```

---

## A10. Post-Review Refinements (2026-07-27)

After a full architecture review of the completed Phase A, seven refinements were applied. Details in `progress_overview.md` §Phase A → Post-review refinements.

### A10a. Fix `_noiseIsWater` radius bug

`_noiseIsWater` was hardcoded to pass `radius=9999` to `sampleBaseFields`. This inflated the latitude term to ≈1.0 everywhere, making `classifyTerrain` never return `'ice'` in the water-type BFS — cold polar water tiles could be misclassified as non-water, breaking lake/ocean determination.

**Fix:** Added `radius` parameter to `_noiseIsWater(seed, q, r, radius, noiseConfig)`. The single call site in `waterTypeForTile` now passes the real map radius.

### A10b. Add `biome_savanna`

Natural biomes covered only `biome_arid` (m≤0.22, t≥0.65) and `biome_lush` (m≥0.62, t≥0.25), leaving a large climate gap at `{ m: 0.22–0.62, t: > 0.60 }` — all falling to `biome_default`.

**Fix:** Added `biome_savanna` ("Sunscorched Savanna") with `climateRange: { minMoisture: 0.22, maxMoisture: 0.60, minTemperature: 0.60 }`. Inserted in `BIOME_PRIORITY_ORDER` between `biome_arid` and `biome_lush`. Uses transitional terrain rules (moderate forest/desert thresholds) and warm golden palette distinct from both neighboring biomes.

### A10c. Supernatural field write-back

`applySupernaturalOverrides` computed modified field values (`modElev`, `modMoist`, `modTemp`) as locals for `classifyTerrain` but never persisted them to the tile object. Downstream phases (C moisture adjustment, D river sources, E feature density) would see un-modified climate values on supernatural tiles.

**Fix:** Added 3 lines writing `modElev` → `tile.elevationField`, `modMoist` → `tile.moisture`, `modTemp` → `tile.temperature` after modification and before `classifyTerrain`.

### A10d. Remove dead `DEFAULT_THRESHOLDS`

`DEFAULT_THRESHOLDS` in `terrainTypes.js` was consumed by the old `resolveThresholds()` function, removed in A7. Still exported and barrel-re-exported from `terrainGeneration.js`, but no imports existed.

**Fix:** Removed from `terrainTypes.js` (8 lines) and from `terrainGeneration.js` barrel export.

### A10e. `classifyTerrain` future-proofing

Phase B adds a `slope` parameter for mountain/plateau/hill discrimination — a breaking signature change to an exported function called in 4 places.

**Fix:** Added optional `slope = 0` parameter to `classifyTerrain`. All 4 call sites continue to pass 4 args — the default handles the missing parameter. Phase B can pass real slope values without touching call sites.

### A10f. Document Phase C pass reorder

Phase C splits the current single-pass generation into multi-pass (sample → provisional water → adjust moisture → selectBiome → classifyTerrain). This was documented in the Phase C spec but not noted in the generating function.

**Fix:** Added JSDoc note in `generateChunkTiles` describing the planned Phase C pass split.

### A10g. `biome_brass_grave` placeholder palette

Brass Grave had an empty `palette: {}` — all tiles fell back to `biome_default` colours, making epicenter regions invisible during testing.

**Fix:** Added warm-metallic palette entries for all 6 terrain types (plains, desert, mountain, peak, water, ice). Also added `'ice'` to `terrainTags` since the `temperatureOffset: -0.15` can produce frozen water tiles.

### Verification

```bash
python3 dev/check_imports.py
# OK — all imports resolve, all named exports verified (235 files checked)
python3 dev/check_analysis_imports.py
# OK — all analysis imports resolve, all named exports verified (30 files checked)
