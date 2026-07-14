## Phase 3: Camera Controls + Hex Picking

**Goal**: Implement pan and zoom on the orthographic camera, plus raycaster-based hex picking. Clicking on a hex fires `onHexClick` just like the old SVG system. Tooltips work on hover.

### Files that have been created:

**`src/render/hexmap3d/camera3d.js`** — Camera state and manipulation:

**`src/render/hexmap3d/picking.js`** — Raycaster-based hex coordinate lookup:

**`src/render/hexmap3d/interaction3d.js`** — Wire canvas events to camera and picking:


### Files to edit

**`src/render/hexmap3d/scene.js`** — Integrate camera state:

```javascript src/render/hexmap3d/scene.js
// ADD at top:
import { createCameraState, applyCameraState } from './camera3d.js';

// In initScene(), REPLACE the camera setup section with:
export function initScene(mountElement) {
  // ... renderer setup (unchanged) ...

  const rect = mountElement.getBoundingClientRect();
  const aspect = rect.width / Math.max(rect.height, 1);

  const camState = createCameraState(aspect);

  const camera = new THREE.OrthographicCamera(
    -10, 10, 10, -10, 0.1, 200
  );
  applyCameraState(camera, camState);

  // Store camera on canvas for picking access
  renderer.domElement.__camera = camera;

  // ... lights, scene (unchanged) ...

  // Return camState alongside existing returns:
  return {
    renderer, scene, camera, camState,
    lights: { ambient, hemisphere, directional: dirLight },
    applyCamera() { applyCameraState(camera, camState); },
    getCameraState() { return camState; },
    dispose() { /* ... unchanged ... */ }
  };
}
```

**`src/render/hexmap3d/index.js`** — Wire interaction properly:

```javascript src/render/hexmap3d/index.js
// In setupMapInteraction3D, REPLACE the stub with:
export function setupMapInteraction3D(onTileClick, getTooltipContent) {
  if (!ctx) return () => {};

  const canvas = ctx.renderer.domElement;
  const cleanup = setupMapInteraction3D_impl(
    canvas,
    ctx.applyCamera,
    ctx.getCameraState,
    () => terrainMesh,  // getter so it always returns current mesh
    onTileClick,
    getTooltipContent
  );
  ctx._interactionCleanup = cleanup;
  return cleanup;
}

// Rename the imported function to avoid conflict:
import { setupMapInteraction3D as setupMapInteraction3D_impl } from './interaction3d.js';
```

Also in `renderHexMap3D`, store terrainMesh in the closure (it's already there as `let terrainMesh`).

**`src/game/gameOrchestrator.js`** — Update the `_getTooltipContent` reference:

The old code passes `_getTooltipContent` (which is imported as `getTooltipContent` from `mapView.js`). Make sure the import is still used:

```javascript src/game/gameOrchestrator.js
// Keep this import (already present):
import { refreshZoomDisplay, getTooltipContent as _getTooltipContent } from '../ui/mapView.js';

// In refreshAll(), the setup call already uses it:
// setupMapInteraction3D(onHexClick, (key) => _getTooltipContent(G, key, currentChampion()))
```

Also add the zoom display update and center-on-champion button wiring. In `refreshAll()`, add HUD zoom info:

```javascript src/game/gameOrchestrator.js
// In the HUD section of refreshAll(), UPDATE the zoom display to read from 3D camera:
import { getSceneContext } from '../render/hexmap3d/index.js';

// In the HUD section:
const ctx3d = getSceneContext();
if (ctx3d) {
  const zoomPct = Math.round(100 * 40 / ctx3d.getCameraState().frustumSize);
  document.getElementById('hudZoom').textContent = zoomPct + '%';
}
```

### Files to edit (map buttons)

**`src/ui/gameUIBindings.js`** — Update zoom/center button handlers to use 3D camera:

You'll need to read this file to see current bindings. Let me plan the change pattern:

```javascript src/ui/gameUIBindings.js
// ADD import:
import { getSceneContext } from '../render/hexmap3d/index.js';
import { zoomCamera, resetCamera, panCamera } from '../render/hexmap3d/camera3d.js';

// In the button bindings:

// Zoom In
document.getElementById('zoomIn').onclick = () => {
  const ctx = getSceneContext();
  if (!ctx) return;
  zoomCamera(ctx.getCameraState(), 0.8); // zoom in = smaller frustum
  ctx.applyCamera();
};

// Zoom Out
document.getElementById('zoomOut').onclick = () => {
  const ctx = getSceneContext();
  if (!ctx) return;
  zoomCamera(ctx.getCameraState(), 1.25);
  ctx.applyCamera();
};

// Reset
document.getElementById('zoomReset').onclick = () => {
  const ctx = getSceneContext();
  if (!ctx) return;
  resetCamera(ctx.getCameraState());
  ctx.applyCamera();
};

// Center on Champion
document.getElementById('centerChampion').onclick = () => {
  const ctx = getSceneContext();
  const ch = window.__currentChamp?.(); // or import currentChamp
  if (!ctx || !ch) return;
  const HEX_RADIUS = 1.0;
  const targetX = Math.sqrt(3) * HEX_RADIUS * (ch.pos.q + ch.pos.r / 2);
  const targetZ = 1.5 * HEX_RADIUS * ch.pos.r;
  const state = ctx.getCameraState();
  state.targetX = targetX;
  state.targetZ = targetZ;
  ctx.applyCamera();
};
```

### What you'll see
- Fully functional pan and zoom (mouse wheel, drag-with-shift, touch pinch)
- Hovering over hexes shows the tooltip (same DOM tooltip as before)
- Clicking on a hex triggers movement (if reachable) — **game is interactive again!**
- Map buttons work (zoom in/out/reset/center on champion)
- Still no features, no units, no fog of war

---