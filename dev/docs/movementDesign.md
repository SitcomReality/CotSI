# Movement & Action Points — Design

Redesign of the movement system: variable per-terrain movement costs for every
entity, per-faction and per-mob terrain affinities, multi-step moves, and a
rename of the daily "moves" budget to **action points** (AP).

Companion to `futureWork.md` §1.4. This document is the design; implementation
tracked separately.

---

## 1. Goals

1. **Terrain costs for everyone and everything** — stepping onto a hex costs AP
   by terrain, for champions, traders, and mobs alike.
2. **Interesting movement identity** — factions and mobs move differently:
   Verdant slips through forest, a waterbound mob swims rivers cheaply, an
   amphibious one can cross open water slowly.
3. **Multi-step moves** — one click walks the champion along a path, spending
   AP per hex, stopping when the budget runs out.
4. **Low cognitive load** — no head arithmetic. The UI shows reachability, path
   cost, and remaining AP. Costs are chosen so relative size reads instantly.

Non-goals: no new action types spending AP (combat keeps its own flow; digging,
trade, and base interaction stay free/arrival-triggered). AP is a movement
budget; the name just stops implying "one move = one hex".

---

## 2. The core number: 60

The "lowest common denominator" for a movement budget is **60 AP per day**.

### Why 60

- **60 = LCM(1,2,3,4,5,6)** — the smallest number divisible by every integer
  1–6. It is also divisible by 10, 12, 15, 20, and 30: every terrain cost and
  every faction/mob override in the ladders below divides the pool exactly, so
  **every AP is spendable and all division is clean** (60 AP ÷ forest 12 =
  exactly 5 forest hexes, no remainder confusion).
- **Two digits** — "48/60" reads instantly; 100-scale ("73/100") is a beat
  slower, 120+ is worse.
- **Familiar scale** — minutes in an hour; most people already know 60's
  fractions.
- **⅓ and ½ discounts in whole numbers** — the example that motivated this
  (forest 3 → Verdant 1) works because 3 divides the pool. Any pool not
  divisible by 3 (100, 12 is fine but too coarse — see below) breaks that.

### The cost ladder discipline

A design constraint that is also a feature: **every cost in the system must be
a divisor of 60** (or ∞). This forces a disciplined ladder, keeps every AP
spendable, and makes "how far can I go" always computable with a single mental
division. If a future terrain genuinely needs a cost like 8, the ladder
rebaselines (divide all costs and the pool by 2 → 30, or step up to 120) rather
than adding a non-divisor.

---

## 3. Base terrain cost ladder

Base costs live in the existing `movementCost` field of the `TERRAIN` table in
`src/game/rules/terrainTypes.js` (currently unconsumed placeholder values; the
redesign consumes them).

| Terrain | Cost | Hexes/day (60 AP) | Band |
|---------|------|-------------------|------|
| plains, beach, desert | 10 | 6 | open ground |
| forest, hill | 12 | 5 | medium |
| plateau, marsh | 15 | 4 | slow |
| denseForest | 20 | 3 | very slow |
| river | 30 | 2 | crossing |
| mountain, water, ice | ∞ | 0 | blocked |

Bands are the cognitive shorthand: **open ground cheap, wood and marsh dear,
rivers very dear, mountains/water/ice impassable** — one sentence.

Pacing note: today's champion moves 5–6 hexes/day on open ground (base 5 +
optional bonuses). 60 AP at plains 10 keeps that (6/day) plus +1 from the Spur.
The ladder is one line of params away from any desired pacing (e.g. plains 4 →
15 hexes/day "long-march" feel) — the structure doesn't care.

---

## 4. Effective cost & unified passability

**Passability becomes a cost.** A hex is enterable by an entity if its
effective cost is finite.

```
effectiveCost(entity, tile) = terrainCostOverrides(entity)[tile.terrain]
                              ?? TERRAIN[tile.terrain].movementCost
```

- ∞ = blocked (impassable). `isBlockedForMovement` becomes: effective cost is ∞,
  or tile occupied (champion/mob/trader/base feature) — occupancy rules
  unchanged.
- **Overrides are sparse per-entity tables**, one mechanism for everything:
  a faction's forest discount, a mob's amphibiousness, and (if ever wanted) a
  faction *penalised* on some terrain.
- Override values must also be divisors of 60 (or ∞). This is what makes
  "amphibious" a data entry, not a special case: `{ river: 10, water: 20 }`
  means "crosses rivers at ⅓ cost, can wade open water at ⅔ cost".

Where overrides live:

| Entity | Override source |
|--------|-----------------|
| Champion | Optional `terrainCosts` on the faction entry in `src/game/rules/factionData.js` (pure rules, readable by state and render) |
| Mob | Optional `terrainCosts` on the mob archetype in `src/game/rules/archetypeData/mobs.js` |
| Trader | None — base ladder only |

A new pure helper, e.g. `src/game/rules/movementCosts.js`, exposes
`terrainCost(entity, terrain)` and `isTerrainBlocked(entity, tile)` so all
layers (state, AI, render tooltips) use one source of truth.

---

## 5. Daily AP pools

| Entity | Pool | Notes |
|--------|------|-------|
| Champion | 60 | `CHAMPION_BASE_AP`. +10 Spur artifact (was +1 move). +10 Reverie boon (was +1). × `weather.dayLength`, rounded. Floor `MIN_DAILY_AP = 10` (was 1 hex). Verdant's old flat +1 is *replaced* by its forest affinity (§6) — same identity, more thematic. |
| Trader | 30 | Replaces `TRADER_MOVES_PER_DAY = 2` steps. ~3 plains hexes/day, roughly today's reach; spends per hex like everyone else. |
| Mob | 20 | Wandering budget; enough for 1–2 cheap-terrain steps, 1 river crossing. Harassment stays adjacency-based (no AP). |

Grants and displays that reference "moves" convert to AP: feature rewards
(`featureRewards.js` movement grants → AP, e.g. +10), the dispatch report
"moves" row, and the HUD meter.

---

## 6. Faction movement identities

Starter table — each faction gets **exactly one** signature affinity so
identities stay legible (tunable; the mechanism supports any table). All
override values divide 60.

| Faction | Affinity | Override | Flavor |
|---------|----------|----------|--------|
| Verdant | Forest | `forest: 4, denseForest: 6` | ⅓ cost in woodland — replaces the flat +1 move (Gaia's Wail is about the wild, not speed) |
| Crucible | Highlands | `hill: 6, plateau: 6` | ½–⅖ cost in hills (Scarshield highlanders) |
| Reverie | Marsh | `marsh: 6` | ⅖ cost in marsh (dream-fog walkers) |
| Archive | Rivers | `river: 15` | ½ cost crossing rivers (surveyors who read the land) |
| Hearth | Open ground | `plains: 6, desert: 6` | ⅗ cost on well-trodden paths |
| Masque | Desert | `desert: 6` | ⅗ cost in dunes (veiled nomads) |
| Hollow | Deep wood | `denseForest: 10` | ½ cost in the close wood (nothing is hindered by nothing) |

Design rule: an affinity is a *discount*, never a speed boost on open ground —
that keeps cross-map pacing comparable and makes the choice "which route do I
take" (through my terrain or around it) instead of "am I just faster".

---

## 7. Mob movement identities

Mob archetypes get the same sparse `terrainCosts`. Common capability
templates (written out as literal overrides, not a tag system):

| Capability | Override | Meaning |
|------------|----------|---------|
| Amphibious | `river: 10, water: 20, marsh: 10` | Crosses rivers at ⅓ cost, wades open water slowly, at home in marsh |
| Waterbound | `river: 4, water: 4` | Swims rivers/water at ~open-ground cost; land at base cost (can crawl out) |
| Swimmer | `river: 10, water: 15` | Cheap river crossings, slow open water |
| Marsh-dweller | `marsh: 6, river: 15` | Very cheap marsh, tolerable rivers |

Starter assignments:

| Mob | Override |
|-----|----------|
| Marginal Goose | waterbound (`river: 4, water: 4`) |
| Snail Knight | marsh-dweller (`marsh: 6, river: 15`) |
| Solar Tapir | amphibious (`river: 10, water: 20, marsh: 10`) |
| Infernalpaca, Lunar Leopard, Abusive Mushroom | none (base ladder) |

Consequences to embrace:

- **Rivers become corridors for the right mobs** — a waterbound mob's patrol
  zone includes river and water hexes; champions mostly must ford at cost.
- **Spawn placement follows effective passability** — waterbound mobs may
  spawn on water/river tiles (spawn logic currently keys off the base
  `passable` flag; it must query the mob's own effective cost).
- Champions still never enter water (∞); bases keep `avoidSpawn` on rivers.

---

## 8. Multi-step movement UX (human)

### Model

`movementRange(state, champ)` becomes a **weighted Dijkstra** over effective
costs, returning `{ costs: Map<key, ap>, cameFrom: Map<key, key> }`. The path
to any reachable hex is walked back from `cameFrom`; every hop costs the
target hex's effective cost, deducted from `champ.actionPoints`.

### Interactions

1. **Reachable highlight (minimal)** — the per-refresh highlight is the full
   weighted range, but drawn deliberately understated: thin STATIC hex
   outlines (no fill wash, no animated dashes), batched into a single stroke
   per frame. Hexes in unexplored black fog are never highlighted. (Decided
   in playtesting: the original animated per-hex wash drowned the landscape.)
2. **Hover — terrain cost only** — the tooltip shows the hex's step cost for
   the active champion ("Forest · 12 AP"). No path is computed on hover.
3. **Click to preview → click to confirm (the ONLY move mode)** — the first
   click on a hex computes the route and draws it; the second click on the
   same hex commits the walk. The preview persists until cancelled (Esc or
   clicking the champion's own hex) and survives hovers; clicking a different
   hex moves the preview there. The route line starts at the champion's own
   hex, runs through each path hex, and ends in a distinct white destination
   terminal (outline + center dot). (Decided in playtesting: click-to-walk
   was removed.)
4. **Click beyond budget** — previewing a hex beyond reach shows the
   **longest affordable prefix** of the A* route toward it (futureWork §1.4's
   "farthest reachable tile toward it"); committing walks exactly that prefix.
   The champion stops where the AP runs out; highlights refresh; the player
   continues with another preview.
5. **Combat/trade/base adjacency clicks stay as-is** — those resolve before
   movement, unchanged (they ignore AP entirely, and cancel any pending
   preview).
6. **End of day** — when `actionPoints` hits 0 (or the player ends the turn),
   `pulseEnd` fires as today. `confirmModal` wording "End turn with AP
   remaining?" follows the rename.

### Cognitive-load safeguards

- **Zero arithmetic in normal play**: reachability is precomputed and drawn;
  the previewed route shows the path and its destination, never implied
  numbers.
- **One number in the HUD**: `AP 48/60` (left panel), replacing "Moves 4/5".
- **Costs are shown on hover only** — no per-hex numbers permanently drawn on
  the map (an optional "show terrain costs" debug overlay can come later).
- **Band memory**: the 6-band ladder is learnable as one sentence (§3).
- **Potential for pips or progress bar** — we may consider depicting AP as pips
  (but with a name that doesn't conflict with potency pips) or a progress bar
  that conceals the number, to reduce the cognitive-load further. This will be
  in a later update, but the system we implement now should be designed so that
  it will be easy to make a UX change like this.

---

## 9. Pathfinding & range changes

| Where | Change |
|-------|--------|
| `src/game/state/championMovement.js` | `movementRange` → weighted Dijkstra returning `{costs, cameFrom}`; new `dailyActionPoints()`; `moveChampion` unchanged except spending AP; `adjacentPassable` superseded by the range set (kept only if a passability-only query is still needed) |
| `src/engine/rules/pathfinding.js` | Add a weighted variant (`A*`/Dijkstra with a `stepCost(key)` callback) for bot targeting; keep the BFS `findPath` for anything unweighted (traders don't pathfind — greedy stepping, §11) |
| `src/game/state/championAI.js` | `runBotTurn` walks the weighted path while cumulative cost ≤ AP (today: `steps = min(moves, path.length)`); target scoring keeps hex-distance decay (cheap) — cost-distance scoring is a listed future refinement |
| `src/runtime/botTurnRunner.js` | Execute multi-hop bot moves, deducting AP per hop |
| `src/render/hexmap3d/units/movementAnimator.js` | Chain hops for a path (queue one animation per hop); per-hop duration constant |
| `src/ui/mapTooltip.js`, `src/render/hexmap3d/interaction/hexHover.js` | Terrain cost on hover only (no path computation); route preview is click-to-preview via the pathPreview overlay |
| `src/runtime/mapRefresh.js`, `src/render/overlays/derivedState.js` | `moveHighlights` = weighted range keys (replaces `adjacentPassable`); optional cost-band tinting (phase 2) |

---

## 10. Bot AI

- **Walking** respects costs automatically via the weighted path (§9). Bots
  will naturally route around rivers/wood when cheaper.
- **Search radius** currently uses `champ.baseMove`; convert to `baseActionPoints`
  divided by a typical cost (e.g. ÷10) to keep the same ~hex reach.
- **Scoring decay** stays hex-distance (fine at bot search radii); cost-aware
  scoring is a follow-up, not a blocker.
- **Exploration fallback** already filters `TERRAIN.passable`; it must use the
  champion's own effective cost (a bot that can't cross water shouldn't aim
  across it).

---

## 11. Traders & mob wandering

- **Traders** keep greedy closest-neighbor stepping (`traderMovement.js`) but
  spend from a 30 AP daily pool: step while the best neighbor's effective cost
  ≤ remaining AP. Path selection unchanged (no pathfinding needed at this
  granularity).
- **Mobs** (`mobHarassment.js`) spend from a 20 AP pool when wandering: the
  random neighbor choice filters by effective cost ≤ remaining pool. Mobs
  whose affinity terrains are adjacent (a waterbound goose in a river) will
  drift along them naturally; cheap-terrain neighbors can be weighted up so
  affinity terrains read as "home range" (small tuning knob).
- **Spawn** uses each mob's own effective passability (§7).

---

## 12. Naming & rename table

The budget is called **action points (AP)**. "Move" remains the verb for
stepping a champion onto a hex — the ambiguity the user flagged is in the
*currency*, not the verb.

| Now | Becomes |
|-----|---------|
| `champ.moves` | `champ.actionPoints` (HUD: "AP") |
| `champ.baseMove` | `champ.baseActionPoints` |
| `CHAMPION_BASE_MOVE` (5) | `CHAMPION_BASE_AP` (60) |
| `dailyMoves()` | `dailyActionPoints()` |
| `MIN_DAILY_MOVES` (1) | `MIN_DAILY_AP` (10) |
| `SPUR_MOVE_BONUS` (1) | `SPUR_AP_BONUS` (10) |
| `VERDANT_MOVE_BONUS` (1) | removed — folded into Verdant's forest override |
| `REVERIE_MOVE_BONUS` (1) | `REVERIE_AP_BONUS` (10) |
| `TRADER_MOVES_PER_DAY` (2) | `TRADER_DAILY_AP` (30) |
| `TERRAIN[].movementCost` | stays (it is a movement cost) |
| `movementRange`, `moveChampion`, `isBlockedForMovement` | stay (verb/range names still accurate) |
| `adjacentPassable` | superseded by the weighted range (delete if unused) |
| UI "Moves 4/5", dispatch "moves" row, ledger `'move'` gain, `i-move` icon | "AP 48/60" etc. (icon stays) |

---

## 13. Open tunables (all single-param or single-table changes)

- The whole ladder (§3) — one table in `terrainTypes.js`.
- Faction affinities (§6) — one sparse map per faction in `factionData.js`.
- Mob capabilities (§7) — one sparse map per mob in `archetypeData/mobs.js`.
- Pools (§5) — five constants.
- Whether the Spur (+10 AP) and Reverie (+10 AP) bonuses survive balance pass.
- Reachable-highlight styling (static thin outlines vs a different minimal
  treatment) and the path-preview destination terminal — overlay params.
- Cost-distance bot scoring (follow-up).

---

## 14. Implementation checklist (ordered, when approved)

1. `terrainTypes.js` — set the base ladder (§3).
2. New `src/game/rules/movementCosts.js` — `terrainCost(entity, terrain)` /
   `isTerrainBlocked(entity, tile)`; faction + mob override lookup.
3. `championMovement.js` — weighted Dijkstra `movementRange` (`costs` +
   `cameFrom`), `dailyActionPoints`, AP spending in `moveChampion`.
4. `engine/rules/pathfinding.js` — weighted variant with `stepCost` callback.
5. Params/factories — `CHAMPION_BASE_AP`, `SPUR_AP_BONUS`, `MIN_DAILY_AP`,
   `TRADER_DAILY_AP`, remove `VERDANT_MOVE_BONUS`; faction `terrainCosts`;
   mob `terrainCosts`; `champ.actionPoints` field.
6. Human flow — `hexBridge.js` (range-path click, truncation), animator hop
   chaining, `mapRefresh`/`derivedState` highlight set, `mapTooltip`/`hexHover`
   path preview + cost.
7. Bots — `championAI.js`/`botTurnRunner.js` weighted walking + reachable
   exploration fallback; search-radius conversion.
8. Traders/mobs — AP pools, effective-cost stepping/wandering, mob spawn
   passability.
9. Renames across `turnActions.js`, `factionAbilities.js`, `featureRewards.js`,
   `dispatchReport.js`, `leftPanel.js`, `championViewModel.js`,
   `confirmModal.js`, devtools cheats.
10. Tests — extend `dev/tests/game/state/championMovement.test.js` (weighted
    range, AP budgets, faction/mob overrides), `dev/tests/engine/pathfinding.test.js`
    (weighted variant), `dev/tests/game/terrainTypes.test.js` (ladder divisors);
    run `dev/tests/run.sh` + both import checks.
