# Feature Design — Taxonomy & Placement

Working design for the feature-system redesign, and **the contract for authoring
object geometry** (see §8 "Authoring geometry"). Companion to
`src/game/rules/archetypeData/features.js` and the biome feature rules.
Status: **design questions answered (Aug 2026)** — placement and rewards are
implemented; visuals and balance remain to refine (§3a amounts are first-pass
defaults).

---

## 1. Agreed constraints (from design discussion, Aug 2026)

- **No permanent buffs from map features.** Permanent progression stays in the artifact draft,
  combat spoils, and base purchases. Map features grant only:
  - **Finite resources:** relics, potencies, gold, God's Knots — some grant directly (e.g. knots),
    some offer a choice (artifact-draft-style modal).
  - **Replenishable resources:** healing (timer-based regrow, e.g. the Blessed Font) and temporary
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
- **Vocabulary:** one canonical name per thing (see `dev/docs/namingConventions.md` §6). The early
  codex visual-theme word is extinct (Aug 2026): the plain tree is **Tree** (pure
decor — see §8), and the heal feature is the **Blessed Font** (its trader item is
**Healing Salve**).

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
   are mechanically and thematically distinct: chest = gold, Blessed Font = heal, God's Knot =
   resources, Tree/Bush = scenery. The player-facing feature suite stays small and memorable.

## 3. Reward classes

| Class | Subclass | Grants | Expiry | Example |
|-------|----------|--------|--------|---------|
| Finite | direct | relics / gold / knots / potency, fixed amounts | consumed on use (one-shot) | God's Knot, Treasure Chest |
| Finite | choice | pick 1 of 2–3 offers (relic vs gold vs potency…) | consumed on pick | Null Lily, Volvelle, Screamroot |
| Replenishable | heal | HP, on a regrow timer | reward returns after N days | Blessed Font |
| Replenishable | temp buff | bonus movement this turn / combat buff this turn | end of current turn | Snowperson, Gilded Initial |

Mechanics in code (Aug 2026): knot mining + blessed-font heal/regrow
(`arrivalInteractions.js`), the reward-choice modal pipeline (`state.reward` →
reward modal, used by artifact draft, digs, and map-feature choices), and the
**rewards engine** (`src/game/state/features/featureRewards.js`) which implements every
feature reward below: direct grants apply silently (log + ledger + consume),
choice rewards open the modal for humans and apply a deterministic policy for
bots, replenishable features go unripe on a shared 4-day regrow timer
(`FEATURE_REGROW_DAYS`), and temp buffs (`champ.buffs.attack`/`.defense`,
reset in `beginTurn`; `champ.moves` for movement) last until the champion's
next turn start.

## 3a. Reward amounts (final, Aug 2026)

All amounts live in `economyParams.js` as `FEATURE_*` constants (tune here).

| Kind | Class | Reward |
|------|-------|--------|
| palimpsestSlab | direct | +1 relic |
| vegetableLamb | direct | +2 God's Knots, +6 HP |
| dustbleedCrystal | direct | +10 gold, +1 random potency |
| drownedCopyist | direct | +2 God's Knots, +2 defense this turn |
| witnessStone | choice | +1 relic **or** +12 gold |
| screamroot | choice | +6 God's Knots & −8 HP (never fatal) **or** +2 God's Knots |
| nullLily / volvelle | choice | +1 potency of any of the 7 factions (pick) |
| foolsFire / halfDrawnObelisk | choice | +2 movement this turn **or** +8 gold |
| ouroborosLoop | choice | +1 relic **or** +10 gold |
| errataSlip | choice | +1 random potency **or** +10 gold |
| listenerLichen | choice | +1 random potency **or** +8 gold |
| gildedInitial | choice | +3 attack this turn **or** +3 defense this turn |
| censerSaint | choice | +4 attack this turn & −4 HP (never fatal) **or** +8 gold |
| waxbloom | regrow | +10 HP |
| cinderbloom | regrow | +6 HP |
| scoriaRose | regrow | +2 God's Knots |
| peridexionTree | regrow | +8 HP, +2 defense this turn |
| snowperson | regrow | +2 movement this turn |
| saintsRib | regrow | +3 defense this turn |

Bot policy (`botFeatureChoice` in featureRewards.js): choice features never open
a modal for bots — when hurt (≤ 60% HP) they take the conservative side (safe
knots / gold / defense), when healthy the premium side (risky knots / relic /
potency / movement / attack); potency picks roll a random faction like digs.
Bots also score reward-bearing features as path targets (`featureValueForBot` in
`featureRewards.js` + `BOT_FEATURE_SCORES` in aiParams.js) and re-decide after arriving with movement
left over, so movement buffs are used.

Note on the utility features (foolsFire, halfDrawnObelisk, ouroborosLoop,
errataSlip, listenerLichen): decision 2 makes utility one side of a choice. The
teleport / terrain-change / reveal / turn-return utilities themselves are not
yet built, so their first-pass "utility" side is the movement or potency buff —
the choice structure is in place and the utility mechanics can replace that
side later.

## 4. Tiers & banding (placement rule)

| Tier | Meaning | Center bias | Examples |
|------|---------|-------------|----------|
| T1 | Common, small direct rewards | uniform | God's Knot, Blessed Font |
| T2 | Uncommon, moderate direct | mild ramp toward center | Treasure Chest, Vegetable Lamb, renewable knot/heal |
| T3 | Rare, choices / relics / potencies / temp buffs | strong center bias (rare near edge) | Palimpsest Slab, Null Lily, Saint's Rib |
| T4 | Very rare, richest center rewards | center only | Errata Slip, Ouroboros Loop, Half-Drawn Obelisk |

**Implemented (Aug 2026)** in `featureSpawning.js` + `FEATURE_TIERS` (featureSpawnParams.js):
each tier gates its rules by normalized distance from the map center; a rejected
gate falls through to the next rule, so more common features fill the edge.
Concrete values: `T1 {gate 1.0}`, `T2 {gate 0.55}`, `T3 {gate 0.2}`, `T4 {gate 0,
inner 0.5}` — i.e. T2/T3 ramp linearly to full acceptance at the center, and T4
spawns only inside the inner half of the map. Rules carry their tier on the
biome feature rule (`tier: 'T3'`); rules without one behave as T1 (scenery and
knot/blessed-font are untiered). The per-rule gate rolls use their own noise
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
| bush | Scrub Bush | live | — | none (scenery) | — | any | |
| knot | God's Knot | live | T1 | knots, direct | finite | any | works today |
| blessedFont | Blessed Font | live | T1 | heal | replenishable | any | works today (18/34, 4d regrow) |
| treasureChest | Treasure Chest | live | T2 | gold, direct | finite | any | rectangle box descriptor; deterministic amount at spawn (10–24g) |
| vegetableLamb | Vegetable Lamb | live | T2 | knots + small heal, direct | finite | sig (Untouched) | |
| witnessStone | Witness-Stone | live | T3 | relic vs gold choice | finite | shared (Untouched, Scorch) | amounts in §3a |
| screamroot | Screamroot | live | T3 | knots vs damage risk-reward choice | finite | shared (Untouched, Painforest, Mourning Marsh, Dustbleed) | implemented — see §3a |
| palimpsestSlab | Palimpsest Slab | live | T3 | relic, direct | finite | shared (Untouched, Unfinished Lands) | first relic-on-map feature |
| errataSlip | Errata Slip | live | T4 | utility (terrain change) **or** reward choice | finite | sig (Unfinished Lands) | utility-as-choice |
| gildedInitial | Gilded Initial | live | T3 | tempbuff (combat this turn), choice of buff | replenishable | shared (Untouched, Unfinished Lands) | needs end-of-turn expiry |
| halfDrawnObelisk | Half-Drawn Obelisk | live | T4 | utility (teleport) **or** reward choice | finite | sig (Unfinished Lands) | utility-as-choice |
| volvelle | Volvelle | live | T3 | potency choice (which faction) | finite | sig (Titanstain) | implemented — see §3a |
| censerSaint | Censer Saint | live | T3 | risk-reward choice (buff vs cost) | finite | sig (Titanstain) | implemented — see §3a |
| scoriaRose | Scoria Rose | live | T2 | knots, renewable (regrow) | replenishable | sig (Titanstain) | reuse the shared regrow timer — done |
| cinderbloom | Cinderbloom | live | T2 | renewable small heal vs overlap | replenishable | sig (Titanstain) | overlaps Scoria Rose; revisit |
| peridexionTree | Peridexion Tree | live | T3 | heal + tempbuff (combat this turn) | replenishable | sig (Painforest) | |
| drownedCopyist | Drowned Copyist | live | T3 | knots + tempbuff, direct | finite | sig (Mourning Marsh) | |
| foolsFire | Fool's-Fire | live | T3 | utility (teleport) **or** reward choice | finite | sig (Mourning Marsh) | utility-as-choice |
| ouroborosLoop | Ouroboros Loop | live | T4 | utility (turn-return) **or** reward choice | finite | sig (Sere Wastes) | utility-as-choice |
| saintsRib | Saint's Rib | live | T3 | tempbuff (combat this turn) | replenishable | sig (Scorch) | Scorch's signature |
| dustbleedCrystal | Dustbleed Crystal | live | T2 | gold vs potency direct | finite | sig (Dustbleed) | |
| waxbloom | Waxbloom | live | T2 | heal, renewable | replenishable | sig (Frigid Silence) | Frigid's signature |
| listenerLichen | Listener Lichen | live | T3 | utility (reveal) **or** reward choice | finite | shared (Frigid Silence, Sere Wastes) | utility-as-choice |
| snowperson | Snowperson | live | T2 | tempbuff (bonus movement this turn) | replenishable | sig (Tundra) | fun: snowperson grants a push |
| nullLily | Null Lily | live | T3 | potency choice (which faction) | finite | sig (Unfinished Lands) | flagship choice feature — implemented, see §3a |
| edenMushroom | Eden Mushroom | live | T2 | heal, renewable | replenishable | sig (Edenfall) | placeholder amounts; balance pending |
| edenShroomlet | Shroomlet | live | T2 | heal, renewable | replenishable | sig (Edenfall) | placeholder amounts; balance pending |
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
| Titanstain | Volvelle | exclusive |
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
5. **Amounts** — resolved (Aug 2026): see §3a. Defaults cribbed from dig and
   knot; tune via `FEATURE_*` in economyParams.js.
6. **Dead kinds** — resolved: `vine` and `largeTree` deleted.
7. **Shared-feature dedup** — resolved: waxbloom and saintsRib became signatures; the rest stay
   shared only if mechanically distinct.
8. **UI-naming debt** — done (Aug 2026): `mapTooltip.js` displays canonical display names via the
   archetype registry (`getArchetype` → `feature_${kind}` with fallback); the
   early tree-vs-fruitTree tooltip confusion is gone — trees are pure decor
   and features render their canonical names.

---

## 8. Authoring geometry — the designer's contract

This section is the **only required reading** for authoring object geometry —
for an LLM or a human designer generating the JS for game objects. It covers
what a descriptor is, how an object is made to vary (per tile, per biome, per
growth stage), and the editor/save loop. The exhaustive field-by-field
reference lives in `dev/docs/descriptorAuthoring.md`; every shipped descriptor
in `src/render/hexmap3d/worldObjects/descriptors/data/` is a worked example.
The geometry editor (`dev/tools/geometryEditor.html`) authors and tweaks all of
this visually.

### 8.1 What a descriptor is

Every game object's appearance is **one plain-JS data file**:
`data/<kind>/<id>.js` exporting `const <ID>_DESCRIPTOR = { ... }`
(id `blessedFont` → `BLESSED_FONT_DESCRIPTOR`; camelCase splits:
`denseForest` → `DENSE_FOREST_DESCRIPTOR`). Kinds: `decor`, `feature`,
`mountain`, plus entity kinds (`base`, `champion`, `mob`, `trader`, `item`).
A descriptor declares:

- **`parts`** — a tree of shapes with per-part transforms and colors. Shape
  leaves (`cylinder`, `sphere`, `cone`, `torus`, `box`, `dodecahedron`,
  `octahedron`, `lathe`) carry `params`, `transform` (position / rotation /
  non-uniform `scaleX/Y/Z`) and `color`; **groups** (`children` arrays) share
  one transform so sub-assemblies move or hinge together.
- **`cluster`** — how many items share a tile (uniform count, or moisture-
  scaled count), **`size`** — per-item scale range, **`variation`** — per-axis
  stretch ranges + color jitter.
- **`placement`** — where items sit in the hex (`center` / `scatter` / `ring`
  / `jitter`); **`emphasis`** — what happens when a champion or feature claims
  the hex center (`dispersed` / `sunk` / `hidden`).
- **`variants` + `biomeVariants`** — alternate part sets, per biome.
- **`optionalGroups`** — independent per-instance include/exclude sub-objects.
- Part **`states`** — growth-state keyframes for features that refill/ripen.

Every per-tile draw (count, size, stretch, color, placement) is a **pure
function of the tile hash** — the same tile always produces identical
geometry. No randomness, ever.

### 8.2 The rules that shape content

1. **One decor per terrain.** A terrain decor's `id` IS the terrain's id:
   `plains` tiles render the `plains` decor, `forest` → `forest`,
   `denseForest` → `denseForest` (Deep wood), `desert` → `desert`, and so on.
   Different terrains are **separate descriptor files**, never variants of one
   another (`gameBuilder.js`'s `SIMPLE_DECOR_BY_TERRAIN` dispatches by id).
2. **The first variant is the default look.** `variants[0]` renders on every
   tile unless a biome pins an alternate; `biomeVariants: { biomeId: variantId }`
   swaps in a biome-specific look (the `forest` and `denseForest` decors both
   pin the gnarled `painforest` variant for Painforest woods).
3. **Features and decor compose.** A tile resolves to its feature (knot,
   Blessed Font, chest, ...) at the hex center **and** its terrain decor around
   it; decor yields to the feature/occupant via `emphasis`. A feature's `id`
   must equal the `kind` the game state uses.
4. **Supernatural biomes override terrain decor by name.** A biome's
   `terrainOverrides` can rename a terrain and swap its decor (`decor: 'yetlands'`);
   the override decor's id matches the terrain name it decorates (like
   Titanstain's `titanflesh`).

### 8.3 The mechanism menu

| Mechanism | What it does | When to use | Shipped example |
|---|---|---|---|
| `cluster` + `size` | How many items, how big | Scattered ground decor | `forest.js` (moisture-scaled 3–5 trees), `bush.js` |
| `placement` + `emphasis` | Where items sit; how they yield | Most tile decor/features | `forest.js` (ring, dispersed), `plateau.js` (center, sunk) |
| `variation` + part `stretch` | Per-tile stretch/color jitter | Anything organic (trees, reeds) | `forest.js` trunk/canopy |
| `variants` + `biomeVariants` | Alternate part sets, biome-pinned | Biome-specific looks (features/entities; DECOR moved to `motifs` in v6) | base/mob barrels, knot features |
| `motifs` + `repeatPenalty` | Weighted per-slot table: which motif fills each cluster slot (decor v6) | Scattered decor whose tile should MIX objects — "two rocks and no cactus" | `desert.js`, `forest.js`, all decor files |
| `alternatives` | Weighted per-item choice point inside a parts tree (any kind, any depth) | Within-object configs — a cactus choosing none/one/two/elbow arms | `desert.js` `cactus-arms` |
| `optionalGroups` | Per-instance include/exclude sub-objects | "One of several possible things per tile" (legacy — a motif with a small weight IS an optional group; superseded for decor) | synthetic example below |
| part `states.empty` | Growth-state keyframes: parts lerp empty → full as a feature refills/ripens | Replenishable features (Blessed Font water, Peridexion fruit) | `blessedFont.js`, `peridexionTree.js` |
| part `biomeScale` / `biomeColor` | Per-biome size factors / color tinting | Biome-scaled trees, ground-matching decor | `forest.js` (Tundra-stunted), `plateau.js` |
| Canonical view | Variation-free preview (base parts, one item, authored scale) | Authoring check — "what does the default look like?" | editor toggle |

**Optional groups, concretely** — each present group adds one extra item to
the tile when its `chance` rolls (deterministic per tile):

```js
optionalGroups: [
  { id: 'dead-scrub', chance: 0.5, parts: [{ id: 'scrub-twigs', shape: 'cone',
      params: { bottomR: 0.08, height: 0.2 }, color: 0x8a7a55 }] },
  { id: 'sun-bleached-rock', chance: 0.4, parts: [{ id: 'rock', shape: 'dodecahedron',
      params: { radius: 0.09 }, color: 0xd8cfc0 }] },
],
```

**Growth states, concretely** — the part's authored values are its FULL look;
`states.empty` is its depleted look, lerped by the feature's daily `growth`
(0 → 1, one step per day):

```js
{ id: 'font-water', shape: 'cylinder', transform: { y: 0.3 }, color: 0x6fd4e8,
  states: { empty: { scaleY: 0.2, y: 0.14, color: 0x7e99a6 } } },
```

### 8.4 Worked examples to copy from

- **A terrain decor with biome variation** — `data/decor/forest.js` (default
  round trees → gnarled Painforest pin; moisture count; ring placement;
  per-tree stretch; biome size/color). `denseForest.js` is the same pattern
  for deep wood.
- **A simple ground decor** — `data/decor/plains.js`, `data/decor/marsh.js`
  (scatter cluster, dispersed emphasis).
- **A centralized feature with a growth state** — `data/features/blessedFont.js`
  (center placement, `states.empty` water keyframe).
- **A feature with grouped sub-assemblies** — `data/features/openTreasureChest.js`
  (the hinged-lid group: one shared transform swings several parts together).
- **A centralized mound decor** — `data/decor/plateau.js` (center, sunk
  emphasis).

### 8.5 The editor + save loop

1. Open `dev/tools/geometryEditor.html` (served by `dev/tools/geometryEditor/saveServer.sh`,
   which also serves the game) — browse decor/features/items, pick the
   preview tile's terrain/biome, toggle occupied / canonical / growth state.
2. Edit parts, variants, biome pins, optional groups in the inspector; the
   preview re-renders live; the parts list shows which parts are growth-keyed
   (◐ badge).
3. **Save** writes `data/<kind>/<id>.js` (kind-aware paths), refreshes the
   golden snapshot fixture, and the round-trip tests pin that the file
   re-imports exactly. Don't hand-edit a generated file — the next Save
   overwrites it. Hand-authored new descriptors round-trip fine; open + Save
   them in the editor once to adopt them.

The test contract after any geometry change: `node --test` (full suite),
`python3 dev/scripts/check_imports.py`, `check_analysis_imports.py`,
`check_geometry_editor_imports.py`. The descriptor tests
(`dev/tests/render/descriptor*`) and the golden snapshot
(`dev/tests/render/fixtures/descriptorData.snap.json`,
regenerated by `dev/scripts/regenerate_descriptor_snapshot.sh`) are the ones
that catch drift.
