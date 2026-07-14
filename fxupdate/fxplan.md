the torus *is* buggy, and there's a better architecture available. Let me diagnose the bug first, then propose the path forward.

## The Torus Bug (Root Cause)

It's not just a rotation issue. Look at the pulse animation in `unitAnimations.js`:

```javascript src/render/hexmap3d/unitAnimations.js
const rings = ctx.scene.children.filter(c => c.name === 'championRings');
for (const ring of rings) {
  if (ring.isInstancedMesh) {
    const pulse = 1 + Math.sin(time * 3) * 0.1;
    ring.scale.setScalar(pulse);  // ← SCALES THE ENTIRE MESH FROM WORLD ORIGIN
  }
}
```

`InstancedMesh.scale` is a property of the *entire mesh object* — it multiplies every instance's transform from the world origin. So the ring doesn't scale around the champion's position; it scales around `(0,0,0)`, which causes the horizontal sliding/slicing you described. To fix this properly you'd need to rebuild every instance matrix on each frame, which defeats the purpose of instancing.

This is a great example of why a 3D torus is the wrong solution here.

## The Bigger Picture

You have a 3D scene for terrain/units, but effects like selection highlights, glows, damage numbers, status particles, etc. are fundamentally **billboard/spritesheet/2D problems**. Fighting Three.js to make them work in 3D will be:

1. **Fragile** — coordinate mapping, depth sorting, and camera-relative orientation are constant pain points
2. **Slow to iterate** — every tweak requires rebuilding matrices or writing shader code
3. **Expensive** — you end up with custom shaders or 3D geometry for what should be a few draw calls on a 2D canvas

## Recommended Architecture: Canvas Overlay Layer

I'd add a transparent `<canvas>` element stacked directly on top of the Three.js canvas, with its own requestAnimationFrame loop (or hooked into your existing tick). Conceptually:

```
┌──────────────────────────────┐
│  Effects Canvas (2D overlay) │  ← particles, glows, selection rings, damage text
├──────────────────────────────┤
│  Three.js Canvas (3D scene)  │  ← terrain, fog, unit meshes, features
├──────────────────────────────┤
│  UI Panel (HTML/CSS)         │  ← sidebars, modals, tooltips
└──────────────────────────────┘
```

This gives you several wins:

| Concern | 3D-only approach | Canvas overlay approach |
|---------|-----------------|------------------------|
| Active champion highlight | InstancedMesh torus with broken scale animation | Simple 2D ring sprite drawn at projected screen coords |
| Performance | 3D geometry, material setup, instance matrix updates | Single canvas, minimal draw calls, trivial to batch |
| Glows / auras | Requires custom shaders or post-processing passes | `ctx.globalCompositeOperation = 'lighter'` + radial gradients |
| Damage numbers | 3D text mesh or sprite sheets | `ctx.fillText()` with screen-space positioning |
| Graphics settings | Hard to toggle 3D features independently | Per-effect toggles: `effects.particles`, `effects.glows`, `effects.selectionRing` |
| Zoom behavior | 3D objects get tiny when zoomed out | Can clamp sizes or fade based on camera distance |

### Proposed structure

```javascript
// src/render/effects/effectsOverlay.js
export function initEffectsOverlay(threeCanvas) {
  const overlay = document.createElement('canvas');
  overlay.className = 'effects-overlay';
  // Stack directly on top of Three.js canvas
  threeCanvas.parentNode.insertBefore(overlay, threeCanvas.nextSibling);
  
  const ctx2d = overlay.getContext('2d');
  
  // Sync size on resize
  function syncSize() {
    const rect = threeCanvas.getBoundingClientRect();
    overlay.width = rect.width * window.devicePixelRatio;
    overlay.height = rect.height * window.devicePixelRatio;
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
  }
  syncSize();
  
  return { overlay, ctx2d, syncSize };
}
```

### Selection ring replacement

Instead of the torus, you'd:
1. Project the champion's 3D world position to screen coordinates using the Three.js camera
2. Draw a glowing circle at that screen position
3. Scale the ring inversely to camera zoom so it stays visually consistent

```javascript
// Project 3D world position to 2D screen
const screenPos = new THREE.Vector3(worldX, worldY, worldZ);
screenPos.project(camera);

const screenX = (screenPos.x * 0.5 + 0.5) * canvas.width;
const screenY = (-screenPos.y * 0.5 + 0.5) * canvas.height;

// Draw pulsing ring
const pulse = 1 + Math.sin(time * 3) * 0.15;
const radius = 20 * pulse; // constant pixel size, or scale by 1/zoom
ctx2d.beginPath();
ctx2d.arc(screenX, screenY, radius, 0, Math.PI * 2);
ctx2d.strokeStyle = 'rgba(255, 216, 107, 0.9)';
ctx2d.lineWidth = 3;
ctx2d.stroke();
```

### Graphics settings

This architecture naturally supports toggles:

```javascript
const settings = {
  effects: {
    selectionRing: true,    // cheap, always on
    glows: true,            // moderate
    particles: true,        // moderate
    weatherParticles: false, // expensive on some devices
    damageNumbers: true,    // cheap
  }
};
```

Each effect is just a function call in the overlay render pass that can be skipped:

```javascript
function renderEffectsOverlay(state, camera, settings) {
  ctx2d.clearRect(0, 0, overlay.width, overlay.height);
  
  if (settings.effects.selectionRing) renderSelectionRings(ctx2d, state, camera);
  if (settings.effects.glows)        renderGlows(ctx2d, state, camera);
  if (settings.effects.particles)    renderParticles(ctx2d, state, camera);
  if (settings.effects.damageNumbers) renderDamageNumbers(ctx2d, state, camera);
}
```

## Concrete Plan

I'd recommend this sequence:

1. **Create the overlay canvas** (`src/render/effects/effectsOverlay.js`) — size-synced, pointer-events:none, stacked on the Three.js canvas
2. **Move the selection ring to 2D** — kill the torus geometry, ring material, InstancedMesh, and the broken `setScalar` animation. Replace with a simple arc/circle drawn at the projected screen position
3. **Hook into the existing tick loop** — the overlay's render function subscribes to `ctx.onTick` alongside your unit animations
4. **Add a basic settings object** — even if you don't build the UI yet, a `graphicsSettings` module with defaults lets you start branching effects
5. **Build outward from there** — glows for rare/elite mobs, particle bursts on damage, weather effects (rain/snow/fog particles), floating combat text

The 3D scene stays focused on what it's good at: terrain, unit figurines, and fog of war. The overlay handles everything that wants to be screen-aligned, which turns out to be most of the "spectacular" effects.

---