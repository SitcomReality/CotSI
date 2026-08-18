# Game Mechanics Reference

## Turn Order

- `G.globalOrder` is the **persistent** turn order
- At the start of each world day, `G.currentOrder` is snapshotted from `G.globalOrder` (filtered to alive champions). Map movement cycles through `G.currentOrder` for that day
- Mutations to `G.globalOrder` during combat do **not** affect `G.currentOrder` until the **next world day**

---

## Combat Round Flow

### 1. Initiative
Combatants are ordered by position in `G.globalOrder`: earlier acts **first**, later acts **second** (stored as `combat.first` / `combat.second`). The initiator is `combat.attacker` (dictates reward eligibility, not pick order).

### 2. First Exchange (hidden, simultaneous reveal)
- `combat.first` secretly picks a colour
- `combat.second` secretly picks a colour
- Both revealed simultaneously after a short delay

### 3. Second Exchange (hidden, reverse order)
- **`combat.second`** picks first
- **`combat.first`** picks second
- Both revealed simultaneously

Reversing order prevents a permanent information advantage across exchanges in hot-seat games.

### 4. Score Calculation
All four revealed colours are accumulated into the round score. Animations highlight every contributing element.

### 5. Round End & Turn Order Shift
- If a champion **took damage**, their position in `G.globalOrder` moves immediately **in front of** the damaging champion
- The damaged champion acts first in the next combat round

### 6. Next Round
New round begins using the same `combat.first`/`second` assignments (reflecting the updated `G.globalOrder`). Steps 2–5 repeat.

### 7. Fleeing

- **Minimum one round**: Combatants cannot flee until after at least one full round (two exchanges + damage resolution) has completed. The flee button is hidden during round 1.
- **Bot auto-flee**: Bot-controlled champions flee the combat after any round where continuing would be fatal (remaining HP ≤ damage taken that round). This prevents bots from dying to other bots in a single turn — the defender will flee before a lethal blow lands, and the attacker's turn ends when combat concludes.
- **Mob fleeing**: Non-champion creatures (mobs) always flee after round 1 if they lost the round. Round-1 damage is always applied before the mob flees.
- **Damage on flee**: When a combatant flees, the current round's damage (with final bonuses applied) is resolved normally, but capped to leave the fleeing entity at 1 HP minimum if the damage would otherwise be lethal.
- **Turn order on flee**: If a champion takes damage from another champion during a flee round, `G.globalOrder` is updated immediately (the damaged champion moves before the damager). Changes to `G.currentOrder` take effect at the start of the next world day.
- **Attacker's turn**: The champion who initiated combat always ends their turn when combat concludes — whether by death, flee, or otherwise.

---

## Biome System

Biomes are data-driven archetypes defined in `src/game/rules/archetypeData/biomes/` (type: `'biome'`). Each defines:

- **`climateRange`** — (optional) the biome's window in climate space (`{ minElevation, maxElevation, minMoisture, maxMoisture, minTemperature, maxTemperature }`), consumed by `selectBiome()` in `biomeSelection.js`. Biomes without one are catch-alls (e.g. 'Untouched').
- **`terrainRules`** — per-biome overrides merged over `DEFAULT_TERRAIN_RULES` (defined in `params/game/terrainGenParams.js`) and consumed by `classifyTerrain()` in `terrainClassification.js`; e.g. `mountainThreshold`, `waterMaxElevation`, `treeLineMax`, plus per-biome gates like `forestMinMoisture` / `desertMaxMoisture` / `marshMinMoisture`
- **`features`** — ordered list of feature spawn rules (`{kind, threshold, compare, terrainOnly?, terrainExclude?, tier?}`; first match wins)
- **`palette`** — per-terrain colour overrides as normalized 0–1 float tuples `[r,g,b]` for vertex colors
- **`colors`** — biome color swatches for terrain-decor tinting: identity swatches `foliage`/`bloom`/`exotic` (required per biome) plus material swatches `wood`/`soil`/`stone` (fall back to `BIOME_COLOR_DEFAULTS`)
- **`terrainTags`** — which terrain types appear
- **`weatherAffinity`** — hint for weather system (future)
- **`terrainElevation`** — (optional) per-terrain Y-offset overrides

### Map Settings Parameters

The setup screen's height/water/mountains sliders (`hv`/`wt`/`mt`) were removed in the
§5 fragility-hardening pass — the new terrain pipeline doesn't consume `mapSettings`
multipliers yet. Re-add the sliders when the pipeline has real knobs to expose.

### Multi-biome mode

The **default** setup option is "Multi-biome (mixed world)". Biomes are now assigned
per-hex from climate fields (elevation, moisture, temperature) through `selectBiome()`
in `src/game/rules/terrainGen/classification/biomeSelection.js` — see that file for
the current priority order and each biome's `climateRange` in `biomes/`.

### Biome Fields

See `src/game/rules/archetypeData/biomes/` for exact definitions.

| Field | Type | Purpose |
|-------|------|---------|
| `climateRange` | object | The biome's window in climate space: `{minElevation, maxElevation, minMoisture, maxMoisture, minTemperature, maxTemperature}`. Consumed by `selectBiome()`; absent = catch-all biome. |
| `terrainRules` | object | Per-biome overrides merged over `DEFAULT_TERRAIN_RULES` (`params/game/terrainGenParams.js`); consumed by `classifyTerrain()`. |
| `features` | `[{kind, threshold, compare, terrainOnly?, terrainExclude?, tier?}]` | Ordered list of feature spawn rules. `compare: 'gt'` = roll > threshold, `'lt'` = roll < threshold. First match wins. Replaces old `featureFrequencies`. |
| `palette` | `{terrain: [r,g,b]}` | Normalized 0–1 colour overrides for 3D mesh and minimap. |
| `colors` | `{foliage, bloom, exotic, wood?, soil?, stone?}` | Biome color swatches for terrain-decor tinting. `foliage`/`bloom`/`exotic` are the biome's identity colors (required); `wood`/`soil`/`stone` inherit `BIOME_COLOR_DEFAULTS` unless overridden. |
| `terrainTags` | `string[]` | Terrain types this biome supports. |
| `weatherAffinity` | `string[]` | Placeholder for future weather system. |
| `terrainElevation` | `{terrain: number}` | (optional) Per-terrain Y-offset overrides. |

### Feature kinds

| Kind | Type | Mechanics | Visual |
|------|------|-----------|--------|
| `blessedFont` | resource | Heals on arrival, regrows after `FEATURE_REGROW_DAYS` | Font descriptor with dry → filled growth states |
| `knot` | resource | Mined on arrival for Knot currency | Knot mesh |
| `treasureChest` | resource | Gold on arrival (10–24g), consumed | Rectangle box descriptor |
| `bush` | flora | Decorative only | Tuft geometry, green, 1.5x |

These four are the classic kinds; biomes also spawn many more (e.g. `vegetableLamb`,
`witnessStone`, `screamroot`, `palimpsestSlab`, `gildedInitial`, `saintsRib`), all defined
in `archetypeData/features.js` and rewarded via `game/state/featureRewards.js`.

### Adding a New Biome

```js
defineArchetype('biome_my_new_biome', {
  type: 'biome',
  id: 'biome_my_new_biome',
  name: 'Display Name',
  origin: 'natural', // or 'supernatural' for epicenter-placed biomes
  climateRange: { minElevation: 0, maxElevation: 1, minMoisture: 0, maxMoisture: 1, minTemperature: 0, maxTemperature: 1 },
  terrainRules: { /* overrides merged over DEFAULT_TERRAIN_RULES */ },
  features: [
    { kind: 'blessedFont', threshold: 0.970, compare: 'gt', terrainOnly: ['forest', 'deepWood'] },
    { kind: 'knot',        threshold: 0.038, compare: 'lt' },
  ],
  palette: { /* per-terrain [r,g,b] tuples, normalized 0–1 */ },
  colors: {
    foliage: [0.45, 0.67, 0.36],   // identity: plant life (leaves, grass, scrub)
    bloom: [0.83, 0.69, 0.35],     // identity: flowers, fruits, berries
    exotic: [0.75, 0.28, 0.32],    // identity: crystals, glows, supernatural bits
    // wood/soil/stone omitted → BIOME_COLOR_DEFAULTS
  },
  terrainTags: ['plains', 'forest', 'desert', 'marsh', 'mountain', 'water'],
  weatherAffinity: ['temperate'],
  terrainElevation: null,
});
```

New biomes automatically appear in the setup screen dropdown — no wiring changes needed.
