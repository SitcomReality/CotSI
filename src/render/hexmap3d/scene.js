import * as THREE from '../../lib/three.module.js';

/**
 * Initialize the Three.js scene, renderer, camera, and lights.
 * Returns all objects needed by other modules.
 */
export function initScene(mountElement) {
  // --- Renderer ---
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x5c5242); // dark parchment (contrast with terrain colors)
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
  ground.name = 'ground';
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
