### Step 5: Wire the Effects Overlay into the Application

**Modified file: `src/render/hexmap3d/index.js`**

- In `initHexMap3D`, after `initScene`, call `initEffectsOverlay(ctx)` and register all layers
- In `renderHexMap3D`, after the 3D render completes, call `setEffectsState(state, ctx.camera)` so the overlay tick has current data
- Remove `mistMesh` variable and all `buildExploredMistMesh` references

**Modified file: `src/game/gameOrchestrator.js`**

- Add a window resize listener that calls `syncSize` on the overlay (or have the overlay listen to `window.resize` internally via the module)
