### Step 3: Rewrite Fog Mist as a 2D Canvas Render Layer

**Modified file: `src/render/hexmap3d/fogOfWar.js`** — now only handles the unexplored face-down tile mesh (which is genuinely 3D and should stay in the Three.js scene).

**New file: `src/render/effects/fogMistLayer.js`** (has been created)

This replaces the current `buildExploredMistMesh` 3D mist geometry. Instead of floating 3D prisms, it:

1. Reads `humanView.explored` minus `humanView.visible` to get the mist hex set
2. For each mist hex, computes its 6 world-space corners (using terrain elevation + `MIST_OFFSET`)
3. Projects all corners to screen space
4. Draws filled hexagons on the 2D canvas with a dark semi-transparent fill
5. The result: a smooth, soft dark shroud that perfectly follows terrain height without z-fighting, depth-test tricks, or sharp 3D edges

**Note:** `hexCenter` and `HEX_RADIUS` are currently in `terrain.js`. We should extract them to a small shared utility (`src/render/hexmap3d/hexUtils.js`) that both `terrain.js` and `fogOfWar.js` and the new effects can import. But to keep the plan clean, I'll note this as a minor refactor within Step 3.

**Changes to `fogOfWar.js`:**
- Remove `buildExploredMistMesh` entirely
- Rename-file or keep only `buildUnexploredMesh` (the face-down tiles, which are real 3D geometry)

**Changes to `src/render/hexmap3d/index.js`** (render path):
- Remove the `buildExploredMistMesh` call and `mistMesh` disposal
- The mist is now handled by the effects overlay, not the 3D scene
