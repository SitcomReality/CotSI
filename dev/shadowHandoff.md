# Shadow System Handoff — July 2026

## Current State (as of this session's revert)

The code is reverted to the pre-dynamic-shadow state. The only change
that remains is `frustumPadding: 2.0` in `shadowLightConfig.js`, which
was already in place before this session (the earlier fix for an
undersized frustum).

## How the Lighting & Shadow System Works

### Light setup (`src/render/hexmap3d/scene/lightSetup.js`)

- `addLights()`: creates an ambient light, a hemisphere light, and one
  `DirectionalLight`.
- The directional light is positioned at a fixed world coordinate
  `(-20, 10, -3)` and targets the origin `(0, 0, 0)`.
- The shadow camera (Three.js's built-in shadow support for
  `DirectionalLight`) is positioned at the same world point and shares
  the same target.
- `setShadowMapExtent(light, mapRadius)`: called once during init from
  `initMap3d.js`.  It computes the world-space extent of the hex grid
  (`mapWidth = sqrt(3) * radius * 2`, `mapHeight = 1.5 * radius * 2`),
  takes the larger dimension, multiplies by `frustumPadding` (currently
  2.0), and sets `light.shadow.camera.left/right/top/bottom` to a
  square frustum of that size centred on the light target (origin).
  This is a static, whole-map shadow frustum computed once.

### Shadow parameters (`src/render/shadowLightConfig.js`)

| Parameter    | Value  | Notes                                     |
|--------------|--------|-------------------------------------------|
| `mapSize`    | 2048   | Shadow map resolution per side             |
| `cameraNear` | 0.5    | Near clip of shadow camera                 |
| `cameraFar`  | 100    | Far clip of shadow camera                  |
| `frustumPadding` | 2.0 | Multiplier on map extent for the frustum |
| `bias`       | -0.00005 | Depth bias for acne reduction            |
| `normalBias` | 0.005  | Normal-based self-shadow avoidance         |

### Shadow map type

`VSMShadowMap` — Variance Shadow Mapping.  Provides soft-edged
shadows.  Set in `shadowLightConfig.shadowMapType` and consumed in
`rendererSetup.js`.

## The Known Bug

On maps larger than roughly radius 25, shadows are missing from the
**top-left area** of the map (northwest region in world space).

### Root cause

The shadow camera sits at the light's fixed world position
`(-20, 10, -3)` and looks toward the origin.  Its view direction
(vector from light to origin) is roughly `(0.89, -0.44, 0.13)` —
pointing southwest and slightly down.

For large maps, hexes in the northwest region produce a **positive
camera-local Z** value, meaning they fall **behind the shadow
camera**.  The shadow camera's near/far clip planes only capture
objects in front of it (negative local Z), so these hexes never enter
the shadow pass regardless of how large the frustum left/right/top/
bottom values are.

### Verification

Computed for a radius-30 map at several sample hexes (verified with
the actual light geometry):

```
hex(-20, 30)   camZ=+20.87  CLIPPED (behind camera)
hex(-25, 30)   camZ=+13.19  CLIPPED
hex(-15, 25)   camZ=+23.71  CLIPPED
hex(  0, 30)   camZ=+51.58  CLIPPED
hex(-30, 20)   camZ= -4.16  OK (in front)
```

All tested hexes with `r >= 25` (northern half of the map) have
positive camera-local Z and are clipped.  Hexes further south
(negative r) or with large positive q are also behind the camera
because they extend past the light's position on the opposite side.

### Why it only affects large maps

On a small map (radius ~10), the map barely extends past the light
position `x=-20`.  Most hexes sit between the light and the origin,
well inside the camera's view frustum.  At radius 25+, the hex grid
extends past `x=-20` by enough margin that significant portions of the
map sit on the camera's "behind" side.

## What Was Attempted This Session

### Dynamic shadow frustum following the camera

The idea: instead of a static frustum covering the whole map from a
fixed light position, reposition the light and its shadow camera so
the frustum always centres on whatever area the player is currently
looking at.  Both light position and light target are shifted by the
same world delta, preserving the light **direction** vector.

### The implementation (now reverted)

1. **`lightSetup.js`** — added `updateShadowFrustumForView(light, camState)`:
   - Read the visible ground area from the camera state (`targetX`,
     `targetZ`, `frustumSize`, `aspect`, `pitch`).
   - Compute `halfWidth` (perpendicular to the camera look direction)
     and `halfDepth` (along the look direction, accounting for
     isometric foreshortening via `sin(pitch)`).
   - Apply a `viewMargin` of 1.5×.
   - Set `light.position = cfg.sunPosition + (targetX, 0, targetZ)`
     and `light.target.position = (targetX, 0, targetZ)` so the
     direction vector stays identical.
   - Resize `left/right/top/bottom` to a square of the computed
     half-extent.

2. **`sceneSetup.js`** — called `updateShadowFrustumForView` after
   every `applyCamera()` and after resize.

3. **`initMap3d.js`** — removed the `setShadowMapExtent` call (the
   dynamic update handles the initial state).

4. **`shadowLightConfig.js`** — added `viewMargin: 1.5`.

### Result: three new problems

**1. Missing shadows shifted to bottom-right.**  The dynamic frustum
only covers the visible area + margin.  On large maps, parts of the
map outside this window receive no shadow information.  Previously the
top-left was missing; now the shadows just follow the camera, leaving
parts of the map unshadowed when the player looks elsewhere.

**2. Lighting appearance changes with camera position.**  Although the
light direction vector is mathematically identical after translation,
the shadow directions appeared to shift as the player panned.  A
mountain's shadow pointed SE when the peak was in the top-left of the
screen, but pointed downward when the peak was in the bottom-right.
The shadows changed length and orientation depending on the peak's
position on screen.

**3. Colour/hue shift across the map.**  The same scene looked
"sunset yellow" in the top-left and "harsh white" in the bottom-right.
This could be a perception effect from the changing shadow coverage,
or it could indicate that the hemisphere/ambient lights contribute
differently depending on which geometry is in the shadow pass.

### Why the dynamic approach failed

The critical misunderstanding: **moving the light position changes the
shadow camera's view matrix, not just the direction**.  A
`DirectionalLight` in Three.js uses the light position as the shadow
camera origin.  The shadow map is rendered by projecting the scene
from that origin onto a plane perpendicular to the light direction.
When the origin moves, the projection of every object onto that plane
changes — shadows stretch, shrink, and rotate in world space even
while the *infinite parallel rays* stay parallel.

The effect is equivalent to holding a flashlight at arm's length vs.
close to an object: the rays remain parallel in both cases (it's a
directional light), but the shadow map is rendered from a specific
vantage point, and the content of that render depends on which
geometry is in front of the camera at that vantage.

**A truly correct camera-following shadow system** (e.g., Cascaded
Shadow Maps) doesn't just move the light.  It recomputes the shadow
camera's projection matrix from scratch based on the main camera's
view frustum in light space.  The light stays at a fixed position; the
shadow camera is a *separate* orthographic camera whose frustum is
recomputed to cover the main frustum's projection into light space.

## Architectural Constraints

- The camera perspective (tilt & rotation) never changes — only zoom
  and pan (from AGENTS.md).  This simplifies any shadow solution.
- The game uses Three.js's built-in `DirectionalLight.shadow` system.
- VSMShadowMap is configured; any solution must be compatible with it.
- The map is procedurally generated and can grow arbitrarily large via
  exploration/discovery (not just the initial radius).
- Stylized graphics are the target — physically perfect shadows are
  not required.  A simple, performant approximation is preferred.

## Alternative Approaches for Future Sessions

### Approach A: Increase cameraFar and accept the limitation

If the problem is that parts of the map fall behind the camera's
view, one fix is to increase `cameraFar` significantly (to e.g. 500)
so the far plane doesn't clip distant geometry.  But the real problem
is geometry behind the camera (positive local Z), not just far-away
geometry — increasing `cameraFar` alone won't fix that.

### Approach B: Move the light position further from the map centre

If the light is moved much further away along the same direction
(e.g. `(-100, 50, -15)` instead of `(-20, 10, -3)`), the angular
extent of the map as seen from the light shrinks.  Fewer (or zero)
hexes fall behind the shadow camera because the camera is much
further back.  The frustum size (`left/right/top/bottom`) would need
to increase proportionally.

Trade-off: further light = larger frustum = lower shadow resolution
per unit of world surface.  At 2048×2048 on a radius-40 map this
might be acceptable for stylized graphics.

### Approach C: Accept the limitation, style around it

For a stylized game, missing shadows on the map edge might be
acceptable if the visual design accounts for it.  Options:
- Limit map radius to ~25 (the threshold where the issue appears).
- Fade shadows toward the map edge intentionally.
- Remove real-time shadows entirely and bake them into the terrain
  texture.
- Use a screen-space shadow approximation that doesn't depend on the
  shadow camera position.

### Approach D: Proper view-aligned shadow frustum (revisit with care)

If the dynamic approach is revisited, the implementation must:

1. **Keep the light at a fixed world position** — never move it.
2. Create a *second* orthographic camera for shadow rendering,
   separate from the light's built-in shadow camera (or reconfigure
   it per-frame).
3. Compute the 8 corners of the main camera's view frustum in world
   space, transform them into light space, and compute the axis-
   aligned bounding box in light space.
4. Set `left/right/top/bottom/near/far` from that AABB.
5. Update this every time the camera changes.

This approach costs nothing at render time (the projection matrices
are set once per camera move) and exactly covers the visible area
without artefacts.  The problem this session hit (shadows changing
direction) would not occur because the light position never moves;
only the shadow camera's *projection* changes.

### Approach E: No shadow maps, use a simple shadow decal / billboard

Since the game has a stylised aesthetic, each unit could render a
dark ellipse on the ground directly below it, or a directional shadow
sprite projected in the light direction.  This completely avoids the
shadow map complexity and scales to any map size.  Performance is
constant.  Implementation is in the render/hexmap3d layer, independent
of the light system.

## Files Involved

| File | Role |
|------|------|
| `src/render/shadowLightConfig.js` | All tunable shadow/light constants |
| `src/render/hexmap3d/scene/lightSetup.js` | `addLights`, `setShadowMapExtent` |
| `src/render/hexmap3d/scene/sceneSetup.js` | Scene creation, `applyCamera` |
| `src/render/hexmap3d/scene/cameraState.js` | Camera state + `applyCameraState` |
| `src/render/hexmap3d/scene/cameraZoomMath.js` | `fitCameraToMap`, frustum sizing |
| `src/runtime/initMap3d.js` | Calls `setShadowMapExtent` once |
| `src/render/hexmap3d/scene/rendererSetup.js` | Reads `shadowMapType` from config |

## Data for Reproduction

To reproduce the shadow clipping issue, set `gameState.radius = 30`
(or larger), initialise a game, and inspect the northwest region
(hexes with `r > 20`).  Shadows on the terrain meshes in that region
are absent.

The exact threshold depends on the light position.  With
`sunPosition.x = -20`, hexes with `r >= 25` start to show positive
camera-local Z values.  Moving the light further away (Approach B)
raises this threshold proportionally.
