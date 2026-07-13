## Phase 3: Camera Controls + Hex Picking

**Goal**: Implement pan and zoom on the orthographic camera, plus raycaster-based hex picking. Clicking on a hex fires `onHexClick` just like the old SVG system. Tooltips work on hover.

### Files to create

**`src/render/hexmap3d/camera3d.js`** — Camera state and manipulation:

```javascript src/render/hexmap3d/camera3d.js
/**
 * Camera state and manipulation for the 3D orthographic view.
 *
 * The camera is orthographic, positioned at a fixed isometric angle
 * (~50° pitch, looking from south-west). Only pan (reposition target)
 * and zoom (adjust frustum size) are allowed. No tilt or rotation.
 */

const DEFAULT_FRUSTUM = 40; // vertical world units visible at zoom=1
const MIN_FRUSTUM = 5;
const MAX_FRUSTUM = 120;

export function createCameraState(aspect) {
  return {
    frustumSize: DEFAULT_FRUSTUM,
    targetX: 0,
    targetZ: 0,
    aspect,
    pitch: Math.PI / 3.5,  // ~51°
    yaw: Math.PI / 6,       // ~30° (south-west looking north-east)
    distance: 50,           // camera distance from target (along look vector)
  };
}

/**
 * Update the Three.js camera to match our camera state.
 * Call this whenever state changes.
 */
export function applyCameraState(camera, state) {
  const { frustumSize, aspect, targetX, targetZ, pitch, yaw, distance } = state;

  // Update frustum
  camera.left   = -frustumSize * aspect / 2;
  camera.right  =  frustumSize * aspect / 2;
  camera.top    =  frustumSize / 2;
  camera.bottom = -frustumSize / 2;
  camera.updateProjectionMatrix();

  // Compute camera position from spherical coords around target
  // Y is up; camera orbits in XZ plane
  const camX = targetX + distance * Math.cos(pitch) * Math.sin(yaw);
  const camY = distance * Math.sin(pitch);
  const camZ = targetZ + distance * Math.cos(pitch) * Math.cos(yaw);

  camera.position.set(camX, camY, camZ);
  camera.lookAt(targetX, 0, targetZ);
}

/**
 * Pan: shift the target point by world-space deltas.
 * dx, dz are in the ground plane.
 */
export function panCamera(state, dx, dz) {
  state.targetX += dx;
  state.targetZ += dz;
}

/**
 * Zoom: multiply frustum size by factor, clamped.
 */
export function zoomCamera(state, factor) {
  state.frustumSize = Math.max(MIN_FRUSTUM, Math.min(MAX_FRUSTUM, state.frustumSize * factor));
}

/**
 * Reset to default view centered on origin.
 */
export function resetCamera(state) {
  state.frustumSize = DEFAULT_FRUSTUM;
  state.targetX = 0;
  state.targetZ = 0;
}
```

**`src/render/hexmap3d/picking.js`** — Raycaster-based hex coordinate lookup:

```javascript src/render/hexmap3d/picking.js
import * as THREE from 'three';
import { coordKey } from '../../world/map.js';

const HEX_RADIUS = 1.0; // must match terrain.js

const raycaster = new THREE.Raycaster();

/**
 * Convert a screen-space mouse event to a hex key string.
 *
 * @param {number} clientX - Mouse X relative to viewport
 * @param {number} clientY - Mouse Y relative to viewport
 * @param {HTMLCanvasElement} canvas
 * @param {THREE.OrthographicCamera} camera
 * @param {THREE.Mesh} terrainMesh - The merged terrain mesh to raycast against
 * @returns {string|null} Hex key like "3,-2" or null if no hit
 */
export function hexKeyAtPosition3D(clientX, clientY, canvas, camera, terrainMesh) {
  // Normalized device coordinates (-1 to +1)
  const rect = canvas.getBoundingClientRect();
  const ndcX = ((clientX - rect.left) / rect.width)  * 2 - 1;
  const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

  const hits = raycaster.intersectObject(terrainMesh, false);
  if (hits.length === 0) return null;

  const point = hits[0].point;

  // Convert world-space (x, z) back to hex axial coordinates
  // Inverse of: x = sqrt(3) * (q + r/2), z = 1.5 * r
  const z = point.z;
  const x = point.x;

  // r = z / 1.5
  const r = z / (1.5 * HEX_RADIUS);
  // q = (x / sqrt(3)) - r/2
  const q = (x / (Math.sqrt(3) * HEX_RADIUS)) - r / 2;

  // Cube rounding (same as existing SVG hex-picking)
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);

  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;

  return coordKey({ q: rq, r: rr });
}
```

**`src/render/hexmap3d/interaction3d.js`** — Wire canvas events to camera and picking:

```javascript src/render/hexmap3d/interaction3d.js
import { hexKeyAtPosition3D } from './picking.js';
import { applyCameraState, panCamera, zoomCamera } from './camera3d.js';
import { createTooltip } from '../hexmap/map-tooltip.js'; // reuse existing tooltip DOM

/**
 * Attach pan/zoom/click/hover listeners to the canvas.
 * Replaces SVG-based setupMapInteraction from the old system.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Function} applyCamera - fn() to sync camera state → Three.js camera
 * @param {Function} getCameraState - fn() → camera state object
 * @param {Function} getTerrainMesh - fn() → current terrain THREE.Mesh (may be replaced)
 * @param {Function} onTileClick - callback(hexKey)
 * @param {Function} getTooltipContent - callback(hexKey) → HTML string
 * @returns {Function} cleanup
 */
export function setupMapInteraction3D(
  canvas, applyCamera, getCameraState, getTerrainMesh,
  onTileClick, getTooltipContent
) {
  let isPanning = false;
  let panStartX = 0, panStartY = 0;
  let panStartTargetX = 0, panStartTargetZ = 0;

  const tooltip = createTooltip(getTooltipContent);

  // --- Pan: mouse drag (left button + shift, or middle button) ---
  function onMouseDown(e) {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      isPanning = true;
      panStartX = e.clientX;
      panStartY = e.clientY;
      const state = getCameraState();
      panStartTargetX = state.targetX;
      panStartTargetZ = state.targetZ;
      canvas.style.cursor = 'grabbing';
    }
  }

  function onMouseMove(e) {
    if (isPanning) {
      const state = getCameraState();
      // Convert pixel delta to world-space delta (approximate)
      const scale = state.frustumSize / canvas.clientHeight;
      const dx = -(e.clientX - panStartX) * scale;
      const dz = -(e.clientY - panStartY) * scale;
      state.targetX = panStartTargetX + dx;
      state.targetZ = panStartTargetZ + dz;
      applyCamera();
      return;
    }

    // Hover: show tooltip
    const terrain = getTerrainMesh();
    if (!terrain) return;
    const key = hexKeyAtPosition3D(
      e.clientX, e.clientY, canvas,
      canvas.__camera, terrain
    );
    tooltip.show(e.clientX, e.clientY, key);
  }

  function onMouseUp(e) {
    if (isPanning) {
      isPanning = false;
      canvas.style.cursor = '';
    }
  }

  function onMouseLeave() {
    tooltip.hide();
  }

  // --- Click ---
  function onClick(e) {
    if (isPanning) return;
    if (e.button !== 0) return;
    if (e.shiftKey) return;

    const terrain = getTerrainMesh();
    if (!terrain) return;
    const key = hexKeyAtPosition3D(
      e.clientX, e.clientY, canvas,
      canvas.__camera, terrain
    );
    if (onTileClick) onTileClick(key);
  }

  // --- Scroll zoom ---
  function onWheel(e) {
    e.preventDefault();
    const state = getCameraState();
    const factor = e.deltaY > 0 ? 1.15 : 0.87;
    zoomCamera(state, factor);
    applyCamera();
  }

  // --- Touch support ---
  let lastTouchDist = 0;
  let lastTouchCenter = { x: 0, y: 0 };
  let touchPanStartTargetX = 0, touchPanStartTargetZ = 0;

  function onTouchStart(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      panStartX = touch.clientX;
      panStartY = touch.clientY;
      const state = getCameraState();
      touchPanStartTargetX = state.targetX;
      touchPanStartTargetZ = state.targetZ;
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0], t2 = e.touches[1];
      lastTouchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      lastTouchCenter = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
    }
  }

  function onTouchMove(e) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = touch.clientX - panStartX;
      const dy = touch.clientY - panStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        isPanning = true;
        const state = getCameraState();
        const scale = state.frustumSize / canvas.clientHeight;
        state.targetX = touchPanStartTargetX - dx * scale;
        state.targetZ = touchPanStartTargetZ - dy * scale;
        applyCamera();
      }
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const t1 = e.touches[0], t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (lastTouchDist > 0) {
        const state = getCameraState();
        const factor = lastTouchDist / dist;
        zoomCamera(state, factor);
        applyCamera();
      }
      lastTouchDist = dist;
      lastTouchCenter = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
    }
  }

  function onTouchEnd(e) {
    if (e.touches.length === 0) {
      isPanning = false;
    }
    if (e.touches.length < 2) {
      lastTouchDist = 0;
    }
  }

  // --- Attach ---
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseLeave);
  canvas.addEventListener('click', onClick);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);

  function cleanup() {
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    canvas.removeEventListener('mouseleave', onMouseLeave);
    canvas.removeEventListener('click', onClick);
    canvas.removeEventListener('wheel', onWheel);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
    tooltip.destroy();
    canvas.style.cursor = '';
  }

  return cleanup;
}
```

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