import * as THREE from '../../../vendor/three.module.js';
import { createCameraState, applyCameraState } from './cameraState.js';
import { createRenderer } from './rendererSetup.js';
import { addLights } from './lightSetup.js';

/**
 * Initialize the Three.js scene, renderer, camera, and lights.
 * The clock parameter provides the rAF loop and per-frame callbacks;
 * sceneSetup no longer owns its own animation loop.
 *
 * @param {HTMLElement} mountElement
 * @param {object} [options]
 * @param {object} [options.clock] - Clock instance (from clockScheduler)
 * @param {boolean} [options.shadows]
 * @returns {object} scene context
 */
export function initScene(mountElement, { clock, shadows = false } = {}) {
  // --- Renderer ---
  const renderer = createRenderer(mountElement, { shadows });

  // --- Scene ---
  const scene = new THREE.Scene();

  // --- Orthographic Camera (managed by camera3d) ---
  const rect = mountElement.getBoundingClientRect();
  const initWidth = Math.round(rect.width);
  const initHeight = Math.round(rect.height);
  const aspect = initWidth / Math.max(initHeight, 1);
  const camState = createCameraState(aspect);

  const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);
  applyCameraState(camera, camState);

  // Store camera on canvas for picking access
  renderer.domElement.__camera = camera;

  function resize(width, height) {
    if (!width || !height) return;
    const rw = Math.round(width);
    const rh = Math.round(height);
    renderer.setSize(rw, rh, true);
    // Defensive clamp: force GL viewport to match canvas dimensions exactly
    {
      const gl = renderer.getContext();
      gl.viewport(0, 0, renderer.domElement.width, renderer.domElement.height);
    }

    camState.aspect = rw / Math.max(rh, 1);
    applyCameraState(camera, camState);
  }

  // --- Lights ---
  const lights = addLights(scene, { shadows });

  // --- Ground plane (temporary, removed in Phase 2) ---
  const groundGeo = new THREE.PlaneGeometry(60, 60);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0xd4b87a });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.name = 'ground';
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.2;
  scene.add(ground);

  // --- Animation loop (clock-owned) ---
  if (clock) {
    clock.onTick(() => {
      renderer.render(scene, camera);
    });
  }

  return {
    renderer,
    scene,
    camera,
    camState,
    resize,
    lights,
    applyCamera() { applyCameraState(camera, camState); },
    getCameraState() { return camState; },
    getClock() { return clock; },
    dispose() {
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      scene.clear();
    }
  };
}
