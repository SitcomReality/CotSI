### Phase 4: Tuning, Edge Cases & Polish

**Goal:** Make it look good. This phase is deliberately light on specifics because we'll iterate visually.

**Step 4.1 — Tune constants**
- In `fogOverlayLayer.js` and `fogMaskGen.js`:
  - Adjust `BLUR_RADIUS` (start at 12px, try 6–20px range).
  - Adjust `FOG_BASE` color/opacity.
  - Adjust `EXPLORED_PUNCH_ALPHA` (how much mist remains over explored areas).
  - Adjust `MIST_OFFSET` height for mask projection.
- **Files involved:** EDIT `src/render/effects/fogOverlayLayer.js`, `src/render/effects/fogMaskGen.js`

**Step 4.2 — Handle camera zoom/pan invalidation**
- The masks are in screen space, so they automatically stay aligned with the projection each frame (we regenerate them every frame from current camera state). Verify this works correctly during rapid pan/zoom.
- If performance is a concern with regenerating masks every frame, consider throttling: only regenerate masks when camera or vision changes. But starting with per-frame regeneration is simplest and likely fine given the small hex counts.
- **Files involved:** `src/render/effects/fogMaskGen.js` (minor, possibly no change)

**Step 4.3 — Verify off-map fog uniformity**
- Walk the camera to the map edge. Confirm unexplored tiles and the void beyond the map are identically fogged (both get no mask punch → opaque base fog).
- **Files involved:** No code changes expected; visual verification.