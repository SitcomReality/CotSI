## Phase 1: Empty 3D Scene — "The Lit Table"

**Goal**: Get a Three.js WebGL canvas rendering inside `#mapMount` with lights and an orthographic camera. The map will be blank, but pan/zoom won't work yet, and all game interaction will be broken. That's fine.

Three.js is found in the src/lib/ directory: src/lib/three.module.js, src/lib/three.core.js

### Files to create

**`src/render/hexmap3d/scene.js`** — Renderer, scene, orthographic camera, lights, animation loop:

```javascript src/render/hexmap3d/scene.js
import * as THREE from 'three';

/**
 * Initialize the Three.js scene, renderer, camera, and lights.
 * Returns all objects needed by other modules.
 */
export function initScene(mountElement) {
  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0xe8d5a3); // warm parchment background
  renderer.shadowMap.enabled = false; // Phase 7 will enable this

  // Match the mount element's size
  const rect = mountElement.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  mountElement.appendChild(renderer.domElement);

  // --- Scene ---
  const scene = new THREE.Scene();

  // --- Orthographic Camera ---
  // Fixed isometric angle: ~50° pitch, looking from south-west toward north-east
  // We'll set frustum in camera3d.js (Phase 3) — placeholder for now
  const aspect = rect.width / Math.max(rect.height, 1);
  const frustumSize = 40; // world units visible vertically
  const camera = new THREE.OrthographicCamera(
    -frustumSize * aspect / 2,
     frustumSize * aspect / 2,
     frustumSize / 2,
    -frustumSize / 2,
    0.1,
    200
  );
  // Position: above and south-west, looking at origin
  camera.position.set(-20, 25, -20);
  camera.lookAt(0, 0, 0);

  // --- Lights ---
  const ambient = new THREE.AmbientLight(0xc8b898, 0.6);
  scene.add(ambient);

  const hemisphere = new THREE.HemisphereLight(0xffe8c8, 0x8a6a3a, 0.4);
  scene.add(hemisphere);

  const dirLight = new THREE.DirectionalLight(0xfff4e0, 3.0);
  dirLight.position.set(15, 25, 10); // north-east, matching existing shadow convention
  scene.add(dirLight);

  // --- Ground plane (temporary, removed in Phase 2) ---
  const groundGeo = new THREE.PlaneGeometry(60, 60);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0xd4b87a });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.2;
  scene.add(ground);

  // --- Animation loop ---
  let running = true;
  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();

  return {
    renderer,
    scene,
    camera,
    lights: { ambient, hemisphere, directional: dirLight },
    dispose() {
      running = false;
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      scene.clear();
    }
  };
}
```

**`src/render/hexmap3d/index.js`** — Main entry point (stub for now):

```javascript src/render/hexmap3d/index.js
import { initScene } from './scene.js';

let ctx = null; // singleton scene context

/**
 * One-time initialization. Called from gameOrchestrator on first refreshAll.
 */
export function initHexMap3D(mountElement) {
  if (ctx) {
    ctx.dispose();
  }
  ctx = initScene(mountElement);
  return ctx;
}

/**
 * Full render pass. Stub — will build terrain, features, units in later phases.
 */
export function renderHexMap3D(state) {
  if (!ctx) return;
  // Phase 2+: build/update terrain mesh here
  // Phase 5+: build/update feature instanced meshes
  // Phase 6+: build/update unit instanced meshes
}

/**
 * Placeholder — Phase 3 will implement real interaction.
 */
export function setupMapInteraction3D(onTileClick, getTooltipContent) {
  if (!ctx) return () => {};
  // Phase 3: wire canvas events + raycaster
  return () => {};
}

export function getSceneContext() {
  return ctx;
}
```

### Files to edit

**`src/game/gameOrchestrator.js`** — Replace the SVG map render path with 3D init on first call:

```javascript src/game/gameOrchestrator.js
// At top of file, ADD import:
import { initHexMap3D, renderHexMap3D, setupMapInteraction3D } from '../render/hexmap3d/index.js';

// Keep the old SVG import for now (we'll remove in Phase 7):
// import { renderHexMapSVG, setupMapInteraction, camera, resetCamera } from '../render/hexmap.js';

// Add a flag to track whether 3D scene is initialized:
let map3dInitialized = false;

// In refreshAll(), REPLACE the "// Map" section:
export function refreshAll() {
  if (!G) return;
  const ch = currentChamp();

  // Panels (unchanged)
  document.getElementById('leftMount').innerHTML = renderLeftPanel(G, ch);
  document.getElementById('rightMount').innerHTML = renderRightPanel(G);

  // ── Map (3D replacement) ──
  const mountEl = document.getElementById('mapMount');
  if (!map3dInitialized) {
    // First call: clear mount, init 3D scene
    mountEl.innerHTML = ''; // remove any placeholder
    initHexMap3D(mountEl);
    setupMapInteraction3D(
      onHexClick,
      (key) => getTooltipContent(G, key, currentChampion())
    );
    map3dInitialized = true;
  }
  renderHexMap3D(G);

  // ── Remove old SVG code (commented out for reference) ──
  // const mapResult = renderHexMapSVG(G, onHexClick);
  // document.getElementById('mapMount').innerHTML = mapResult.svg;
  // camera.offsetX = mapResult.offsetX;
  // camera.offsetY = mapResult.offsetY;
  // const svgEl = document.getElementById('hexMapSvg');
  // if (svgEl) { setupMapInteraction(svgEl, onHexClick, ...); }

  // Paley, Log, HUD, Artifact, Bot, Victory — ALL UNCHANGED below this line
  // ...
}
```

Also in `gameOrchestrator.js`, the `resetCamera()` call in `__beginGame` can stay for now (it's a no-op on the old camera object which is no longer used for rendering — harmless).

### What you'll see
- A warm beige canvas filling the `#mapMount` area
- A flat ground plane lit from the north-east
- No hex tiles, no units, no interaction
- Left/right panels, HUD, log bar still work (they're DOM)
- Clicking on the map does nothing
- Map buttons (zoom in/out) don't work yet

---