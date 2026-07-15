1. **The `resize` function doesn’t update the stored camera aspect ratio.**  
   It manually recalculates the frustum but never updates `camState.aspect`. Later calls to `applyCamera()` or the existing camera state will re-apply the *old* aspect, undoing the resize and causing the fog-projection mismatch. The fog looks correct at start then shifts because the camera frustum aspect no longer matches the viewport after a zoom/pan re-apply.

2. **The observer watches `#mapMount` (the container) instead of the Three.js canvas.**  
   When `renderer.setSize(width, height, true)` changes the canvas CSS width/height, it can sometimes trigger a re-layout of the parent – leading to an infinite observer loop that crashes the browser. Observing the Three.js canvas directly and using a re-entrancy guard avoids this.

3. **`projection.js` uses `getBoundingClientRect()`** which can be slightly out of sync with the actual drawable area if CSS transforms or borders exist. Switching to the DPR‑based calculation makes it robust.

Apply the following changes:

---

### 1. `src/render/hexmap3d/scene/scene.js` – fix the resize function

Update `camState.aspect` and use `applyCameraState` instead of manually setting frustum values. This ensures the camera state and the actual camera stay in perfect sync.

```javascript src/render/hexmap3d/scene/scene.js
// ... inside initScene, after camera definition ...

function resize(width, height) {
    if (!width || !height) return;
    renderer.setSize(width, height, true);

    // Update the stored aspect ratio and re-apply the camera state
    camState.aspect = width / Math.max(height, 1);
    applyCameraState(camera, camState);
}

// ...
```

---

### 2. `src/render/effects/effectsOverlay.js` – observe the canvas, not the container

```javascript src/render/effects/effectsOverlay.js
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
    
    ctx2d = overlay.getContext('2d');
    
    let currentW = 0, currentH = 0;
    let updating = false;                // re-entrancy guard

    function updateCanvases() {
        if (updating) return;            // prevent cycles
        const rect = threeCanvas.getBoundingClientRect();
        const w = Math.round(rect.width);
        const h = Math.round(rect.height);
        if (w === currentW && h === currentH) return;
        currentW = w;
        currentH = h;

        updating = true;
        // Resize the Three.js renderer + camera
        sceneContext.resize(w, h);

        // Align overlay exactly with the Three.js canvas
        const parentRect = threeCanvas.parentNode.getBoundingClientRect();
        overlay.style.left = (rect.left - parentRect.left) + 'px';
        overlay.style.top  = (rect.top  - parentRect.top)  + 'px';
        overlay.style.width  = w + 'px';
        overlay.style.height = h + 'px';

        const dpr = window.devicePixelRatio || 1;
        overlay.width  = w * dpr;
        overlay.height = h * dpr;
        ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);

        updating = false;
    }

    // Observe the Three.js canvas itself – no container re-layout loops
    const resizeObserver = new ResizeObserver(() => updateCanvases());
    resizeObserver.observe(threeCanvas);

    // Initial sync
    updateCanvases();
    
    // ... rest of tick hook stays the same ...
}
```

*Remove the old `syncSize` function and the observer on `mountEl`.* The `syncSize` export can be kept as a no‑op for backwards compatibility.

---

### 3. `src/render/effects/projection.js` – use hardware dimensions (optional but recommended)

```javascript src/render/effects/projection.js
export function worldToScreen(worldX, worldY, worldZ, camera, canvas) {
    _worldVec.set(worldX, worldY, worldZ);
    _screenVec.copy(_worldVec).project(camera);
    
    if (_screenVec.z > 1) return null;
    
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;
    const x = (_screenVec.x * 0.5 + 0.5) * cssW;
    const y = (-_screenVec.y * 0.5 + 0.5) * cssH;
    return { x, y };
}
```

---

### Why this fixes the fog

- **Camera aspect stays locked** even after later calls to `applyCamera`. The frustum always matches the viewport.
- **Overlay aligns perfectly** because it follows the Three.js canvas position exactly, even if scrolled or offset.
- **No infinite loops** – observing only the canvas and using the `updating` flag breaks any cycle.

After these edits, the fog mask should sit exactly on the terrain at all zoom levels. The player‑highlight ring (a 3D object) wasn’t affected before, so it will stay correct.