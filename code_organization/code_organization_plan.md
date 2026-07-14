## Current State

The `src/render/hexmap3d/` directory had **28 files** in a single flat folder.

**Cross-cutting dependencies:**
- `hexUtils.js` is imported by 10+ modules (terrain, fog, all features, all units, picking, external effects)
- `terrain.js` exports `tileTopY` which is imported by all feature builders, unit builders, and `fogMistLayer.js`
- `camera3d.js` is used by scene, all pan/zoom/touch handlers, `gameOrchestrator`, and `gameUIBindings`

**External consumers** (outside `hexmap3d/`, currently importing deeply):
- `gameOrchestrator.js` → `hexmap3d/index.js`, `hexmap3d/camera3d.js`
- `gameUIBindings.js` → `hexmap3d/index.js`, `hexmap3d/camera3d.js`
- `mapView.js` → `hexmap3d/index.js`
- `fogMistLayer.js` → `hexmap3d/terrain.js`, `hexmap3d/hexUtils.js`
- `selectionRingLayer.js` → `hexmap3d/unitUtils.js`

---

## Proposed Structure

```
src/render/hexmap3d/
├── hexmap3d-index.js         # Public barrel — re-exports everything external consumers need
├── hexUtils.js               # Shared hex math (used by 10+ modules; keep at top level)
│
├── scene/                    # Three.js world initialization
│   ├── scene-index.js        # Re-exports from scene.js, camera.js, materials.js
│   ├── scene.js              # initScene (renderer, camera, lights, animation loop)
│   ├── camera.js             # (was camera3d.js) CameraState, applyCameraState, pan/zoom/reset
│   └── materials.js          # Shared terrain Material instances
│
├── terrain/                  # Ground tile meshes
│   ├── terrain-index.js      # Re-exports buildTerrainMesh, buildUnexploredMesh, tileTopY, etc.
│   ├── terrain.js            # buildTerrainMesh, ELEVATION, tileTopY, colors
│   └── fogOfWar.js           # buildUnexploredMesh (face-down unexplored tiles)
│
├── features/                 # Map decorations (trees, mountains, knots, bases)
│   ├── features-index.js     # buildFeatureMeshes + re-exports of individual builders
│   ├── trees.js
│   ├── mountains.js
│   ├── knots.js
│   ├── bases.js
│   ├── featureGeometries.js  # Cached THREE geometries
│   └── X (featureUtils.js has actually been moved to /src/core/prng.js) pseudoRandom
│
├── units/                    # Unit figurines on the map
│   ├── units-index.js        # Re-exports: buildUnitMeshes, setupUnitAnimations, geometries, utils
│   ├── unitMeshes.js         # buildUnitMeshes
│   ├── unitAnimations.js     # setupUnitAnimations
│   ├── unitGeometries.js     # Cached unit geometries
│   └── unitUtils.js          # hexToRgb, re-exports hexCenter3D/tileTopY/coordKey
│
└── interaction/              # All pointer/touch/wheel input handling
    ├── interaction-index.js  # (was interaction3d.js) setupMapInteraction3D — wires up handlers
    ├── pan.js                # (was panHandlers.js) Shift+drag & middle-button pan
    ├── hover.js              # (was hoverHandler.js) Pointer-move → tooltip
    ├── click.js              # (was clickHandler.js) Click → hex selection
    ├── zoom.js               # (was zoomHandler.js) Wheel zoom
    ├── touch.js              # (was touchHandlers.js) Touch pan/pinch-zoom
    ├── picking.js            # Raycaster-based hex-at-pointer
    ├── tooltip.js            # DOM tooltip element (used by hover, pan, interaction cleanup)
    └── panUtils.js           # screenToWorldPan math (used by pan + touch)
```

This takes us from **28 files in 1 flat folder** to **6 subdirectories** with a clean domain separation.

---

## What Needs to Change

### 1. Internal import path updates (~40 import statements across ~20 files)
Every `./sibling.js` import becomes `../otherDir/sibling.js` or `./sibling.js` depending on new location. For example:
- `scene.js`: `'./camera3d.js'` → `'./camera.js'`
- `terrain.js`: `'./materials.js'` → `'../scene/materials.js'`, `'./hexUtils.js'` → `'../hexUtils.js'`
- `features/*.js`: `'./hexUtils.js'` → `'../../hexUtils.js'`, `'./terrain.js'` → `'../terrain/terrain.js'`
- `interaction/*.js`: cross-references like `'./picking.js'` stay `'./picking.js'`; `'./camera3d.js'` → `'../scene/camera.js'`

### 2. `hexmap3d-index.js` barrel updates
The top-level `hexmap3d-index.js` will import from new subdirectory paths:
```js
import { initScene } from './scene/scene.js';
import { buildTerrainMesh } from './terrain/terrain.js';
// ... etc
```
It should also **re-export** the public symbols that external effects layers currently reach into sub-modules for:
- `tileTopY` (from `terrain/terrain.js`)
- `hexCenter`, `hexCornersXZ` (from `hexUtils.js` — already importable)
- `hexCenter3D`, `tileTopY` (from `units/unitUtils.js`)

### 3. External consumer updates (3 files)
- **`src/render/effects/fogMistLayer.js`**: `'../hexmap3d/terrain.js'` → `'../hexmap3d/hexmap3d-index.js'` (import `tileTopY` from barrel)
- **`src/render/effects/selectionRingLayer.js`**: `'../hexmap3d/unitUtils.js'` → `'../hexmap3d/hexmap3d-index.js'` (import `hexCenter3D`, `tileTopY` from barrel)
- **`src/game/gameOrchestrator.js`**: `'../render/hexmap3d/camera3d.js'` → `'../render/hexmap3d/hexmap3d-index.js'` (import `resetCamera` from barrel)
- **`src/ui/gameUIBindings.js`**: `'../render/hexmap3d/camera3d.js'` → `'../render/hexmap3d/hexmap3d-index.js'` (import `zoomCamera`, `resetCamera` from barrel)

This way the barrel (`hexmap3d-index.js`) becomes the single public API surface, and no external code reaches into subdirectories.

## Migration Approach

The work is entirely mechanical — no logic changes, only path updates and re-exports.