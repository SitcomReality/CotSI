# Object Geometry Editor (`dev/tools/geometryEditor`)

The **standalone object-geometry editor** — an in-browser tool for authoring the
*descriptor* data that defines all object geometry in the game (see
`dev/docs/descriptorAuthoring.md` for the data model). It is **not** part of the
game UI and is not governed by the game's layer-boundary rules. It ships its own
Node **save server** (`server/`) so edits can be written back to the source tree.

This README is the tool's own reference and file inventory, kept beside the code.

## Running & workflow

- **Serve:** `dev/tools/geometryEditor/saveServer.sh` launches `server/index.mjs`
  (bare-import Node resolution like `dev/tests/run.sh`). It also serves the repo
  root, so the game itself and all dev pages load through it.
- **Edit + save:** open `dev/tools/geometryEditor.html`, author/select an object,
  then **Save**. The editor writes generated files back into
  `src/render/hexmap3d/worldObjects/descriptors/data/` via a POST to the save
  server (after a side-by-side review diff). Don't hand-edit generated descriptor
  files — the next save overwrites them.
- **Atlas:** save can also rebuild the icon atlas (`assets/icons/`) in-browser.
- **Import hygiene:** `python3 dev/scripts/check_geometry_editor_imports.py`
  verifies every relative import resolves, including cross-references into `src/`.
  It does **not** check layer boundaries.
- **Tests:** the part-tree math in `ui/partTree/` (pure, Node-testable) is covered
  by `dev/tests/geometryEditor/`; descriptor data round-trip safety is pinned in
  `dev/tests/render/descriptorRoundtrip.test.js`.

## Relationship to the game

The editor **reuses** the game's own descriptor/scene pipeline instead of owning a
fork: `src/render/hexmap3d/worldObjects/descriptors/` (schema, recordBuilder,
motifDraw, meshAssembly…), `src/render/hexmap3d/scene/` (materials, lightSetup,
outline), `src/render/hexmap3d/hexWorldSpace`, `src/engine/rules/mat4`,
`src/game/rules/` (archetypes, factionData, terrainTypes, archetypeData) and
`src/params/render/`. Layer-boundary rules for the game are in
`dev/docs/systemArchitecture.md` §2; descriptor authoring is in
`dev/docs/descriptorAuthoring.md`.

## File inventory

### Root

| File | Purpose |
|------|---------|
| `state.js` | Shared mutable editor state (`S`): descriptor, selection, variant, biome |
| `domRefs.js` | DOM element cache (`els` object) |
| `entityView.js` | Entity-kind registry + selection helpers |
| `sampleObjects.js` | Sample descriptors, object categories, mob rows |
| `atlasBuild.js` | In-browser WebGL icon-atlas builder (portraits for assets/icons/) |
| `history.js` | Undo/redo history tracking for editor state |
| `saveServer.sh` | Launches `server/index.mjs` (node resolution like dev/tests/run.sh) |

### `emitDescriptor/` — descriptor → source serialization

| File | Purpose |
|------|---------|
| `index.js` | Barrel: descriptor → `src/…/descriptors/data/<id>.js` serialization |
| `exportNames.js` | id → SCREAMING_SNAKE export-name conventions |
| `format.js` | Descriptor → JS source-literal formatter |

### `server/` — Node save server (dev only)

| File | Purpose |
|------|---------|
| `index.mjs` | Dev save server entry: router + listener (run via saveServer.sh) |
| `paths.mjs` | Repo paths, port, table-driven entity layout, MIME table |
| `http.mjs` | HTTP plumbing: JSON/static responses, body reader |
| `write.mjs` | Atomic data-file writes + barrel registration |
| `save.mjs` | POST /save handler: validate → emit → write → snapshot refresh |
| `atlas.mjs` | POST /save/atlas handler: commit the icon atlas |
| `descriptor.mjs` | GET /save/descriptor handler: on-disk source for the review diff |

### `preview/` — 3D viewport

| File | Purpose |
|------|---------|
| `index.js` | Barrel: public 3D-viewport API (createPreview, showRecords, selection overlay, AABB) |
| `viewportState.js` | Shared viewport runtime handles (renderer, scene, camera, orbit, …) |
| `scene/index.js` | Scene construction + dirty-flag render loop |
| `scene/camera.js` | Orbit camera update + in-game camera reset |
| `scene/records.js` | Record arrays → InstancedMesh display (+ outlines, strip multi-tile) |
| `overlay/index.js` | Selection wireframe + origin marker (composes the gizmo) |
| `overlay/gizmo.js` | 3-axis translation arrows + drag frame + raycast picking |
| `pointer/index.js` | Orbit / click-select / gizmo-drag pointer input |
| `pointer/math.js` | NDC / raycast / gizmo-plane math |
| `floor.js` | Hex tile floor + floor-reference plane builders |
| `aabb.js` | World-AABB computation for selected part ids |

### `ui/` — DOM panels & inspector

| File | Purpose |
|------|---------|
| `main.js` | Entry point: startup orchestration + viewport/panel bindings |
| `chromeControls.js` | Chrome control wiring (browser pick, preview toggles, undo, panel folds) |
| `editorPanel.js` | Panel context (`mutate`/`renderAll`) + object/part inspector dispatch |
| `inspectorHead.js` | Inspector header chrome |
| `lineDiff.js` | LCS line diff for the save-review modal |
| `objectTemplates.js` | New-object template presets |
| `renameIds.js` | Part-id / motif-id rename rewrite helpers |
| `variantQuery.js` | Active variant/parts query from state |
| `objectBrowser/index.js` | Barrel: floating object browser |
| `objectBrowser/list.js` | Category-collapsible sample list + search filter |
| `objectBrowser/panel.js` | Floating-panel open/close + overlay choreography |
| `previewSync/index.js` | Barrel: state→preview bridge (rebuild, biome select, selection overlay) |
| `previewSync/tile.js` | Preview-tile derivation + biome tint |
| `previewSync/strip.js` | 3×3 tile-strip view + motif histogram |
| `projectControls/index.js` | Chrome-bar project actions: download/load/new |
| `projectControls/saveToGame.js` | Save-to-game flow: probe, review gate, POST /save |
| `projectControls/saveReviewModal.js` | Side-by-side diff modal for save review |
| `projectControls/atlasSave.js` | Icon-atlas rebuild + POST after a successful save |

### `ui/objectInspector/` — object-level inspector

| File | Purpose |
|------|---------|
| `index.js` | Barrel: object-level inspector |
| `identity.js` | Object panel: name/id rows |
| `render.js` | Motifs panel + Fields-panel kind dispatch |
| `sectionShell.js` | Collapsible section shell + open-state (object-inspector instance) |
| `entitySection.js` | Entity faction/archetype controls |
| `portraitSection.js` | Portrait picker + icon preview |
| `tileSections.js` | Cluster/size/placement/emphasis sections |
| `variantSection.js` | Variant picker + duplicate |
| `variantDuplicate.js` | Duplicate-variant action |
| `biomePins.js` | Pinned biome weight rows (motif grid) |
| `motifSection/index.js` | Barrel: v6 motif composition panel |
| `motifSection/motifList.js` | Motif id/weight rows + add/duplicate/delete |
| `motifSection/biomeGrid.js` | Per-biome weight grid with realized shares |

### `ui/partInspector/` — selected-part inspector

| File | Purpose |
|------|---------|
| `index.js` | Barrel: selected-part inspector |
| `render.js` | Inspector composition entry |
| `sectionShell.js` | Collapsible section shell + open-state (part-inspector instance) |
| `boundsSection.js` | World-AABB readout |
| `stateKeyframes.js` | Growth-state `states.empty` keyframe access |
| `axisPresets.js` | Axis/tilt presets + vector helpers |
| `actions/index.js` | Barrel: part header + id row + structural actions |
| `actions/header.js` | Breadcrumb back to object-level controls |
| `actions/idEdit.js` | Editable part-id row |
| `actions/structureActions.js` | Nest/move/ungroup/copy-transform/convert-to-alternatives |
| `transform/index.js` | Barrel: position/rotation/scale sections |
| `transform/position.js` | Y/Lift/localPos rows (+ empty-state keyframe) |
| `transform/rotation.js` | Axis/angle/rotY/tilt rows |
| `transform/scale.js` | Per-axis scale rows |
| `leafSections/index.js` | Barrel: leaf-only sections |
| `leafSections/shape.js` | Shape-params rows |
| `leafSections/color.js` | Merged Color & tint section (entity tokens vs literal + biome-tint source/influence) |
| `leafSections/biomeScale.js` | Sparse per-part biome-scale override rows |
| `leafSections/stretch.js` | Per-axis stretch variation rows |
| `alternatives/index.js` | Choice-point fields (seed, default, options) |
| `alternatives/optionRows.js` | Per-option rows (radio, id, weight, group, remove) |

### `ui/partList/` — parts tree list

| File | Purpose |
|------|---------|
| `index.js` | Parts-list header + add row (list session state) |
| `rows.js` | Recursive part-row rendering (fold, reorder, remove) |
| `actionsBar.js` | Parts-list action bar (list-level actions) |

### `ui/partTree/` — parts-tree math (pure, Node-tested)

| File | Purpose |
|------|---------|
| `index.js` | Barrel: parts-tree math (pure, Node-tested) |
| `walk.js` | Tree walking + predicates |
| `nodes/index.js` | Barrel: node factories + transform conversion |
| `nodes/constructors.js` | Fresh-id/motif-scoping + group/leaf/alternatives factories |
| `nodes/transform.js` | Node rotation matrices + root→nested conversion |
| `restructure/index.js` | Barrel: structural edits |
| `restructure/nest.js` | Nest into fresh group / ungroup |
| `restructure/move.js` | Move into/out of an existing group |
| `restructure/duplicate.js` | Duplicate a part subtree |
| `restructure/frameMath.js` | Rigid-frame matrices for exact reparenting |
| `restructure/localDelta.js` | Gizmo localPos delta helper |

### `ui/formControls/` — DOM form builders

| File | Purpose |
|------|---------|
| `index.js` | Barrel: DOM form builders |
| `layout.js` | `el` / `row` / `subheading` primitives |
| `inputs.js` | Number/int/degree steppers, select, color, text inputs |

### `styles/` — page styling

| File | Purpose |
|------|---------|
| `index.css` | Barrel: imports all geometry-editor page stylesheets |
| `reset.css` | Global reset and base element styles |
| `layout.css` | Page grid, chrome shell, panel positioning |
| `floating.css` | Shared fixed-position overlay shell (browser + diff modal) |
| `chrome.css` | Header action bar, search, load-error |
| `diff.css` | Save-review diff modal styles |
| `browser.css` | Object browser panel |
| `parts.css` | Parts list + parts-tree rows |
| `fields.css` | Field-row layout (control/stretch/preset rows) |
| `forms.css` | Form-control base, inspector field sizing, steppers |
| `text.css` | Info/hint/mono text |
| `inspector.css` | Inspector head, section titles, collapsible sections, part actions |
| `motifs.css` | v6 decor composition: motif rows, weight grid, alternatives, strip histogram |
| `overlay.css` | Viewport overlays: preview tools + HUD |