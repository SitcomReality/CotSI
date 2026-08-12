# Hex Occupation Rules

These rules govern which entities may occupy which hexes. They are enforced at
spawn time and during all movement and pathfinding.

---

## Champion (human and bot)

| May occupy | May not occupy |
|-----------|----------------|
| Any passable terrain: Plains, Forest, Deep wood, Desert, Marsh, Hill, Plateau, Beach, River | Mountain, Broken water, Frozen surface (impassable terrain) |
| Fruit Tree (*) | Faction base |
| God's Knot (*) | Another champion |
| | Mob (aggressive or not) |
| | Trader |

(*) Champions interact with fruit trees (eat fruit) and knots (mine) on arrival
— these are intentional interactions, not just occupancy.

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
- No champion
- No other mob
- No trader

Wandering only applies to **aggressive** mobs and is probabilistic
(`mob.aggressive && rng < MOB_WANDER_CHANCE` in `mobHarassment.js`); non-aggressive
mobs stay put.

**Enforcement points:**
- `createMobs()` in `entityFactory.js` — spawn filter requires passable terrain with no feature (and excludes `avoidSpawn` tiles such as rivers via `collectSpawnCandidates` in `tileQueries.js`).
- Mob wandering in `runMobHarassment()` in `mobHarassment.js` (invoked from `runWorldTurn()` in `worldSimulation.js`) — checks feature, champion, mob, and trader occupancy.

---

## Trader

Traders follow the same **completely vacant** rule as mobs:

- Passable terrain
- No feature
- No champion
- No mob
- No other trader

**Enforcement points:**
- `createTraders()` in `entityFactory.js` — spawn filter requires passable terrain with no feature (and excludes `avoidSpawn` tiles such as rivers via `collectSpawnCandidates` in `tileQueries.js`).
- Trader movement in `runTraderMovement()` in `traderMovement.js` (invoked from `runWorldTurn()` in `worldSimulation.js`) — checks feature, champion, mob, and trader occupancy.

---

## Utility function

`isVacant(state, key)` in `entityQueries.js` matches the complete-vacancy check
for mobs and traders: passable terrain, no feature, no champion, no mob, no trader.
It is currently referenced only by the test suite — the live spawn and movement
paths use `collectSpawnCandidates` plus inline `occupiedBy*` checks instead.
