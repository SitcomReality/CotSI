# Movement & Hex Occupation — Conventions

The canonical reference for how movement and hex occupation work: the
action-point (AP) budget, terrain movement costs, entity movement identities,
occupancy rules, and the human movement interaction model. Consolidates and
supersedes `dev/docs/movementDesign.md` and `dev/docs/hexOccupationRules.md`.

> **The specifications are still in flux.** The numbers, pools, affinities,
> and some rules below are the *current conventions* — implemented and tested —
> not the final design. In particular, a planned change will allow **pathing
> over** hexes an entity cannot stop on, with some features **collected as you
> pass** without stopping (e.g. passing through a fruit-tree hex and gaining
> its heal mid-route). See [§11 Future directions](#11-future-directions).

---

## 1. Action points (AP)

Movement is budgeted in **action points** per day. Stepping onto a hex costs
AP by terrain; the budget resets at the start of each champion's turn.

- **Champion base pool: 60 AP/day** (`CHAMPION_BASE_AP`). 60 is the smallest
  number divisible by every integer 1–6 (LCM(1..6)) and by 10, 12, 15, 20,
  and 30 — every terrain cost and every faction/mob override below divides it
  exactly, so **every AP is spendable and all division is clean** (60 ÷ forest
  12 = exactly 5 forest hexes). It is two digits ("48/60" reads instantly) and
  familiar (minutes in an hour).
- **Daily composition** (champion): `baseActionPoints` (60) + `SPUR_AP_BONUS`
  (+10 with the Pilgrim's Spur artifact) + `REVERIE_AP_BONUS` (+10 from a
  Reverie dream boon), scaled by `weather.dayLength` (rounded), floored at
  `MIN_DAILY_AP` = 10. Feature rewards can grant AP mid-turn (e.g. +20 from
  the Snowperson or choice rewards).
- **Pools by entity class:**

  | Entity | Daily pool | Notes |
  |--------|-----------|-------|
  | Champion | 60 | +10 Spur, +10 Reverie, × dayLength, floor 10 |
  | Trader | 30 | `TRADER_DAILY_AP` — ≈3 plains hexes/day |
  | Mob | 20 | `MOB_DAILY_AP` — 1–2 cheap-terrain steps, 1 river crossing |

- **Cost-ladder discipline:** every cost in the system must be a divisor of 60
  (or ∞). This forces a disciplined ladder and keeps "how far can I go" a
  single mental division. If a terrain ever needs a non-divisor cost, the
  ladder rebaselines (scale all costs and the pool together, e.g. ÷2 → 30)
  rather than adding a non-divisor.

---

## 2. Terrain movement costs

Base costs live in the `movementCost` field of the `TERRAIN` table in
`src/game/rules/terrainTypes.js`.

| Terrain | Cost | Hexes/day (60 AP) | Band |
|---------|------|-------------------|------|
| plains, beach, desert | 10 | 6 | open ground |
| forest, hill | 12 | 5 | medium |
| plateau, marsh | 15 | 4 | slow |
| denseForest | 20 | 3 | very slow |
| river | 30 | 2 | crossing |
| mountain, water, ice | ∞ | 0 | blocked |

Band memory: **open ground cheap, wood and marsh dear, rivers very dear,
mountains/water/ice impassable** — one sentence.

### Effective cost & unified passability

**Passability is a cost.** A hex is enterable by an entity iff its effective
cost is finite:

```
effectiveCost(entity, tile) = terrainCostOverrides(entity)[tile.terrain]
                              ?? TERRAIN[tile.terrain].movementCost
```

- ∞ = blocked for that entity. There is no separate passability flag in the
  movement path; "can I enter" and "what does it cost" are one lookup.
- **Overrides are sparse per-entity tables** — one mechanism for a faction's
  forest discount, a mob's amphibiousness, or (if ever wanted) a penalty.
  Override values must also be divisors of 60 (or ∞).
- Override sources:

  | Entity | Override source |
  |--------|-----------------|
  | Champion | Optional `terrainCosts` on the faction entry in `src/game/rules/factionData.js` |
  | Mob | Optional `terrainCosts` on the mob archetype in `src/game/rules/archetypeData/mobs.js` |
  | Trader | None — base ladder only |

- Single source of truth: `terrainCost(entity, terrain)` /
  `isTerrainBlocked(entity, terrain)` in `src/game/rules/movementCosts.js`.

---

## 3. Hex occupancy rules

Two layers decide whether an entity may be on a hex: **terrain cost** (above)
and **hard occupancy blocks** (below). Both must pass.

### Hard blocks (apply regardless of terrain cost)

A hex is never enterable when it contains:

- **Another champion** (only the moving champion's own hex is exempt)
- **Any mob**
- **Any trader**
- **A faction base feature**

These are hard blocks at all times — as movement destinations, as path
targets, and as intermediate path hexes.

### Per-entity rules

**Champion** — may stop on any hex whose effective cost is finite: all
passable terrain (plains, forest, deep wood, desert, marsh, hill, plateau,
beach, river) plus feature hexes (fruit tree, God's Knot, treasure chest,
choice features). Arrival interactions fire on entry (`interactOnArrival` in
`src/game/state/arrivalInteractions.js`): eating fruit, mining knots, opening
chests, resolving choice features. **Feature hexes are destination-only in
routing** — paths never pass *through* a feature hex, so the outcome of a
walk always matches its preview (§7; the planned collect-as-you-pass change
is §11). Champions can never enter mountain, broken water, or frozen surface
(∞ for every faction).

**Mob** — may occupy hexes its own archetype can enter (effective cost
finite — so waterbound mobs may occupy river/water) that are otherwise
**completely vacant**: no feature, no champion, no mob, no trader. Aggressive
mobs wander; non-aggressive mobs stay put (§8).

**Trader** — base-ladder passable terrain (never water), otherwise
**completely vacant**: no feature, no champion, no mob, no trader.

**Base** — a faction base owns its hex; no entity ever enters it. `avoidSpawn`
on river keeps bases, champions, mobs, and traders from spawning there.

### Utility

`isVacant(state, key)` in `src/game/state/entityQueries.js` is the
complete-vacancy check (passable terrain, no feature, no champion, no mob, no
trader). Currently referenced only by the test suite — live spawn and
movement paths use `collectSpawnCandidates` plus inline `occupiedBy*` checks.

### Enforcement points (current code)

| Rule | Where |
|------|-------|
| Terrain + occupancy blocking for range | `isBlockedForMovement(state, key, entity)` — `entityQueries.js`, used by `movementRange` |
| Full enterability (terrain + occupancy) for pathing | `canChampionEnter(state, key, champ)` — `entityQueries.js`, used by bot AI and human pathing (`pathToward`) |
| Reachability + path reconstruction | `movementRange` / `pathToKey` / `pathToward` — `championMovement.js` |
| Weighted A* | `weightedFindPath` — `engine/rules/pathfinding.js` |
| Champion spawn/start placement | `collectSpawnCandidates` (`tileQueries.js`) + spawn clearance in `gameFactory.js` |
| Mob spawn (per-archetype passability, incl. water/river) | `createMobs` — `entityFactory.js` |
| Trader spawn (passable, not avoidSpawn, vacant) | `createTraders` — `entityFactory.js` |
| Mob wandering (vacant + affordable) | `runMobHarassment` — `mobHarassment.js` |
| Trader movement (vacant + affordable) | `runTraderMovement` — `traderMovement.js` |
| Arrival interactions | `interactOnArrival` — `arrivalInteractions.js` |

---

## 4. Entity movement identities

Design rule: an affinity is a *discount on its terrain*, never a speed boost
on open ground — cross-map pacing stays comparable, and the choice is "which
route do I take" rather than "am I just faster".

### Factions

Each faction gets exactly one signature affinity (tunable; all values divide
60):

| Faction | Affinity | Override | Flavor |
|---------|----------|----------|--------|
| Verdant | Forest | `forest: 4, denseForest: 6` | ⅓ cost in woodland |
| Crucible | Highlands | `hill: 6, plateau: 6` | ½–⅖ cost in hills |
| Reverie | Marsh | `marsh: 6` | ⅖ cost in marsh |
| Archive | Rivers | `river: 15` | ½ cost crossing rivers |
| Hearth | Open ground | `plains: 6, desert: 6` | ⅗ cost on well-trodden paths |
| Masque | Desert | `desert: 6` | ⅗ cost in dunes |
| Hollow | Deep wood | `denseForest: 10` | ½ cost in the close wood |

### Mobs

Common capability templates (literal override entries, not a tag system):

| Capability | Override | Meaning |
|------------|----------|---------|
| Amphibious | `river: 10, water: 20, marsh: 10` | Crosses rivers at ⅓ cost, wades open water slowly, at home in marsh |
| Waterbound | `river: 4, water: 4` | Swims rivers/water at ~open-ground cost; land at base cost (can crawl out) |
| Swimmer | `river: 10, water: 15` | Cheap river crossings, slow open water |
| Marsh-dweller | `marsh: 6, river: 15` | Very cheap marsh, tolerable rivers |

Starter assignments: **Marginal Goose** waterbound, **Snail Knight**
marsh-dweller, **Solar Tapir** amphibious; Infernalpaca, Lunar Leopard, and
Abusive Mushroom use the base ladder.

Consequences to embrace:

- **Rivers become corridors for the right mobs** — a waterbound mob's patrol
  zone includes river and water hexes; champions mostly must ford at cost.
- **Spawn placement follows effective passability** — waterbound mobs may
  spawn on water/river tiles; everyone else spawns on base-passable land.

---

## 5. Multi-step movement (human interaction)

### Range & path model

`movementRange(state, champ)` computes the weighted reachable set within the
champion's AP pool, returning `{ costs, cameFrom }` (hex key → total AP;
hex key → previous key on the cheapest path). Every hop on a walked path
costs the target hex's effective cost, deducted from `champ.actionPoints`.
The path to any reachable hex is reconstructed by walking `cameFrom`
backwards (`pathToKey`); `pathToward` additionally resolves out-of-range
targets (§7).

### Interaction model (click-to-preview → click-to-confirm — the ONLY move mode)

1. **Reachable highlight (minimal)** — the full weighted range is drawn as
   thin STATIC hex outlines (no fill wash, no animated dashes), batched into
   a single path + stroke per frame. Hexes in unexplored black fog are never
   highlighted. (Decided in playtesting: the original animated per-hex wash
   drowned the landscape.)
2. **Hover — terrain cost only** — the tooltip shows the hex's step cost for
   the active champion ("Forest · 12 AP"). No path is computed on hover.
3. **Click to preview** — the first click on a hex computes the route and
   draws it: a line from the champion's own hex through each path hex, ending
   in a distinct white destination terminal (outline + center dot). The
   preview **persists until cancelled** (Esc or clicking the champion's own
   hex), survives hovers, and moves to a new hex when a different hex is
   clicked. (Decided in playtesting: click-to-walk was removed.)
4. **Click to confirm** — the second click on the same hex commits the walk
   (chained hop animations, AP deducted per hop). The commit **revalidates**
   the path against fresh state — if the world moved (occupants, features, AP
   changes), the player gets a toast instead of a stale walk.
5. **Beyond budget** — previewing a hex beyond reach shows the **longest
   affordable prefix** of the A* route toward it; committing walks exactly
   that prefix. The champion stops where the AP runs out.
6. **Adjacency interactions** — combat, trade, and base clicks resolve before
   movement, ignore AP entirely, and cancel any pending preview.
7. **Camera** — a committed multi-hex walk starts one camera pan whose
   duration matches the walk (hops × 500 ms), so the view glides alongside the
   champion and arrives with it. Manual drags cancel the pan.
8. **End of day** — when `actionPoints` hits 0 (or the player ends the turn),
   the end-turn pulse fires; the confirm modal asks "End turn with AP
   remaining?".

Cognitive-load safeguards: zero arithmetic in normal play (reachability is
precomputed and drawn; the route shows the path and its destination); one
number in the HUD (`AP 48/60`); costs appear on hover only; the 6-band ladder
is one sentence. A pips/progress-bar depiction of AP is a considered future
UX change — the system is designed so that swap is easy.

---

## 6. Pathfinding & range conventions

- `movementRange` is a weighted shortest-path search (FIFO relaxation with
  re-push on improvement — provably optimal for the non-negative ladder, and
  cheaper than a heap at range sizes), capped by the champion's AP pool.
- `pathToward(state, champ, targetKey)` is the single source for every human
  path (preview and commit): in-range targets get the cheapest full path,
  out-of-range targets get the affordable prefix of a weighted A* route.
- **Feature hexes are destination-only in both searches** — never routed
  through (§3, §11).
- `weightedFindPath` (engine, A* with a binary min-heap) takes a
  `stepCost(key)` callback: positive AP cost, `Infinity` = blocked. The
  search is bounded only by `stepCost` — callers MUST return `Infinity` for
  hexes outside the map.
- **Bots** pathfind with the same weighted model: `weightedFindPath` +
  `canChampionEnter`, walking the longest affordable prefix of the route.
  Bot search radius derives from `baseActionPoints` ÷ typical cost (plains);
  the exploration fallback filters by the champion's own effective cost (a
  bot that can't cross water won't aim across it).

---

## 7. Traders & mobs

- **Traders** refill 30 AP each world turn and take greedy closest-neighbor
  steps toward their target base while the best neighbor's effective cost
  fits the remaining pool. Base ladder only — traders never enter water.
- **Mobs** refill 20 AP each world turn. Harassment is adjacency-based (no
  AP). Aggressive mobs wander probabilistically (`MOB_WANDER_CHANCE`),
  stepping through affordable neighboring hexes using their own archetype
  costs — a waterbound goose drifts along rivers, a marsh-dweller through
  marsh ("home range" behaviour).
- **Spawn** uses each entity's own effective passability (§3, §4).

---

## 8. Terminology & naming

"Move" remains the verb for stepping an entity onto a hex; the *budget* is
**action points (AP)**.

| Term | Meaning |
|------|---------|
| AP / `actionPoints` | The daily movement budget on an entity (`champ.actionPoints`) |
| `baseActionPoints` | A champion's pool before artifacts/weather (60) |
| `dailyActionPoints()` | Computes the daily pool (base + Spur + Reverie, × dayLength, floor) |
| `TERRAIN[].movementCost` | Base per-terrain AP cost (∞ = impassable) |
| `terrainCosts` | Sparse per-faction / per-mob override table |
| `terrainCost(entity, terrain)` / `isTerrainBlocked` | Effective cost / blocked check (movementCosts.js) |
| `isBlockedForMovement(state, key, entity)` | Terrain + occupancy blocking for range computation |
| `canChampionEnter(state, key, champ)` | Full enterability check for pathing |
| `movementRange` / `pathToKey` / `pathToward` | Weighted reachability, cheapest-path reconstruction, click-path resolution |
| `moveChampion(state, champ, key, cost)` | Execute one step, spending AP |
| `TRADER_DAILY_AP` (30) / `MOB_DAILY_AP` (20) | Non-champion pools |

---

## 9. Open tunables (single-param or single-table changes)

- The whole base ladder (§2) — one table in `terrainTypes.js`.
- Faction affinities (§4) — one sparse map per faction in `factionData.js`.
- Mob capabilities (§4) — one sparse map per mob in `archetypeData/mobs.js`.
- Pools (§1) — five constants.
- Whether the Spur (+10 AP) and Reverie (+10 AP) bonuses survive the balance
  pass.
- Reachable-highlight styling and the destination terminal — overlay params.
- Cost-distance bot scoring (follow-up).
- AP display (number vs pips/progress bar) — UI change, §5.

---

## 10. Future directions (specifications likely to change)

The exact specifications above are **current conventions, not final**. Known
planned changes:

- **Pathing over non-stoppable hexes** — entities will be able to route
  *through* hexes they cannot stop on (currently everything enterable is
  stoppable, and feature hexes are destination-only).
- **Collect-as-you-pass** — features such as fruit trees may grant their
  effect (e.g. the heal) when an entity passes through the hex, without
  stopping on it.
- These changes will rework the destination-only feature rule (§3), the
  pathing conventions (§6), and the arrival-interaction flow
  (`interactOnArrival`), and will define what "stop" means for turn-end,
  adjacency interactions, and AP spending.
