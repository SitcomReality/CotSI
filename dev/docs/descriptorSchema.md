# Descriptor Schema Reference

Field-level reference for descriptor data — the schema fields, shape registry,
transforms, part groups, growth states, and how randomization works. Extracted
from [descriptorAuthoring.md](descriptorAuthoring.md) (the entry point: mental
model, units, deliverable). Section numbers follow the original single-file
guide, so internal "§" references still resolve within this file.

---

## 4. Field reference

### 4.1 Top-level fields

| Field | Type | Default | Meaning |
|---|---|---|---|
| `schemaVersion` | int | 7 | Schema version. Write `7` (the current version — decor `motifs` may reference shared library geometry or inline `parts`, §5.4). Older files (v3–v6) auto-migrate on load; the editor rewrites them to the current version on the next Save. |
| `id` | string | — | Canonical id, `[A-Za-z0-9_-]`. For a feature this must equal the feature kind the game state uses (`openTreasureChest`). |
| `kind` | string | — | One of `feature`, `decor`, `mountain`, `base`, `champion`, `mob`, `trader`. |
| `displayName` | string | — | UI name (editor, tooltips). |
| `scale` | number | 1 | Object-level scale multiplier (baked into every item's size). |
| `cluster` | object | `{ min: 1, max: 1, rule: 'uniform' }` | How many items per tile. |
| `size` | object | `{ min: 1, max: 1 }` | Per-item size range (multiplier applied to `scale`). |
| `variation` | object | stretch `[1,1]` per axis, `colorJitter: 0` | Object-level per-axis stretch ranges + color jitter. |
| `variantRule` | string | `'hash'` (when `variants` present) | How a variant is chosen — see §5.3. |
| `placement` | object | `{ mode: 'center' }` | Where items sit inside the hex. |
| `emphasis` | object | `{ behavior: 'none' }` | Behavior when the hex center is claimed. |
| `material` | object | `{}` | Object-level material: `emissive` (0xRRGGBB) + `emissiveIntensity`. **No color here — colors live on parts (v4).** |
| `parts` | array | — | The part list (used when no variant is chosen). |
| `variants` | array | — | Optional alternative part sets (see §5.3). |
| `biomeVariants` | object | — | Per-biome variant pins: `{ biomeId: variantId }` (see §5.3). |

**cluster:**
- `rule: 'uniform'` — count drawn from `[min, max]` by the tile hash.
- `rule: 'moisture'` — count scales with the tile's `moisture`:
  `countsByTerrain` (`{ forest: [3, 5], deepWood: [4, 7] }`, keyed by
  terrain id, `forest` as fallback), `densityRange: [0.55, 0.85]` (moisture
  below the low end → `min`, above → `max`), plus `jitter: 1` hash jitter.

**placement:**
- `mode: 'center'` — one item at the hex center.
- `mode: 'scatter'` — the classic simple-feature rule extended to clusters:
  every member gets its own per-tile offset, spin, and size jitter (~0.8–0.99×),
  so a cluster truly scatters across the hex (item 0 keeps the original
  deterministic single-item roll verbatim — lone objects are unchanged). The
  spread is bounded by `offsetMin`/`offsetMax` (defaults 0.15/0.3) — the chests
  use `offsetMin: 0, offsetMax: 0.1` to hug the hex center. Optional
  `separation` (0) — see below. The size jitter is
  **rigid**: it scales the whole item (geometry *and* the root `localPos`/`lift`
  slots, group hinges, and nested leaf offsets), so a multi-part object stays
  assembled when a scatter tile shrinks it — and the spin rotates each item
  about its own origin, not the hex center.
- `mode: 'ring'` — cluster members in a ring around the center, each leaning
  outward. Optional `ringMin`/`ringMax` (0.18/0.55), `leanMin`/`leanMax`
  (0.045/0.12).
- `mode: 'jitter'` — a loose clump: item 0 sits at a fixed per-tile
  angle/distance (`offset`), the rest of the cluster spreads within 0.5–1.5×
  `offset` of the hex center, each with its own facing and a per-tile lean
  axis. Optional `offset` (0.08), `tiltMin`/`tiltMax` (0/0), `tiltSeed` (1),
  `separation` (0).

`separation` (scatter + jitter, world units, default 0) is the **minimum
distance between cluster members on the same tile** — the offset radii move
items away from the hex center, but no two members can be forced apart by them,
so overlapping clusters (e.g. a tight cactus patch) have no way to spread out.
Set it to your object's footprint width (a cactus with arms reaching ±0.3 wants
`separation` ≈ 0.35–0.45) and cluster members are pushed apart so every pair
ends up roughly that far apart (a deterministic relaxation after the offsets
are drawn — stable per tile, and members may land beyond the offset disc, which
is the point; convergence leaves pairs within ~0.001 world units of the target,
invisible against a 1.0-unit hex). Displaced clusters (dispersal ring / corner
anchor) ignore it.

All lean/tilt (ring `leanMin`/`leanMax`, jitter `tiltMin`/`tiltMax`, and a
part's own `tiltAxis`/`tilt`) **pivots at the part's base** — the bottom stays
planted on the ground (or on `transform.y`/`lift`) and the top swings, rather
than rotating around the shape's center.

Each mode owns a fixed sub-field set (scatter: `offsetMin`/`offsetMax`/
`separation`; ring: `ringMin`/`ringMax`/`leanMin`/`leanMax`; jitter:
`offset`/`tiltMin`/`tiltMax`/`tiltSeed`/`separation`). Fields from other modes
are **inert** and stripped on emit, so switching modes in the editor does not
accumulate stale fields. (Cluster rules
work the same way: `countsByTerrain`/`densityRange`/`jitter` belong to
`moisture` only, `min`/`max` to `uniform` only.)

**emphasis** (`what the object does when the hex center is claimed by an
occupant or feature`):
- `'none'` — stays put (mountains).
- `'dispersed'` — shrinks and steps aside: to a shared upper-left corner anchor
  for a single item, to a ring near the hex edge for a cluster. Centralized
  features (the chests) use this too: any occupant — champion, trader, mob —
  claims the center, so the object steps aside rather than being buried.
- `'sunk'` — shrinks and descends below the surface (hill mounds).
- `'hidden'` — not rendered.

**variation:**
```js
variation: {
  stretchY: [0.9, 1.2],  // per-axis stretch ranges, [min, max]
  stretchX: [0.9, 1.2],
  stretchZ: [0.9, 1.2],
  colorJitter: 0.05,     // ±factor brightness jitter per instance
}
```

### 4.2 Part fields

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Part id, unique within the part set that renders together (the fallback `parts` or one variant's `parts`). Tagged onto records so the assembler groups instances per part. |
| `shape` | string | One of the shapes in §4.3. |
| `params` | object | Shape dimensions; omitted params get the shape's defaults. |
| `color` | int or token string | The part's own color (`0xRRGGBB`), or a named token on entity parts (`factionBase`, `factionAccent`, `factionBody`). **Every part has its own color; there is no object-level color.** |
| `transform` | object | See §4.4. |
| `stretch` | object | Per-part per-axis stretch override: `{ y: { min, max, seed } }`, or `false` to pin an axis at 1 (no stretch). Overrides the object-level `variation` ranges. |
| `biomeScale` | object | Per-biome size factor: `{ biome_tundra: 0.85 }` multiplies the part's scale on tiles of that biome (stunted tundra trees). Scales lift/`localPos` rigidly too. |
| `biomeColor` | object | Per-part biome tint: `{ source: 'foliage' \| 'wood' \| 'soil' \| 'stone' \| 'bloom' \| 'exotic' \| 'terrain', influence: 0..1 }` — mixes the part's color toward the tile's blended biome color by `influence` (see §5.7). Pick the swatch matching the material the part depicts. |
| `states` | object | Growth-state keyframes — the part's look at different regrowth stages (see §4.6). Shape leaves only; groups reject it. |
| `alternatives` | array | **Choice point** (v6): not a shape and not a group — a weighted option table (see §5.4). The node carries `seed` (draw lane) and `default` (preview/catalog option) only; it has no transform, no color, no geometry. Options are `{ id, weight?, biomeWeight?, parts }` (parts may be empty — the `none` option). |
| `chance` | number 0..1 | **Per-node spawn roll** (§5.2): an independent present/absent draw per placed item. Absent ≡ always present; 0 ≡ never. Works on any node kind — shape leaf, group, or alternatives choice point — so siblings roll independently (two arms at `chance: 0.45` yield none / left / right / both without combinatorial authoring). Children of a spawned group all appear together; the geometry editor's canonical preview skips the roll. |

### 4.3 Shape registry

`params` mirror the THREE.js constructor arguments the game's geometry
factories use. Defaults fill omitted params.

| Shape | Params (defaults) | Notes |
|---|---|---|
| `cylinder` | `bottomR` (0.08), `topR` (0.1), `height` (0.4), `segments` (6) | Trunks, stems |
| `cone` | `bottomR` (0.25), `height` (0.72), `radialSegs` (6), `heightSegs` (2) | Canopies, caps |
| `sphere` | `radius` (0.3), `wSegs` (6), `hSegs` (4), `phiStart` (0), `phiLength` (2π), `thetaStart` (0), `thetaLength` (π) | Full or partial spheres |
| `spheroid` | `radius` (0.3), `wSegs` (6), `hSegs` (4) | Stretchable sphere — use transform scale for elongation |
| `torus` | `radius` (0.1), `tube` (0.02), `radialSegs` (4), `tubularSegs` (8), `arc` (2π) | Rings, halos |
| `box` | `width` (0.25), `height` (0.05), `depth` (0.18) | Chests, slabs |
| `cube` | `size` (0.3) | Regular cube; stretch via transform scale |
| `dodecahedron` | `radius` (0.08), `detail` (0) | Crystals |
| `octahedron` | `radius` (0.2), `detail` (0) | Knots (resource nodes) |
| `mountain` | `variant` (`'classic'` \| `'offpeak'`) | Bespoke hex-tiling mountain; carries per-vertex colors |
| `lathe` | — | Bespoke solid of revolution (former "snowperson" shape) |

### 4.4 Transform fields

All optional. `PART_TRANSFORM_DEFAULTS`: `{ y: 0, lift: 0, rotY: 0, scaleX: 1,
scaleY: 1, scaleZ: 1 }`.

| Field | Meaning |
|---|---|
| `y` | Bottom height of the part above the surface (bottom-anchored). |
| `lift` | Raises the part in its own frame, pre-scale (same bottom-height measure as `y` under stretch). |
| `liftRange` | `{ min, max, seed? }` — draws the lift from `[min, max]` by `frac(treeHash(tileH, seed))` instead of a fixed value (default seed 6). Both are bottom-heights; the canopy anchor uses it with the trunk's stretch seed so the canopy bottom tracks the per-tree trunk stretch (§5.3). Root-only, like `y`/`lift`. |
| `rotY` | Spin around the world Y axis (radians). |
| `scaleX`, `scaleY`, `scaleZ` | Independent non-uniform scale (base 1). May also be a **range form** `{ min, max }` — one draw per node per item (§5.2), so a whole subtree scales rigidly per instance while children keep their relative layout. |
| `localPos` | `{ x, y, z }` offset within the part's frame; pre-scaled with the item's rigid scale factor (item scale × dispersal × scatter jitter, plus `biomeScale`). `localPos.y` is the same vertical offset slot as `lift` — the two **stack** (both raise the part). Each axis may also be a **range form** `{ min, max }` (one draw per node per item, §5.2) — e.g. an arm anchored at a random height on a trunk: `{ x: -0.1, y: { min: 0.18, max: 0.3 }, z: 0 }`. |
| `localAxis` + `localAngle` | Rotation about an arbitrary axis in the part's **local frame**. The axis is a **direction** — magnitude is ignored (normalized at render), so `{ x: -3, y: 4, z: 4 }` means the same as `{ x: -0.47, y: 0.62, z: 0.62 }`. Both fields are required together. |
| `tiltAxis` + `tilt` | World-space lean about a horizontal axis: `tiltAxis` is `{ x, z }` (direction only, normalized at render), `tilt` the lean angle. Both required together. |

### 4.5 Part groups (nesting)

A part is either a **shape leaf** (`shape` + `params`, as above) or a **group**:
a node with a `children` array and **no** `shape`/`params`/`color`/`stretch`/
`biomeColor`/`biomeScale` of its own (groups have no geometry — validation
rejects those fields). `parts` (or one variant's `parts`) is a tree: root nodes
may be leaves or groups, and groups recurse. Part ids must be unique across the
**whole** tree, not just one list (records/InstancedMeshes are keyed by
partId).

**Root vs nested transforms.** Root leaves keep every transform field from
§4.4 — `y`/`lift` ground them and `tiltAxis`/`tilt` lean them in world space.
Nested leaves and groups carry only `localPos`, `localAxis` + `localAngle`,
`rotY`, and `scaleX/Y/Z` — `y`/`lift`/`liftRange`/`tilt` are **root-only**
(nested nodes have no grounding; their position is purely relative to the
parent). Validation rejects those fields on nested nodes.

**Why groups exist.** Sub-assemblies that must move (or hinge) together — the
open chest's lid + straps, a censer's chain — used to be hand-duplicated
numbers across parts. A group shares one transform: moving/rotating the group
moves every child rigidly, and rotation happens about the group's `localPos`
point (a **pivot/hinge** — the flat model can only rotate each part about its
own bottom-center).

**Rendering.** Groups emit no records; nested leaves emit a precomputed world
`matrix` (16 floats, THREE column-major) instead of the flat record fields
(`recordBuilder` composes every ancestor group frame, then the leaf's own
frame — see [§6](descriptorPipeline.md)). `buildInstanced` applies it directly, so the render structure
and performance are unchanged.

**Worked hinge example — the open chest lid.** This is the actual `group-1`
from `openTreasureChest.js` (shown in full in [§8](descriptorExamples.md)).
The group's `localPos` sits
at the hinge (the chest's back-top edge), and the children are placed in the
closed-lid frame so their back edge lands on the hinge axis:

```js
{ id: 'group-1',                   // group — no shape
  transform: { localPos: { x: 0, y: 0.15, z: 0.125 },   // hinge: chest back-top
              localAxis: { x: 1, y: 0, z: 0 }, localAngle: 1 },  // swing open
  children: [
    { id: 'chest-lid-open', shape: 'box', params: { width: 0.35, height: 0.08, depth: 0.25 },
      transform: { localPos: { x: 0, y: 0, z: -0.125 } } },   // back edge on the hinge
    { id: 'iron-strap-lid-left', shape: 'box', params: { width: 0.031, height: 0.1, depth: 0.255 },
      transform: { localPos: { x: -0.1, y: 0, z: -0.125 } } },
    { id: 'iron-strap-lid-right', shape: 'box', params: { width: 0.031, height: 0.1, depth: 0.255 },
      transform: { localPos: { x: 0.1, y: 0, z: -0.125 } } },
  ] }
```

Rotating the group's `localAxis`/`localAngle` swings the lid + straps rigidly
about the hinge. **Author groups in the geometry editor** (`dev/tools/geometryEditor.html`:
"Nest into group", "move into group", "Move out of group", "Ungroup") — the
editor keeps the transforms exact, and Save round-trips the tree.

### 4.6 Growth states (regrowth / ripening)

Features that replenish (the Blessed Font's water, the Peridexion Tree's
fruit, any future regrow-class reward) can change appearance as they refill.
Each day, `featureRegrowth.js` advances the feature's continuous `growth`
0 → 1 (one step of `1/regrowDays` per world turn); the render lerps keyframed
parts between their **empty** look (growth 0) and their authored **full** look
(growth 1). There is no real-time animation — the object simply sits one step
closer to full each day, and the chunk rebuild shows it.

A part opts in with a `states` field; only the `empty` keyframe exists today —
**the part's base values ARE the full state**, so descriptors without `states`
render identically at every growth and never carry the field:

```js
{ id: 'font-water', shape: 'cylinder',
  params: { bottomR: 0.2, topR: 0.2, height: 0.02 },
  transform: { y: 0.3 },                 // full: water brims at the rim
  color: 0x6fd4e8,                       // full: vivid
  states: {
    empty: {                              // growth 0: dry font
      scaleX: 0.35, scaleY: 0.2, scaleZ: 0.35,   // a tiny puddle
      y: 0.14,                            // low in the bowl
      color: 0x7e99a6,                    // dull
    },
  },
}
```

Each field the keyframe lists lerps from the empty value to the base over
growth 0 → 1; unlisted fields keep their base at every growth. Supported
keyframe fields:

| Field | Meaning |
|---|---|
| `scaleX`, `scaleY`, `scaleZ` | Per-axis scale multipliers at growth 0 (e.g. `scaleY: 0.2` = a flat puddle that swells upward as it fills). |
| `y` | Root-leaves only: the bottom height at growth 0 (e.g. the puddle sitting low in the bowl). |
| `localPos` | `{ x, y, z }` — nested leaves only: the position in the parent frame at growth 0. |
| `color` | The color at growth 0, channel-lerped to the base color (e.g. unripe green → ripe amber). |

Only shape leaves carry `states` (groups have no visuals — validation rejects
it). Per-instance variation still applies **on top**: stretch/`biomeScale`
scale and color jitter/biome tint run after the state lerp, so a half-grown
font still jitters like any other tile.

**In the geometry editor:** the "State" toggle (`full — growth 1` /
`empty — growth 0`) switches the preview between the two keyframes; with
"empty" selected, the inspector's Y / localPos / scale / color rows edit the
`states.empty` keyframe (the part list marks keyframed parts with a ◐ badge).
The game state drives `growth` in play; the editor just authors the two
keyframes.

## 5. How randomization works

Every tile-driven decision is a pure function of the tile — a deterministic
hash (`tileHash(tile)` and per-item `treeHash(tileH, i)`) — so the same tile
always produces identical records across rebuilds. There is no `Math.random`
anywhere. The pipeline (recordBuilder.js):

1. **Count** — `cluster` rule picks the item count (§4.1).
2. **Variant** — `variantRule` picks one variant's part set (§5.3).
3. **Per item `i`** (0 … count−1):
   - **Item scale** — `scale × lerp(size.min, size.max, frac(treeHash(tileH, i + 3)))`, so cluster members vary in size.
   - **Placement** — mode-dependent offset/rotation/lean inside the hex (§4.1), overridden by dispersal when displaced.
   - **Per part** — the part's transform composes onto the item: non-uniform scale, per-axis stretch (`part.stretch` wins, else `variation.stretchX/Y/Z`), scatter size jitter, `biomeScale` factor; grounding bakes the shape's base offset into `y`; rotation (`rotY` + placement spin, `localAxis`/`localAngle`, `tiltAxis`/`tilt`) passes through to the record; `lift`/`localPos` are pre-scaled by item scale.
   - **Color** — `jitteredColor(part.color, variation.colorJitter, …)` gives each instance a small brightness jitter; then the per-part `biomeColor` tint mixes the result toward the tile's blended biome color (§5.7).

### 5.2 Per-node variation: chance and ranged transforms

Two mechanisms layer onto the per-part step above (transformVariation.js,
resolved at the top of the parts-tree walk):

- **`chance`** — each node with a `chance < 1` rolls an independent
  present/absent draw per item. Because every node rolls for itself,
  alternatives-style combinatorial option tables are usually unnecessary:
  N optional limbs = N nodes, not 2^N options.
- **Range-form transforms** — `{ min, max }` on `localPos.x/y/z` or
  `scaleX/Y/Z` draws one value per node per item. Apply the range on a
  GROUP to move/scale a whole sub-assembly rigidly: children inherit the
  drawn transform, so e.g. an arm group with ranged `scaleX` lengthens its
  stub AND carries its rise/tip children along with it.

Both draws come from one lane keyed by (tile hash, item index, node id):
renaming a node reshuffles only that node's draws. Prefer the range-on-group
form over per-child ranges when the pieces must stay attached.

Two decor-path notes: center-placed **decor** items draw a full-circle
facing (`CENTER_ROTATION_SEED`, lane i+29) so authored left/right biases
don't read in play — features keep their authored facing. And on the game
path the tile hash is salted with the world seed (`saltedTileHash`), so
decor layouts differ between worlds; the editor and tests use the unsalted
pure-(q,r) hash.

### 5.3 Variant selection

> **v7:** the DECOR path moved to the weighted `motifs` table — see §5.4.
> Variants + `biomeVariants` pins remain for **features and entity kinds**.
> A legacy decor file still loads — `normalizeDescriptor` auto-migrates it in
> memory on load.

**What variants are and where they apply.** A `variants` array holds
alternate part sets, and `variantRule` decides which one renders. This is the
selection mechanism for **features and entity kinds** (a faction's champion
model, a feature's per-biome look). Decor no longer uses it — a decor's
variety comes from its weighted `motifs` table (§5.4) instead.

So on the tile path the variant dimension is the **biome**, via pins:

- **`variants[0]` is the DEFAULT look** — every tile renders it unless a biome
  pins an alternate. Put the canonical look first, alternates after.
- **`biomeVariants`** — `{ biomeId: variantId }` pins an alternate to a biome:
  every tile of that biome renders it. This stays for **features and entity
  kinds**; decor does not pin whole looks (its per-biome variety is the
  `motifs` table's `biomeWeight` skews instead, §5.4).
- **Explicit picker** — the editor's Variant picker (a record-path
  `variantId` override) forces one variant while authoring; a stale id falls
  through.

Precedence (highest first): explicit picker → `biomeVariants[biomeId]` →
default (`variants[0]`). A descriptor with `biomeVariants` never hash-rolls —
variants are biome alternates, not per-tile lottery content.

`variantRule` remains for the two non-biome cases:

- `'mountain'` — mountain roll over the `classic`/`offpeak` variants: hash
  raw `(q, r)` with `MOUNTAIN_HASH_SEEDS` (`((q·13 + r·7)·19) % 100`).
- `'hash'` (default) — roll over the variant list by tile hash. Kept for
  content that genuinely wants hash-chosen variants; no current decor uses it.
- `'faction'` / `'archetype'` — **entity-driven**: variant id must equal the
  entity's `faction` (e.g. `'CRU'`) or `archetype` (e.g. `'bear'`); unknown
  values fall back to the first variant.

Old files that used the retired `'cluster'`/`'solitary'` rules auto-migrate on
load.

**In the geometry editor:** the object controls list every registered biome
with one variant select per row ("— default look" clears a pin), and the
preview bar's Biome selector renders the pinned looks — switch the biome to
view its pinned variant. (The preview tile's terrain is derived from
the descriptor — each decor is bound to the terrain its id names — so there
is no terrain selector.)

**Creating a new variant** — the "＋ Duplicate" button in the Variant section
copies the currently edited look (the active variant's parts, or the fallback
`parts` list when the object has no variants yet — that list is converted into
the default variant first, preserving the `variants[0]` convention) into a
brand-new variant and selects it for editing. Reshape the copy, then pin it to
a biome in the Per-biome variants section. The duplicate workflow is the whole
point of the per-biome variants system for features and entities: one default
look plus a pinned alternate per biome. (Decor variety uses the `motifs`
table instead — the editor's Motif panel, §5.4.)

### 5.4 Decor composition: motifs, alternatives, and weights (v7)

Every choice point in a decor is a weighted pick, and there are three levels:

| Level | Question | Mechanism |
|---|---|---|
| Tile | how many items? | `cluster` — the slot count (slots now count OBJECTS, not composites) |
| Slot | which motif is this item? | `motifs` — a weighted table, one draw per slot |
| Item | which configuration? | `alternatives` nodes inside the parts tree |

**`motifs`** (decor-level, replaces `variants` on the decor path):

```js
motifs: [
  { id: 'cactus', weight: 0.4,
    biomeWeight: { biome_tundra: 0.05, biome_mourning_marsh: 0.1 },
    parts: [ /* a small part tree — groups and alternatives allowed */ ] },
  { id: 'rock', weight: 0.45, parts: [ /* … */ ] },
],
```

- `weight` (default 1) — base draw weight. Each slot draws one motif from the
  table via a uniform hash value against the cumulative weights. **The CDF
  accumulates over a stable sort by motif id** — inserting or reordering
  motifs is a content edit, never a world-edit.
- `biomeWeight` (default 1 per biome) — a per-biome weight *multiplier*:
  **absent key ≡ 1, present 0 ≡ excluded**. The realized share in a biome is
  `w_i / Σw` over the filtered table — a factor of 5 makes a motif DOMINANT,
  not exclusive (use `biomeWeight: 0` to exclude). `biomeVariants` pins remain
  but are deprecated for new content — prefer `biomeWeight` in the motif table.
- **All-excluded fallback** — if a biome excludes every motif, the draw falls
  back to each motif's base `weight` (never empty, never all-ones), and
  validation warns.
- `repeatPenalty` (decor-level, default 1) — the duplicate-control knob: after
  each slot pick, the picked motif's weight is multiplied by it and the table
  renormalized. 1 = independent draws (the inert default), 0 = without
  replacement, ~0.3–0.6 = soft damping. The shipped decors use 0.35–0.5.
- A motif may carry its own `size` / `placement` overrides (absent fields
  inherit the decor-level values), so a rock and a cactus can want different
  `offsetMax` and size ranges.
- Biome identity is expressed as **tints and weights, not restated geometry**:
  the same shapes carry `biomeColor` tints, `biomeScale` sizes, and
  `biomeWeight` skews per biome.

**Shared-library motif references (v7).** A decor motif entry may reference
shared geometry from `data/motifs/` instead of inlining its own `parts`. The
library is hand-authored (not emitted by the editor's descriptor Save) and
holds **one motif per file** — one discrete object per `.js`, named by its
`id` (`roundTree.js`, `gnarledTree.js`, `log.js`, `stone.js`, `tuft.js`, …):

```js
motifs: [
  { motif: 'gnarledTree', weight: 0.35, biomeWeight: { biome_painforest: 5 } },
  { motif: 'log', weight: 0.06, size: { min: 0.8, max: 1.0 } }, // size overrides the library default
],
```

- A reference is `{ motif: '<libraryId>', weight?, biomeWeight?, size?,
  placement? }` — no `parts`. `normalizeDescriptor` materializes the library's
  part tree and inherits its default `size`/`placement`; an explicit
  `size`/`placement` on the entry overrides those defaults.
  `denormalizeDescriptor` collapses an untouched reference back to reference
  form.
- Editing a referenced motif's geometry inside a decor produces a **local
  override** — the entry keeps the `motif` origin tag but now carries its own
  `parts`, diverged from the library (never a silent loss; it round-trips).
- **The debris shapes use an `alternatives` root.** Each of the four debris
  motifs (`stone`, `pile`, `shard`, `tuft`) and `pool` is one entry whose root
  is an `alternatives` node: every option is a distinct material (e.g. `stone`
  → stone-lump / rock-lump / boulder-lump / clod-block / rubble-block /
  orb-pebble), so one motif carries the variety the old single-file catch-all
  spread across many files. `biomeWeight` skews and per-use presentation live
  **on the referencing decor's motif entry**, not on the motif — the library
  owns shapes, the decor owns how they're used.
- The library dedupes geometry shared across terrain decors: the same motif can
  appear in several decor tables (e.g. `gnarledTree` is folded into both the
  `forest` and `deepWood` tables; `log` in many). See
  `dev/tests/render/descriptorMotifShared.test.js`.

**`alternatives`** — a parts-tree node at any depth (any kind: decor, feature,
even nested inside another alternative):

```js
{ id: 'cactus-arms', seed: 101, default: 'two-straight',
  alternatives: [
    { id: 'none',         weight: 0.25, parts: [] },
    { id: 'one-straight', weight: 0.3,  parts: [ /* arm cylinder */ ] },
    { id: 'two-straight', weight: 0.3,  parts: [ /* arm left + arm right */ ] },
    { id: 'elbow',        weight: 0.15, parts: [ /* group: base + rise, hinged */ ] },
  ] },
```

- Each item rolls ONE alternative (seeded per node, item-scoped — two cacti on
  one tile can show different arm configs). The node itself emits no record
  and carries no transform — **a hinged config wraps its parts in a group**:
  `group(transform: hinge) → alternatives → elbow: group(base + rise)`.
- `seed` is an authored integer from the **reserved 100–199 lane**, assigned
  once at node creation and never recomputed from the id or path (renames and
  reorders must not reshuffle in-world rolls).
- `default` names the option "Show all" and the preview radios resolve to —
  never a `none`. All-zero weights also fall back to `default`, else the first
  non-empty option.
- `biomeWeight` per option (optional) — a sparse per-biome multiplier biasing
  which shape variant the choice point favors in a biome, the exact mirror of
  the motif-table `biomeWeight` (§5.4): absent key ≡ 1, present 0 ≡ excluded.
  The effective weight is `weight × biomeWeight[biomeId]`; an all-excluded
  table falls back to `default`/first non-empty. Canonical (Show all) and the
  per-node preview pin ignore it. Authored in the editor via a per-option
  biome grid beside the weight rows.
- Option ids live in the GLOBAL part-id namespace (two co-candidate arms must
  not share an id). The editor keeps that namespace for you: ids created under
  a motif are stored motif-scoped (`<motifId>-<localId>`; parts added inside an
  option: `<motifId>-<optionId>-<localId>`), so the author never
  hand-maintains global uniqueness — the strip histogram's motif attribution
  keys off the same prefix.

**The editor**: motif decors get a Motif panel (weight
inputs, a per-biome grid of realized shares, a "Force motif" picker) instead
of the Variant section; alternatives get a per-node option table (weights,
`default`, read-only seed, preview radios, add/remove, group-inside-option)
plus a per-option per-biome bias grid; "Show all" renders every motif once at
authored scale (the piece inventory); and a 3×3 tile-strip of real neighbor
hashes with a 64-tile histogram is the diversity acceptance view.

Two editor ergonomics notes (the alternatives authoring additions): the editor
displays a **derived local name** in the parts tree (the storage id's
motif/choice/option prefixes peeled — `cactus-two-straight-arm-2` shows as
`arm-2`), while the full id stays the source of truth and is shown in the row
tooltip and the inspector's id row. And every choice point's preview is either
**natural** (a real seeded roll) or **pinned** to one option: the tree's choice
row shows a live `↻ natural` / `→ <option>` badge, selecting the choice point or
the inspector's "Natural (random)" radio returns to the random roll, and the
row's `⟳` cycles through each config.

### 5.6 Entity-driven path (bases, champions, mobs, traders)

An entity is a single item at the hex center: count is 1, placement is center,
and there are no tile-hash draws. Differences from the tile path:

- Variant picked by `variantRule` from the entity's `faction`/`archetype`.
- **Colors resolve from the entity's palette**, never from the tile: a part's
  `color` string token looks up `entity.colors[token]` (`factionBase`,
  `factionAccent`, `factionBody` — the body token resolves to a darkened base
  color); a numeric `color` is the literal; no `color` falls back to
  `entity.color`. No color jitter, no biome tint.
- Item scale is `entity.scale × descriptor.scale`; per-part `scaleX/Y/Z` apply.

### 5.7 Biome color influence

`part.biomeColor` only applies on the tile path. The tint is the tile's own
biome colors **pulled toward the average of its land neighbors** (the same
neighbor blend the terrain surfaces use), so an Edenfall object beside
Painforest tiles gets its purple diluted by green. Rules:

- `source` picks one of the biome's material-class color swatches to tint
  toward — `foliage` for leaves/grass/scrub, `wood` for trunks/logs/
  driftwood, `soil` for dirt/sand/clods, `stone` for rocks and rubble,
  `bloom` for flowers/fruits/berries, `exotic` for crystals/ores/glows and
  supernatural bits. (The biome's `colors` block defines the actual color
  per swatch; `wood`/`soil`/`stone` inherit `BIOME_COLOR_DEFAULTS` unless a
  biome overrides them.)
- `source: 'terrain'` tints toward the tile's own **terrain surface color** —
  the biome palette entry for the tile's terrain type, neighbor-blended the
  same way. This is ground-matching: decor using it can never mismatch the
  surface it sits on (hill and plateau mounds use it).
- `influence: 0` keeps the default color; `1` fully replaces it.
- Every biome's decor swatch-tints; only tiles with no known biome colors
  keep the authored part colors. The `terrain` tint still applies wherever
  palettes are known, and every biome's colors bleed into *neighbor* tiles'
  blends. Something that must stay untinted per-biome is better expressed as
  a motif (a biome-pinned motif whose parts carry no `biomeColor`).
- Tiles with no known biome colors never tint; tiles with no palette never
  terrain-tint.
- Requires a numeric (literal) part color — tokens have no tint.
