### Phase 1: Mask Generation Utilities

**Goal:** Build the offscreen canvas mask generation pipeline — the core engine that turns hex keys into blurred vision masks. No changes to the render loop yet; this is pure infrastructure.

**Step 1.1 — Create `src/render/effects/fogMaskGen.js`**
- **New file.**
- Accept `state`, `camera`, `canvas` (for projection), and the `visible`/`explored` Sets from `getHumanView`.
- For every hex in the game state:
  - Compute 6 world-space corners (reuse the `getMistCornersWorld` logic from `fogMistLayer.js` — hex center + `hexCornersXZ`, lifted to `tileTopY + MIST_OFFSET`).
  - Project each corner to screen space via `worldToScreen`.
  - Draw the hex as a filled white polygon onto an **offscreen canvas** — one for the *visible* mask, one for the *explored* mask.
- Return the two offscreen canvases.
- Skip hexes whose projected points are all off-screen or behind camera.
- **Key decisions baked in:**
  - Visible hexes go only into the `visibleMask` canvas.
  - Explored-but-not-visible hexes go into the `exploredMask` canvas.
  - Unexplored and outside-map: no mask at all → stays opaque.
  - Soft edges: apply `ctx.filter = 'blur(12px)'` (tunable constant) when drawing the masks, or better, draw sharp then blur the whole mask canvas afterward.

**Files involved:** NEW `src/render/effects/fogMaskGen.js`

**Step 1.2 — Expose `tileTopY` from the barrel (if not already)**
- Verify `tileTopY` is importable from `../hexmap3d/hexmap3d-index.js`. It appears to be. No change expected, but confirm during implementation.

**Files involved:** `src/render/hexmap3d/hexmap3d-index.js` (verify only)
