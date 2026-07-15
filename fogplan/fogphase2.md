### Phase 2: New Unified Fog Render Layer

**Goal:** Replace `fogMistLayer.js` with a new layer that uses destination-out compositing with the masks from Phase 1. This is the main swap.

**Step 2.1 — Create `src/render/effects/fogOverlayLayer.js`**
- **New file.**
- Export a `renderFogOverlay(ctx2d, state, camera, time)` function matching the layer signature.
- Logic each frame:
  1. Call `fogMaskGen` to get the two offscreen mask canvases (reuse cached canvases to avoid allocation — create once, clear + redraw each frame).
  2. Cover the entire `ctx2d.canvas` with opaque fog color (e.g. `'rgba(8, 6, 2, 1.0)'` for unexplored/off-map).
  3. Set `ctx2d.globalCompositeOperation = 'destination-out'` and draw the *explored mask* at partial alpha (e.g. `ctx2d.globalAlpha = 0.70`), punching a semi-transparent hole so terrain faintly shows through.
  4. Draw the *visible mask* at full alpha (`ctx2d.globalAlpha = 1.0`), punching a fully transparent hole.
  5. Reset `globalCompositeOperation` and `globalAlpha` to defaults.
- The result: opaque fog everywhere except explored regions (misty) and visible regions (clear), all with soft blurred boundaries.
- No per-hex iteration in the render loop — just two `drawImage` calls.
- **Tunable constants** to expose at the top: `FOG_BASE`, `EXPLORED_PUNCH_ALPHA`, `BLUR_RADIUS`.

**Files involved:** NEW `src/render/effects/fogOverlayLayer.js`

**Step 2.2 — Register the new layer, unregister the old one**
- In `hexmap3d-index.js`:
  - Change import from `renderFogMist` to `renderFogOverlay`.
  - Change `registerLayer('fogMist', 0, renderFogMist)` to `registerLayer('fogOverlay', 0, renderFogOverlay)`.
- No changes to `effectsOverlay.js` — its generic layer system handles this transparently.

**Files involved:** EDIT `src/render/hexmap3d/hexmap3d-index.js`