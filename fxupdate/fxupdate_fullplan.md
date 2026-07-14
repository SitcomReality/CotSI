## Architecture Decision: Single Effects Canvas

The fog mist should share the **same 2D overlay canvas** as other effects (selection rings, future glows/particles), not a separate one. Reasoning:

1. **Single DOM layer** — one `pointer-events: none` canvas stacked on the Three.js canvas, no z-index tangle
2. **Natural render order** — fog renders first (deepest layer), then glows/rings sit above it
3. **Shared projection logic** — one place to do 3D→2D world-to-screen projection, used by both fog hexagons and effect circles
4. **Single tick hook** — one `ctx.onTick` callback drives the overlay, no extra rAF loops

Layering within the canvas:

```
┌──────────────────────────────────────────┐
│  Effects Canvas (2D overlay)             │
│                                          │
│  1. Fog mist — dark semi-transparent     │
│     hexagons over explored-not-visible   │
│     tiles                                │
│  2. Selection rings — pulsing circles    │
│     around active champion               │
│  3. (Future) glows, auras, particles,    │
│     damage numbers                       │
└──────────────────────────────────────────┘
```

---

## Step-by-Step Implementation Plan

### Step 1: Create the Effects Overlay Module

**New file: `src/render/effects/effectsOverlay.js`**

This module:
- Creates a `<canvas>` stacked on top of the Three.js canvas
- Syncs its size to the Three.js canvas (handling devicePixelRatio and resize)
- Exposes a `get2DContext()` for other modules to draw into
- Exposes a `renderEffects(state, camera, settings)` function that other modules register drawing callbacks into
- Hooks into `ctx.onTick` for its own animation frame

```javascript
// src/render/effects/effectsOverlay.js
// Creates a transparent canvas overlaid on the Three.js canvas.
// Handles size syncing, pixel ratio, and provides a registry
// for layered 2D effect renderers.

let overlay = null;
let ctx2d = null;
let threeCanvas = null;
let renderLayers = [];   // ordered array of { name, priority, render(ctx2d, state, camera, time) }

export function initEffectsOverlay(sceneContext) {
  threeCanvas = sceneContext.renderer.domElement;
  
  overlay = document.createElement('canvas');
  overlay.className = 'effects-overlay';
  overlay.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    pointer-events: none;
    z-index: 1;
  `;
  threeCanvas.parentNode.insertBefore(overlay, threeCanvas.nextSibling);
  syncSize();
  
  ctx2d = overlay.getContext('2d');
  
  // Hook into existing tick loop
  sceneContext.onTick((time) => {
    // state and camera are fetched lazily via globals or passed from renderHexMap3D
    // (see Step 4 for wiring)
    if (!overlay._state || !overlay._camera) return;
    renderFrame(overlay._state, overlay._camera, time);
  });
  
  return { overlay, ctx2d, syncSize, registerLayer };
}

function syncSize() {
  if (!threeCanvas || !overlay) return;
  const rect = threeCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  overlay.width = rect.width * dpr;
  overlay.height = rect.height * dpr;
  overlay.style.width = rect.width + 'px';
  overlay.style.height = rect.height + 'px';
  if (ctx2d) ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function registerLayer(name, priority, renderFn) {
  renderLayers.push({ name, priority, render: renderFn });
  renderLayers.sort((a, b) => a.priority - b.priority);
}

function renderFrame(state, camera, time) {
  ctx2d.clearRect(0, 0, overlay.width / (window.devicePixelRatio || 1), overlay.height / (window.devicePixelRatio || 1));
  for (const layer of renderLayers) {
    layer.render(ctx2d, state, camera, time);
  }
}

// Called externally to push latest state/camera refs
export function setEffectsState(state, camera) {
  if (!overlay) return;
  overlay._state = state;
  overlay._camera = camera;
}

export { syncSize, registerLayer };
```

---

### Step 2: Add World-to-Screen Projection Utility

**New file: `src/render/effects/projection.js`**

Single source of truth for converting a world-space position (on the terrain surface) to screen-space pixel coordinates. Used by fog hex rendering, selection rings, and every future effect.

```javascript
// src/render/effects/projection.js
import * as THREE from '../../lib/three.module.js';

const _worldVec = new THREE.Vector3();
const _screenVec = new THREE.Vector3();

/**
 * Project a 3D world position to 2D canvas pixel coordinates.
 * @param {number} worldX
 * @param {number} worldY - vertical (typically surfaceY)
 * @param {number} worldZ
 * @param {THREE.Camera} camera
 * @param {HTMLCanvasElement} canvas - the effects overlay (css-sized)
 * @returns {{ x: number, y: number } | null} pixel coords or null if behind camera
 */
export function worldToScreen(worldX, worldY, worldZ, camera, canvas) {
  _worldVec.set(worldX, worldY, worldZ);
  _screenVec.copy(_worldVec).project(camera);
  
  if (_screenVec.z > 1) return null; // behind camera
  
  const rect = canvas.getBoundingClientRect();
  const x = (_screenVec.x * 0.5 + 0.5) * rect.width;
  const y = (-_screenVec.y * 0.5 + 0.5) * rect.height;
  return { x, y };
}
```

---

### Step 3: Rewrite Fog Mist as a 2D Canvas Render Layer

**Modified file: `src/render/hexmap3d/fogOfWar.js`** — now only handles the unexplored face-down tile mesh (which is genuinely 3D and should stay in the Three.js scene).

**New file: `src/render/effects/fogMistLayer.js`**

This replaces the current `buildExploredMistMesh` 3D mist geometry. Instead of floating 3D prisms, it:

1. Reads `humanView.explored` minus `humanView.visible` to get the mist hex set
2. For each mist hex, computes its 6 world-space corners (using terrain elevation + `MIST_OFFSET`)
3. Projects all corners to screen space
4. Draws filled hexagons on the 2D canvas with a dark semi-transparent fill
5. The result: a smooth, soft dark shroud that perfectly follows terrain height without z-fighting, depth-test tricks, or sharp 3D edges

```javascript
// src/render/effects/fogMistLayer.js
// Draws dark mist over explored-but-not-visible hexes as 2D canvas polygons.
// Priority: 0 (draws first, underneath everything else)

import { worldToScreen } from './projection.js';
import { ELEVATION, HEX_THICKNESS } from '../hexmap3d/terrain.js';
import { hexCenter } from '../hexmap3d/hexUtils.js'; // extract or duplicate
import { getHumanView } from '../../game/vision.js';

const MIST_COLOR = 'rgba(10, 8, 4, 0.82)';
const MIST_OFFSET = 0.3;

// Generate 6 world-space corners for a hex, lifted to mist height
function getMistCornersWorld(q, r, terrain) {
  const elev = ELEVATION[terrain] || 0;
  const topY = elev + HEX_THICKNESS + MIST_OFFSET;
  const { x: cx, z: cz } = hexCenter(q, r);
  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    corners.push({
      x: cx + HEX_RADIUS * Math.cos(angle),
      y: topY,
      z: cz + HEX_RADIUS * Math.sin(angle),
    });
  }
  return corners;
}

export function renderFogMist(ctx2d, state, camera, overlayCanvas) {
  const { visible, explored } = getHumanView(state);
  
  for (const [, tile] of Object.entries(state.tiles)) {
    const key = `${tile.q},${tile.r}`;
    if (!explored.has(key) || visible.has(key)) continue;
    
    const corners = getMistCornersWorld(tile.q, tile.r, tile.terrain);
    const screenPts = corners
      .map(c => worldToScreen(c.x, c.y, c.z, camera, overlayCanvas))
      .filter(Boolean);
    
    if (screenPts.length < 3) continue;
    
    ctx2d.beginPath();
    ctx2d.moveTo(screenPts[0].x, screenPts[0].y);
    for (let i = 1; i < screenPts.length; i++) {
      ctx2d.lineTo(screenPts[i].x, screenPts[i].y);
    }
    ctx2d.closePath();
    ctx2d.fillStyle = MIST_COLOR;
    ctx2d.fill();
  }
}
```

**Note:** `hexCenter` and `HEX_RADIUS` are currently in `terrain.js`. We should extract them to a small shared utility (`src/render/hexmap3d/hexUtils.js`) that both `terrain.js` and `fogOfWar.js` and the new effects can import. But to keep the plan clean, I'll note this as a minor refactor within Step 3.

**Changes to `fogOfWar.js`:**
- Remove `buildExploredMistMesh` entirely
- Rename-file or keep only `buildUnexploredMesh` (the face-down tiles, which are real 3D geometry)

**Changes to `src/render/hexmap3d/index.js`** (render path):
- Remove the `buildExploredMistMesh` call and `mistMesh` disposal
- The mist is now handled by the effects overlay, not the 3D scene

---

### Step 4: Move Selection Ring to 2D Canvas

**Modified file: `src/render/hexmap3d/unitMeshes.js`** — remove all champion ring InstancedMesh creation.

**Modified file: `src/render/hexmap3d/unitAnimations.js`** — remove the torus-pulse `setScalar` animation block.

**New file: `src/render/effects/selectionRingLayer.js`**

```javascript
// src/render/effects/selectionRingLayer.js
// Draws a pulsing ring around the active champion at their projected screen position.
// Priority: 10 (above fog, below future particles)

import { worldToScreen } from './projection.js';
import { hexCenter3D, tileTopY } from '../hexmap3d/unitUtils.js';

const RING_COLOR = '#ffd86b';
const RING_RADIUS = 22; // base pixel radius
const RING_WIDTH = 3;

export function renderSelectionRing(ctx2d, state, camera, overlayCanvas, time) {
  const champ = state.champions.find(c => c.id === state.activeChampionId && c.alive);
  if (!champ) return;
  
  const tile = state.tiles[`${champ.pos.q},${champ.pos.r}`];
  if (!tile) return;
  
  const surfaceY = tileTopY(tile.terrain);
  const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);
  const screen = worldToScreen(x, surfaceY + 0.18, z, camera, overlayCanvas);
  if (!screen) return;
  
  const pulse = 1 + Math.sin(time * 3) * 0.15;
  const radius = RING_RADIUS * pulse;
  
  ctx2d.beginPath();
  ctx2d.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
  ctx2d.strokeStyle = RING_COLOR;
  ctx2d.lineWidth = RING_WIDTH;
  ctx2d.shadowColor = RING_COLOR;
  ctx2d.shadowBlur = 8;
  ctx2d.stroke();
  ctx2d.shadowBlur = 0; // reset for other layers
}
```

**Changes to `unitGeometries.js`:**
- Remove `getChampionRingGeo()` and the cached `championRingGeo` variable (no longer used)

---

### Step 5: Wire the Effects Overlay into the Application

**Modified file: `src/render/hexmap3d/index.js`**

- In `initHexMap3D`, after `initScene`, call `initEffectsOverlay(ctx)` and register all layers
- In `renderHexMap3D`, after the 3D render completes, call `setEffectsState(state, ctx.camera)` so the overlay tick has current data
- Remove `mistMesh` variable and all `buildExploredMistMesh` references

**Modified file: `src/game/gameOrchestrator.js`**

- Add a window resize listener that calls `syncSize` on the overlay (or have the overlay listen to `window.resize` internally via the module)

---

### Step 6: Add Graphics Settings Module

**New file: `src/render/effects/graphicsSettings.js`**

A minimal settings object so effects can be toggled independently, even before a settings UI exists:

```javascript
// src/render/effects/graphicsSettings.js
export const graphicsSettings = {
  effects: {
    fogMist: true,
    selectionRing: true,
    glows: false,        // future
    particles: false,    // future
    damageNumbers: false, // future
  }
};
```

Each layer checks its corresponding flag before drawing.

---

### Step 7: Cleanup — Remove Dead 3D Artifacts

**Modified files:**
- `src/render/hexmap3d/unitGeometries.js` — remove `getChampionRingGeo()`, cached `championRingGeo`
- `src/render/hexmap3d/unitMeshes.js` — remove `championRingInstances` collection and the ring InstancedMesh block (~15 lines)
- `src/render/hexmap3d/unitAnimations.js` — remove the `rings.filter(...)` pulse loop; this file may become nearly empty (keep the skeleton for future bob animations)
- `src/render/hexmap3d/fogOfWar.js` — remove `buildExploredMistMesh`, `MIST_COLOR`, `MIST_OPACITY`, `MIST_OFFSET` constants (keep `buildUnexploredMesh`)

---

## Summary of All Touched Files

| File | Action | Step |
|------|--------|------|
| `src/render/effects/effectsOverlay.js` | **New** — overlay canvas, layer registry, tick hook | 1 |
| `src/render/effects/projection.js` | **New** — worldToScreen utility | 2 |
| `src/render/effects/fogMistLayer.js` | **New** — 2D mist rendering layer | 3 |
| `src/render/effects/selectionRingLayer.js` | **New** — 2D selection ring layer | 4 |
| `src/render/effects/graphicsSettings.js` | **New** — per-effect toggle config | 6 |
| `src/render/hexmap3d/hexUtils.js` | **New** (or extract) — shared `hexCenter`, `hexCornersXZ`, `HEX_RADIUS` | 3 |
| `src/render/hexmap3d/fogOfWar.js` | **Modify** — remove `buildExploredMistMesh` | 3, 7 |
| `src/render/hexmap3d/unitMeshes.js` | **Modify** — remove champion ring InstancedMesh | 4, 7 |
| `src/render/hexmap3d/unitAnimations.js` | **Modify** — remove torus pulse animation | 4, 7 |
| `src/render/hexmap3d/unitGeometries.js` | **Modify** — remove `getChampionRingGeo` | 7 |
| `src/render/hexmap3d/index.js` | **Modify** — init effects overlay, wire state, remove mist mesh | 3, 5 |
| `src/game/gameOrchestrator.js` | **Modify** — (minimal) resize handler hookup if needed | 5 |

---

## Benefits of This Approach

1. **Bug fixes delivered** — the torus sliding/slicing bug disappears entirely because we stop using `InstancedMesh.scale.setScalar()` from world origin
2. **Mist becomes gorgeous** — soft-edged 2D polygons with real transparency, no z-fighting or depth-test hacks, perfectly follows terrain height per-tile
3. **Performance improves** — 3D mist prisms were 54 vertices × N tiles worth of GPU geometry updated every frame; 2D hex fill is a few Canvas2D `lineTo`/`fill` calls that the browser handles efficiently
4. **Foundation for everything else** — glows, auras, weather particles, damage numbers all slot into new layer files registered at appropriate priorities
5. **Trivial to toggle** — each effect is a single `if (!settings.effects.xyz) return;` guard, making a future graphics settings UI straightforward