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
| `deepWood` | Deep wood | `#2d6b23` | yes | 20 | conical pines, 4–7 per hex (decor: "Deep Wood") |
| `desert` | Desert | `#d6b15b` | yes | 10 | scrub clusters, 6–8 per hex (decor: "Desert Growth") |
| `marsh` | Marsh | `#819967` | yes | 15 | reed clusters, 5–8 per hex (decor: "Marsh Reeds") |
| `hill` | Hill | `#8ba863` | yes | 12 | raised mound, one per hex (decor: "Hill Mound") |
| `plateau` | Plateau | `#9a9078` | yes | 15 | scatter of boulders + scrub tufts, 5–8 per hex (decor: "Plateau Scrub") |
| `mountain` | Mountains | `#877c6a` | no | ∞ | hex-pyramid peaks, edge-to-edge per tile |
| `water` | Broken water | `#285f8b` | no | ∞ | none — own rippling water mesh (lakes darker) |
| `ice` | Frozen surface | `≈#a5d1f4` | no | ∞ | none — water mesh, pale frost |
| `beach` | Beach | `#e8d8a0` | yes | 10 | log/tuft/stone/pile wrack, 5–8 per hex (decor: "Beach Wrack") |
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
  forest +0.15, deepWood +0.20, hill +0.25, marsh −0.05, beach −0.05,
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
   `deepWoodMinMoisture` (0.64) → `deepWood`; moisture > `forestMinMoisture`
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
2. **Supernatural re-presentation** — the two supernatural biomes *rename* the
   underlying terrain via `terrainOverrides` (display name + movement cost; it
   does not touch decor) and recolor it with their biome palette. The
   decoration is handled separately: each base decorator folds the
   supernatural motifs into its `motifs` table and gates them by a
   `biomeWeight` of 0 outside the owning biome (§6). A `plains` tile inside
   Titanstain is still terrain key `plains`, but it renders as **Titanflesh** —
   renamed, recolored, re-decorated. The inverse also holds: **Titanflesh**,
   **Titanblood**, **Yetlands**, and **Forespring** are look names only (terrain
   display names + shared motif ids), so they never appear outside these two
   biomes.

Per-biome terrain character (derived from `climateRange` + `terrainRules`;
defaults in §3):

| Biome | Terrain character |
|-------|-------------------|
| **Sere Wastes** | Desert-dominated. NO forest / deepWood / marsh (moisture ≤ 0.30 is below every minimum: forest 0.85, dense 0.64, marsh 0.75). Water rare (elev < 0.04). Mountains possible (threshold 0.60). |
| **Scorch** | Savanna. NO forest / deepWood / marsh (forest min 0.76 and marsh min 0.62 both above the climate max moist 0.60). Desert *surprisingly rare* (`desertMaxMoisture` 0.12). Water rare (elev < 0.08). Mountains at 0.60. |
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

`terrainOverrides` only **rename** the underlying terrain (display name +
movement cost); they do **not** swap decor. The supernatural look instead comes
from each base decorator's `motifs` table, which folds in the supernatural
motif **references** and gates them to a single biome via a `biomeWeight` of 0
everywhere else. Movement cost is uniform (no faction terrain bonuses apply
inside these biomes).

Water, ice, and river are the one structural exception: their base decorator
carries a `bare` motif that renders nothing (the water mesh owns the surface),
so on the natural biomes these tiles are plain ground. The pools drop into that
same table — the single `pool` motif under both Titanstain and Unfinished Lands
— which is why water reads as empty in the mortal world and corrupted only
inside these two regions.

**Titanstain** — everything is corrupted titanflesh; water is titanblood.

| Terrain key | Renders as | Decor pattern |
|-------------|-----------|---------------|
| `plains`, `beach`, `desert`, `marsh`, `hill`, `plateau`, `forest`, `deepWood` | **Titanflesh** | titan motifs: `titanSpire`, `titanBoil` |
| `mountain` | Titanflesh Mountain | standard mountain |
| `water` | Titanblood | `pool` |
| `ice` | Frozen Titanblood | `pool` |
| `river` | Titanblood River | `pool` |

**Unfinished Lands** — half-formed analogues of everything.

| Terrain key | Renders as | Decor pattern |
|-------------|-----------|---------------|
| `plains`, `beach`, `desert`, `plateau` | **Yetlands** | yet-fragment motifs: `yetFragmentCube`, `yetFragmentShard` |
| `forest`, `deepWood`, `marsh` | **Protogrowth** | yet-fragment motifs: `yetFragmentCube`, `yetFragmentShard` |
| `hill` | Half-Hewn Rise | yet-fragment motifs: `yetFragmentCube`, `yetFragmentShard` |
| `mountain` | Sky Stalagmite | standard mountain |
| `water` | Forespring | `pool` |
| `ice` | Forespring | `pool` |
| `river` | Forespring | `pool` |

---

## 7. Colors

### 7.1 Biome ground palettes

Every biome carries a `palette` — one RGB tuple per terrain type (0–1 floats;
hex = `round(v·255)`). The tile's ground color is `palette[terrain]`, falling
back to the global `TERRAIN_COLOR` table (§2) when a biome has no entry (e.g.
`ice` in the warm biomes). Palettes are the **single source of the world's
color** — there is no other per-tile ground coloring.

| Biome | plains | forest | deepWood | desert | marsh | hill | plateau | mountain | water | ice | beach |
|-------|--------|--------|-------------|--------|-------|------|---------|----------|-------|-----|-------|
| Untouched | `#74ad5d` | `#4b8e41` | `#2d6b23` | `#d6b15b` | `#819967` | `#8ba863` | `#9a9078` | `#877c6a` | `#285f8b` | — | `#e0d2a0` |
| Edenfall | `#8c4d8c` | `#6b337a` | `#4d2661` | `#ad8ca6` | `#73597a` | `#805285` | `#8c6b8f` | `#7a6180` | `#33548f` | — | `#b38c99` |
| Painforest | `#619e47` | `#38802e` | `#1f591a` | `#c7a666` | `#6b8c57` | `#66944d` | `#80856e` | `#7a8573` | `#21698a` | — | `#a68c61` |
| Frigid Silence | `#949e8c` | `#577a59` | `#385940` | `#b8ad8c` | `#7a8a7a` | `#85947a` | `#8c8f85` | `#808580` | `#336b94` | `#adc7d9` | `#ada694` |
| Mourning Marsh | `#597a59` | `#386138` | `#1f4726` | `#8c7a59` | `#4d6b47` | `#617052` | `#6b7566` | `#66706b` | `#296985` | `#8ca6bf` | `#807a6b` |
| Tundra | `#c7ccd1` | `#7a9e8c` | `#527a66` | `#a69e8c` | `#859485` | `#9ead9e` | `#adb3ad` | `#94999e` | `#336b8f` | `#b8d1e0` | `#bfb8a6` |
| Sere Wastes | `#9e8547` | `#667333` | `#59612e` | `#e0b861` | `#948559` | `#947a4d` | `#9e8a6b` | `#947059` | `#306691` | — | `#e0bf85` |
| Scorch | `#9e944f` | `#6b7a38` | `#526129` | `#d6b366` | `#8f8a5c` | `#8f8a57` | `#998a70` | `#948066` | `#36668f` | — | `#e6bf80` |
| Dustbleed | `#8c3326` | `#408073` | `#266659` | `#b35933` | `#594033` | `#804033` | `#8c4d40` | `#734038` | `#296385` | — | `#a65940` |
| Titanstain | `#b85c80` | `#803861` | `#5c2647` | `#d18f9e` | `#8a4d70` | `#a35275` | `#b8708a` | `#753d57` | `#660f24` | `#a35266` | `#d1949e` |
| Unfinished Lands | `#85bdbd` | `#4d99a3` | `#337585` | `#c2c7b8` | `#6ba899` | `#80adad` | `#94bdb8` | `#6b94a3` | `#266e99` | `#9ed6e0` | `#c2ccc2` |

"—" = no palette entry → global terrain color (§2). Titanstain and Unfinished
Lands also carry `river` palette entries (`#660f24`, `#2e85ad`) that are
cosmetic — rivers always render `RIVER_COLOR`.

### 7.2 Biome color swatches (geometry tint)

Each biome defines **`colors`** — six *material-class* swatches, 0–1 tuples,
that tint individual decor parts per-hex. A decor part tints from the swatch
matching the material it depicts:

| swatch | tints | covers |
|--------|-------|--------|
| `foliage` | plant life | leaves, needles, grass, reeds, scrub, moss |
| `wood` | trunks, branches, logs, driftwood |
| `soil` | dirt, sand, clay, clods, mud |
| `stone` | rocks, boulders, rubble, scree |
| `bloom` | the natural-life accent | flowers, fruits, berries |
| `exotic` | the rare-material accent | crystals, ores, glows, supernatural bits |

`foliage`/`bloom`/`exotic` are **identity swatches** — every biome authors them
(enforced by the archetype tests). `wood`/`soil`/`stone` are **material
swatches** with global defaults (`BIOME_COLOR_DEFAULTS` in
`src/game/rules/archetypeData/biomes/biomeColorDefaults.js`): wood `#8b5e3c`,
soil `#8a6b4a`, stone `#8c8c8c`. A biome overrides a material swatch only when
its version is distinctive (e.g. Edenfall's purple-tinted rock); otherwise it
inherits the default.

**Identity swatches:**

| Biome | `foliage` | hex | `bloom` | hex | `exotic` | hex |
|-------|-----------|-----|---------|-----|----------|-----|
| Untouched | vibrant meadow green `(0.455, 0.678, 0.365)` | `#74ad5d` | warm golden blossom `(0.839, 0.694, 0.357)` | `#d6b15b` | rose-berry accent `(0.750, 0.280, 0.320)` | `#bf474f` |
| Edenfall | the distinctive purple `(0.550, 0.300, 0.550)` | `#8c4d8c` | gold `(0.910, 0.760, 0.290)` | `#e8c24a` | luminous orchid glow `(0.800, 0.650, 0.950)` | `#cca7f2` |
| Painforest | deep rich green `(0.380, 0.620, 0.280)` | `#619e47` | magenta jungle blossom `(0.820, 0.250, 0.400)` | `#d14066` | dark teal `(0.160, 0.420, 0.380)` | `#296b61` |
| Frigid Silence | frost-bleached grey-green `(0.580, 0.620, 0.550)` | `#949e8c` | muted periwinkle blossom `(0.550, 0.620, 0.750)` | `#8c9ebf` | pale frost (ice crystals) `(0.680, 0.780, 0.850)` | `#adc7d9` |
| Mourning Marsh | deep marsh green `(0.300, 0.420, 0.280)` | `#4d6b47` | mournful blue `(0.250, 0.420, 0.550)` | `#406b8c` | will-o'-wisp fen glow `(0.850, 0.850, 0.450)` | `#d9d973` |
| Tundra | deep blue `(0.160, 0.300, 0.550)` | `#294d8c` | pale lilac blossom `(0.720, 0.700, 0.850)` | `#b8b3d9` | near-white snow `(0.940, 0.960, 1.000)` | `#f0f5ff` |
| Sere Wastes | sun-bleached tan `(0.620, 0.520, 0.280)` | `#9e8547` | dusty desert rose `(0.780, 0.520, 0.380)` | `#c78561` | bone white `(0.920, 0.900, 0.840)` | `#ebe6d6` |
| Scorch | hot orange `(0.910, 0.440, 0.100)` | `#e8701a` | dry yellow flower `(0.850, 0.780, 0.350)` | `#d9c759` | ash grey `(0.550, 0.550, 0.550)` | `#8c8c8c` |
| Dustbleed | deep rusty red `(0.550, 0.200, 0.150)` | `#8c3326` | sickly pale blossom `(0.720, 0.700, 0.500)` | `#b8b380` | turquoise (the crystals) `(0.250, 0.500, 0.450)` | `#408073` |
| Titanstain | titanflesh pink `(0.720, 0.360, 0.500)` | `#b85c80` | pale flesh highlight `(0.850, 0.550, 0.650)` | `#d98ca6` | titanblood crimson `(0.400, 0.060, 0.140)` | `#660f24` |
| Unfinished Lands | light pink `(0.940, 0.740, 0.800)` | `#f0bdcc` | pale ghost-green blossom `(0.720, 0.880, 0.850)` | `#b8e0d9` | electric blue `(0.300, 0.850, 1.000)` | `#4dd9ff` |

**Material-swatch overrides** (all other biomes inherit the defaults):

| Biome | swatch | hex | for |
|-------|--------|-----|-----|
| Edenfall | `wood` `(0.350, 0.150, 0.300)` | `#59264d` | dark purple-barked trunks |
| Edenfall | `stone` `(0.478, 0.380, 0.502)` | `#7a6180` | purple-tinted rock (its mountain palette color) |
| Dustbleed | `soil` `(0.470, 0.270, 0.210)` | `#784536` | rusty tainted earth |
| Titanstain | `soil` `(0.400, 0.250, 0.300)` | `#66404d` | bruised flesh-earth |
| Titanstain | `stone` `(0.459, 0.239, 0.341)` | `#753d57` | titanflesh mountain rock (its mountain palette color) |
| Unfinished Lands | `soil` `(0.600, 0.720, 0.700)` | `#99b8b3` | pale ghost earth |
| Unfinished Lands | `stone` `(0.420, 0.580, 0.639)` | `#6b94a3` | half-formed rock (its mountain palette color) |

Note: the swatches are often (but not always) one of the palette colors —
Scorch's `foliage` `#e8701a` and Tundra's `foliage` `#294d8c` do **not** match
any palette entry; they are the biome's *identity* colors for decor, not its
ground colors.

### 7.3 How the tint reaches decor parts

Terrain decor parts may declare `biomeColor: { source, influence }`:

- `source` ∈ `'foliage' | 'wood' | 'soil' | 'stone' | 'bloom' | 'exotic' |
  'terrain'` — which swatch to mix toward; pick the one matching the material
  the part depicts (see the table in §7.2). `terrain` = the tile's own ground
  color (the §7.1 palette entry for its terrain), neighbor-blended; this is
  *ground matching* — hill mounds and plateau boulders use it so decor can
  never mismatch the surface it sits on (scrub tufts instead tint toward
  `foliage`).
- `influence` ∈ [0, 1] — 0 keeps the part's authored color, 1 fully replaces it.
- The tint is **neighbor-blended per swatch**: each of the tile's swatch colors
  is pulled toward the average of its explored land neighbors (factor 0.8), so
  an Edenfall tree beside Painforest tiles gets its purple foliage diluted by
  green.
- Every biome's decor swatch-tints; only tiles with no known biome colors
  keep the authored part colors. The `terrain` tint still applies wherever
  palettes are known, and every biome's colors bleed into neighbors.
- Requires a numeric literal part color (string tokens have no tint). Water and
  river neighbors never participate in the blend.

---

## 8. Using this document to improve the palette

All ground colors live in exactly two places: the per-biome `palette` blocks in
`src/game/rules/archetypeData/biomes/*.js` and the fallback
`TERRAIN_COLOR` in `src/params/render/terrainParams.js`; the decor-tint colors
are the per-biome `colors` swatches (§7.2). Because every tile's color
resolves through `palette[terrain]`, a palette edit restyles an entire biome at
once — including, via the `terrain` tint source, the decor that ground-matches.
Note also that the swatches can be tuned independently of the ground
palette (e.g. Scorch's orange `foliage` vs. its sandy ground), which is a
deliberate knob for making decor stand out or blend in. Watch for the known
friction points when tuning: biome blends at region borders (factor 0.8), the
bright Untouched greens against the supernatural palettes, and the
`--` fallback columns (ice/river) that ignore the biome palette.
