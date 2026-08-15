# Decor Composition — motifs, weighted slots, and alternatives

**Status:** design proposal (no code changes yet). Decided in discussion:
structural biome looks fold into the compositional system; presence is a
weighted **slot table**; within-object variety uses an **`alternatives`**
node; the editor gets a redefined Canonical view, spawn-rule controls, and a
tile-strip preview.

This doc is the spec the implementation will follow. It extends
`dev/docs/descriptorAuthoring.md` (which stays the authoritative authoring
guide once the feature ships).

---

## 1. The problem, restated

The decor descriptors (`src/render/hexmap3d/worldObjects/descriptors/data/decor/`)
have two kinds of bloat:

1. **Reskin redundancy** — `beach`, `plains`, `desert`, `marsh`, `plateau`
   each carry ~8 biome-pinned variants that are the *same 4–5 shapes with the
   same transforms*, differing only in `color`, `biomeColor`, and
   `biomeScale`. Example: in `beach.js` the tuft cone (bottomR 0.18–0.2,
   scaleY 0.7–0.8, scaleXZ 1.5–1.6) appears in 7 of 8 variants; the driftwood
   cylinder (localPos x −0.2…−0.24, localAngle ≈ −0.9) in 7 of 8. `desert.js`
   restates a trunk + 1–2 arms + rock + shrub 8 times (55 parts).
2. **No variety per tile** — every part of the selected variant renders on
   every item of every tile. A desert hex is always "cactus + arm + arm +
   rock + shrub"; it can never be "two rocks and no cactus", and a cactus can
   never choose between one straight arm, two straight arms, or an elbow.

The current "one composite object, repeated" model also breaks the authoring
concept of a canonical look: `Canonical` in the editor renders
`descriptor.parts` (the fallback list) with all randomness off — which for
decor is a leftover stub (`forest`/`denseForest` keep a bare `trunk` in it;
`beach`/`plains`/`marsh`/`plateau`/`desert` have **no fallback at all** —
`desert.js`'s only "better cactus" trunk is a commented-out block — so
Canonical shows nothing). With dynamic decor there is no single canonical
object — the rules are the object.

## 2. The model: one vocabulary for every level of choice

**Every choice point in a decor is a weighted pick.** There are three levels,
each handled by one mechanism:

| Level | Question | Mechanism |
|---|---|---|
| Tile | how many items? | `cluster` — the **slot count** (ranges re-tuned: slots now count objects, not composites — §5.5) |
| Slot | which motif is this item? | `motifs` — a weighted table, one draw per slot |
| Item | which configuration? | `alternatives` nodes inside the parts tree |

Biome influence stays **orthogonal** to all three: `biomeColor`/`biomeScale`
tint and size whatever spawned (existing machinery), and per-motif
`biomeWeight` shifts the slot draw. Biome identity is expressed as *tints and
weights*, not as restated geometry.

### 2.1 `motifs` (decor-level, replaces `variants` on the tile path)

```js
motifs: [
  { id: 'cactus', weight: 0.4,
    biomeWeight: { biome_tundra: 0.05, biome_frigid_silence: 0.05, biome_mourning_marsh: 0.1 },
    parts: [ /* a small part tree — may contain groups and alternatives */ ] },
  { id: 'rock', weight: 0.45, parts: [ /* … */ ] },
  { id: 'shrub', weight: 0.2, parts: [ /* … */ ] },
],
```

- `weight` (default 1) — base draw weight. Each of the tile's `cluster` slots
  draws one motif from a uniform `[0, 1)` hash value against the cumulative
  table (`draw < Σw / totalW`). The effective per-biome table is built first:
  `weight × biomeWeight[biomeId]` per motif, with entries whose effective
  weight is 0 **filtered out** — an excluded motif must not shift the
  surviving thresholds, and adding a zeroed motif later must not re-roll
  existing tiles.
- `biomeWeight` (default 1 per biome) — per-biome weight multiplier. A motif
  can be made dominant (weight × 5), rare (× 0.1), or **excluded**
  (× 0) in a biome. It is a *relative* multiplier — the realized share in a
  biome is `w_i / Σw` over the filtered table, not the raw factor. Weights
  are the soft control; `biomeVariants` stays as a hard-pin override for
  looks that must be guaranteed (§5.1).
- **All-excluded fallback:** if a biome's filter leaves zero motifs, fall
  back to the unweighted table (all weights 1, no biomeWeight) — never a
  divide-by-zero, never an unexpectedly empty tile.
- `parts` — same part-tree vocabulary as today (leaves, groups,
  `alternatives`), with `biomeColor`/`biomeScale` doing the per-biome work.
- `motifs` is a **tile-driven decor** concept (`kind: 'decor'`). Features stay
  single-center objects on `variants`; entity kinds keep their
  faction/archetype `variantRule`; `mountain` keeps `variantRule: 'mountain'`.

### 2.2 `alternatives` (a parts-tree node, any kind)

```js
{
  id: 'cactus-arms',
  alternatives: [
    { id: 'none',         weight: 0.25, parts: [] },
    { id: 'one-straight', weight: 0.3,  parts: [ armLeft ] },
    { id: 'two-straight', weight: 0.3,  parts: [ armLeft, armRight ] },
    { id: 'elbow',        weight: 0.15, parts: [ /* group: base + rise, hinged */ ] },
  ],
}
```

- A node with **no** `shape`/`children`/`color`/`stretch` — it is not a shape
  and not a group; it is a **choice point**. Validation rejects the full
  geometry field set (`shape`, `params`, `color`, `materialColor`, `stretch`,
  `biomeColor`, `biomeScale`, `states`, `children`, and `transform` — a
  transparent choice point carries no position of its own). Note this is
  *stricter* than the group rule: groups reject `shape`/`color`/`stretch`/
  `states`/… but **do** carry `transform`; "mirroring the group rule" must
  not be read that loosely.
- Each **item** rolls one alternative (seeded, item-scoped — so a tile with
  two cacti can show two different arm configurations). The chosen `parts`
  tree continues the walk; the node itself emits no record.
- `weight` per alternative (default 1) — same weighted draw as motifs.
- Allowed at any depth (inside motifs, inside groups, even nested inside
  alternatives — each node rolls independently). Available to **all kinds**
  (a feature or mob can use it too); it is purely a parts-tree feature.
  Independence requires a **per-node seed lane**: each node draws from
  `itemHash(tileH, i + nodeSeed)` with its own stable `nodeSeed` (a hash of
  the node's id/path, or an authored `seed` field) — sibling or nested nodes
  sharing the bare `itemHash(tileH, i)` lane would all resolve to the same
  option, fully correlating every level of choice on an item.
- Part ids stay unique across the **whole** tree, alternatives included (two
  co-candidate arms must not share an id — the editor's duplicate-copy
  generates fresh ids). Only the chosen alternative's parts render, but the
  assembler keys meshes by partId from the records that exist, so absent
  parts are simply absent instances.

### 2.3 What this kills

- `beach.js` (8 variants / 44 parts) → ~5 motifs (`tuft`, `driftwood`,
  `stone`, `shell`, `glass`), each 1–3 parts, colors replaced by
  `biomeColor` tints.
- `desert.js` (8 variants / 55 parts) → the worked example in §4.
- The `variants[0]` "default look" convention and the fallback `parts` list
  become meaningless on the decor path and are dropped there (Canonical no
  longer means "fallback parts" — §3.1).
- `optionalGroups` is superseded for decor (a motif with a small weight *is*
  an optional group). It stays in the pipeline for feature-kind use; no new
  work goes into it.

## 3. Pipeline changes

### 3.1 Canonical preview → "Show all"

`recordsForDescriptor(..., canonical = true)` currently renders
`descriptor.parts`, one item, no randomness. Redefine for motif decors:

- **All motifs forced, one item each**, at authored scale, default colors, no
  stretch/jitter, laid out in a row (or ring) so the inventory reads as a
  catalog instead of stacking at the origin (no placement scatter). This is
  the authoring view — every piece you've defined is visible regardless of
  hash luck.
- **Alternatives resolve to their first option** in this view (they are
  separate configs, not simultaneous geometry). The editor's part inspector
  adds a per-node "preview alternative" selector that forces a specific
  option (an explicit-id override on the node path), so each config is
  editable by eye.
- Non-decor kinds (variants path) keep the existing behavior (fallback parts,
  variation-free) — a chest's fallback parts are a real object.

### 3.2 Record building

- **Motif draw:** in `tileRecords.js`, replace the single `variantFor` call
  with per-slot draws. Build the effective per-biome table first (weights ×
  `biomeWeight[biomeId]`, zero-weight entries dropped — §2.1). Slot `i` draws
  from that table using a dedicated reserved seed lane
  (`itemHash(tileH, i + MOTIF_SEED)`), so lone tiles stay deterministic,
  cluster members decorrelate, and the draw is independent of the size and
  placement lanes — same hygiene the size draw already uses (`i + 3`,
  `i + 13`…, `OPTIONAL_GROUP_SEED` = 53 are all separate lanes).
- **Alternative resolution:** `collectPart` gains a resolve step — on an
  `alternatives` node, pick by `itemHash(tileH, i + nodeSeed)` (per-node
  seed, §2.2) and continue the walk with the chosen parts. The context
  already carries `tileH` and `i`; add the node's seed.
- **One shared walk, two sinks:** `recordsForDescriptor` **and**
  `nodeWorldFrames` (the editor's gizmo path) must be refactored into a
  single item walk that both call with a different sink (records array vs.
  `nodeFrames` map) — not two near-identical loops that resolve through one
  helper. They are already copy-paste duplicates of each other's
  canonical/size/placement logic, and they already disagree today:
  `nodeWorldFrames` never emits `optionalGroups` while
  `recordsForDescriptor` does. A shared walk fixes that latent divergence,
  so selection frames match rendered records by construction.
- **Assembler: the `partById` walk must gain motifs.**
  `meshAssembly.buildDescriptorMeshes` currently builds its part lookup from
  `descriptor.parts` and `descriptor.variants[*].parts` only — without a
  walk over `descriptor.motifs[*].parts` (recursing into
  `alternatives[*].parts`, skipping the choice-point nodes), motif parts
  resolve to no geometry/material and are silently skipped. Mesh bucketing
  per partId already handles absent parts (the `optionalGroups` precedent),
  so sparse tiles emit fewer instances — a render win, not a cost — but the
  material/geometry lookup must know the new part trees.

### 3.3 Schema / validation / migration

- `schemaVersion: 6`. New fields: descriptor `motifs`, part-tree
  `alternatives` (node), per-motif `biomeWeight`, per-alternative `weight`.
- Validation: `motifs` array shape (`{ id, weight?, biomeWeight?, parts }`,
  motif ids unique, `parts` validated as a parts list); `alternatives` node
  rejects the full geometry field set (§2.2) and requires
  `alternatives: [{ id, weight?, parts }]` — with one exception: an option's
  `parts` **may be empty** (the `none` case), which `validatePartsList`
  forbids for every other list, so that check must be relaxed for
  alternative options.
- **Global id namespace:** uniqueness moves from the current per-list scope
  (`validatePartsList` gives `descriptor.parts`, each `variant.parts`, and
  each `optionalGroups` list its own `seen` set) to **one set across the
  whole descriptor** — parts + variants + motifs + alternatives +
  optionalGroups — because `meshAssembly` keys meshes by bare partId from a
  merged `partById` map. This is a validation-behavior change, not just a
  doc note.
- `biomeWeight` keys validate against the registered biome id list (the same
  list the editor's biome rows come from) — a typo'd biome id must not
  silently no-op, as `biomeScale`/`biomeVariants` keys do today.
- Migration v5 → v6 (normalize): for `kind: 'decor'` with `variants`,
  convert each variant → a motif (`weight: 1`, `biomeWeight: 1`) and drop
  the fallback `parts` stub. `biomeVariants` is **not carried over as a
  pin** — each pin becomes a strong `biomeWeight` lift (×3–×5) on the motif
  it named, so migrated tiles keep the biome's look dominant while the
  weighted table actually fires. (A kept pin would reproduce the old
  exclusive render and make the new system inert — today `desert.js` pins
  all 8 biomes.) A hard pin remains available as an opt-in escape hatch with
  a precise meaning: a pinned biome forces that motif on **every** slot
  (exclusive). New content should use weights, never pins. Entity kinds and
  `mountain` are untouched.
- `emitDescriptor`/`descriptorDenormalize` strip defaults (`weight: 1`,
  `biomeWeight: {}`) on save, round-trip as today.

### 3.4 Tests / fixtures

- New recordBuilder tests: motif draws are deterministic per tile+slot,
  weights shift with `biomeWeight`, exclusion at weight 0, per-item
  alternative resolution (two items on one tile may differ), lone-tile
  stability.
- Round-trip tests extend to `motifs` + `alternatives`; the golden snapshot
  (`dev/tests/render/fixtures/descriptorData.snap.json`) regenerates — the
  decor records will change as decor files migrate.

## 4. Worked example — `desert.js` under the new model

The shipped file's 8 variants / 55 parts collapse to 6 motifs (~20 parts).
The structurally-different looks (`coldwaste`, `saltflats`, `bonedunes`)
become low-weight motifs with `biomeWeight` lifts, exactly the "fold
everything in" decision:

```js
export const DESERT_DESCRIPTOR = {
  schemaVersion: 6,
  id: 'desert',
  kind: 'decor',
  displayName: 'Desert Growth',
  cluster: { min: 4, max: 7, rule: 'uniform' },   // slot count — each slot is one OBJECT now
                                                  // (was: one full composite); raised to keep
                                                  // tile density (§5.5)
  size: { min: 0.9, max: 1.2 },
  variation: { colorJitter: 0.06 },
  placement: { mode: 'scatter', offsetMin: 0.15, offsetMax: 0.45, separation: 0.42 },
  emphasis: { behavior: 'dispersed' },
  motifs: [
    { id: 'cactus', weight: 0.4,
      biomeWeight: { biome_tundra: 0.05, biome_frigid_silence: 0.05, biome_mourning_marsh: 0.1 },
      parts: [
        { id: 'cactus-trunk', shape: 'cylinder',
          params: { bottomR: 0.1, topR: 0.085, height: 0.55, segments: 6 },
          stretch: { y: { min: 0.9, max: 1.25, seed: 6 }, x: false, z: false },
          color: 0x4c8a4a, biomeColor: { source: 'primary', influence: 0.45 },
          biomeScale: { biome_edenfall: 1.1, biome_dustbleed: 1.05 } },
        { id: 'cactus-arms', alternatives: [
          { id: 'none',         weight: 0.25, parts: [] },
          { id: 'one-straight', weight: 0.3,  parts: [ /* arm cylinder, localAxis hinge */ ] },
          { id: 'two-straight', weight: 0.3,  parts: [ /* arm left + arm right */ ] },
          { id: 'elbow',        weight: 0.15, parts: [ /* group: arm-base + arm-rise, FK hinge
                                                          (the commented-out "better cactus"
                                                          in today's desert.js) */ ] },
        ] },
      ] },
    { id: 'rock', weight: 0.45,
      parts: [ /* dodecahedron, scaleY 0.7/scaleX 1.2, terrain tint */ ] },
    { id: 'shrub', weight: 0.2,
      parts: [ /* cone tuft, terrain tint */ ] },
    { id: 'cold-mound', weight: 0.05,          // was 'coldwaste'
      biomeWeight: { biome_tundra: 0.7, biome_frigid_silence: 0.7 },
      parts: [ /* mound + agave + spar */ ] },
    { id: 'salt-crust', weight: 0.1,           // was 'saltflats'
      biomeWeight: { biome_mourning_marsh: 0.6 },
      parts: [ /* mound + crust + stalk */ ] },
    { id: 'dead-cactus', weight: 0.05,         // was 'bonedunes'
      biomeWeight: { biome_sere_wastes: 0.5, biome_scorch: 0.3 },
      parts: [ /* rib + chip */ ] },
  ],
};
```

Resulting tile behavior matches the request directly: `cluster` draws 4–7
slots, each slot rolls `cactus`/`rock`/`shrub`/… by weight → "1 cactus + 1
rock", "2 rocks", "rock alone" all occur; each cactus then rolls its arm
config → none / one straight / two straight / elbow. Biome identity comes
from `biomeColor` tints, `biomeScale` sizes, and `biomeWeight` skews — no
restated geometry. The same pattern applies to `beach`, `plains`, `marsh`,
`plateau`; `forest`/`denseForest` fold their structural biome looks
(`dead`, `painforest`, `frost`, …) into the table as weighted motifs the same
way.

## 5. Behavior consequences (read before building)

1. **Biome looks become dominant, not exclusive.** `biomeWeight` is a
   *relative* multiplier: a factor of 0.7 against competing motifs in a
   biome does **not** mean "7/10 trees gnarled" — the realized share is
   `w_i / Σw` over the filtered table. That is the point of "fold everything
   in", but it is a change from `biomeVariants`' guarantee. Two escapes:
   `biomeWeight: 0` for *exclusion* (the entry is filtered out of the table,
   §2.1), and a hard `biomeVariants` pin for *guaranteed* looks — a pinned
   biome forces that motif on every slot (exclusive). New content should use
   weights, never pins. Tune in the editor (§6) — weights are the first
   thing to eyeball on a strip.
2. **Lone tiles** (cluster min = 1) draw their motif from the dedicated
   `itemHash(tileH, 0 + MOTIF_SEED)` lane — deterministic per tile, stable
   across rebuilds, and independent of the size/placement lanes.
3. **Snapshot churn** — decor records change as each file migrates; the
   golden fixture regenerates once per migration, not per keystroke.
4. **Authoring ergonomics depend on the tile-strip** (§6.3) — a single-tile
   preview cannot show that a desert *population* is varied; the strip is the
   acceptance view.
5. **Slot count now counts objects, not composites — raise `cluster`
   ranges.** Today `cluster: 2–4` means 2–4 full composites (cactus + rock +
   shrub ≈ 5 parts each); under motifs each slot is one object (a cactus, a
   rock, a shrub), so the same range renders ~3× sparser. Re-tune `cluster`
   per decor during migration (§7.3) — the §4 example already shows
   `min: 4, max: 7`.
6. **Duplicates are allowed, unconstrained.** Independent per-slot draws can
   yield four identical cacti on one tile. Acceptable for v1; a per-motif
   `maxPerTile` (or "no immediate repeat") is a cheap future extension if
   strips show repetition.

## 6. Editor changes

### 6.1 Motif panel (replaces the Variant section for motif decors)

- Motif list with `weight` (number input); "＋ Add motif", "Duplicate", delete.
- Per-biome weight grid (biome rows × motif columns, numeric) — the
  composition analog of today's per-biome variant pins. Rows come from the
  registered biome list, and the data validator checks `biomeWeight` keys
  against the same list — a typo'd biome id must not silently no-op.
- "Force motif" picker (the current variant picker's role) for authoring one
  motif in isolation.

### 6.2 Alternatives in the part tree + inspector

- Part-tree actions: "Convert selection to alternatives" (wraps selected
  nodes into an `alternatives` node with one option), "Add alternative",
  "Remove alternative", per-alternative `weight`.
- Inspector: selecting an `alternatives` node shows its options with a
  "preview" radio — forces that option in the preview (like the variant
  picker, but node-scoped), and it is what the redefined Canonical view uses
  to show each config.

### 6.3 Tile-strip preview (the diversity acceptance view)

- A 3×3 grid of tiles at different `tileH` values, same biome/terrain, each
  rendered by the existing `showRecords` path at an offset origin. Prefer 9
  *neighboring* `tileH` values (a real neighborhood) over 9 arbitrary hashes
  — that is the population a player actually sees. Re-roll and
  biome/terrain selectors apply to the whole strip.
- Canonical checkbox becomes "Show all" (all motifs forced, §3.1) — orthog-
  onal to the strip (strip = real rolls; Show all = the piece inventory).

## 7. Suggested implementation order

1. Schema v6: `motifs` + `alternatives` + validation (global id namespace,
   empty-option exception, rejected-field set) + migration (variants →
   motifs for decor, `biomeVariants` pins → `biomeWeight` lifts). No data
   changes yet — migration output renders close to v5 (dominant looks, now
   with weight variety) but is **not** byte-1:1; that is the point.
2. Pipeline: per-slot motif draw + per-node alternative resolution, one
   shared item walk for records + frames, the assembler's motif-aware
   `partById` walk, canonical → "Show all". Tests + snapshot regen.
3. Data: migrate decor-by-decor, desert first (§4), then beach/plains/marsh/
   plateau, then forest/denseForest motifs. Re-tune `cluster` ranges (density
   shift, §5.5) and eyeball on the strip.
4. Editor: motif panel (per-biome weight grid), alternatives editing +
   preview, "Show all", tile strip.
5. Docs: fold this spec into `descriptorAuthoring.md` (§4.1, §5.3) and
   `featureDesign.md` §8.3 once the behavior is real.
