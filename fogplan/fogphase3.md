### Phase 3: Remove the 3D Unexplored Mesh

**Goal:** With the opaque base fog covering unexplored and off-map regions identically, the `buildUnexploredMesh` face-down geometry becomes redundant. Remove it to simplify the 3D scene.

**Step 3.1 — Remove unexplored mesh building and disposal**
- In `hexmap3d-index.js`:
  - Remove `import { buildUnexploredMesh } from './terrain/fogOfWar.js'`.
  - Remove `unexploredMesh` variable.
  - Remove `buildUnexploredMesh(...)` call and its `ctx.scene.add(...)`.
  - Remove `disposeMesh(unexploredMesh)` calls.

**Files involved:** EDIT `src/render/hexmap3d/hexmap3d-index.js`

**Step 3.2 — Delete `fogOfWar.js`**
- **Delete file.** All its functionality is superseded by the full-canvas fog.

**Files involved:** DELETE `src/render/hexmap3d/terrain/fogOfWar.js`

**Step 3.3 — Delete old `fogMistLayer.js`**
- **Delete file.** Replaced by `fogOverlayLayer.js`.

**Files involved:** DELETE `src/render/effects/fogMistLayer.js`