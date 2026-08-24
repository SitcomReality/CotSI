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
`dev/tools/geometryEditor/emitDescriptor/`). The editor Save writes ONLY the
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
  schemaVersion: 7,
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

---

## Section map

The detailed reference lives in sibling documents. Each keeps the original
guide's section numbering, so "§" references still resolve within their file:

- [descriptorSchema.md](descriptorSchema.md) — field reference: top-level and part fields, shape registry, transforms, part groups (nesting/hinges), growth states (§4); how randomization works — chance, ranged transforms, variants, decor motifs & alternatives, entity path, biome color influence (§5).
- [descriptorPipeline.md](descriptorPipeline.md) — how rendering works: records → InstancedMeshes, in-game dispatch (§6); where things live — module map (§10).
- [descriptorExamples.md](descriptorExamples.md) — worked examples: a variable-properties decor, the forest (§7); a centralized feature, the open treasure chest (§8); adding a new object — checklist (§9).
