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

---

## Biome System

Biomes are data-driven archetypes defined in `src/game/rules/archetypeData.js` (type: `'biome'`). Each defines:

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

### Adding a New Biome

```js
defineArchetype('biome_my_new_biome', {
  type: 'biome',
  name: 'Display Name',
  terrainThresholds: { /* ... */ },
  featureFrequencies: { tree: { threshold: 0.935, exclude: ['desert'] }, knot: { threshold: 0.038 } },
  palette: { plains: [r,g,b], forest: [r,g,b], desert: [r,g,b], marsh: [r,g,b], mountain: [r,g,b], water: [r,g,b] },
  terrainTags: ['plains', 'forest', 'mountain'],
  weatherAffinity: ['temperate'],
});
```

New biomes automatically appear in the setup screen dropdown — no wiring changes needed.
