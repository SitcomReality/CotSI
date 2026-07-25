# Minimap Rotation Handoff

## What We Were Trying to Do

The user reported that the minimap shows the game world rotated relative to the 3D
view.  In the 3D view, hexagons appear **pointy at top and bottom** (pointy-top
orientation).  On the minimap, the same world appears with its points **on the left
and right** (flat-top orientation).  Concretely, the left/West edge of the 3D world
shows up as the South-West corner of the minimap.

The user wanted the minimap's orientation to match the 3D view so that what looks
like "left" in the 3D view is also "left" on the minimap.

## Root Cause

### The 3D camera has a fixed yaw rotation

In `src/render/hexmap3d/scene/cameraState.js` the orthographic camera is
configured with:

```js
yaw: Math.PI / 6,  // 30° — camera looks from south-west toward north-east
```

This means the 3D view through the camera is rotated 30° in the XZ plane relative
to a pure top-down projection.  The pitch (~51°) and the yaw together mean the
world appears on screen at a 30° rotation from an axis-aligned view.

### The minimap uses a pure axis-aligned projection

In `src/render/minimap/` the minimap maps world X directly to pixel-X and world Z
directly to pixel-Y — no rotation is applied.  This gives a pure top-down
axis-aligned view of the same world.

The result: the 3D view and the minimap disagree by a 30° rotation, causing the
perceived mismatch.

### The camera viewport indicator is also wrong

`minimapOverlayLayer.js` draws the camera frustum as an axis-aligned rectangle on
the minimap.  Since the actual orthographic camera is at yaw=30°, the real
viewport on the ground is a **rotated** rectangle.  The indicator therefore shows
the wrong footprint — it doesn't match what the camera actually sees.

## Key Systems Explored

| File | Role |
|------|------|
| `src/render/hexmap3d/hexWorldSpace.js` | Hex → 3D world space (centers, corners) |
| `src/render/minimap/minimapTerrainLayer.js` | Minimap terrain rendering |
| `src/render/minimap/minimapOverlayLayer.js` | Minimap entity + camera indicator overlay |
| `src/render/minimap/minimapClickHandler.js` | Click-to-navigate on minimap |
| `src/render/minimap/minimap.js` | Orchestrator for minimap sub-modules |
| `src/render/minimap/minimapDom.js` | DOM/canvas setup for minimap |
| `src/render/hexmap3d/scene/cameraState.js` | Camera yaw, pitch, frustum |
| `src/render/hexmap3d/scene/sceneSetup.js` | Scene init, applyCameraState |
| `src/render/hexmap3d/scene/cameraCentering.js` | centerCameraOnHex etc |
| `src/render/hexmap3d/scene/cameraPanMath.js` | panCamera, setPanBounds |
| `src/render/hexmap3d/interaction/panMath.js` | screenToWorldPan (screen deltas → world) |
| `src/render/hexmap3d/interaction/cameraPan.js` | Drag-pan handler wiring |
| `src/render/hexmap3d/terrain/terrainMesh.js` | 3D hex terrain geometry |
| `src/render/hexmap3d/scene/cameraCentering.js` | Camera centering on hexes |
| `src/render/overlays/interactionHighlights.js` | Uses hexCornersXZ for hex-highlight rendering |
| `src/render/overlays/selectionRing.js` | Uses hexCornersXZ for selection ring |
| `src/render/overlays/movementHighlights.js` | Uses hexCornersXZ for move highlights |
| `src/render/overlays/fogHexGeometry.js` | Uses hexCornersXZ for fog mask |

## Approaches Considered (and Why Discarded)

### 1. Rotate the minimap world-to-pixel projection

Apply a 30° rotation to (x, z) world coordinates before mapping to (px, py) on
the minimap canvases.  This would make the minimap orientation match the 3D
camera's yaw.

**Cost:** touches 3 files (`minimapTerrainLayer.js`, `minimapOverlayLayer.js`,
`minimapClickHandler.js`) — bounds computation, hex rendering, entity rendering,
camera indicator corners, and click inversion all need the rotation.

**Note:** the indicator corners are already handled (`drawCameraIndicator()` now
uses the camera yaw).  `CAMERA_YAW` is available as a named constant from
`cameraState.js`.

### 2. Change the camera yaw to 0°

Setting `yaw = 0` would make the 3D view axis-aligned, matching the minimap.
This was discarded because the AGENTS.md explicitly says "The camera perspective
(tilt & rotation) will never change."  It would also be a massive visual change
to the game's established look.

## Sources of Confusion

Seven independent sources of confusion were identified during the investigation
(A–G).  All have been resolved in code or documentation — see the **Resolved
Issues** section for details on each one.

## What a Fix Would Probably Look Like

The remaining work to make the minimap match the 3D view:

1. ✅ ~~Export the camera yaw~~ — done: `CAMERA_YAW` is exported from `cameraState.js`.

2. ✅ ~~Rotate the minimap projection~~ — done: all three minimap modules
   (`minimapTerrainLayer.js`, `minimapOverlayLayer.js`, `minimapClickHandler.js`)
   apply a `CAMERA_YAW` rotation to world coords before the scale+offset
   transform; the click handler applies the inverse rotation to recover original
   world coords.

3. ✅ ~~Fix the camera indicator~~ — done: `drawCameraIndicator()` now draws the
   correct rotated+stretched frustum footprint.

4. ✅ ~~Fix the click inversion~~ — done: `handleMinimapClick()` inverts the
   rotation when converting pixel coords back to world coords.

---

## Resolved Issues

The following confusion sources from the list above have been addressed in code:

### A. hexWorldSpace.js comments — fixed

The "Flat-top" comments in `hexCenter` and `hexCornersXZ` now correctly say
"pointy-top".  The `hexCornersXZ` JSDoc also notes that the -30° offset is the
*hex corner phase*, distinct from the camera yaw.

### B. Camera yaw visibility

`CAMERA_YAW = Math.PI / 6` is now exported as a named constant from
`cameraState.js`.  All three minimap modules (`minimapTerrainLayer.js`,
`minimapOverlayLayer.js`, `minimapClickHandler.js`) carry JSDoc `@see` comments
pointing to this constant.

### C. Camera-rotation-aware pan bounds

`setPanBounds()` in `cameraPanMath.js` now uses `maxFrustumSize`, `pitch`, and
`yaw` from the camera state to compute how far the rotated viewport extends from
center at maximum zoom-out, and shrinks the pan bounds accordingly.  This
prevents the rotated frustum from showing area past the map edge at max zoom-out.

### D. Camera indicator on minimap

`drawCameraIndicator()` in `minimapOverlayLayer.js` now computes the correct
ground-plane footprint of the orthographic frustum — a parallelogram rotated by
`yaw` and stretched by `1/sin(pitch)` in the camera's local up direction.  The
minimap overlay now shows the true camera viewport shape and rotation.

### E. Shared constant for camera rotation

`CAMERA_YAW` is exported from `cameraState.js` and used internally in
`createCameraState()` instead of the inline literal.  Any module that needs the
yaw can import it or read it at runtime from `camState.yaw`.

### F. Verification recipe

See the **Verification Recipe** section below for how to confirm rotation
direction and sign in-browser.

### G. Naming glossary

See the **Naming Glossary** section below.

---

## Naming Glossary

Four rotation-related concepts appear in the codebase.  They are easy to
conflate because they share the same magnitude (30°) or similar naming.
This table keeps them distinct:

| Concept | Value | Location | Role |
|---------|-------|----------|------|
| **Camera yaw** | `+π/6` (30°) | `cameraState.js` `CAMERA_YAW` | Horizontal rotation of the 3D camera around Y axis. Makes the 3D view look south-west→north-east. **Minimap must account for this rotation.** |
| **Hex corner phase** | `-π/6` (-30°) | `hexWorldSpace.js` `hexCornersXZ()` | Starting angle for generating hexagon corner vertices. Offsets corners so points face top/bottom (pointy-top layout). **Independent of camera.** |
| **Pointy-top vs flat-top** | n/a | `hexWorldSpace.js` | Describes hexagon orientation: pointy-top = corners at top/bottom, flat-top = flat sides at top/bottom. The grid uses **pointy-top**. |
| **Screen-to-world pan** | camera quaternion | `panMath.js` `screenToWorldPan()` | Converts screen-pixel deltas to world-space pan vectors using the full camera orientation (pitch + yaw). **Transparent — callers never need to adjust for yaw.** |

---

## Verification Recipe

Use this in the browser to confirm that the rotation direction and sign are
correct:

1. Open the browser console and run:
   ```js
   __getSceneContext().getCameraState()
   ```
   This prints `yaw: 0.523...` (π/6) and `pitch: 0.897...` (π/3.5).

  * Full output from console log in game:
  ```console
  {
    "frustumSize": 7.583362363312532,
    "targetX": 11.258330249197702,
    "targetZ": 10.5,
    "aspect": 1.717852684144819,
    "pitch": 0.8975979010256552,
    "yaw": 0.5235987755982988,
    "distance": 50,
    "mapRadius": 21,
    "maxFrustumSize": 15,
    "referenceFrustum": 91.00034835975039,
    "startCenter": {
      "startX": 11.258330249197702,
      "startZ": 10.5
    },
    "panBounds": {
      "minX": -20.418856446893937,
      "maxX": 20.418856446893937,
      "minZ": -16.75039192956176,
      "maxZ": 16.75039192956176
    }
  }
  ```

2. Locate a known feature near the left/West edge of the map in the 3D view.
   Note its approximate position relative to the minimap.

3. On the minimap, find the white camera-indicator rectangle.  After the rotated
   indicator fix, this rectangle should be rotated ~30° clockwise relative to
   the axis-aligned minimap edges.

4. Pan the camera so the known feature moves through the center of the 3D view.
   The camera-indicator rectangle on the minimap should correspondingly center
   over the feature's dot on the minimap.

5. If the indicator rectangle's orientation is visibly wrong (e.g. rotated the
   wrong direction), invert the rotation sign in `drawCameraIndicator()`:
   change `- cy * sinYaw * stretch` to `+ cy * sinYaw * stretch` and vice versa
   for the corresponding z terms.

6. Optionally add a temporary `console.log` of the four world-space corners
   computed in `drawCameraIndicator()` and compare them against the hex
   positions printed by `__getSceneContext().getCameraState()`.
