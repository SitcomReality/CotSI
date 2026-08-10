# Descriptor Authoring Guide

**Champions of the Supernal Interregnum** — how procedural object geometry is
described, randomized, and rendered, for anyone (human or agent) who wants to
author new object models without touching the renderer.

> If you are an external contributor: this document is self-contained. Read it,
> then produce a single ES module file per the **Deliverable** section. The
> game's pipeline — validation, randomization, and rendering — needs no help
> from you beyond the data.

---

## 1. What a descriptor is

A **descriptor** is a plain data object that describes one procedurally placed
game object: which primitive shapes make up its parts, what color each part is,
how many copies of the object appear on a tile and where they sit, how each
copy varies (variant, rotation, scale, color), and how it responds to being
displaced. Descriptors are the single source of truth for these objects — the
in-browser **geometry editor** (`dev/geometryEditor.html`) reads, edits, and
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
  (strings) are legal only on entity-driven parts — see §6.4.
- **Vertical (Y) is bottom-anchored:** `transform.y` and `transform.lift` are
  the height of the part's **lowest vertex** above the surface; `0` sits flush
  on the ground. Shapes are vertically centered primitives; the pipeline bakes
  in the automatic base offset (`shapeBaseOffset`), so you never compensate for
  "half the shape height" yourself. Stretch and `scaleY` grow a part upward
  from its base, never below it.
- **Transform order at render:** place → spin (`rotY`, world Y) + lean
  (`tiltAxis`/`tilt`, world space) → lift/`localPos` (local frame) → local
  rotation (`localAxis`/`localAngle`, local frame) → scale.

## 3. The deliverable: file, naming, module shape

One file per object in `src/render/hexmap3d/worldObjects/descriptors/data/`:

- File name: `<id>.js` (lowerCamelCase id).
- Export name: the id converted to SCREAMING_SNAKE + `_DESCRIPTOR`
  (`edenMushroom` → `EDEN_MUSHROOM_DESCRIPTOR`, `plainsGrass` →
  `PLAINS_GRASS_DESCRIPTOR`). The conversion splits camelCase words and maps
  `-`/`_` to `_`.
- The export is the descriptor literal — **only non-default fields** (the
  emitter strips defaults; `normalizeDescriptor` re-fills them on load).

No id → file exceptions: every descriptor is `<id>.js` — including the
entity kinds (which previously kept plural file names). `base.js` and
`mob.js` remain table-driven (`BASE_VARIANTS` / `MOB_VARIANTS` derive their
descriptor from variant maps the game imports — mobs compose the per-archetype
variant files in `data/mobs/`) and are not editable through the editor yet.

Module shape (this is what the editor Save produces; copying the header is
optional for new files):

```js
/**
 * edenMushroom.js — Descriptor data for "Eden Mushroom".
 *
 * Generated file: edit this object in the geometry editor
 * (dev/geometryEditor.html) and press Save — hand edits are overwritten.
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
| `schemaVersion` | int | 5 | Schema version. Always write `5` (v3/v4 files auto-migrate on load; the editor rewrites them to 5 on the next Save). |
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
  use `offsetMin: 0, offsetMax: 0.1` to hug the hex center. The size jitter is
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
  axis. Optional `offset` (0.08), `tiltMin`/`tiltMax` (0/0), `tiltSeed` (1).

All lean/tilt (ring `leanMin`/`leanMax`, jitter `tiltMin`/`tiltMax`, and a
part's own `tiltAxis`/`tilt`) **pivots at the part's base** — the bottom stays
planted on the ground (or on `transform.y`/`lift`) and the top swings, rather
than rotating around the shape's center.

Each mode owns a fixed sub-field set (scatter: `offsetMin`/`offsetMax`; ring:
`ringMin`/`ringMax`/`leanMin`/`leanMax`; jitter: `offset`/`tiltMin`/`tiltMax`/
`tiltSeed`). Fields from other modes are **inert** and stripped on emit, so
switching modes in the editor does not accumulate stale fields. (Cluster rules
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
| `biomeColor` | object | Per-part biome tint: `{ source: 'primary' \| 'accent', influence: 0..1 }` — mixes the part's color toward the tile's blended biome color by `influence` (see §5.7). |

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
`rotY`, and `scaleX/Y/Z` — `y`/`lift`/`tilt` are **root-only** (nested nodes
have no grounding; their position is purely relative to the parent). Validation
rejects `y`/`lift`/`tilt` on nested nodes.

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
about the hinge. **Author groups in the geometry editor** (`dev/geometryEditor.html`:
"Nest into group", "move into group", "Move out of group", "Ungroup") — the
editor keeps the transforms exact, and Save round-trips the tree.

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

`variants` is a list of `{ id, parts }`. The rule:

- `'hash'` (default) — roll over the variant list by tile hash. The generic rule for any hash-chosen content (mountains).
- `'cluster'` — grove rule: `denseForest` → `tall`, everything else → `round`; the `biome_painforest` biome forces the `painforest` variant.
- `'solitary'` — lone-tree rule: canopy shape by terrain + coord hash (ids `round`/`tall`/`wide`).
- `'faction'` / `'archetype'` — **entity-driven**: variant id must equal the entity's `faction` (e.g. `'CRU'`) or `archetype` (e.g. `'bear'`); unknown values fall back to the first variant.

The editor can force one variant id for preview (the record path accepts a
`variantId` override); in-game the rule decides.

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
biome `primary`/`accent` color **pulled toward the average of its land
neighbors** (the same neighbor blend the terrain surfaces use), so an Edenfall
object beside Painforest tiles gets its purple diluted by green. Rules:

- `source: 'primary'` or `'accent'` picks which channel to tint toward.
- `influence: 0` keeps the default color; `1` fully replaces it.
- Tiles of `biome_default` (Untouched) and `biome_painforest` never tint; tiles
  with no known biome colors never tint. Their colors still bleed into
  *neighbor* tiles' blends.
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
grove on forest/denseForest, hill mounds, and one ground decor per
marsh/plateau/plains/desert/beach). Decorations resolve in their unoccupied
state while the tile is out of sight; occupants/features gate displacement.

## 7. Worked example: a decor with variable properties — the Tree Grove

A terrain `decor` is scattered and varies per tile, and the grove is the
flagship example of the variable-properties vocabulary: count, size, part set,
stretch, and color all come from ranges and per-tile draws rather than fixed
values. `src/render/hexmap3d/worldObjects/descriptors/data/grove.js` (annotated;
the shipped file still carries `schemaVersion: 4` — v4 auto-migrates on load,
and the editor rewrites it to 5 on the next Save):

```js
export const GROVE_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'grove',
  kind: 'decor',                      // terrain decoration, not a feature
  displayName: 'Tree Grove',
  cluster: { rule: 'moisture' },      // count scales with tile moisture
  size: { min: 1.3, max: 1.5 },       // trees vary 1.3–1.5× object scale
  variation: { colorJitter: 0.05 },   // slight brightness jitter per tree
  variantRule: 'cluster',             // denseForest→tall, else round; painforest biome→painforest
  placement: { mode: 'ring' },        // ring around the hex center
  emphasis: { behavior: 'dispersed' },// shrink+step aside when the center is claimed
  parts: [                           // fallback part set — only used if no variant matches
    { id: 'trunk', shape: 'cylinder', stretch: { y: { min: 0.9, max: 1.2, seed: 6 }, x: false, z: false },
      biomeScale: { biome_tundra: 0.85 }, color: 0x8b5e3c },
  ],
  variants: [
    {
      id: 'round',                    // deciduous canopy
      parts: [
        {
          id: 'trunk', shape: 'cylinder',
          stretch: { y: { min: 0.9, max: 1.2, seed: 6 }, x: false, z: false },
          biomeScale: { biome_tundra: 0.85 },   // stunted on Tundra
          color: 0x8b5e3c,
        },
        {
          id: 'canopy-round', shape: 'sphere',
          transform: { lift: 0.2 },
          stretch: { y: { min: 0.85, max: 1.3, seed: 4 }, x: { min: 0.9, max: 1.15, seed: 5 }, z: { min: 0.9, max: 1.15, seed: 5 } },
          color: 0x3cb371,
          biomeColor: { source: 'primary', influence: 0.8 }, // greens blend toward the biome
          biomeScale: { biome_tundra: 0.85 },
        },
      ],
    },
    {
      id: 'tall',                     // denseForest pine: cone canopy, accent tint
      parts: [
        { id: 'trunk', shape: 'cylinder', stretch: { y: { min: 0.9, max: 1.2, seed: 6 }, x: false, z: false }, biomeScale: { biome_tundra: 0.85 }, transform: { scaleY: 0.8 }, color: 0x8b5e3c },
        { id: 'canopy-tall', shape: 'cone', transform: { lift: 0.22 }, stretch: { y: { min: 0.85, max: 1.3, seed: 4 }, x: { min: 0.9, max: 1.15, seed: 5 }, z: { min: 0.9, max: 1.15, seed: 5 } }, color: 0x2e8b57, biomeColor: { source: 'accent', influence: 0.7 }, biomeScale: { biome_tundra: 0.85 } },
      ],
    },
    {
      id: 'painforest',               // gnarled Painforest grove: multi-part bent trunk
      parts: [
        { id: 'trunk-gnarled-base',   shape: 'cylinder', params: { bottomR: 0.13, topR: 0.08, height: 0.3, segments: 5 }, transform: { localAxis: { x: 1, y: 0, z: 0 }, localAngle: 0.12 }, stretch: { y: { min: 0.9, max: 1.15, seed: 6 }, x: false, z: false }, biomeScale: { biome_painforest: 0.55 }, color: 0x8b5e3c },
        { id: 'trunk-gnarled-upper',  shape: 'cylinder', params: { topR: 0.05, height: 0.24, segments: 5 }, transform: { localPos: { x: 0, y: 0.3, z: 0.02 }, localAxis: { x: 1, y: 0, z: 0 }, localAngle: -0.15 }, stretch: { y: { min: 0.9, max: 1.15, seed: 6 }, x: false, z: false }, biomeScale: { biome_painforest: 0.55 }, color: 0x8b5e3c },
        { id: 'branch-gnarled',       shape: 'cylinder', params: { bottomR: 0.045, topR: 0.025, height: 0.3, segments: 5 }, transform: { localPos: { x: 0.02, y: 0.52, z: 0.03 }, localAxis: { x: 1, y: 0, z: 0 }, localAngle: 0.7 }, stretch: { y: { min: 0.9, max: 1.2, seed: 6 }, x: false, z: false }, biomeScale: { biome_painforest: 0.55 }, color: 0x8b5e3c },
        { id: 'canopy-gnarled',       shape: 'sphere', params: { radius: 0.26 }, transform: { localPos: { x: 0.02, y: 0.78, z: 0.21 } }, color: 0x2e5d2e, biomeScale: { biome_painforest: 0.55 } },
      ],
    },
  ],
};
```

What each mechanism contributes, at a glance:

- **Variable properties** — everything about a grove is a range, not a fixed
  value: count (moisture rule), size (1.3–1.5×), part set (`variantRule`),
  per-tree stretch, biome size/color, brightness jitter. The chest (§8) is the
  opposite: one fixed, centralized object.
- `cluster.rule: 'moisture'` — wetter forest tiles get more trees.
- `variantRule: 'cluster'` — the terrain/biome picks the part set: round
  deciduous canopies, tall pines, or the gnarled multi-part Painforest trees.
- `placement.ring` — members circle the hex center; `emphasis.dispersed`
  pushes them to the hex edge and shrinks them when the center is claimed.
- `stretch` — per-tree random trunk height and canopy puffiness (deterministic
  per tile, seeded hash draws); `x: false` / `z: false` pin the trunk's width.
- `biomeScale` — Tundra trees shrink to 85%, Painforest to 55%.
- `biomeColor` — canopy green leans into the tile's blended biome color
  (primary for round, accent for tall).
- `color` per part — trunk brown vs canopy green, jittered ±0.05 brightness.

## 8. Worked example: a centralized feature — the Open Treasure Chest

The chest is the opposite of the grove (§7): one fixed, centralized object
with a moving sub-assembly. It shows schema v5 groups (the hinged lid), root
leaves with per-part transforms, non-uniform scale, and local rotations. The
closed-lid sibling `treasureChest.js` uses the same parts vocabulary without
the group.

`src/render/hexmap3d/worldObjects/descriptors/data/openTreasureChest.js` (annotated;
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
  puts one item at the hex center. Contrast the scattered grove (§7).
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
   const { OPEN_TREASURE_CHEST_DESCRIPTOR } = await import('./src/render/hexmap3d/worldObjects/descriptors/data/openTreasureChest.js');
   const d = normalizeDescriptor(OPEN_TREASURE_CHEST_DESCRIPTOR);
   const errors = validateDescriptor(d);
   if (errors.length) { console.error(errors); process.exit(1); }
   console.log(recordsForDescriptor(d, { q: 3, r: -2, terrain: 'plains' }, { x: 0, y: 0, z: 0 }));
   EOF
   ```

4. **Regenerate the golden snapshot** so `tests/run.sh` passes
   (`descriptorData.test.js` asserts every descriptor's records exactly match
   `tests/render/fixtures/descriptorData.snap.json`):

   ```bash
   /run/host/usr/bin/node --input-type=module <<'EOF'
   import { writeFileSync } from 'node:fs';
   import { ALL_DESCRIPTORS } from './src/render/hexmap3d/worldObjects/descriptors/data/index.js';
   import { normalizeDescriptor } from './src/render/hexmap3d/worldObjects/descriptors/schema.js';
   import { recordsForDescriptor } from './src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js';
   const POS = { x: 1.732, y: 1.25, z: -3.0 };
   const TILES = {
     grove: { q: 3, r: -2, terrain: 'forest', moisture: 0.8 },
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
   writeFileSync('tests/render/fixtures/descriptorData.snap.json', JSON.stringify(out, null, 2) + '\n');
   console.log('wrote', Object.keys(out).length, 'snapshots');
   EOF
   ```

5. **Run the checks**: `tests/run.sh`, `python3 dev/check_imports.py`,
   `python3 dev/check_geometry_editor_imports.py`.
6. **Make it spawn in-game** (features): register a feature archetype in
   `src/game/rules/archetypeData/features.js`
   (`defineArchetype('feature_<kind>', { type: 'feature', name, tags, visual })`)
   and a spawn rule that references its kind (see the existing entries).
   Terrain decorations (decor/mountain) hook in via `gameBuilder.js`'s
   terrain tables instead.
7. Optionally **open the geometry editor** (`dev/geometryEditor.html` via
   `dev/geometryEditor/saveServer.sh`) to view/edit it — Save will rewrite the
   file in canonical form.

## 10. Where things live (quick map)

| Concern | File |
|---|---|
| Descriptor schema, shapes, defaults, validation, normalization | `src/render/hexmap3d/worldObjects/descriptors/schema.js` |
| Record generation (randomization) | `src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js` |
| Records → InstancedMeshes | `src/render/hexmap3d/worldObjects/descriptors/meshAssembly.js`, `../meshBuilder.js` |
| Shape/material factories (THREE) | `src/render/hexmap3d/worldObjects/descriptors/shapeFactories.js` |
| Neighbor-blended biome colors | `src/render/hexmap3d/worldObjects/biomeTint.js` |
| In-game tile dispatch | `src/render/hexmap3d/worldObjects/descriptors/gameBuilder.js` |
| Descriptor data | `src/render/hexmap3d/worldObjects/descriptors/data/` |
| Editor emit/format rules | `dev/geometryEditor/emitDescriptor.js` |
| Deterministic hashes | `src/render/hexmap3d/worldObjects/tileHash.js` |
| Dispersal/sinking | `src/render/hexmap3d/worldObjects/decorEmphasis.js` |
