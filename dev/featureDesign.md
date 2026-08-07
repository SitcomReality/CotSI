# Feature Design — Taxonomy & Placement (DRAFT, pending review)

Working design for the feature-system redesign. Companion to `src/game/rules/archetypeData/features.js`
and the biome feature rules. Status: **draft for review** — nothing here is final until the user
signs off; rows marked *open* are explicit questions.

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

## 2. Reward classes

| Class | Subclass | Grants | Expiry | Example |
|-------|----------|--------|--------|---------|
| Finite | direct | relics / gold / knots / potency, fixed amounts | consumed on use (one-shot) | God's Knot |
| Finite | choice | pick 1 of 2–3 offers (relic vs gold vs potency…) | consumed on pick | *open — first candidates below* |
| Replenishable | heal | HP, on a regrow timer | reward returns after N days | Moonberry Tree |
| Replenishable | temp buff | bonus movement this turn / combat buff this turn | end of current turn | *open — candidates below* |

Mechanics already in code: knot mining + moonberry heal/regrow (`arrivalInteractions.js`), the
reward-choice modal pipeline (`state.reward` → reward modal, used by artifact draft and digs),
relic/potency/gold counters on champions. New systems needed: temp-buff state with end-of-turn
expiry, and per-feature regrow timers where reuse makes sense.

## 3. Tiers & banding (placement rule)

| Tier | Meaning | Center bias | Examples |
|------|---------|-------------|----------|
| T1 | Common, small direct rewards | uniform | God's Knot, Moonberry Tree |
| T2 | Uncommon, moderate direct | mild ramp toward center | Treasure Chest, Vegetable Lamb, renewable knot/heal |
| T3 | Rare, choices / relics / potencies / temp buffs | strong center bias (rare near edge) | Palimpsest Slab, Null Lily, Saint's Rib |
| T4 | Very rare, richest center rewards | center only | *open — likely a small set of choice landmarks* |

Banding is a placement-density function of distance from map center, applied per tier (details in
the terrain-gen phase). Scenery (trees, bushes, vines) is not tiered — it is decor, not collectible.

## 4. Archetype mapping (DRAFT)

Legend: status — **live** (a biome spawns it) / **dead** (defined, no biome rule). Reward:
**direct** / **choice** / **heal** / **tempbuff**. Scope: **any** (any biome) / **sig** (signature,
exclusive) / **shared** (multiple biomes, not exclusive).

| Kind | Name | Status | Tier | Reward | Class | Scope | Notes |
|------|------|--------|------|--------|-------|-------|-------|
| tree | Tree | live | — | none (scenery) | — | any | grove/solitary decor |
| largeTree | Elder Tree | dead | — | none (scenery) | — | — | no biome spawns it; keep as decor variant or reclaim later |
| bush | Scrub Bush | live | — | none (scenery) | — | any | |
| vine | Ground Vine | dead | — | none (scenery) | — | — | no biome spawns it; reclaim candidate |
| knot | God's Knot | live | T1 | knots, direct | finite | any | works today |
| fruitTree | Moonberry Tree | live | T1 | heal | replenishable | any | works today (18/34, 4d regrow) |
| chest | Treasure Chest | **live (Aug 2026)** | T2 | gold, direct | finite | any | rectangle box descriptor; deterministic amount at spawn (10–24g) |
| vegetableLamb | Vegetable Lamb | live | T2 | knots + small heal, direct | finite | sig (Untouched) | |
| witnessStone | Witness-Stone | live | T3 | *open*: relic direct vs relic/gold choice | finite | shared (Untouched, Scorch) | dedup question |
| screamroot | Screamroot | live | T3 | *open*: knots vs damage risk-reward choice | finite | shared (Untouched, Painforest, Mourning Marsh) | risk-reward fits "choice" |
| palimpsestSlab | Palimpsest Slab | live | T3 | relic, direct | finite | shared (Untouched, Unfinished Lands) | first relic-on-map feature |
| errataSlip | Errata Slip | live | T4 | *open* (was: terrain change) | — | sig (Unfinished Lands) | utility not in reward palette; re-map or defer |
| gildedInitial | Gilded Initial | live | T3 | tempbuff (combat this turn), choice of buff | replenishable | shared (Untouched, Unfinished Lands) | needs end-of-turn expiry |
| halfDrawnObelisk | Half-Drawn Obelisk | live | T4 | *open* (was: teleport) | — | sig (Unfinished Lands) | same utility question as errataSlip |
| volvelle | Volvelle | live | T3 | *open*: potency choice (which faction) | finite | sig (Brass Grave) | natural artifact-style choice |
| censerSaint | Censer Saint | live | T3 | *open*: risk-reward choice (buff vs cost) | finite | sig (Brass Grave) | |
| scoriaRose | Scoria Rose | live | T2 | knots, renewable (regrow) | replenishable | sig (Brass Grave) | reuse moonberry regrow timer |
| cinderbloom | Cinderbloom | live | T2 | *open*: renewable small heal vs overlap | replenishable | sig (Brass Grave) | overlaps Scoria Rose; dedup question |
| brassLungVent | Brass Lung Vent | live | T3 | *open*: hazard/cost, not a reward | — | sig (Brass Grave) | negative feature — keep? re-map? |
| peridexionTree | Peridexion Tree | live | T3 | heal + tempbuff (combat this turn) | replenishable | sig (Painforest) | |
| drownedCopyist | Drowned Copyist | live | T3 | knots + tempbuff, direct | finite | sig (Mourning Marsh) | |
| foolsFire | Fool's-Fire | live | T3 | *open*: utility (teleport) vs choice | — | sig (Mourning Marsh) | utility question |
| ouroborosLoop | Ouroboros Loop | live | T4 | *open*: utility (turn-return) | — | sig (Sere Wastes) | utility question |
| saintsRib | Saint's Rib | live | T3 | tempbuff (combat this turn) | replenishable | shared (Sere Wastes, Scorch) | dedup: make Scorch's signature? |
| redLetterBramble | Red-Letter Bramble | live | T2 | *open*: hazard/cost | — | shared (Sere Wastes, Scorch) | negative feature question |
| dustbleedCrystal | Dustbleed Crystal | live | T2 | *open*: gold vs potency direct | finite | sig (Dustbleed) | |
| waxbloom | Waxbloom | live | T2 | heal, renewable | replenishable | shared (Frigid Silence, Tundra) | dedup: keep Frigid's signature |
| listenerLichen | Listener Lichen | live | T3 | *open*: utility (reveal) vs potency choice | — | shared (Frigid Silence, Sere Wastes) | utility question |
| snowperson | Snowperson | live | T2 | *open*: tempbuff (bonus movement this turn) | replenishable | sig (Tundra) | fun: snowperson grants a push |
| nullLily | Null Lily | live | T3 | potency choice (which faction) | finite | sig (Unfinished Lands) | the flagship choice feature |

## 5. Biome signatures (one exclusive per biome)

| Biome | Signature | Status |
|-------|-----------|--------|
| Untouched (default) | Vegetable Lamb | exclusive already |
| Painforest | Peridexion Tree | exclusive already |
| Edenfall | Eden Mushroom / Eden Shroomlet | exclusive already (two-feature set) |
| Brass Grave | Volvelle (candidate) | exclusive already |
| Unfinished Lands | Half-Drawn Obelisk (candidate) | exclusive already |
| Sere Wastes | Ouroboros Loop (candidate) | exclusive already |
| Mourning Marsh | Drowned Copyist (candidate) | exclusive already |
| Frigid Silence | Waxbloom (candidate) | **shared with Tundra — needs dedup** |
| Tundra | Snowperson | exclusive already |
| Dustbleed | Dustbleed Crystal | exclusive already |
| Scorch | **none today — needs one** | candidate: Saint's Rib (pull from Sere) or Witness-Stone (pull from Untouched) |

## 6. Open questions for review

1. **Scorch signature** — Scorch currently has no exclusive feature. Pull Saint's Rib from Sere
   Wastes, pull Witness-Stone from Untouched, or invent one?
2. **Utility features** (Half-Drawn Obelisk, Fool's-Fire, Ouroboros Loop, Errata Slip, Listener
   Lichen): keep them as pure utility (contradicts "every feature grants a reward"), re-map them
   to reward classes, or make the utility itself one side of a choice (e.g. "reveal area **or** take
   gold")?
3. **Negative features** (Red-Letter Bramble, Brass Lung Vent): hazards aren't rewards. Keep as
   obstacles (spawned by design, not by reward logic), re-map, or cut?
4. **First choice features** — which 2–3 features get the artifact-draft treatment first? Natural
   candidates: Null Lily (potency pick), Volvelle (potency pick), Screamroot (risk-reward),
   Witness-Stone (relic vs gold).
5. **Amounts** — treasure chest gold, renewable knot/heal amounts, and temp-buff magnitudes are
   all unset. Defaults can be cribbed from dig (`DIG_GOLD_BASE` 7 + 0–12), knot (2–3), moonberry
   (18/34).
6. **Dead kinds** — `vine` and `largeTree` are defined but never spawned. Reclaim as features,
   keep as scenery, or delete?
7. **Shared-feature dedup** — waxbloom, saintsRib, listenerLichen, screamroot, witnessStone,
   gildedInitial, redLetterBramble, errataSlip… currently span multiple biomes. Decide which become
   exclusives (signatures) and which stay shared non-signatures.
8. **Known UI-naming debt** — `mapTooltip.js` displays raw feature kinds (`◈ chest`), not the
   canonical display names. Applies to all features equally (incl. a pre-existing `tree` vs
   `fruitTree` 🍃 bug at line 40). To fix in a UI pass: kind→display-name map (ui/ cannot import
   game/rules, so this needs a data bridge or a ui-side registry).
