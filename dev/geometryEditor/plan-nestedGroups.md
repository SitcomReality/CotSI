# Geometry editor: nested part groups (schema v5) + authoring tooling

*Original plan (verbatim) for the nested-groups + authoring-tooling work. Phase 1
and Phase 2 are complete (see commit history: `14bd9ff`, `b26d8aa`, `bdee2e0`,
`6b741f7`). Phase 3 (viewport tooling), Phase 4 (chest migration), and Docs
remain. The consolidated "what remains" plan lives in the plan-mode document for
Phase 3/4.*

## Problem

The descriptor transform model is a flat list of leaf parts positioned absolutely
against the item origin. Intricate objects (the open chest) need:

- **relative positioning / shared transforms** — lid + straps must move together;
  today every sub-assembly is hand-duplicated numbers (`openTreasureChest.js`
  straps copy the lid's `localPos` + `localAngle`; `censerSaint.js` chain+censer
  duplicate `localPos {x:0.22, z:0.15}`);
- **a pivot / hinge** — the flat model rotates every part about its own
  bottom-center, so a hinged lid forces hand-solving `localPos = hinge − R(θ)·hingePoint`
  (the current lid floats ~0.4 world units behind the chest).

The editor also has no way to manipulate horizontal position at all: `localPos.x/z`
is the only horizontal-position mechanism and the inspector never renders an input
for it (the only `localPos` mention in `dev/geometryEditor/` is a hint string in
`partInspector.js:168`). No viewport selection, no axes, no bounding boxes, no gizmo,
and the per-part inspector is one long un-collapsible scroll.

Verdict (agreed with user): the leaf transform fields and the authored → records →
InstancedMesh seam are sound; the gap is **structure** — add nested part **groups**
to the descriptor, flatten at record time, and build the missing editor tooling.

## Key design decision: records gain a `matrix` field

True nesting cannot be flattened into the current flat record fields in general:
a child under a rotated+scaled group requires a full affine matrix (rotation about
a non-origin point + scale × rotation ⇒ shear), which `T · R · T(localPos) · R(local) · S`
cannot express. So:

- **Nested leaves emit a precomputed world `matrix`** (THREE column-major, 16
  numbers, `Matrix4.elements` order) instead of `x/y/z/scale/rotY/...`.
- **`buildInstanced` (meshBuilder.js) gets a tiny additive branch:**
  `if (inst.matrix) _matrixT.fromArray(inst.matrix) else <existing composition>`.
  No render-structure or perf change; records without `matrix` (every root leaf,
  i.e. 100% of existing content) render byte-identically.
- **Root leaves keep today's exact record fields** — the recordBuilder tile path
  and entity path emit them unchanged. Verified: no existing part combines `rotY`
  with horizontal `localPos` or `localAxis`/`localAngle` (grep of `data/`), so the
  world-rotation slot stays exactly where it is for roots.
- Group nodes emit no records (no geometry) — `buildDescriptorMeshes`
  (meshAssembly.js) is untouched because it only sees leaf records.

## Schema v5 — groups (`src/render/hexmap3d/features/descriptors/schema.js`)

A part is either a **shape leaf** (`shape` + `params`) or a **group** (a `children`
array of parts/groups, no `shape`). Both carry a `transform`.

```js
{ id: 'lid',                          // group node
  transform: { localPos: { x: 0, y: 0.15, z: 0.125 },   // hinge point (chest back-top)
              localAxis: { x: 1, y: 0, z: 0 }, localAngle: -1.4 },
  children: [
    { id: 'lid-board', shape: 'box', params: { width: 0.35, height: 0.08, depth: 0.25 },
      transform: { localPos: { x: 0, y: 0, z: -0.125 } } },
    { id: 'strap-l', ... },
    { id: 'strap-r', ... },
  ] },
```

Semantics:

- **Root parts** (top of each parts tree): every existing transform field, exactly
  as today — `y` (bottom height, grounded), `lift`, `localPos`, `rotY`,
  `localAxis`/`localAngle`, `tiltAxis`/`tilt`, `scaleX/Y/Z`.
- **Nested parts and groups**: only `localPos`, `localAxis`+`localAngle`, `rotY`,
  `scaleX/Y/Z`. `y`, `lift`, `tiltAxis`/`tilt` are **root-only** → validation
  errors on nested nodes (they have no grounding; position is purely relative).
- **Groups**: no `shape`, `params`, `color`, `stretch`, `biomeColor`, `biomeScale`
  (no geometry of their own) → validation errors if present. Must have a
  non-empty `children`.
- **Id uniqueness**: part ids must be unique across the whole subtree of one
  parts set (fallback `parts` or one variant's `parts`), not just the direct list
  (records/InstancedMesh are keyed by partId).
- `SCHEMA_VERSION` 4 → 5. v4 files need **no migration** — groups are optional and
  absent means all leaves, i.e. today's model. `normalizeDescriptor` is idempotent.
- `normalizePart` recurses into `children` (shape defaults + transform defaults,
  same rules); `denormalizeDescriptor` strips defaults recursively (add `children`
  to the denorm walk and to `PART_KEYS`). `validatePart` branches shape-leaf vs
  group and validates nested transforms against the nested field set.

Group transform composition (used by recordBuilder, shared with the editor):

```
nodeFrame = T(localPos) · R(localAxis, localAngle) · R_y(rotY) · S(sx, sy, sz)
nestedLeafWorld = T(item pivot + placement offset + disp offset)
                · R(placement rotY · tilt)          // the world slot, as today
                · groupFrameₙ · ... · groupFrame₁ · leafFrame
```

All `localPos`/`scale` in every frame pre-scale by `itemScale` and the part's
`biomeScale` factor (rigid scaling, mirroring today's leaf convention); leaf frames
also fold in per-axis stretch / scatter jitter. `y`/grounding/`lift` never appear
below the root level.

## Phases

### Phase 1 — Schema v5 + flattening + render branch (game side, no editor)

Files: `schema.js`, `recordBuilder.js`, `meshBuilder.js`.

1. `schema.js`: bump `SCHEMA_VERSION` to 5; add `children` to `PART_KEYS`; split
   `validatePart` into leaf/group branches (rules above); make `normalizePart` and
   `denormalizeDescriptor` recurse; keep the v3/v4 migrations running on leaves
   only (a group has no params/color to migrate).
2. `recordBuilder.js`: refactor the per-part walk into a recursive descent. Root
   leaves → exactly today's records. Groups → compose frames (pure math, no
   THREE — implement a small column-major matrix helper local to the module, or
   import one from `src/engine/` if a matrix util exists; otherwise add a minimal
   pure matrix module under `src/engine/`). Nested leaves → one record
   `{ partId, matrix, color? }` (color jitter/biome tint unchanged). Same in
   `recordForEntityPart` / `recordsForEntity`.
   Export a pure `nodeOrigins(descriptor, tile|entity, worldPos, …) → Map<partId, {x,y,z}>`
   (world origin of every leaf **and** group) so the editor can place the gizmo /
   bounds on groups too — no record duplication.
3. `meshBuilder.js`: `buildInstanced` — `if (inst.matrix) { _matrixT.fromArray(inst.matrix) }`
   branch before the existing composition.

Tests (this phase must go green before the editor work):

- `descriptorSchema.test.js`: group validates clean; shape+children rejected;
  nested `y`/`lift`/`tilt` rejected; group `color`/`stretch` rejected; duplicate
  ids across nesting rejected; normalize fills nested defaults recursively;
  denormalize strips nested defaults; idempotence; JSON roundtrip.
- `descriptorRecordBuilder.test.js`: existing tests unchanged and passing (root
  parity); new tests: hand-computed 2-node group matrix (e.g. group at
  `localPos {0, 0.5, 0}` + child box at `{0, 0, 0.2}` → assert exact matrix
  entries), nested leaf under rotated group, group scale × child scale, entity
  path with a group, `nodeOrigins` for a group.
- `descriptorRoundtrip.test.js`: add a synthetic group descriptor roundtrip
  (emit → import → normalize → deep-equal), separate from the `ALL_DESCRIPTORS` loop.

Checkpoint: `tests/run.sh` green; open the editor — every existing object renders
identically (spot-check the volvelle, palimpsest, champions).

### Phase 2 — Editor structural editing (tree, groups, localPos fields, sections)

Files: `dev/geometryEditor/ui/partList.js`, `partInspector.js`, `formControls.js`
(if needed), `variantQuery.js` (minor), `styles/controls.css`.

1. **Parts list → tree** (`partList.js`): recursive render of the active parts
   tree — groups as collapsible rows (`id · group`), children indented; add a
   "＋ Group" action (inserts a group node with a single child part); per-row
   select / reorder-within-siblings / remove (removes subtree). Select state stays
   `S.selectedPartId` (ids are unique in the active tree, so a flat id still
   resolves by walking).
2. **Nest / unnest**: "Nest into new group" on a selected part, and "Ungroup" on
   a selected group (promote children to the group's parent, folding the group's
   `localPos` into each child — pure editor math, no schema change).
3. **Part inspector** (`partInspector.js`):
   - Add **`localPos` X/Y/Z rows** — a new **Position** section. Root parts show
     `y` (bottom height), `Lift`, and `localPos X/Y/Z`; nested parts/groups show
     only `localPos X/Y/Z`.
   - Group inspector: transform-only (localPos, axis/angle, rotY, scale) — no
     shape/color/stretch/biome sections.
   - **Collapsible sections** (`<details>/<summary>` styled like the existing
     `.section-title`): Shape, Position, Rotation, Scale, Color, Biome tint,
     Stretch. Session-persisted open/collapsed set (pattern: `collapsedCategories`
     in `main.js`). Defaults: Shape/Position/Rotation open; Scale/Color/Biome
     tint/Stretch collapsed.
4. **"Copy transform from…"** helper: dropdown of sibling node ids in the part
   inspector → copies `localPos`+rotation+scale onto the selected node. (For
   ungrouped duplicates; groups make the chest-strap case moot.)

Checkpoint: in the browser, author a small grouped object (e.g. a lid group with
two children), Save it, reload — round-trip through `emitDescriptor` keeps the
tree. `descriptorRoundtrip` still green.

### Phase 3 — Viewport tooling (click-select, bounds, gizmo)

Files: `dev/geometryEditor/preview.js`, `ui/partInspector.js` (bounds readout),
`styles/controls.css` (overlay/gizmo styling), maybe `domRefs.js`.

1. **Click-to-select**: raycast on pointer-up (skip when the pointer moved — orbit
   drags must not select). `mesh.name` is `${descriptor.id}-${partId}`, so
   `partId = name.slice(prefix.length + 1)`; keep a partId→mesh map built at
   `showRecords` time. Set `S.selectedPartId`, re-render panel.
2. **Selection highlight + origin marker**: after rebuild, draw the selected
   node's world AABB as a wireframe box (`THREE.Box3` → `EdgesGeometry`, refreshed
   on rebuild) — for a group, the union of its descendant leaves' instance bounds.
   Add a small always-on marker at the item origin (ground point) so `localPos`
   has a visual anchor.
3. **Bounds readout**: per selected node, world AABB min/max/center (union over
   instance matrices — `mesh.computeBoundingBox()` then transform per instance)
   shown in the inspector. This makes "lid hinge at z −0.26 vs chest back +0.15"
   visible as numbers.
4. **Translation gizmo**: when a node is selected, three axis arrows at the node's
   world origin (from `nodeOrigins`), X red / Y green / Z blue, sized ~0.15.
   Pointer-down on an arrow captures the drag (disables orbit); the pointer is
   projected onto the arrow's axis line, the world delta is converted into the
   node's **parent frame** (inverse of the accumulated parent rotation) and
   written to the node's `localPos` through `ctx.mutate`. Y arrow edits
   `localPos.y`, X/Z arrows `localPos.x/z` — the same field set for roots and
   nested nodes.
   Perf note: `mutate` rebuilds the single-item preview per move — acceptable at
   preview scale; batch via `requestRender` if it stutters.

Checkpoint: open the chest, click the lid, drag it on the ground plane and
vertically; bounds readout matches the wireframe; orbit still works when not on
an arrow.

### Phase 4 — Migrate the open chest to a hinged lid group (demo + dogfood)

Files: `src/render/hexmap3d/features/descriptors/data/openTreasureChest.js` (via
the editor's Save, per the generated-file convention).

- Restructure `chest-lid-open` + both `iron-strap-lid-*` into a `lid` group whose
  `localPos` sits at the chest's back-top hinge (`{x:0, y:0.15, z:0.125}` pre-item-scale;
  the children's `localPos` place the board and straps in the closed lid frame,
  offset `z: −0.125` from the hinge). Rotating the group's `localAxis/localAngle`
  swings lid + straps rigidly about the hinge.
- Validate in the editor (click-select the lid, drag the hinge, rotate the group),
  then Save. Confirm `tests/run.sh` green (roundtrip now covers a real group).

### Docs

- `dev/descriptorAuthoring.md`: new subsection on groups (tree shape, root vs
  nested transform fields, the matrix flattening, worked hinge example).
- `AGENTS.md`: one line in the descriptor-data conventions noting parts may nest
  into groups.
- `dev/futureWork.md`: remove the deferred "3D gizmo" bullet (done in Phase 3).

## Open items (deferred, noted)

- **Rotation gizmo** (arcs) — out of scope; `rotY`/`localAngle` remain typed.
- **Align-bottom/top helpers** — superseded by bounds readout + gizmo for now;
  easy to add later from the same AABB math.
- Named `group`/`children` chosen for vocabulary fit (not on the banned-name
  list); can rename before Phase 2 if the user prefers (e.g. `subobject`).

## Status / deltas since this plan was written

- Phase 1 done (`14bd9ff`), Phase 2 done (`b26d8aa`); extra work added during
  Phase 2: reparenting (move into/out of **existing** groups, `bdee2e0`) and two
  bug fixes (`6b741f7`: add-part NaN regression; stale save-server error
  reporting). Phase 2 §4 "Copy transform from…" is implemented
  (`partInspector.js` renderPartActions).
- Phase 3 (viewport tooling: click-select, AABB wireframe + origin marker,
  bounds readout, translation gizmo) is DONE — the consolidated plan
  (plan-mode doc `wasp-huntress-barry-allen.md` at the time of writing) covers
  the concrete implementation. Docs step also done (`descriptorAuthoring.md`
  §4.5, AGENTS.md one-liner, `futureWork.md` gizmo bullet removed).
- Phase 4 (chest hinge migration) remains: the user hand-migrated the chest lid
  + left strap into a `group-1` via the editor (uncommitted): a pure translation
  `{x:-0.41, y:0, z:0.06}`, not the hinge approach Phase 4 describes. Note: the
  file only has ONE lid strap (`iron-strap-lid-left`; no right strap exists) —
  Phase 4's "both straps" is stale. The uncommitted change will be reworked in
  Phase 4, which also regenerates the chest golden snapshot in
  `tests/render/descriptorData.test.js`.
