# Biomes & Terrain — Context Reference

**Champions of the Supernal Interregnum** — what the world is made of: every
biome, every terrain type, the colors that drive the ground and the decor, and
how biome + terrain interact. Written for contributors (human or LLM) who have
not seen the game or the codebase — e.g. someone about to author object geometry
via `dev/docs/descriptorAuthoring.md`.

Canonical sources (read these for values that change): `src/game/rules/archetypeData/biomes/`
(biome definitions), `src/game/rules/terrainTypes.js` + `src/params/render/terrainParams.js`
(terrain tables), `src/params/game/terrainGenParams.js` (classification thresholds),
`src/game/rules/terrainGen/classification/biomeSelection.js` + `terrainClassification.js`
(the selection/classification code), `src/game/rules/terrainOverrides.js` (supernatural
re-presentation). Everything below was extracted from those files.

---

## 1. How the world is generated (one paragraph)

Per hex, generation computes four continuous **fields** in [0, 1]: **elevation**,
**moisture**, **temperature**, and **slope**. A **biome** is assigned first from
climate (moisture/temperature/elevation windows; see §4), then the **terrain
type** is classified from the same fields using the biome's `terrainRules`
merged over the global defaults (§3). Rivers are then carved along downhill
paths and boost the moisture of adjacent hexes. Two **supernatural biomes** are
instead stamped onto the map at seeded "epicenter" regions: inside one, the
fields are modified and terrain re-classified, and the terrain is *re-presented*
as alien material (§6). Finally, each tile's ground color comes from the
**biome palette** entry for its terrain type (§7), and decor/features are
spawned per biome rules.

---

## 2. Terrain types

There are 12 terrain type keys. Colors below are the 3D render colors
(`TERRAIN_COLOR` in `src/params/render/terrainParams.js`, RGB 0–1 tuples shown
as hex `round(v·255)`; the legacy ASCII table in `src/game/rules/terrainTypes.js`
matches except ice `#b8d8f0` and river `#5f9ac1`).

| Key | Display name | Color | Passable | Move cost | Ground look |
|-----|--------------|-------|----------|-----------|-------------|
| `plains` | Plains | `#74ad5d` | yes | 10 | grass blades (decor: "Plains Meadow") |
| `forest` | Forest | `#4b8e41` | yes | 12 | round trees, 3–5 per hex (decor: "Forest") |
| `denseForest` | Deep wood | `#2d6b23` | yes | 20 | conical pines, 4–7 per hex (decor: "Dense Forest") |
| `desert` | Desert | `#d6b15b` | yes | 10 | scrub clusters, 6–8 per hex (decor: "Desert Growth") |
| `marsh` | Marsh | `#819967` | yes | 15 | reed clusters, 5–8 per hex (decor: "Marsh Reeds") |
| `hill` | Hill | `#8ba863` | yes | 12 | raised mound, one per hex (decor: "Hill Mound") |
| `plateau` | Plateau | `#9a9078` | yes | 15 | scatter of boulders + scrub tufts, 5–8 per hex (decor: "Plateau Scrub") |
| `mountain` | Mountains | `#877c6a` | no | ∞ | hex-pyramid peaks, edge-to-edge per tile |
| `water` | Broken water | `#5f9ac1` | no | ∞ | none — own rippling water mesh (lakes darker) |
| `ice` | Frozen surface | `≈#a5d1f4` | no | ∞ | none — water mesh, pale frost |
| `beach` | Beach | `#e8d8a0` | yes | 10 | driftwood, 5–8 per hex (decor: "Beach Wrack") |
| `river` | River | `#2d87e6` | yes | 30 | carved channel on the water mesh; `avoidSpawn` |

Notes:

- **`river`** always renders the flat channel blue `#2d87e6` (`RIVER_COLOR`),
  never the biome palette, and never gets normal decor.
- **`water`** renders on its own mesh with no corner-blending and no decor;
  lakes are modulated darker (`r·0.7, g·0.85, b·0.9`).
- Water surfaces ripple via a vertex shader (speed 2.0, amp 0.03) and have
  occasional sparkle glints (`#d9f2ff`).
- Land side-faces adjacent to water/river are damp-tinted toward
  `#1a476b` (weight 0.55).
- Terrain **elevation offsets** (Y above the hex base): plains 0, desert 0,
  forest +0.15, denseForest +0.20, hill +0.25, marsh −0.05, beach −0.05,
  plateau +0.70, mountain +0.85, water −0.15, ice −0.12.

---

## 3. How terrain type is decided

`classifyTerrain()` checks, in order (biome `terrainRules` merged over
`DEFAULT_TERRAIN_RULES`; default thresholds in parentheses):

1. **Water/ice**: elevation < `waterMaxElevation` (0.12) → if temperature <
   `freezeTempMax` (0.50) → `ice`; else if moisture > `waterMinMoisture`
   (0.32) → `water`.
2. **Beach**: any land hex adjacent to water/ice → `beach` (a 1-hex transition
   band; beats every other land check).
3. **Mountain/plateau cap**: elevation > `mountainThreshold` (0.56) → `mountain`
   if slope > `plateauSlopeMin` (0.50), else `plateau`. Additionally elevation >
   `plateauThreshold` (0.48) with slope ≤ `plateauSlopeMax` (0.95) → `plateau`.
4. **Forests** (below tree line, elevation < `treeLineMax` 0.85): moisture >
   `denseForestMinMoisture` (0.64) → `denseForest`; moisture > `forestMinMoisture`
   (0.58) → `forest`.
5. **Desert**: moisture < `desertMaxMoisture` (0.30).
6. **Marsh**: moisture > `marshMinMoisture` (0.52) **and** elevation <
   `marshMaxElevation` (0.24).
7. **Hill**: elevation > `hillElevationMin` (0.32) and slope > `hillSlopeMin`
   (0.25).
8. Otherwise **`plains`**.

So moisture drives forest/desert/marsh, elevation drives water/mountain/plateau,
slope separates mountain from plateau, and temperature gates ice. Biomes tilt
these by overriding individual thresholds (e.g. Edenfall's
`forestMinMoisture: 0.40` makes forest much easier).

---

## 4. The biomes

11 biomes: **9 natural** (assigned per-hex from climate) + **2 supernatural**
(placed as epicenter regions). Natural selection iterates a priority list and
returns the **first biome whose `climateRange` all matches** (a ±0.05 regional
jitter softens boundaries); `biome_default` is last and always matches
(catch-all).

| Priority | Biome | Climate range | Signature |
|----------|-------|---------------|-----------|
| 1 | **Sere Wastes** | moist ≤ 0.30, temp ≥ 0.50 | hot arid desert |
| 2 | **Scorch** | moist 0.22–0.60, temp ≥ 0.68 | hot dry savanna |
| 3 | **The Frigid Silence** | moist ≤ 0.55, temp ≤ 0.52 | cold steppe/tundra |
| 4 | **Mourning Marsh** | moist ≥ 0.58, temp ≤ 0.45 | very cold wetland |
| 5 | **The Tundra** | moist ≥ 0.50, temp ≤ 0.52 | cold wet |
| 6 | **Dustbleed** | elev ≤ 0.30, moist ≤ 0.50 | low dry cursed badlands |
| 7 | **Edenfall** | moist 0.22–0.68, temp 0.42–0.82 | temperate mid-moisture |
| 8 | **Painforest** | moist ≥ 0.62, temp ≥ 0.25 | wet temperate jungle |
| 9 | **Untouched** | (none — catch-all) | balanced vibrant temperate |
| — | **Titanstain** | epicenter (supernatural) | corrupted titanflesh |
| — | **Unfinished Lands** | epicenter (supernatural) | half-formed ghost terrain |

Supernatural placement: seeded dart-throwing seeds (density 0.0008/hex², min
distance 0.14·radius, ≤ 12 epicenters) clustered by low-frequency noise; each
biome has a noise-modulated radius (`radiusFraction 0.11`). Inside an
epicenter the fields are **modified** — Titanstain: elevation −0.05, moisture
×0.5, temperature −0.15 (cold, dry, slightly sunken); Unfinished Lands:
elevation +0.02, moisture ×0.7, temperature −0.10 — then terrain is
re-classified with the supernatural biome's rules. First matching epicenter
wins.

---

## 5. What terrain can appear in which biome

**Framing:** the 12 terrain *keys* exist everywhere — a biome never changes the
classification pipeline itself, only the thresholds, colors, and presentation.
Two mechanisms create the "biome-exclusive terrain" feel:

1. **Climate + threshold preclusion** — a biome's `climateRange` combined with
   its `terrainRules` can make a terrain *impossible* (below, "NO x" means the
   biome's climate window can never reach that terrain's minimum; e.g. Sere
   Wastes caps moisture at 0.30, below every forest minimum).
2. **Supernatural re-presentation** — the two supernatural biomes *rename and
   recolor* the underlying terrain via `terrainOverrides` (§6). That is how
   "normal terrain can't appear" there visually: a `plains` tile inside
   Titanstain is still terrain key `plains`, but it renders as **Titanflesh**
   with titanflesh decor. The inverse also holds: Titanflesh / Yetlands /
   Forespring / Titanblood exist *only* as overrides inside these two biomes,
   so they can never appear anywhere else.

Per-biome terrain character (derived from `climateRange` + `terrainRules`;
defaults in §3):

| Biome | Terrain character |
|-------|-------------------|
| **Sere Wastes** | Desert-dominated. NO forest / denseForest / marsh (moisture ≤ 0.30 is below every minimum: forest 0.85, dense 0.64, marsh 0.75). Water rare (elev < 0.04). Mountains possible (threshold 0.60). |
| **Scorch** | Savanna. NO forest / denseForest / marsh (forest min 0.76 and marsh min 0.62 both above the climate max moist 0.60). Desert *surprisingly rare* (`desertMaxMoisture` 0.12). Water rare (elev < 0.08). Mountains at 0.60. |
| **The Frigid Silence** | Cold steppe. Forests sparse (0.65 / 0.75). Ice common (`freezeTempMax` 0.60 vs default 0.50). Desert possible (≤ 0.30). Marsh only at the moist ceiling (0.55). |
| **Mourning Marsh** | Marsh *dominates* (`marshMinMoisture` 0.20, `marshMaxElevation` 0.50). Desert essentially never (`desertMaxMoisture` 0.05). Ice common. Forests 0.30 / 0.50. |
| **The Tundra** | Cold wet. Forests very rare (0.80 / 0.90). Desert essentially never (0.05). Marsh 0.30 / elev 0.50. Ice common. |
| **Dustbleed** | Dry lowland. NO mountain / plateau — `mountainThreshold` 0.92 exceeds the biome's own max elevation 0.30. Desert common (≤ 0.35). Forests rare (0.60). Water very rare (elev < 0.04 **and** moist > 0.70). |
| **Edenfall** | Fertile temperate. Forests *abundant* (0.40 / 0.55). Desert rare (0.15). Marsh 0.60 / elev 0.35. Mountains 0.60. Water elev < 0.10. |
| **Painforest** | Wet jungle. Forests 0.55 / dense 0.80. Desert essentially never (0.08). Marsh 0.50 / elev 0.40. Mountains 0.65. |
| **Untouched** | Balanced defaults: everything appears in normal temperate proportions. |
| **Titanstain** | Mountains 0.62. Forest essentially never (0.92). Desert ≤ 0.35. Water elev < 0.06. Everything else is re-presented as Titanflesh / Titanblood (see §6). |
| **Unfinished Lands** | Mountains *abundant* (threshold 0.44, `hillElevationMin` 0.08). Forests rare (0.80 / 0.90). Desert ≤ 0.35. Water elev < 0.04. Re-presented as Yetlands / Protogrowth / Forespring (see §6). |

Caveat: **rivers boost moisture** (+0.15 within 1 hex), so a "NO forest" biome
can still grow a pocket of wetter terrain next to a river. These are the
climate-typical cases, not hard guarantees.

---

## 6. Supernatural terrain re-presentation

`terrainOverrides` rename the terrain and swap its decor. Movement cost is
uniform (no faction terrain bonuses apply inside these biomes).

**Titanstain** — everything is corrupted titanflesh; water is titanblood:

| Terrain key | Renders as | Decor |
|-------------|-----------|-------|
| `plains`, `beach`, `desert`, `marsh`, `hill`, `plateau`, `forest`, `denseForest` | **Titanflesh** | `titanflesh` (fleshy growths) |
| `mountain` | Titanflesh Mountain | (standard mountain) |
| `water` | Titanblood | `titanblood` |
| `ice` | Frozen Titanblood | `titanblood` |
| `river` | Titanblood River | `titanblood` |

**Unfinished Lands** — half-formed analogues of everything:

| Terrain key | Renders as | Decor |
|-------------|-----------|-------|
| `plains`, `beach`, `desert`, `plateau` | **Yetlands** | `yetlands` (half-formed remnants) |
| `forest`, `denseForest`, `marsh` | **Protogrowth** | `yetlands` |
| `hill` | Half-Hewn Rise | `yetlands` |
| `mountain` | Sky Stalagmite | (standard mountain) |
| `water` | Forespring | `forespring` |
| `ice` | Forespring | `forespring` |
| `river` | Forespring | `forespring` |

---

## 7. Colors

### 7.1 Biome ground palettes

Every biome carries a `palette` — one RGB tuple per terrain type (0–1 floats;
hex = `round(v·255)`). The tile's ground color is `palette[terrain]`, falling
back to the global `TERRAIN_COLOR` table (§2) when a biome has no entry (e.g.
`ice` in the warm biomes). Palettes are the **single source of the world's
color** — there is no other per-tile ground coloring.

| Biome | plains | forest | denseForest | desert | marsh | hill | plateau | mountain | water | ice | beach |
|-------|--------|--------|-------------|--------|-------|------|---------|----------|-------|-----|-------|
| Untouched | `#74ad5d` | `#4b8e41` | `#2d6b23` | `#d6b15b` | `#819967` | `#8ba863` | `#9a9078` | `#877c6a` | `#5f9ac1` | — | `#e0d2a0` |
| Edenfall | `#8c4d8c` | `#6b337a` | `#4d2661` | `#ad8ca6` | `#73597a` | `#805285` | `#8c6b8f` | `#7a6180` | `#4d6199` | — | `#b38c99` |
| Painforest | `#619e47` | `#38802e` | `#1f591a` | `#c7a666` | `#6b8c57` | `#66944d` | `#80856e` | `#7a8573` | `#4d8cb3` | — | `#a68c61` |
| Frigid Silence | `#949e8c` | `#577a59` | `#385940` | `#b8ad8c` | `#7a8a7a` | `#85947a` | `#8c8f85` | `#808580` | `#59809e` | `#adc7d9` | `#ada694` |
| Mourning Marsh | `#597a59` | `#386138` | `#1f4726` | `#8c7a59` | `#4d6b47` | `#617052` | `#6b7566` | `#66706b` | `#406b8c` | `#8ca6bf` | `#807a6b` |
| Tundra | `#c7ccd1` | `#7a9e8c` | `#527a66` | `#a69e8c` | `#859485` | `#9ead9e` | `#adb3ad` | `#94999e` | `#598594` | `#b8d1e0` | `#bfb8a6` |
| Sere Wastes | `#9e8547` | `#667333` | `#59612e` | `#e0b861` | `#948559` | `#947a4d` | `#9e8a6b` | `#947059` | `#4d85ad` | — | `#e0bf85` |
| Scorch | `#9e944f` | `#6b7a38` | `#526129` | `#d6b366` | `#8f8a5c` | `#8f8a57` | `#998a70` | `#948066` | `#578fb3` | — | `#e6bf80` |
| Dustbleed | `#8c3326` | `#408073` | `#266659` | `#b35933` | `#594033` | `#804033` | `#8c4d40` | `#734038` | `#337380` | — | `#a65940` |
| Titanstain | `#b85c80` | `#803861` | `#5c2647` | `#d18f9e` | `#8a4d70` | `#a35275` | `#b8708a` | `#753d57` | `#660f24` | `#a35266` | `#d1949e` |
| Unfinished Lands | `#85bdbd` | `#4d99a3` | `#337585` | `#c2c7b8` | `#6ba899` | `#80adad` | `#94bdb8` | `#6b94a3` | `#2e85ad` | `#9ed6e0` | `#c2ccc2` |

"—" = no palette entry → global terrain color (§2). Titanstain and Unfinished
Lands also carry `river` palette entries (`#660f24`, `#2e85ad`) that are
cosmetic — rivers always render `RIVER_COLOR`.

### 7.2 Biome signature colors (geometry tint)

Each biome also defines **`colors: { primary, accent }`** — its signature hue
and a secondary highlight, as 0–1 tuples. These are used to **tint individual
decor parts** per-hex (see below) and are the answer to "what are the accent
colors?"

| Biome | `primary` | hex | `accent` | hex |
|-------|-----------|-----|----------|-----|
| Untouched | vibrant meadow green `(0.455, 0.678, 0.365)` | `#74ad5d` | warm golden sand `(0.839, 0.694, 0.357)` | `#d6b15b` |
| Edenfall | purple grass `(0.550, 0.300, 0.550)` | `#8c4d8c` | gold `(0.910, 0.760, 0.290)` | `#e8c24a` |
| Painforest | deep rich green `(0.380, 0.620, 0.280)` | `#619e47` | dark teal `(0.160, 0.420, 0.380)` | `#296b61` |
| Frigid Silence | frost-bleached grey-green `(0.580, 0.620, 0.550)` | `#949e8c` | pale frost `(0.680, 0.780, 0.850)` | `#adc7d9` |
| Mourning Marsh | deep marsh green `(0.300, 0.420, 0.280)` | `#4d6b47` | mournful blue `(0.250, 0.420, 0.550)` | `#406b8c` |
| Tundra | deep blue `(0.160, 0.300, 0.550)` | `#294d8c` | near-white snow `(0.940, 0.960, 1.000)` | `#f0f5ff` |
| Sere Wastes | sun-bleached tan `(0.620, 0.520, 0.280)` | `#9e8547` | bone white `(0.920, 0.900, 0.840)` | `#ebe6d6` |
| Scorch | hot orange `(0.910, 0.440, 0.100)` | `#e8701a` | ash grey `(0.550, 0.550, 0.550)` | `#8c8c8c` |
| Dustbleed | deep rusty red `(0.550, 0.200, 0.150)` | `#8c3326` | turquoise (crystals) `(0.250, 0.500, 0.450)` | `#408073` |
| Titanstain | titanflesh pink `(0.720, 0.360, 0.500)` | `#b85c80` | titanblood crimson `(0.400, 0.060, 0.140)` | `#660f24` |
| Unfinished Lands | light pink `(0.940, 0.740, 0.800)` | `#f0bdcc` | electric blue `(0.300, 0.850, 1.000)` | `#4dd9ff` |

Note: `primary`/`accent` are often (but not always) one of the palette colors —
Scorch's primary `#e8701a` and Tundra's primary `#294d8c` do **not** match any
palette entry; they are the biome's *identity* colors for decor, not its ground
colors.

### 7.3 How the tint reaches decor parts

Terrain decor parts may declare `biomeColor: { source, influence }`:

- `source` ∈ `'primary' | 'accent' | 'terrain'` — which color to mix toward.
  `terrain` = the tile's own ground color (the §7.1 palette entry for its
  terrain), neighbor-blended; this is *ground matching* — hill mounds and
  plateau boulders use it so decor can never mismatch the surface it sits on
  (scrub tufts instead tint toward `primary`).
- `influence` ∈ [0, 1] — 0 keeps the part's authored color, 1 fully replaces it.
- The tint is **neighbor-blended**: the tile's color is pulled toward the
  average of its explored land neighbors (factor 0.8), so an Edenfall tree
  beside Painforest tiles gets its purple diluted by green.
- Tiles of **Untouched** and **Painforest** never *signature*-tint
  (`primary`/`accent`) — a design rule (their decor keeps default colors); the
  `terrain` tint still applies, and their colors still bleed into neighbors.
- Requires a numeric literal part color (string tokens have no tint). Water and
  river neighbors never participate in the blend.

---

## 8. Using this document to improve the palette

All ground colors live in exactly two places: the per-biome `palette` blocks in
`src/game/rules/archetypeData/biomes/*.js` and the fallback
`TERRAIN_COLOR` in `src/params/render/terrainParams.js`; the decor-tint colors
are the per-biome `colors.primary`/`colors.accent`. Because every tile's color
resolves through `palette[terrain]`, a palette edit restyles an entire biome at
once — including, via the `terrain` tint source, the decor that ground-matches.
Note also that `primary`/`accent` can be tuned independently of the ground
palette (e.g. Scorch's orange identity vs. its sandy ground), which is a
deliberate knob for making decor stand out or blend in. Watch for the known
friction points when tuning: biome blends at region borders (factor 0.8), the
bright Untouched greens against the supernatural palettes, and the
`--` fallback columns (ice/river) that ignore the biome palette.
