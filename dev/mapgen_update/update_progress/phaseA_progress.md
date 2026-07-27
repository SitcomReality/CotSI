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
