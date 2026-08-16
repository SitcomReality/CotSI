# Decor Composition — motifs, weighted slots, and alternatives

**Status: SHIPPED (v6, this branch).** The structural biome looks fold into
the compositional system; presence is a weighted **slot table**; within-object
variety uses an **`alternatives`** node; the editor has a motif panel with
realized shares, spawn-rule controls, an alternatives inspector, and a
tile-strip preview. The implementation landed in the commits tagged
`schema v6` / `motif pipeline` / `v5 → v6 migration shim` / `hand-rewrite` /
`editor: v6 decor composition`; `descriptorAuthoring.md` §5.4 is the
authoritative authoring guide for the shipped feature.

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
  table. Half-open CDF: `draw < cum[i]` per bin, with the **last bin closed**
  (a draw ≈ 1 lands in the last motif, never misses). The effective per-biome
  table is built first: `weight × biomeWeight[biomeId]` per motif, with
  entries whose effective weight is 0 **filtered out** — an excluded motif
  must not shift the surviving thresholds, and adding a zeroed motif later
  must not re-roll existing tiles. **The CDF accumulates over a stable sort
  by motif id**, not array order — inserting or reordering motifs is a
  content edit, never a world-edit (§5.7).
- `biomeWeight` (default 1 per biome) — per-biome weight multiplier. Sparse
  map semantics: **absent key ≡ 1, present 0 ≡ excluded**. A motif can be
  made dominant (weight × 5), rare (× 0.1), or **excluded** (× 0) in a
  biome. It is a *relative* multiplier — the realized share in a biome is
  `w_i / Σw` over the filtered table, not the raw factor. Weights are the
  soft control; `biomeVariants` stays as a hard-pin override for looks that
  must be guaranteed (§5.1).
- **All-excluded fallback:** if a biome's filter leaves zero motifs, fall
  back to each motif's **base `weight`** (ignoring `biomeWeight`) — never a
  divide-by-zero, never an unexpectedly empty tile. The fallback must also
  raise a dev-time validation warning ("biome X excludes all motifs") so a
  typo that zeros the whole table can't ship silently. (Falling back to "all
  weights 1" is explicitly wrong: it makes a `dead-cactus` as common as
  `rock` exactly when the author most needs rarity visible.)
- `repeatPenalty` (decor-level, default 1) — the duplicate-control knob
  (§5.6). After each slot pick, the picked motif's weight is multiplied by
  `repeatPenalty` for the tile's remaining slots and the table renormalized:
  1 = independent draws, 0 = without replacement, ~0.3–0.6 = soft damping.
  Shipping the code path with default 1 means flipping a number later never
  re-rolls tiles that weren't hitting the knob.
- **Per-motif `size` / `placement` overrides** — a rock and a cactus want
  different `offsetMax` and size ranges. A motif may carry its own
  `size: { min, max }` and/or `placement` fields; absent fields inherit the
  decor-level values. The scatter solver may additionally need a per-motif
  `footprint` (visual mass for separation) once cluster counts rise — §5.5.
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
  not be read that loosely. The node **may** carry `seed` (its draw lane,
  below) and `default` (its preview option, below); option entries may
  additionally gain `biomeWeight` in a later rev, so the validator must not
  reject option keys it expects to grow.
- Each **item** rolls one alternative (seeded, item-scoped — so a tile with
  two cacti can show two different arm configurations). The chosen `parts`
  tree continues the walk; the node itself emits no record.
- `weight` per alternative (default 1) — same weighted draw as motifs.
- Allowed at any depth (inside motifs, inside groups, even nested inside
  alternatives — each node rolls independently). Available to **all kinds**
  (a feature or mob can use it too); it is purely a parts-tree feature.
  Independence requires a **per-node seed lane**: each node draws from
  `itemHash(tileH, i + nodeSeed)`. **`nodeSeed` is an authored `seed`
  field** — assigned once when the node is created, never recomputed from
  the node's id or path, because paths are unstable under edits: renaming an
  id, reordering options, or inserting a sibling would otherwise reshuffle
  every in-world roll ("why did my desert change?"). A path-hash is used
  only as a fallback for nodes that predate the field (migration assigns
  stable seeds). Node seeds come from a **reserved range (100–199)** so they
  can never collide with the reserved lanes (`i + 3`, `i + 13`…, 53,
  `MOTIF_SEED`) and silently correlate a choice with size or placement —
  see the seed-lane audit table (§3.2).
- `default` (optional) — the option id that "Show all" and the preview radio
  resolve to. Falls back to the **first non-empty** option (an authored
  `none` must never be the catalog entry). Reordering options must not
  change the preview; migration sets `default` to today's first entry.
- **All-zero options:** if every option's weight is 0 (or the filter empties
  the table), resolve to `default` (or the first option) — never skip the
  node, never a divide-by-zero. Validate `weight >= 0`.
- **The hinge lives outside the choice point.** Because the node cannot
  carry `transform`, a hinged config (a cactus elbow) restates its
  `localPos`/`localAngle` in every option unless you wrap:
  ```text
  group(id: cactus-arms, transform: <hinge>)
    └─ alternatives: [none, one-straight, elbow: group(base + rise)]
  ```
  Spec this pattern in `descriptorAuthoring.md` so the first desert file
  doesn't end up with three copies of the same hinge that drift apart.
- Part ids stay unique across the **whole** tree, alternatives included (two
  co-candidate arms must not share an id). The editor assigns **storage ids
  on commit** — a part added under motif `M` / option `A` stores `M/A/localId`
  (or a short hash) while the tree shows the local name — so authors never
  hand-maintain the global namespace (§6.2). Only the chosen alternative's
  parts render, but the assembler keys meshes by partId from the records
  that exist, so absent parts are simply absent instances.

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
  stretch/jitter, in a **bound-aware** ring or wrapped row (spacing ≈
  `max(aabb) × 1.2`, not a fixed stride — a 6-motif desert row is fine, a
  12–15-motif forest needs wrapping). This is the authoring view — every
  piece you've defined is visible regardless of hash luck. Show all
  **ignores biome tint, `biomeScale`, and `biomeWeight`** (it is the piece
  inventory; the biome selector and the catalog must not fight).
- **Alternatives resolve to `default`, else the first non-empty option**, in
  this view (they are separate configs, not simultaneous geometry). An
  authored `none` must never be the catalog entry. The editor's part
  inspector adds a per-node "preview alternative" selector that forces a
  specific option (an explicit-id override on the node path), so each config
  is editable by eye.
- Non-decor kinds (variants path) keep the existing behavior (fallback parts,
  variation-free) — a chest's fallback parts are a real object.

### 3.2 Record building

- **Motif draw:** in `tileRecords.js`, replace the single `variantFor` call
  with per-slot draws. Build the effective per-biome table first (weights ×
  `biomeWeight[biomeId]`, zero-weight entries dropped — §2.1), **sorted by
  motif id** so array order is never gameplay. Slot `i` draws from that
  table using a dedicated reserved seed lane (`itemHash(tileH, i +
  MOTIF_SEED)`), so lone tiles stay deterministic, cluster members
  decorrelate, and the draw is independent of the size and placement lanes —
  same hygiene the size draw already uses (`i + 3`, `i + 13`…,
  `OPTIONAL_GROUP_SEED` = 53 are all separate lanes). After each pick, apply
  `repeatPenalty` (§2.1) and renormalize before the next slot.
- **Alternative resolution:** `collectPart` gains a resolve step — on an
  `alternatives` node, pick by `itemHash(tileH, i + node.seed)` (authored
  seed from the reserved 100–199 range, §2.2) and continue the walk with the
  chosen parts. The context already carries `tileH` and `i`; add the node's
  seed.
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
  material/geometry lookup must know the new part trees. Notes: motif ids
  and part ids are **separate namespaces** (the assembler keys by part id
  only); and the assembler builds one mesh per partId across *all*
  alternatives (the full vocabulary), which is a net win after the reskin
  collapse but spikes unique meshes on the pre-collapse migration shim —
  another reason the shim must not ship (§3.3).
- **One resolver, two skins.** Motifs, `alternatives`, and (later)
  `optionalGroups` are the same weighted pick: one
  `resolveWeighted(table, draw, { biome })` implementation, three call
  sites. Do not build a second CDF for alternatives — two CDFs will drift.
  (`optionalGroups` is `alternatives` with a `none`; a motif is an
  `alternatives`-shaped entry with a cluster loop around it.)
- **Seed-lane audit table** — reserved offsets; do not reuse them for new
  draws:

  | Lane | Draw source | Purpose |
  |---|---|---|
  | size | `itemHash(tileH, i + 3)` (item 0: `treeHash`) | per-item size |
  | placement | `i + 13` / `i + 17` / `i + 19` / `i + 23` | angle / dist / rotY / scale |
  | tilt | `placement.tiltSeed + i` | per-item lean |
  | optionalGroups | `OPTIONAL_GROUP_SEED` = 53 | presence roll |
  | lift / stretch | authored `seed` per part | per-part range draw |
  | **motif** | `i + MOTIF_SEED` (reserved, e.g. 61) | slot motif draw |
  | **alternatives** | `node.seed` (reserved **100–199**) | per-node option draw |

  Keep new draws out of 3, 13, 17, 19, 23, 53, 61, and 100–199; the
  seed-channel-independence test (§3.4) catches any accidental reuse.

### 3.3 Schema / validation / migration

- `schemaVersion: 6`. New fields: descriptor `motifs`, decor-level
  `repeatPenalty`, part-tree `alternatives` (node with allowed `seed` +
  `default`), per-motif `biomeWeight` / `size` / `placement`,
  per-alternative `weight`.
- Validation: `motifs` is **required non-empty for `kind: 'decor'`** and is
  **mutually exclusive with `variants`** (reject a descriptor carrying both;
  never fall through to `parts`). Shape: `{ id, weight?, biomeWeight?,
  size?, placement?, parts }`, motif ids unique. `alternatives` node rejects
  the full geometry field set (§2.2) but **allows `seed` and `default`**,
  and requires `alternatives: [{ id, weight?, parts }]` — with one
  exception: an option's `parts` **may be empty** (the `none` case), which
  `validatePartsList` forbids for every other list, so that check must be
  relaxed for alternative options. Validate `weight >= 0` on motifs and
  options; validate `default` names an option that exists.
- **Namespace rules:** motif ids and part ids are **separate namespaces** —
  `biomeVariants`, "Force motif", and `default` accept motif/option ids,
  never part ids. Part ids must be unique across the **whole** descriptor
  (one `seen` set over parts + variants + motifs + alternatives +
  optionalGroups) because `meshAssembly` keys meshes by bare partId from a
  merged `partById` map — a validation-behavior change from today's
  per-list scoping, not just a doc note.
- `biomeWeight` keys validate against the registered biome id list (the same
  list the editor's biome rows come from) — a typo'd biome id must not
  silently no-op, as `biomeScale`/`biomeVariants` keys do today. Sparse-map
  semantics: absent key ≡ 1, present 0 ≡ excluded (§2.1).
- Migration v5 → v6 is a **compatibility shim, not shippable content** —
  in-memory only, never written back, and a decor that hasn't been
  hand-rewritten (§7.5) stays v5:
  - For `kind: 'decor'` with `variants`: convert each variant → a motif
    (`weight: 1`), drop the fallback `parts` stub.
  - **Uniquify part ids** (`<variantId>:<partId>` or a short hash suffix)
    and rewrite internal references (states, FK chains, alternative paths).
    This is mandatory, not defensive: `forest.js` already repeats
    `id: 'trunk'` across 9 parts trees and `denseForest.js` across 2 —
    `meshAssembly`'s last-write-wins `partById` is a latent hazard today
    (benign only because reskin variants share shape/params and color rides
    in records). `desert`/`beach`/`plains`/`marsh`/`plateau` already use
    unique prefixed ids.
  - **Preserve exclusivity — do NOT convert pins to ×3–×5 lifts.** A lift
    is not "dominant": ×5 against a 6-motif table is a ~50% share, and a
    file that pins all 8 biomes would render dramatically more mixed than
    v5. The shim must render the old look: keep `biomeVariants` pins (a
    pinned biome forces that motif on **every** slot), which is exactly v5's
    guarantee. Opening the exclusive mix is the *hand-rewrite's* job
    (weights plus `biomeWeight: 0` exclusions), not the migrator's.
  - Pins stay available as an opt-in escape hatch (precise meaning: every
    slot forces that motif) but are **deprecated for new content** — new
    content uses weights.
  - Entity kinds and `mountain` are untouched.
- `emitDescriptor`/`descriptorDenormalize` strip defaults on save, round-trip
  as today — **but only `weight: 1` and `biomeWeight: {}` may be stripped**.
  `weight: 0` and `biomeWeight: { biome_x: 0 }` are meaningful (exclusion)
  and must be preserved.

### 3.4 Tests / fixtures

- New recordBuilder tests — happy path: motif draws are deterministic per
  tile+slot; weights shift with `biomeWeight`; exclusion at weight 0;
  per-item alternative resolution (two items on one tile may differ);
  lone-tile stability; `repeatPenalty` reduces same-tile duplicates as it
  approaches 0 and is deterministic.
- Edge cases: all-excluded biome falls back to base `weight` (never
  all-ones, never empty, warning raised); all-zero `alternatives` resolve to
  `default`/first; pin precedence (pin > force > weights); a pinned biome
  forces its motif on every slot; a **trailing `weight: 0` motif does not
  change existing slot draws**; reordering motifs with the stable-id CDF
  does not change draws; renaming/reordering alternatives with an authored
  `seed` does not change rolls; seed-channel independence (motif draw ≠ size
  ≠ placement ≠ each alternatives node, including nested nodes);
  frames ≡ records partId sets; a typo'd `biomeWeight` id is rejected;
  cross-motif part-id collisions are rejected; migration uniquifies
  colliding ids (the `forest.js` `trunk` case) and rewrites internal refs.
- Migration fidelity gate: for each migrated decor, the pinned biome's
  realized share ≈ v5 (exact pin match) until hand-rewritten.
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
  repeatPenalty: 0.4,   // damp duplicates — 4 cacti on one tile is an accident, not a look (§5.6)
  motifs: [
    { id: 'cactus', weight: 0.4,
      biomeWeight: { biome_tundra: 0.05, biome_frigid_silence: 0.05, biome_mourning_marsh: 0.1 },
      parts: [
        { id: 'cactus-trunk', shape: 'cylinder',
          params: { bottomR: 0.1, topR: 0.085, height: 0.55, segments: 6 },
          stretch: { y: { min: 0.9, max: 1.25, seed: 6 }, x: false, z: false },
          color: 0x4c8a4a, biomeColor: { source: 'foliage', influence: 0.45 },
          biomeScale: { biome_edenfall: 1.1, biome_dustbleed: 1.05 } },
        { id: 'cactus-arms', seed: 101, default: 'two-straight',
          // seed: authored identity — reserved 100–199 lane, never path-derived (§2.2);
          // default: the Show-all catalog entry — never 'none'
          alternatives: [
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
   biome forces that motif on every slot (exclusive). **Precedence, highest
   first: pin > editor force > weights.** New content should use weights,
   never pins; a migrated decor keeps its pins until the hand-rewrite opens
   the mix (§3.3). Tune in the editor (§6) — weights are the first thing to
   eyeball on a strip.
2. **Lone tiles** (cluster min = 1) draw their motif from the dedicated
   `itemHash(tileH, 0 + MOTIF_SEED)` lane — deterministic per tile, stable
   across rebuilds, and independent of the size/placement lanes.
3. **Snapshot churn + persistence** — decor records change as each file
   migrates; the golden fixture regenerates once per migration, not per
   keystroke. If worlds persist *generated records* rather than re-deriving
   them from `tileH`, this is a save migration, not just a fixture regen; if
   they re-derive, every live world changes look on patch (acceptable for
   decor — but tell whoever owns ship nights). Anything that keys off
   rendered records by partId (screenshots, VFX anchors) is a breaking
   content rev.
4. **Authoring ergonomics depend on the tile-strip** (§6.3) — a single-tile
   preview cannot show that a desert *population* is varied; the strip is the
   acceptance view.
5. **Slot count now counts objects, not composites — re-tune by part count,
   not vibes.** Today `cluster: 2–4` means 2–4 full composites (cactus +
   rock + shrub ≈ 5 parts each); under motifs each slot is one object (a
   cactus, a rock, a shrub), so the same range renders ~3× sparser. Target
   **mean part count per tile ≈ the v5 mean**: `newCluster ≈ oldCluster ×
   (avgPartsPerOldVariant / avgPartsPerMotif)`, and gate each migration with
   a part-count histogram over N tile hashes within ~20% of v5 — don't trust
   eyeballing. Also remember 7 shrubs ≠ 7 cacti in visual mass: raise
   cluster counts *and* check the scatter solver on the strip before locking
   ranges (`separation` with 7 draws will stack or starve); a per-motif
   `footprint` for the scatter solver (§2.1) is the real fix. The §4 example
   shows `min: 4, max: 7` as a starting point.
6. **Duplicates: damp them with `repeatPenalty`, not later surgery.**
   Independent draws will give you four identical cacti on one tile. The
   v1 knob is the decor-level `repeatPenalty` (§2.1): after each slot pick,
   multiply the picked motif's weight by `penalty` and renormalize — 1 =
   independent (default; the code path ships live but inert), 0 = without
   replacement, ~0.3–0.6 = soft damping. Because the default is inert,
   flipping a number later only affects tiles that were already hitting the
   knob — no mass re-roll. (A hard per-motif `maxPerTile` remains possible
   but is not needed for v1.)
7. **Renames, reorders, and inserts are not world-edits.** Authored
   `seed`s (not paths) keep alternative rolls stable under edits, and the
   stable-id CDF keeps motif rolls stable under reordering (§2.1, §2.2).
   These are the "why did my desert change" killers; both are tested
   (§3.4).

## 6. Editor changes

### 6.1 Motif panel (replaces the Variant section for motif decors)

- Motif list with `weight` (number input); "＋ Add motif", "Duplicate", delete.
- Per-biome weight grid (biome rows × motif columns) — each cell shows the
  **realized share** `w_i / Σw` for that biome (with a bar), not just the
  raw multiplier: "0.7" is unreadable as a probability, "42%" is not. Rows
  come from the registered biome list, and the data validator checks
  `biomeWeight` keys against the same list — a typo'd biome id must not
  silently no-op. Excluded cells (effective 0) render struck-through.
- "Force motif" picker (the current variant picker's role) for authoring one
  motif in isolation; it accepts **motif ids only** (never part ids). When
  force is on, the tile strip switches to catalog mode (the forced motif on
  every tile) — no mixed "force on, strip still rolling" state.

### 6.2 Alternatives in the part tree + inspector

- Part-tree actions: "Convert selection to alternatives" (wraps selected
  nodes into an `alternatives` node with one option), "Add alternative",
  "Remove alternative", per-alternative `weight`.
- **`seed` is assigned once at node creation** (auto, from the reserved
  100–199 range) and never recomputed — the tree shows it read-only.
  Renaming the node or reordering options must not change it (§2.2).
- Per-node `default` picker (which option Show-all and the preview radio
  resolve to).
- Inspector: selecting an `alternatives` node shows its options with a
  "preview" radio — forces that option in the preview (like the variant
  picker, but node-scoped), and it is what the redefined Canonical view uses
  to show each config. **Selecting a part that lives only inside one option
  auto-switches the preview to that option** (a part in a non-previewed
  option has no gizmo frame).
- "Add group inside option" is a first-class action — the hinged-elbow
  pattern (§2.2) needs it to stay obvious, or authors will ask for
  `transform` on the choice point.
- **Storage ids on commit:** parts added under a motif/option are stored
  with a prefixed id (`M/A/localId`) while the tree shows the local name —
  the global namespace is the editor's job, not the author's (§2.2).

### 6.3 Tile-strip preview (the diversity acceptance view)

- A 3×3 grid of 9 **neighboring hexes** (their real hashes — consecutive
  `tileH` integers are not a neighborhood and may be correlated), same
  biome/terrain, each rendered by the existing `showRecords` path at an
  offset origin. Re-roll and biome/terrain selectors apply to the whole
  strip; a **scrub-seed slider** lets authors land on (and away from) ugly
  hashes instead of gambling on re-roll.
- **Histogram beside the strip** — a 64–128-tile tally of motif counts,
  alternative counts, and duplicate-per-tile rate against the expected
  `w_i / Σw`. Nine tiles cannot tell you whether cactus is 32% or 48%; the
  histogram is the "did I write the weights I think I wrote" view, the strip
  is the "does it look like a place" view. Excluded (weight 0) motifs are
  highlighted for the selected biome.
- Canonical checkbox becomes "Show all" (all motifs forced, §3.1) — orthog-
  onal to the strip (strip = real rolls; Show all = the piece inventory).

## 7. Suggested implementation order

1. **Unify the item walk first** — refactor `recordsForDescriptor` and
   `nodeWorldFrames` onto one walk with two sinks, fixing the
   `optionalGroups` frame divergence, with a characterization test (frames ≡
   records partId sets). Land this alone, no behavior change except "frames
   now emit optional groups" — gizmo regressions only surface by clicking.
2. Schema v6 + validation (global id namespace, empty-option exception,
   allowed `seed`/`default`, `weight >= 0`, biome-id keys, motifs/variants
   exclusivity) with **no migrate-on-save**; fixtures stay v5.
3. Pipeline behind "descriptor has `motifs`": motif draw (stable-id CDF +
   `repeatPenalty`) + per-node alternative resolution (authored seeds), the
   assembler's motif-aware `partById` walk, Show all → `default`/first
   non-empty. Tests against hand-written v6 fixtures (the §4 desert).
4. **In-memory v5 shim**: variant → motif, id uniquify, pins preserved
   (exclusive). Never written back; a decor stays v5 until hand-rewritten.
5. Data: hand-rewrite decor-by-decor — desert first (§4), then
   beach/plains/marsh/plateau, then forest/denseForest (the id-collision
   files). Gate each with the part-count histogram (§5.5), then eyeball
   strip + histogram.
6. Editor: motif panel with realized shares, alternatives editing
   (seed/default/preview-on-select), "Show all", neighborhood strip +
   histogram.
7. Docs: fold this spec into `descriptorAuthoring.md` (§4.1, §5.3) and
   `featureDesign.md` §8.3; plan the `optionalGroups` → alternatives-with-
   `none` sunset (one weighted resolver, §3.2) for a later schema rev.
