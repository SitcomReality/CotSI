# Descriptor Authoring Guide

**Champions of the Supernal Interregnum** — how procedural object geometry is
described, randomized, and rendered, for anyone (human or agent) who wants to
author new object models without touching the renderer.

> If you are an external contributor: this document is self-contained. Read it,
> then produce a single ES module file per the **Deliverable** section. The
> game's pipeline — validation, randomization, and rendering — needs no help
> from you beyond the data.
>
> For world context you will not get from this document — what the biomes and
> terrain look like and their exact colors, the factions and their palettes, and
> the physical scale of the world — see the companion references in
> `dev/docs/context/`: `biomesAndTerrain.md`, `factions.md`, and
> `sceneConventions.md`.

---

## 1. What a descriptor is

A **descriptor** is a plain data object that describes one procedurally placed
game object: which primitive shapes make up its parts, what color each part is,
how many copies of the object appear on a tile and where they sit, how each
copy varies (variant, rotation, scale, color), and how it responds to being
displaced. Descriptors are the single source of truth for these objects — the
in-browser **geometry editor** (`dev/tools/geometryEditor.html`) reads, edits, and
saves them, and the game renderer consumes them directly.

There are two flavors:

| Flavor | Kinds | Placement | Randomized by |
|---|---|---|---|
| **Tile-driven** | `feature`, `decor`, `mountain` | every eligible tile | the tile's deterministic hash |
| **Entity-driven** | `base`, `champion`, `mob`, `trader` | one per entity, hex center | the entity's state (faction, archetype, palette) |

A descriptor never contains THREE.js or any rendering code — it is pure data
(JSON-safe: colors are integers, angles are radians, lengths are world units).

## 2. Units and coordinate conventions

- **World unit:** hex radius = `1.0`. A part the size of a bush is ~0.2–0.4;
  a tree is ~0.6–1.5 tall.
- **Angles:** radians everywhere in the data (the editor displays degrees and
  converts on write). `Math.PI / 2` = 90°.
- **Colors:** `0xRRGGBB` integers (e.g. `0x3cb371`). Named color *tokens*
  (strings) are legal only on entity-driven parts — see §5.6.
- **Vertical (Y) is bottom-anchored:** `transform.y` and `transform.lift` are
  the height of the part's **lowest vertex** above the surface; `0` sits flush
  on the ground. Shapes are vertically centered primitives; the pipeline bakes
  in the automatic base offset (`shapeBaseOffset`), so you never compensate for
  "half the shape height" yourself. Stretch and `scaleY` grow a part upward
  from its base, never below it. `transform.liftRange` draws that height from
  `[min, max]` by a seeded hash instead of a fixed `lift` — author it with the
  seed of the part it tracks (e.g. the trunk's stretch seed) so one part's
  bottom follows another's per-tile draw (see the forest canopy anchor, §5.3).
- **Transform order at render:** place → spin (`rotY`, world Y) + lean
  (`tiltAxis`/`tilt`, world space) → lift/`localPos` (local frame) → local
  rotation (`localAxis`/`localAngle`, local frame) → scale.

## 3. The deliverable: file, naming, module shape

One file per object in `src/render/hexmap3d/worldObjects/descriptors/data/`:

- File name: `<id>.js` (lowerCamelCase id).
- Export name: the id converted to SCREAMING_SNAKE + `_DESCRIPTOR`
  (`edenMushroom` → `EDEN_MUSHROOM_DESCRIPTOR`, `plains` →
  `PLAINS_DESCRIPTOR`). The conversion splits camelCase words and maps
  `-`/`_` to `_`.
- The export is the descriptor literal — **only non-default fields** (the
  emitter strips defaults; `normalizeDescriptor` re-fills them on load).

No id → file exceptions: every descriptor is `<id>.js` — including the
entity kinds (which previously kept plural file names). The table-driven
entity files (`base.js`, `champion.js`, `mob.js`) compose their variant maps
from per-variant files the editor DOES write: mobs from `data/mobs/<archetype>.js`,
bases from `data/bases/<faction>.js`, champions from `data/champions/<faction>.js`
(each a `<NAME>_VARIANT` block — see `variantExportName`/`emitVariantModule` in
`dev/tools/geometryEditor/emitDescriptor.js`). The editor Save writes ONLY the
active variant's file; the barrels stay hand-composed and are never rewritten
by a save. Champions compose their shared pedestal stand from
`data/champions/shared.js`; the base variants are fully self-contained.

Module shape (this is what the editor Save produces; copying the header is
optional for new files):

```js
/**
 * edenMushroom.js — Descriptor data for "Eden Mushroom".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/tools/geometryEditor.html) and press Save — hand edits are overwritten.
 */
export const EDEN_MUSHROOM_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'edenMushroom',
  kind: 'feature',
  displayName: 'Eden Mushroom',
  scale: 2.5,
  placement: { mode: 'scatter' },
  emphasis: { behavior: 'dispersed' },
  parts: [
    {
      id: 'body',
      shape: 'cone',
      params: { bottomR: 0.18, height: 0.3, heightSegs: 1 },
      color: 0x7a2a8a,
    },
  ],
};
```

## 4. Field reference

### 4.1 Top-level fields

| Field | Type | Default | Meaning |
|---|---|---|---|
| `schemaVersion` | int | 5 | Schema version. Write `6` for v6 motif decors (`motifs` / `alternatives`, §5.4); `5` for everything else. Older files (v3/v4/v5) auto-migrate on load; the editor rewrites them to the current version on the next Save. |
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
  `countsByTerrain` (`{ forest: [3, 5], denseForest: [4, 7] }`, keyed by
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
| `biomeColor` | object | Per-part biome tint: `{ source: 'primary' \| 'accent' \| 'terrain', influence: 0..1 }` — mixes the part's color toward the tile's blended biome color by `influence` (see §5.7). |
| `states` | object | Growth-state keyframes — the part's look at different regrowth stages (see §4.6). Shape leaves only; groups reject it. |
| `alternatives` | array | **Choice point** (v6): not a shape and not a group — a weighted option table (see §5.4). The node carries `seed` (draw lane) and `default` (preview/catalog option) only; it has no transform, no color, no geometry. Options are `{ id, weight?, parts }` (parts may be empty — the `none` option). |

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
| `scaleX`, `scaleY`, `scaleZ` | Independent non-uniform scale (base 1). |
| `localPos` | `{ x, y, z }` offset within the part's frame; pre-scaled with the item's rigid scale factor (item scale × dispersal × scatter jitter, plus `biomeScale`). `localPos.y` is the same vertical offset slot as `lift` — the two **stack** (both raise the part). |
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
frame — see §6). `buildInstanced` applies it directly, so the render structure
and performance are unchanged.

**Worked hinge example — the open chest lid.** This is the actual `group-1`
from `openTreasureChest.js` (shown in full in §8). The group's `localPos` sits
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

### 5.3 Variant selection

> **v6:** the DECOR path moved to the weighted `motifs` table — see §5.4.
> Variants + `biomeVariants` pins remain for **features and entity kinds**
> (and as a deprecated escape hatch for decor). A v5 decor file still loads:
> `normalizeDescriptor` migrates it in memory (variant → motif, ids
> uniquified, pins preserved) until it is hand-rewritten.

**A decor is the look of ONE terrain.** Each decor-producing terrain has its
own descriptor, and the decor's `id` IS the terrain's id: `forest` tiles render
the `forest` decor, `denseForest` tiles the `denseForest` decor (deep wood),
`desert` tiles the `desert` decor, and so on. The game's dispatch table
(`gameBuilder.js` `SIMPLE_DECOR_BY_TERRAIN`) maps terrain → decor by that id;
different terrains are **never** variants of one another.

So on the tile path the only variant dimension is the **biome**:

- **`variants[0]` is the DEFAULT look** — every tile renders it unless a biome
  pins an alternate. Put the canonical look first, alternates after.
- **`biomeVariants`** — `{ biomeId: variantId }` pins an alternate to a biome:
  every tile of that biome renders it (e.g. the `forest` and `denseForest`
  decors both pin the gnarled `painforest` variant for Painforest woods).
- **Explicit picker** — the editor's Variant picker (a record-path
  `variantId` override) forces one variant while authoring; a stale id falls
  through.

Precedence (highest first): explicit picker → `biomeVariants[biomeId]` →
default (`variants[0]`). A descriptor with `biomeVariants` never hash-rolls —
variants are biome alternates, not per-tile lottery content.

`variantRule` remains for the two non-biome cases:

- `'mountain'` — legacy mountain roll over the `classic`/`offpeak` variants:
  hash raw `(q, r)` with `MOUNTAIN_HASH_SEEDS` (`((q·13 + r·7)·19) % 100`) so
  per-tile assignments match the pre-migration `mountainMeshes.js` builder.
- `'hash'` (default) — roll over the variant list by tile hash. Kept for
  content that genuinely wants hash-chosen variants; no current decor uses it.
- `'faction'` / `'archetype'` — **entity-driven**: variant id must equal the
  entity's `faction` (e.g. `'CRU'`) or `archetype` (e.g. `'bear'`); unknown
  values fall back to the first variant.

The legacy `'cluster'` and `'solitary'` rules were **retired** — the
terrain/height distinctions they hardcoded are now separate descriptors or
per-part authoring. `normalizeDescriptor` migrates old files (`'cluster'` →
`'hash'`, dropping any interim `terrainVariants` field).

**In the geometry editor:** the object controls list every registered biome
with one variant select per row ("— default look" clears a pin), and the
preview bar's Biome selector renders the pinned looks — switch the biome to
Painforest for the gnarled woods. (The preview tile's terrain is derived from
the descriptor — each decor is bound to the terrain its id names — so there
is no terrain selector.)

**Creating a new variant** — the "＋ Duplicate" button in the Variant section
copies the currently edited look (the active variant's parts, or the fallback
`parts` list when the object has no variants yet — that list is converted into
the default variant first, preserving the `variants[0]` convention) into a
brand-new variant and selects it for editing. Reshape the copy (see §7 for the
per-biome forest), then pin it to a biome in the Per-biome variants section.
The duplicate workflow is the whole point of the per-biome system: one
terrain, many biomes, one default look plus a pinned alternate per biome.

### 5.4 Decor composition: motifs, alternatives, and weights (v6)

Every choice point in a decor is a weighted pick, and there are three levels
(`dev/docs/decorComposition.md` is the full spec):

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
  not exclusive (use `biomeWeight: 0` to exclude, or a `biomeVariants` pin to
  guarantee — pins are deprecated for new content).
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
- Option ids live in the GLOBAL part-id namespace (two co-candidate arms must
  not share an id). The editor keeps that namespace for you: ids created under
  a motif are stored motif-scoped (`<motifId>-<localId>`; parts added inside an
  option: `<motifId>-<optionId>-<localId>`), so the author never
  hand-maintains global uniqueness — the strip histogram's motif attribution
  keys off the same prefix.

**The editor** (§6 of the spec): motif decors get a Motif panel (weight
inputs, a per-biome grid of realized shares, a "Force motif" picker) instead
of the Variant section; alternatives get a per-node option table (weights,
`default`, read-only seed, preview radios, add/remove, group-inside-option);
"Show all" renders every motif once at authored scale (the piece inventory);
and a 3×3 tile-strip of real neighbor hashes with a 64-tile histogram is the
diversity acceptance view.

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

- `source: 'primary'` or `'accent'` picks the biome's signature color channel
  to tint toward.
- `source: 'terrain'` tints toward the tile's own **terrain surface color** —
  the biome palette entry for the tile's terrain type, neighbor-blended the
  same way. This is ground-matching: decor using it can never mismatch the
  surface it sits on (hill and plateau mounds use it).
- `influence: 0` keeps the default color; `1` fully replaces it.
- Tiles of `biome_default` (Untouched) and `biome_painforest` never
  *signature*-tint (`primary`/`accent`); their `terrain` tint still applies,
  and their colors still bleed into *neighbor* tiles' blends.
- Tiles with no known biome colors never tint; tiles with no palette never
  terrain-tint.
- Requires a numeric (literal) part color — tokens have no tint.

## 6. How rendering works

The renderer needs no geometry code from you. The full pipeline:

```
descriptor (+ tile / entity)
  → recordsForDescriptor / recordsForEntity   (recordBuilder.js — pure data)
  → records: { partId, x, y, z, scale, scaleY, scaleZ?, rotY?,
               lift? / localPos?, localAxis? + localAngle?,
               tiltAxis? + tilt?, color? }    // root leaves
             { partId, matrix, color? }       // nested leaves (§4.5)
  → buildDescriptorMeshes                       (meshAssembly.js)
  → one InstancedMesh per part geometry         (meshBuilder.js)
```

- **Geometry:** `geometryForShape(shape, params)` maps a part onto its THREE
  constructor (cached per shape+params). `mountain` and `lathe` use bespoke
  game geometries.
- **Material:** `materialForPart` returns a **shared white toon material** —
  all color is per-instance via `setColorAt(record.color)`. Object-level
  `emissive`/`emissiveIntensity` (resource nodes) pass through; `mountain`
  enables vertex colors.
- **Instance matrix:** `T · R(rotY · tilt) · Lift(localPos) · Local(axis·angle) · S(scaleX/Y/Z)`.
  The local axis and tilt axis are normalized here, which is why their
  magnitude is meaningless in the data. A nested-leaf record carries a
  precomputed world `matrix` instead — `buildInstanced` applies it directly
  (the matrix already includes every ancestor group frame).

In-game dispatch (gameBuilder.js): each tile resolves to its feature (by
`tile.feature.kind` → descriptor id) plus its terrain decoration (mountains,
forest/denseForest woods, hill mounds, and one ground decor per
marsh/plateau/plains/desert/beach — the decor's id IS the terrain's id).
Decorations resolve in their unoccupied
state while the tile is out of sight; occupants/features gate displacement.

## 7. Worked example: a decor with variable properties — the Forest

A terrain `decor` is scattered and varies per tile, and the forest decor is the
flagship example of the variable-properties vocabulary: count, size, part set,
stretch, and color all come from ranges and per-tile draws rather than fixed
values. One decor per terrain — `src/render/hexmap3d/worldObjects/descriptors/data/decor/forest.js`
is the `forest` terrain's decor, and `decor/denseForest.js` is a **separate**
descriptor (the deep-wood's conical pines) — never a variant of this one.

> **v6:** the shipped forest is now a `motifs` table (schemaVersion 6) — the
> default `round` tree plus each structural biome look (`painforest` gnarled,
> `taiga`, `frost`, `dry`, `dead`, `edenfall`, `marshwood`, `dustbleed`) as a
> low-weight motif with a home-biome `biomeWeight` lift and cross-biome
> suppressions (§5.4). The worked example below shows the pre-v6 variant form;
> the motif form is the same geometry folded into one table.

The forest is also the showcase of the per-biome variant system: every biome
that can grow forest terrain pins its own look. Titanstain and Unfinished
Lands never render this decor at all (their `terrainOverrides` swap the forest
terrain for Titanflesh / Protogrowth), so the pins cover exactly the biomes
where a forest tile can actually exist (abridged — the PRE-v6 variant form; the
shipped file is the `motifs` table with home-biome `biomeWeight` lifts):

```js
export const FOREST_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'forest',                       // the decor's id IS the terrain's id
  kind: 'decor',                      // terrain decoration, not a feature
  displayName: 'Forest',
  cluster: { rule: 'moisture', countsByTerrain: { forest: [3, 5] } }, // count scales with tile moisture
  size: { min: 1.3, max: 1.5 },       // trees vary 1.3–1.5× object scale
  variation: { colorJitter: 0.05 },   // slight brightness jitter per tree
  biomeVariants: {                    // one pinned look per biome that grows forest
    biome_painforest: 'painforest',   //   gnarled Painforest woods
    biome_tundra: 'taiga',            //   stunted conical pines
    biome_frigid_silence: 'frost',    //   snow-capped pines
    biome_scorch: 'dry',              //   sun-bleached dry woodland
    biome_sere_wastes: 'dead',        //   bare dead trees, broken branches
    biome_edenfall: 'edenfall',       //   tall two-lobe purple canopies
    biome_mourning_marsh: 'marshwood',//   short squat murky woodland
    biome_dustbleed: 'dustbleed',     //   quenched teal, crystal-studded
  },
  placement: { mode: 'ring', leanMin: 0.2, leanMax: 0.3 }, // ring around the hex center, slight per-tree lean
  emphasis: { behavior: 'dispersed' },// shrink+step aside when the center is claimed
  parts: [                           // fallback part set — only used if no variant matches
    { id: 'trunk', shape: 'cylinder', stretch: { y: { min: 0.9, max: 1.2, seed: 6 }, x: false, z: false },
      biomeScale: { biome_tundra: 0.85 }, color: 0x8b5e3c },
  ],
  variants: [
    {
      id: 'round',                    // DEFAULT look (variants[0]) — every non-pinned tile
      parts: [
        {
          id: 'trunk', shape: 'cylinder',
          stretch: { y: { min: 1, max: 1.2, seed: 6 }, x: false, z: false },
          biomeScale: { biome_tundra: 0.85 },   // stunted on Tundra
          color: 0x8b5e3c,
        },
        {
          id: 'canopy-round', shape: 'sphere',
          // Legacy anchor: canopy bottom = (canopyY·trunkStretch − halfHeight)
          // = 0.5·s − 0.3, drawn on the trunk's stretch seed (6); the shipped
          // file carries the authored liftRange [0.15, 0.30].
          transform: { liftRange: { min: 0.15, max: 0.3, seed: 6 } },
          stretch: { y: { min: 0.85, max: 1.3, seed: 4 }, x: { min: 0.9, max: 1.15, seed: 5 }, z: { min: 0.9, max: 1.15, seed: 5 } },
          color: 0x3cb371,
          biomeColor: { source: 'primary', influence: 0.8 }, // greens blend toward the biome
          biomeScale: { biome_tundra: 0.85 },
        },
      ],
    },
    // … painforest (the gnarled multi-part bent trunk, pinned above) …
    {
      id: 'dead',                     // Sere Wastes: a dead tree — no leaves at all
      parts: [
        { id: 'trunk',          shape: 'cylinder', params: { bottomR: 0.09, topR: 0.07, height: 0.5, segments: 6 },
          stretch: { y: { min: 0.9, max: 1.2, seed: 6 }, x: false, z: false },
          biomeScale: { biome_sere_wastes: 0.8 }, color: 0x7a6a55,   // bone-dry bark
          biomeColor: { source: 'terrain', influence: 0.3 } },       // ground-matching bleached wood
        { id: 'branch-dead-a',  shape: 'cylinder', params: { bottomR: 0.035, topR: 0.02, height: 0.3, segments: 5 },
          transform: { localPos: { x: 0.02, y: 0.3, z: 0 }, localAxis: { x: 1, y: 0, z: 0 }, localAngle: 0.9 },
          stretch: { y: { min: 0.8, max: 1.2, seed: 6 }, x: false, z: false },
          biomeScale: { biome_sere_wastes: 0.8 }, color: 0x6e5f4d },
        { id: 'branch-dead-b',  shape: 'cylinder', params: { bottomR: 0.03, topR: 0.018, height: 0.24, segments: 5 },
          transform: { localPos: { x: -0.03, y: 0.36, z: 0.02 }, localAxis: { x: 1, y: 0, z: 0 }, localAngle: -1.05 },
          stretch: { y: { min: 0.8, max: 1.2, seed: 6 }, x: false, z: false },
          biomeScale: { biome_sere_wastes: 0.8 }, color: 0x6e5f4d },
        { id: 'branch-dead-c',  shape: 'cylinder', params: { bottomR: 0.025, topR: 0.015, height: 0.2, segments: 5 },
          transform: { localPos: { x: 0.04, y: 0.44, z: -0.02 }, localAxis: { x: 1, y: 0, z: 0 }, localAngle: 1.25 },
          stretch: { y: { min: 0.8, max: 1.2, seed: 6 }, x: false, z: false },
          biomeScale: { biome_sere_wastes: 0.8 }, color: 0x6e5f4d },
      ],
    },
    {
      id: 'frost',                    // Frigid Silence: a snow-capped pine
      parts: [
        { id: 'trunk',       shape: 'cylinder', params: { bottomR: 0.07, topR: 0.05, height: 0.45, segments: 6 },
          stretch: { y: { min: 0.9, max: 1.15, seed: 6 }, x: false, z: false },
          biomeScale: { biome_frigid_silence: 0.85 }, color: 0x4a3f33 },
        { id: 'canopy-frost', shape: 'cone', params: { bottomR: 0.22, height: 0.42, radialSegs: 6, heightSegs: 2 },
          transform: { liftRange: { min: 0.3, max: 0.42, seed: 6 } },  // cone base tucks into the trunk top
          stretch: { y: { min: 0.9, max: 1.2, seed: 4 }, x: { min: 0.85, max: 1.1, seed: 5 }, z: { min: 0.85, max: 1.1, seed: 5 } },
          color: 0x3a5a4a, biomeColor: { source: 'terrain', influence: 0.5 },  // cold taiga green
          biomeScale: { biome_frigid_silence: 0.85 } },
        { id: 'snowcap',     shape: 'cone', params: { bottomR: 0.1, height: 0.16, radialSegs: 6, heightSegs: 1 },
          transform: { localPos: { x: 0, y: 0.64, z: 0 } },            // perched in the cone's upper taper
          stretch: { y: { min: 0.8, max: 1.1, seed: 4 }, x: false, z: false },
          color: 0xdfe6ec, biomeColor: { source: 'accent', influence: 0.6 },  // pale frost accent
          biomeScale: { biome_frigid_silence: 0.85 } },
      ],
    },
    // … taiga, dry, edenfall, marshwood, dustbleed — see the table below …
  ],
};
```

The rest of the forest's biome looks, each a small variation on the same
vocabulary (all part ids unique within their variant; all canopies track the
trunk's stretch seed 6 through `liftRange`; `biomeScale` sizes the whole
variant for its biome):

| Variant | Biome | Look | The trick |
|---|---|---|---|
| `round` | default (Untouched) | lush puffball | the canonical look — `variants[0]` |
| `painforest` | Painforest | gnarled bent trunk | 3-part trunk, `localAxis`/`localAngle` per segment |
| `taiga` | Tundra | stunted conical pine | cone canopy, `biomeScale: 0.8`, terrain-tinted |
| `frost` | Frigid Silence | snow-capped pine | cone + a small pale `snowcap` cone at its apex |
| `dry` | Scorch | sun-bleached dry woodland | short trunk, low flat sphere, `biomeScale: 0.8` |
| `dead` | Sere Wastes | dead tree, broken branches | **no canopy** — 3 bare branch cylinders at staggered heights/angles |
| `edenfall` | Edenfall | tall lush purple | two stacked spheres (two-lobe crown), `biomeScale: 1.1` |
| `marshwood` | Mourning Marsh | squat murky tree | short trunk, wide squashed sphere (`stretchY` low / `stretchXZ` high) |
| `dustbleed` | Dustbleed | quenched teal, crystal-studded | a `dodecahedron` crystal shard perched on the canopy, accent-tinted |

What each mechanism contributes, at a glance:

- **One decor per terrain** — the decor's `id` is the terrain's id, and
  `gameBuilder` maps terrain → decor by it. The deep-wood look is a separate
  descriptor (`denseForest.js`), not a variant.
- **`variants[0]` is the default look** — every forest tile renders `round`
  unless a biome pins an alternate; `biomeVariants` swaps in one dedicated
  look per biome. A biome with no pin (e.g. `biome_default`) keeps the
  default — that is how a shared look survives while only the biomes that
  need a different tree get one.
- **Variable properties** — everything about a forest is a range, not a fixed
  value: count (moisture rule), size (1.3–1.5×), part set (default vs biome
  pin), per-tree stretch, biome size/color, brightness jitter. The chest (§8)
  is the opposite: one fixed, centralized object.
- `cluster.rule: 'moisture'` — wetter forest tiles get more trees
  (`countsByTerrain.forest` → 3–5; the denseForest decor carries its own
  4–7 range). Sere Wastes and Scorch tiles are dry, so their forests are
  automatically sparse without any per-variant count.
- `placement.ring` — members circle the hex center; `emphasis.dispersed`
  pushes them to the hex edge and shrinks them when the center is claimed.
- `stretch` — per-tree random trunk height and canopy puffiness (deterministic
  per tile, seeded hash draws); `x: false` / `z: false` pin the trunk's width.
- `liftRange` — the canopy base tracks the trunk's stretch draw (same seed 6)
  so a tall tree's canopy rides high and a short tree's rides low; the
  per-variant ranges tuck each canopy shape into its trunk (a cone base
  overlaps less than a sphere, so `taiga`'s range hugs the trunk top while
  `round`'s swallows it).
- `biomeScale` — Tundra/Frigid/Sere/Scorch trees shrink to 80–85% of the
  default; Edenfall's grow to 110%; Painforest's gnarled groves to 55%.
- `biomeColor` — canopy green leans into the tile's blended biome color
  (`primary` for the round variant, the biome's `terrain` surface color for
  the ground-matching conifers, `accent` for frost snow and Dustbleed's
  crystals).
- `color` per part — trunk brown vs canopy green, jittered ±0.05 brightness;
  a dead tree's branches are darker than its trunk, the frost snowcap is
  pale, the crystal is turquoise.

## 8. Worked example: a centralized feature — the Open Treasure Chest

The chest is the opposite of the forest decor (§7): one fixed, centralized
object with a moving sub-assembly. It shows schema v5 groups (the hinged lid),
root leaves with per-part transforms, non-uniform scale, and local rotations.
The closed-lid sibling `treasureChest.js` uses the same parts vocabulary
without the group.

`src/render/hexmap3d/worldObjects/descriptors/data/features/openTreasureChest.js` (annotated;
default-valued fields omitted for readability):

```js
export const OPEN_TREASURE_CHEST_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'openTreasureChest',        // a feature kind — spawns one chest per tile
  kind: 'feature',
  displayName: 'Open Treasure Chest',
  scale: 1.2,                     // item-level size multiplier
  emphasis: { behavior: 'dispersed' },  // yield when an occupant claims the hex
  // No `placement`: defaults to { mode: 'center' } — one item at the hex center.
  parts: [
    { id: 'chest-base', shape: 'box', params: { width: 0.35, height: 0.15, depth: 0.25 },
      color: 0x5c4033 },
    { id: 'iron-strap-base-left', shape: 'box', params: { width: 0.03, height: 0.16, depth: 0.255 },
      transform: { localPos: { x: -0.12, y: 0, z: 0 } }, color: 0x222222 },
    { id: 'iron-strap-base-right', shape: 'box', params: { width: 0.03, height: 0.16, depth: 0.255 },
      transform: { localPos: { x: 0.12, y: 0, z: 0 } }, color: 0x222222 },
    { id: 'gold-hoard', shape: 'spheroid', params: { radius: 0.12 },
      transform: { y: -0.06, scaleX: 1.3, scaleY: 0.6, scaleZ: 0.9, localPos: { x: 0, y: 0.12, z: 0 } },
      color: 0xffd700 },
    { id: 'gem-ruby', shape: 'dodecahedron', params: { radius: 0.03 },
      transform: { y: -0.04, localPos: { x: 0.08, y: 0.16, z: 0.04 }, localAxis: { x: 1, y: 1, z: 0 }, localAngle: 0.5 },
      color: 0xe0115f },
    { id: 'gem-sapphire', shape: 'dodecahedron', params: { radius: 0.025 },
      transform: { y: -0.02, localPos: { x: -0.05, y: 0.18, z: -0.02 }, localAxis: { x: 0, y: 1, z: 1 }, localAngle: 0.8 },
      color: 0x0f52ba },
    {
      id: 'group-1',              // the hinged lid — a group, no shape/color
      transform: { localPos: { x: 0, y: 0.15, z: 0.125 },   // hinge: chest back-top
                  localAxis: { x: 1, y: 0, z: 0 }, localAngle: 1 },  // swing open
      children: [
        { id: 'chest-lid-open', shape: 'box', params: { width: 0.35, height: 0.08, depth: 0.25 },
          transform: { localPos: { x: 0, y: 0, z: -0.125 } }, color: 0x4a3022 },
        { id: 'iron-strap-lid-left', shape: 'box', params: { width: 0.031, height: 0.1, depth: 0.255 },
          transform: { localPos: { x: -0.1, y: 0, z: -0.125 } }, color: 0x222222 },
        { id: 'iron-strap-lid-right', shape: 'box', params: { width: 0.031, height: 0.1, depth: 0.255 },
          transform: { localPos: { x: 0.1, y: 0, z: -0.125 } }, color: 0x222222 },
      ],
    },
  ],
};
```

What each piece demonstrates:

- **Central placement** — no `placement` field, so the default `mode: 'center'`
  puts one item at the hex center. Contrast the scattered forest decor (§7).
- **Emphasis** — the chest *yields* rather than disappears: any occupant
  (champion, trader, mob) claims the hex center, so `dispersed` shrinks the
  chest and steps it aside instead of burying it. Use `behavior: 'hidden'` if
  you'd rather it vanish outright.
- **Root leaves** — `chest-base` and the iron straps are grounded at the
  surface; the straps' `localPos.x` (±0.12) sets their stance against the
  base. Each part is positioned independently, yet the straps read as wrapping
  the box.
- **Non-uniform scale** — `gold-hoard` squashes a 0.12-radius spheroid
  (`scaleY: 0.6`, `scaleX: 1.3`) into a coin pile, and `y: -0.06` +
  `localPos.y: 0.12` stack to sink it inside the chest body.
- **Local rotations** — the gems are dodecahedra posed with
  `localAxis`/`localAngle` so their facets catch the light at different angles.
- **The group** — `group-1` is the hinged lid: its `localPos` is the hinge
  point at the chest's back-top edge, and `localAxis`/`localAngle` swing the
  whole sub-assembly open. The children are authored in the closed-lid frame
  (`z: -0.125` puts their back edge on the hinge axis), so rotating the group
  swings lid + straps rigidly — no hand-duplicated offsets (§4.5).

## 9. Adding a new object — checklist

1. **Write the file** `src/render/hexmap3d/worldObjects/descriptors/data/<id>.js`
   with the `<ID>_DESCRIPTOR` export (id = feature kind for features).
2. **Register it** in `data/index.js`: add the import and push it into
   `ALL_DESCRIPTORS` (editor-display order).
3. **Validate + preview records** — Node recipe (Node may be off PATH on
   Flatpak; use `/run/host/usr/bin/node`):

   ```bash
   /run/host/usr/bin/node --input-type=module <<'EOF'
   import { normalizeDescriptor, validateDescriptor } from './src/render/hexmap3d/worldObjects/descriptors/schema.js';
   import { recordsForDescriptor } from './src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js';
   const { OPEN_TREASURE_CHEST_DESCRIPTOR } = await import('./src/render/hexmap3d/worldObjects/descriptors/data/features/openTreasureChest.js');
   const d = normalizeDescriptor(OPEN_TREASURE_CHEST_DESCRIPTOR);
   const errors = validateDescriptor(d);
   if (errors.length) { console.error(errors); process.exit(1); }
   console.log(recordsForDescriptor(d, { q: 3, r: -2, terrain: 'plains' }, { x: 0, y: 0, z: 0 }));
   EOF
   ```

4. **Regenerate the golden snapshot** so `dev/tests/run.sh` passes
   (`descriptorData.test.js` asserts every descriptor's records exactly match
   `dev/tests/render/fixtures/descriptorData.snap.json`):

   ```bash
   /run/host/usr/bin/node --input-type=module <<'EOF'
   import { writeFileSync } from 'node:fs';
   import { ALL_DESCRIPTORS } from './src/render/hexmap3d/worldObjects/descriptors/data/index.js';
   import { normalizeDescriptor } from './src/render/hexmap3d/worldObjects/descriptors/schema.js';
   import { recordsForDescriptor } from './src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js';
   const POS = { x: 1.732, y: 1.25, z: -3.0 };
   const TILES = {
     forest: { q: 3, r: -2, terrain: 'forest', moisture: 0.8 },
     denseForest: { q: 3, r: -2, terrain: 'denseForest', moisture: 0.8 },
     hill: { q: 3, r: -2, terrain: 'hill' },
     mountain: { q: 3, r: -2, terrain: 'mountain', mountainType: 'peak' },
   };
   const tileFor = (d) => TILES[d.id] ?? { q: 3, r: -2, terrain: 'plains' };
   const ENTITY_KINDS = new Set(['base', 'champion', 'mob', 'trader']);
   const out = {};
   for (const raw of ALL_DESCRIPTORS) {
     if (ENTITY_KINDS.has(raw.kind)) continue;
     const d = normalizeDescriptor(raw);
     out[raw.id] = { tile: tileFor(d), records: recordsForDescriptor(d, tileFor(d), POS) };
   }
   writeFileSync('dev/tests/render/fixtures/descriptorData.snap.json', JSON.stringify(out, null, 2) + '\n');
   console.log('wrote', Object.keys(out).length, 'snapshots');
   EOF
   ```

5. **Run the checks**: `dev/tests/run.sh`, `python3 dev/scripts/check_imports.py`,
   `python3 dev/scripts/check_geometry_editor_imports.py`.
6. **Make it spawn in-game** (features): register a feature archetype in
   `src/game/rules/archetypeData/features.js`
   (`defineArchetype('feature_<kind>', { type: 'feature', name, tags, visual })`)
   and a spawn rule that references its kind (see the existing entries).
   Terrain decorations (decor/mountain) hook in via `gameBuilder.js`'s
   terrain tables instead.
7. Optionally **open the geometry editor** (`dev/tools/geometryEditor.html` via
   `dev/tools/geometryEditor/saveServer.sh`) to view/edit it — Save will rewrite the
   file in canonical form.

## 10. Where things live (quick map)

| Concern | File |
|---|---|
| Descriptor schema, shapes, defaults, validation, normalization | `src/render/hexmap3d/worldObjects/descriptors/schema.js` (barrel; implementation in `shapeTypes.js`, `descriptorDefaults.js`, `validateShapes.js`, `validateParts.js`, `descriptorValidation.js`, `descriptorNormalize.js`, `descriptorDenormalize.js`) |
| Record generation (randomization) | `src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js` (barrel; implementation in `clusterCount.js`, `variantSelection.js`, `itemPlacement.js`, `partScale.js`, `partColor.js`, `partFrames.js`, `tileRecords.js`, `entityRecords.js`, `motifDraw.js`) |
| Records → InstancedMeshes | `src/render/hexmap3d/worldObjects/descriptors/meshAssembly.js`, `../meshBuilder.js` |
| Shape/material factories (THREE) | `src/render/hexmap3d/worldObjects/descriptors/shapeFactories.js` |
| Neighbor-blended biome colors | `src/render/hexmap3d/worldObjects/biomeTint.js` |
| In-game tile dispatch | `src/render/hexmap3d/worldObjects/descriptors/gameBuilder.js` |
| Descriptor data | `src/render/hexmap3d/worldObjects/descriptors/data/` |
| Editor emit/format rules | `dev/tools/geometryEditor/emitDescriptor.js` |
| Deterministic hashes | `src/render/hexmap3d/worldObjects/tileHash.js` |
| Dispersal/sinking | `src/render/hexmap3d/worldObjects/decorEmphasis.js` |
