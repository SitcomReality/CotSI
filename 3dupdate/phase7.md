## Phase 7: Polish — Animations, Shadows, Tooltips, Cleanup

**Goal**: Add idle animations, optional real-time shadows, and remove old SVG renderer references.

### Files to edit

**`src/render/hexmap3d/scene.js`** — Add animation tick support:

```javascript src/render/hexmap3d/scene.js
// Add an onTick callback array that the animation loop calls:
export function initScene(mountElement) {
  // ... existing setup ...

  const tickCallbacks = [];

  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);

    const time = performance.now() * 0.001; // seconds
    for (const fn of tickCallbacks) {
      fn(time);
    }

    renderer.render(scene, camera);
  }
  animate();

  return {
    // ... existing returns ...
    onTick(fn) { tickCallbacks.push(fn); },
  };
}
```

**`src/render/hexmap3d/units3d.js`** — Add idle bobbing and ring rotation:

```javascript src/render/hexmap3d/units3d.js
// Export a function that registers tick handlers for animations
export function setupUnitAnimations(ctx, getState) {
  const dummy = new THREE.Object3D();

  ctx.onTick((time) => {
    const state = getState();
    if (!state) return;

    // Find active champion ring and pulse it
    const rings = ctx.scene.children.filter(c => c.name === 'championRings');
    for (const ring of rings) {
      if (ring.isInstancedMesh) {
        const pulse = 1 + Math.sin(time * 3) * 0.1;
        ring.scale.setScalar(pulse);
      }
    }

    // Find knots and rotate them
    const knots = ctx.scene.children.filter(c => c.name === 'knots');
    for (const knot of knots) {
      if (knot.isInstancedMesh) {
        knot.rotation.y += 0.01;
      }
    }

    // Subtle bob for units — update instance matrices
    // (Can be added later for full polish)
  });
}
```

**`src/render/hexmap3d/index.js`** — Register animation callbacks:

```javascript src/render/hexmap3d/index.js
import { setupUnitAnimations } from './units3d.js';

// In initHexMap3D, after ctx is created:
export function initHexMap3D(mountElement) {
  if (ctx) disposeAll();
  ctx = initScene(mountElement);

  // Setup animations (needs game state access)
  setupUnitAnimations(ctx, () => window.__gameState);

  return ctx;
}
```

**`src/game/gameOrchestrator.js`** — Expose game state for animations:

```javascript src/game/gameOrchestrator.js
// In __beginGame, after G is set:
window.__gameState = G;

// In refreshAll, keep it updated:
window.__gameState = G;
```

**`src/render/hexmap3d/scene.js`** — Add shadow support (Tier 2, optional):

```javascript src/render/hexmap3d/scene.js
// In initScene, add shadow configuration (commented out by default):

export function initScene(mountElement, { shadows = false } = {}) {
  // ... existing renderer setup ...
  if (shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  // ... directional light setup ...
  if (shadows) {
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    dirLight.shadow.bias = -0.001;
  }
  // ...
}
```

### Cleanup — Remove old SVG renderer references

**`src/game/gameOrchestrator.js`** — Remove commented-out SVG code and old imports:

```javascript src/game/gameOrchestrator.js
// REMOVE these imports (if still present):
// import { renderHexMapSVG, setupMapInteraction, camera, resetCamera } from '../render/hexmap.js';

// REMOVE the resetCamera() call in __beginGame (or replace with 3D camera reset):
// OLD: resetCamera();
// NEW:
import { getSceneContext } from '../render/hexmap3d/index.js';
import { resetCamera as resetCamera3D } from '../render/hexmap3d/camera3d.js';
// In __beginGame:
const ctx3d = getSceneContext();
if (ctx3d) { resetCamera3D(ctx3d.getCameraState()); ctx3d.applyCamera(); }
```

**`src/ui/gameUIBindings.js`** — Ensure all button bindings use 3D camera (already covered in Phase 3).

**`src/render/hexmap.js`** — Optionally mark as deprecated or keep as fallback.

### What you'll see
- Active champion's ring pulses gently
- God's Knots slowly rotate
- Optional real-time shadows from champions/NPCs onto terrain (if enabled)
- All old SVG code paths are gone
- The game is a complete 3D low-poly diorama

---