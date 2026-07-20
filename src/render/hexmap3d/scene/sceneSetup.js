import * as THREE from '../../../vendor/three.module.js';
import { createCameraState, applyCameraState } from './cameraControls.js';

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
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.round(Math.min(window.devicePixelRatio, 2)));
  renderer.setClearColor(0x5c5242); // dark parchment (contrast with terrain colors)

  if (shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  } else {
    renderer.shadowMap.enabled = false;
  }

  // Match the mount element's size
  const rect = mountElement.getBoundingClientRect();
  const initWidth = Math.round(rect.width);
  const initHeight = Math.round(rect.height);
  renderer.setSize(initWidth, initHeight, true);
  // Defensive clamp: force GL viewport to match canvas dimensions exactly
  // (guards against Three.js setViewport float rounding mismatch)
  {
    const gl = renderer.getContext();
    gl.viewport(0, 0, renderer.domElement.width, renderer.domElement.height);
  }
  mountElement.appendChild(renderer.domElement);

  // --- Scene ---
  const scene = new THREE.Scene();

  // --- Orthographic Camera (managed by camera3d) ---
  const aspect = initWidth / Math.max(initHeight, 1);
  const camState = createCameraState(aspect);

  const camera = new THREE.OrthographicCamera(
    -10, 10, 10, -10, 0.1, 200
  );
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

    // Update the stored aspect ratio and re-apply the camera state
    camState.aspect = rw / Math.max(rh, 1);
    applyCameraState(camera, camState);
  }

  // --- Lights ---
  const ambient = new THREE.AmbientLight(0xc8b898, 0.6);
  scene.add(ambient);

  const hemisphere = new THREE.HemisphereLight(0xffe8c8, 0x8a6a3a, 0.4);
  scene.add(hemisphere);

  const dirLight = new THREE.DirectionalLight(0xfff4e0, 3.0);
  dirLight.position.set(15, 25, 10); // north-east, matching existing shadow convention
  scene.add(dirLight);

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

  // --- Ground plane (temporary, removed in Phase 2) ---
  const groundGeo = new THREE.PlaneGeometry(60, 60);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0xd4b87a });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.name = 'ground';
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.2;
  scene.add(ground);

  // --- Animation loop (clock-owned) ---
  // Register the Three.js render call as a per-frame callback on the clock.
  // This replaces the old internal animate() + tickCallbacks pattern.
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
    lights: { ambient, hemisphere, directional: dirLight },
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