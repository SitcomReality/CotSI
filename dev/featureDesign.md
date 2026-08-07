# Feature Design — Taxonomy & Placement (DRAFT, pending review)

Working design for the feature-system redesign. Companion to `src/game/rules/archetypeData/features.js`
and the biome feature rules. Status: **design questions answered (Aug 2026)** — implementation
proceeds in phases; the reward mechanics are still in progress (see §6).

---

## 1. Agreed constraints (from design discussion, Aug 2026)

- **No permanent buffs from map features.** Permanent progression stays in the artifact draft,
  combat spoils, and base purchases. Map features grant only:
  - **Finite resources:** relics, potencies, gold, God's Knots — some grant directly (e.g. knots),
    some offer a choice (artifact-draft-style modal).
  - **Replenishable resources:** healing (timer-based regrow, e.g. Moonberry Tree) and temporary
    buffs that expire at the end of the current turn (bonus movement this turn, combat buff for
    combats this turn). Replenishable features re-offer their reward after a regrow timer.
- **Tiered + banded placement.** Better features are more frequent toward the map center, rarer
  toward the edges (see §3).
- **Biome signatures.** Some features spawn in any biome; each biome has exactly one signature
  feature that is exclusive to it (arbitrary instance count — e.g. snowpersons only in Tundra).
- **Treasure Chest** is a new any-biome feature that always rewards gold (simple rectangle mesh
  for now; visuals refined later).
- **De-emphasis preserved.** A feature scoots to the hex edge when an occupant claims the center
  and persists as a reminder until collected. (Visual/spread refinement deferred.)
- **Vocabulary:** one canonical name per thing (see `dev/namingConventions.md` §6). "Manuscript"
  is extinct (Aug 2026): the plain tree is **Tree**, the heal tree is **Moonberry Tree** and its
  fruit are *moonberries*.

## 2. Decisions locked (Aug 2026)

1. **Scorch signature — Saint's Rib.** Removed from Sere Wastes; Ouroboros Loop stays Sere's
   signature. Every biome now has exactly one exclusive signature.
2. **Utility features become one side of a choice.** Features whose old design was pure utility
   (Half-Drawn Obelisk, Fool's-Fire, Ouroboros Loop, Errata Slip, Listener Lichen) offer the
   utility **or** a reward (e.g. "reveal area **or** take gold"). No pure-utility rewards.
3. **No obstacles.** Red-Letter Bramble and Brass Lung Vent are **deleted** (Aug 2026). Purely
   negative tiles don't make exploration more interesting on a random map — they're just annoying.
4. **First choice features:** Null Lily (potency pick), Volvelle (potency pick), Screamroot
   (risk-reward). Implemented via the existing `state.reward` artifact-draft-style modal.
5. **Dead kinds deleted (Aug 2026):** `vine` and `largeTree` (scenery-only kinds with no biome
   rule) are removed from code, tests, and the analysis tool.
6. **Shared-feature dedup.** Waxbloom is Frigid Silence's exclusive (removed from Tundra);
   Saint's Rib is Scorch's exclusive. The remaining shared/any features stay only because they
   are mechanically and thematically distinct: chest = gold, Moonberry Tree = heal, God's Knot =
   resources, Tree/Bush = scenery. The player-facing feature suite stays small and memorable.

## 3. Reward classes

| Class | Subclass | Grants | Expiry | Example |
|-------|----------|--------|--------|---------|
| Finite | direct | relics / gold / knots / potency, fixed amounts | consumed on use (one-shot) | God's Knot, Treasure Chest |
| Finite | choice | pick 1 of 2–3 offers (relic vs gold vs potency…) | consumed on pick | Null Lily, Volvelle, Screamroot |
| Replenishable | heal | HP, on a regrow timer | reward returns after N days | Moonberry Tree |
| Replenishable | temp buff | bonus movement this turn / combat buff this turn | end of current turn | Snowperson, Gilded Initial |

Mechanics already in code: knot mining + moonberry heal/regrow (`arrivalInteractions.js`), the
reward-choice modal pipeline (`state.reward` → reward modal, used by artifact draft and digs),
relic/potency/gold counters on champions. New systems needed: temp-buff state with end-of-turn
expiry, and per-feature regrow timers where reuse makes sense.

## 4. Tiers & banding (placement rule)

| Tier | Meaning | Center bias | Examples |
|------|---------|-------------|----------|
| T1 | Common, small direct rewards | uniform | God's Knot, Moonberry Tree |
| T2 | Uncommon, moderate direct | mild ramp toward center | Treasure Chest, Vegetable Lamb, renewable knot/heal |
| T3 | Rare, choices / relics / potencies / temp buffs | strong center bias (rare near edge) | Palimpsest Slab, Null Lily, Saint's Rib |
| T4 | Very rare, richest center rewards | center only | Errata Slip, Ouroboros Loop, Half-Drawn Obelisk |

**Implemented (Aug 2026)** in `featureSpawning.js` + `FEATURE_TIERS` (worldParams.js):
each tier gates its rules by normalized distance from the map center; a rejected
gate falls through to the next rule, so more common features fill the edge.
Concrete values: `T1 {gate 1.0}`, `T2 {gate 0.55}`, `T3 {gate 0.2}`, `T4 {gate 0,
inner 0.5}` — i.e. T2/T3 ramp linearly to full acceptance at the center, and T4
spawns only inside the inner half of the map. Rules carry their tier on the
biome feature rule (`tier: 'T3'`); rules without one behave as T1 (scenery and
knot/moonberry are untiered). The per-rule gate rolls use their own noise
channel (`NOISE_CHANNEL_FEATURE_TIER` + rule index), so gating is deterministic
and independent of the spawn roll.

Banding is a placement-density function of distance from map center, applied per tier (details in
the terrain-gen phase). Scenery (trees, bushes) is not tiered — it is decor, not collectible.

## 5. Archetype mapping (DRAFT)

Legend: status — **live** (a biome spawns it) / **deleted** (removed Aug 2026). Reward:
**direct** / **choice** / **heal** / **tempbuff**. Scope: **any** (any biome) / **sig** (signature,
exclusive) / **shared** (multiple biomes, not exclusive).

| Kind | Name | Status | Tier | Reward | Class | Scope | Notes |
|------|------|--------|------|--------|-------|-------|-------|
| tree | Tree | live | — | none (scenery) | — | any | grove/solitary decor |
| bush | Scrub Bush | live | — | none (scenery) | — | any | |
| knot | God's Knot | live | T1 | knots, direct | finite | any | works today |
| fruitTree | Moonberry Tree | live | T1 | heal | replenishable | any | works today (18/34, 4d regrow) |
| chest | Treasure Chest | live | T2 | gold, direct | finite | any | rectangle box descriptor; deterministic amount at spawn (10–24g) |
| vegetableLamb | Vegetable Lamb | live | T2 | knots + small heal, direct | finite | sig (Untouched) | |
| witnessStone | Witness-Stone | live | T3 | relic vs gold choice (candidate) | finite | shared (Untouched, Scorch) | |
| screamroot | Screamroot | live | T3 | knots vs damage risk-reward choice | finite | shared (Untouched, Painforest, Mourning Marsh, Dustbleed) | first choice feature — in progress |
| palimpsestSlab | Palimpsest Slab | live | T3 | relic, direct | finite | shared (Untouched, Unfinished Lands) | first relic-on-map feature |
| errataSlip | Errata Slip | live | T4 | utility (terrain change) **or** reward choice | finite | sig (Unfinished Lands) | utility-as-choice |
| gildedInitial | Gilded Initial | live | T3 | tempbuff (combat this turn), choice of buff | replenishable | shared (Untouched, Unfinished Lands) | needs end-of-turn expiry |
| halfDrawnObelisk | Half-Drawn Obelisk | live | T4 | utility (teleport) **or** reward choice | finite | sig (Unfinished Lands) | utility-as-choice |
| volvelle | Volvelle | live | T3 | potency choice (which faction) | finite | sig (Brass Grave) | first choice feature — in progress |
| censerSaint | Censer Saint | live | T3 | risk-reward choice (buff vs cost) | finite | sig (Brass Grave) | |
| scoriaRose | Scoria Rose | live | T2 | knots, renewable (regrow) | replenishable | sig (Brass Grave) | reuse moonberry regrow timer |
| cinderbloom | Cinderbloom | live | T2 | renewable small heal vs overlap | replenishable | sig (Brass Grave) | overlaps Scoria Rose; revisit |
| peridexionTree | Peridexion Tree | live | T3 | heal + tempbuff (combat this turn) | replenishable | sig (Painforest) | |
| drownedCopyist | Drowned Copyist | live | T3 | knots + tempbuff, direct | finite | sig (Mourning Marsh) | |
| foolsFire | Fool's-Fire | live | T3 | utility (teleport) **or** reward choice | finite | sig (Mourning Marsh) | utility-as-choice |
| ouroborosLoop | Ouroboros Loop | live | T4 | utility (turn-return) **or** reward choice | finite | sig (Sere Wastes) | utility-as-choice |
| saintsRib | Saint's Rib | live | T3 | tempbuff (combat this turn) | replenishable | sig (Scorch) | Scorch's signature |
| dustbleedCrystal | Dustbleed Crystal | live | T2 | gold vs potency direct | finite | sig (Dustbleed) | |
| waxbloom | Waxbloom | live | T2 | heal, renewable | replenishable | sig (Frigid Silence) | Frigid's signature |
| listenerLichen | Listener Lichen | live | T3 | utility (reveal) **or** reward choice | finite | shared (Frigid Silence, Sere Wastes) | utility-as-choice |
| snowperson | Snowperson | live | T2 | tempbuff (bonus movement this turn) | replenishable | sig (Tundra) | fun: snowperson grants a push |
| nullLily | Null Lily | live | T3 | potency choice (which faction) | finite | sig (Unfinished Lands) | flagship choice feature — in progress |
| edenMushroom | Eden Mushroom | live | T2 | *open* | — | sig (Edenfall) | |
| edenShroomlet | Shroomlet | live | T2 | *open* | — | sig (Edenfall) | |
| ~~vine~~ | ~~Ground Vine~~ | deleted | — | — | — | — | no biome spawned it |
| ~~largeTree~~ | ~~Elder Tree~~ | deleted | — | — | — | — | no biome spawned it |
| ~~redLetterBramble~~ | ~~Red-Letter Bramble~~ | deleted | — | — | — | — | obstacle — removed per decision 3 |
| ~~brassLungVent~~ | ~~Brass Lung Vent~~ | deleted | — | — | — | — | obstacle — removed per decision 3 |

## 6. Biome signatures (one exclusive per biome — all satisfied Aug 2026)

| Biome | Signature | Status |
|-------|-----------|--------|
| Untouched (default) | Vegetable Lamb | exclusive |
| Painforest | Peridexion Tree | exclusive |
| Edenfall | Eden Mushroom / Eden Shroomlet | exclusive (two-feature set) |
| Brass Grave | Volvelle | exclusive |
| Unfinished Lands | Half-Drawn Obelisk | exclusive |
| Sere Wastes | Ouroboros Loop | exclusive |
| Mourning Marsh | Drowned Copyist | exclusive |
| Frigid Silence | Waxbloom | exclusive (removed from Tundra) |
| Tundra | Snowperson | exclusive |
| Dustbleed | Dustbleed Crystal | exclusive |
| Scorch | Saint's Rib | exclusive (moved from Sere Wastes) |

## 7. Resolved design questions

1. **Scorch signature** — resolved: Saint's Rib (moved from Sere Wastes).
2. **Utility features** — resolved: utility is one side of a choice for the features in question.
3. **Negative features** — resolved: removed entirely (no obstacles).
4. **First choice features** — resolved: Null Lily, Volvelle, Screamroot.
5. **Amounts** — still open. Defaults can be cribbed from dig (`DIG_GOLD_BASE` 7 + 0–12), knot
   (2–3), moonberry (18/34). Settle during the rewards phase with playtesting.
6. **Dead kinds** — resolved: `vine` and `largeTree` deleted.
7. **Shared-feature dedup** — resolved: waxbloom and saintsRib became signatures; the rest stay
   shared only if mechanically distinct.
8. **UI-naming debt** — done (Aug 2026): `mapTooltip.js` displays canonical display names via the
   archetype registry (`getArchetype` → `feature_${kind}` with fallback); the `tree` vs `fruitTree`
   tooltip bug is fixed.
