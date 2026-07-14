import * as THREE from '../../../lib/three.module.js';
import { createCameraState, applyCameraState } from './camera.js';

/**
 * Initialize the Three.js scene, renderer, camera, and lights.
 * Returns all objects needed by other modules.
 */
export function initScene(mountElement, { shadows = false } = {}) {
  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x5c5242); // dark parchment (contrast with terrain colors)

  if (shadows) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  } else {
    renderer.shadowMap.enabled = false;
  }

  // Match the mount element's size
  const rect = mountElement.getBoundingClientRect();
  renderer.setSize(rect.width, rect.height, false);
  mountElement.appendChild(renderer.domElement);

  // --- Scene ---
  const scene = new THREE.Scene();

  // --- Orthographic Camera (managed by camera3d) ---
  const aspect = rect.width / Math.max(rect.height, 1);
  const camState = createCameraState(aspect);

  const camera = new THREE.OrthographicCamera(
    -10, 10, 10, -10, 0.1, 200
  );
  applyCameraState(camera, camState);

  // Store camera on canvas for picking access
  renderer.domElement.__camera = camera;

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

  // --- Animation loop ---
  let running = true;
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
    renderer,
    scene,
    camera,
    camState,
    lights: { ambient, hemisphere, directional: dirLight },
    applyCamera() { applyCameraState(camera, camState); },
    getCameraState() { return camState; },
    onTick(fn) { tickCallbacks.push(fn); },
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