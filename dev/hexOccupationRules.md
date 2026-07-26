# Hex Occupation Rules

These rules govern which entities may occupy which hexes. They are enforced at
spawn time and during all movement and pathfinding.

---

## Champion (human and bot)

| May occupy | May not occupy |
|-----------|----------------|
| Plains, forest, desert, marsh | Mountain, water (impassable terrain) |
| Tree (*) | Faction base |
| God's Knot (*) | Another champion |
| Debris (tuft, rock, flower) | Mob (aggressive or not) |
| | Trader |

(*) Champions interact with trees (eat fruit) and knots (mine) on arrival — these
are intentional interactions, not just occupancy.

**Enforcement points:**
- `isBlockedForMovement()` in `entityQueries.js` — used by `adjacentPassable()`,
  `movementRange()`, and indirectly by human click handling via `hexBridge.js`.
- `canEnter` callback in `championAI.js` — used by bot pathfinding (`findPath`).
  Blocks bases, mobs, traders, and other champions on ALL hexes (including the
  path target), unlike the old code which only blocked them on intermediate hexes.

---

## Mob

Mobs spawn on and may only wander onto hexes that are **completely vacant**:

- Passable terrain (not mountain, not water)
- No feature (no tree, knot, base)
- No debris (no tuft, rock, flower)
- No champion
- No other mob
- No trader

**Enforcement points:**
- `createMobs()` in `entityFactory.js` — spawn filter adds `!tile.debris`.
- Mob wandering in `runWorldTurn()` in `worldSimulation.js` — checks feature,
  debris, champion, mob, and trader occupancy.

---

## Trader

Traders follow the same **completely vacant** rule as mobs:

- Passable terrain
- No feature
- No debris
- No champion
- No mob
- No other trader

**Enforcement points:**
- `createTraders()` in `entityFactory.js` — spawn filter adds `!tile.debris`.
- Trader movement in `runWorldTurn()` in `worldSimulation.js` — checks feature,
  debris, champion, mob, and trader occupancy.

---

## Utility function

`isVacant(state, key)` in `entityQueries.js` encapsulates the complete-vacancy
check for mobs and traders: passable terrain, no feature, no debris, no champion,
no mob, no trader.
