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

Biomes are data-driven archetypes defined in `src/game/rules/archetypeData/biomes.js` (type: `'biome'`). Each defines:

- **`terrainThresholds`** — noise cutoffs per terrain type (`{ minElevation, maxElevation, minMoisture, maxMoisture }`)
- **`featureFrequencies`** — noise thresholds for features (trees, knots)
- **`palette`** — RGB tuples per terrain type for vertex color overrides
- **`terrainTags`** — which terrain types appear
- **`weatherAffinity`** — hint for weather system (future)

### Map Settings Parameters

Setup screen "Advanced" sliders passed as `mapSettings` to `generateTiles()`:

| Parameter | Effect | Range |
|-----------|--------|-------|
| `heightVariation` | Multiplies elevation noise amplitude | 0.5–2.0 |
| `wateriness` | Multiplies water maxElevation threshold | 0.0–2.0 |
| `mountainousness` | Divides mountain minElevation threshold | 0.0–2.0 |

### Multi-biome mode

The **default** setup option is "Multi-biome (mixed world)". A noise channel (`NOISE_CHANNEL_BIOME`) sampled at each chunk's center assigns the biome. Currently weighted as:
- `[0, 0.40)` → `biome_default`
- `[0.40, 0.70)` → `biome_lush`
- `[0.70, 1.00)` → `biome_arid`

### Biome Fields

See `src/game/rules/archetypeData/biomes.js` for exact definitions.

| Field | Type | Purpose |
|-------|------|---------|
| `terrainThresholds` | object | Noise cutoffs for classifying terrain types per tile. |
| `features` | `[{kind, threshold, compare, terrainExclude?}]` | Ordered list of feature spawn rules. `compare: 'gt'` = roll > threshold, `'lt'` = roll < threshold. First match wins. Replaces old `featureFrequencies`. |
| `palette` | `{terrain: [r,g,b]}` | RGB colour overrides for 3D mesh and minimap. |
| `terrainTags` | `string[]` | Terrain types this biome supports. |
| `weatherAffinity` | `string[]` | Placeholder for future weather system. |
| `terrainElevation` | `{terrain: number}` | (optional) Per-terrain Y-offset overrides. |
| `moistureBias` | number | (optional) Additive offset to raw moisture noise, clamped. |
| `supportsFloatingIslands` | boolean | (optional) Whether this biome can generate floating-island terrain. |

### Feature kinds

| Kind | Type | Mechanics | Visual |
|------|------|-----------|--------|
| `fruitTree` | resource | Heals on arrival, regrows after `FRUIT_REGROWTH_DAYS` | Tree mesh |
| `tree` | flora | Decorative only | Tree mesh |
| `largeTree` | flora | Decorative only, scaled 1.8x | Tree mesh (forced large) |
| `knot` | resource | Mined on arrival for Knot currency | Knot mesh |
| `bush` | flora | Decorative only | Tuft geometry, green, 1.5x |
| `vine` | flora | Decorative only | Tuft geometry, lighter green, 0.8x |

### Adding a New Biome

```js
defineArchetype('biome_my_new_biome', {
  type: 'biome',
  id: 'biome_my_new_biome',
  name: 'Display Name',
  terrainThresholds: { /* ... */ },
  features: [
    { kind: 'fruitTree', threshold: 0.970, compare: 'gt', terrainExclude: ['desert'] },
    { kind: 'tree',      threshold: 0.935, compare: 'gt', terrainExclude: ['desert'] },
    { kind: 'knot',      threshold: 0.038, compare: 'lt' },
  ],
  palette: { /* per-terrain [r,g,b] tuples */ },
  terrainTags: ['plains', 'forest', 'desert', 'marsh', 'mountain', 'water'],
  weatherAffinity: ['temperate'],
  terrainElevation: null,
  moistureBias: 0,
  supportsFloatingIslands: false,
});
```

New biomes automatically appear in the setup screen dropdown — no wiring changes needed.
