import * as THREE from '../../../vendor/three.module.js';
import { toonMaterial } from './materials.js';
import { createCameraState, applyCameraState } from './cameraState.js';
import { createRenderer } from './rendererSetup.js';
import { addLights } from './lightSetup.js';
import { shadowLightConfig } from '../../shadowLightConfig.js';
import { graphicsSettings } from '../../overlays/graphicsSettings.js';
import { startMeasure, endMeasure } from '../../../shared/measurements.js';
import { INITIAL_FRUSTUM, CAMERA_NEAR, CAMERA_FAR, GROUND_PLANE_SIZE, GROUND_PLANE_Y } from '../../../params/render/cameraParams.js';

// Stage background: dark parchment vignette fading to the abyss — frames the
// map like a game board on a dark table (see aestheticConventions §1/§12).
const BG_CENTER_COLOR = '#5c5242'; // matches CLEAR_COLOR (dark parchment)
const BG_EDGE_COLOR = '#0c0e12';   // --abyss
const BG_TEXTURE_SIZE = 512;

/**
 * Build a radial-gradient CanvasTexture used as the scene background.
 * Center matches the old flat clear color; edges fall to the abyss so the
 * map reads as a lit diorama rather than floating in uniform void.
 */
function createStageBackground() {
  const canvas = document.createElement('canvas');
  canvas.width = BG_TEXTURE_SIZE;
  canvas.height = BG_TEXTURE_SIZE;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(
    BG_TEXTURE_SIZE / 2, BG_TEXTURE_SIZE / 2, BG_TEXTURE_SIZE * 0.08,
    BG_TEXTURE_SIZE / 2, BG_TEXTURE_SIZE / 2, BG_TEXTURE_SIZE * 0.62
  );
  grad.addColorStop(0, BG_CENTER_COLOR);
  grad.addColorStop(1, BG_EDGE_COLOR);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, BG_TEXTURE_SIZE, BG_TEXTURE_SIZE);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

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

  // Stage background (parchment vignette → abyss) + subtle distance fog so
  // far tiles recede toward the frame (aerial perspective). Fog near/far are
  // eye-tuned for the default camera distance (~50) and map extent — larger
  // maps may need a longer `far`.
  scene.background = createStageBackground();
  if (graphicsSettings.effects.fogMist) {
    scene.fog = new THREE.Fog(new THREE.Color(BG_EDGE_COLOR), 60, 160);
  }

  // --- Orthographic Camera (managed by camera3d) ---
  const rect = mountElement.getBoundingClientRect();
  const initWidth = Math.round(rect.width);
  const initHeight = Math.round(rect.height);
  const aspect = initWidth / Math.max(initHeight, 1);
  const camState = createCameraState(aspect);

  const camera = new THREE.OrthographicCamera(-INITIAL_FRUSTUM, INITIAL_FRUSTUM, INITIAL_FRUSTUM, -INITIAL_FRUSTUM, CAMERA_NEAR, CAMERA_FAR);
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
  const groundGeo = new THREE.PlaneGeometry(GROUND_PLANE_SIZE, GROUND_PLANE_SIZE);
  const groundMat = toonMaterial({ color: 0xd4b87a });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.name = 'ground';
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = GROUND_PLANE_Y;
  scene.add(ground);

  // --- Animation loop (clock-owned) ---
  if (clock) {
    const sunOffset = shadowLightConfig.sunPosition;
    clock.onTick(() => {
      // Keep the sun (and its fixed-size shadow frustum) centered on the
      // camera focus. The offset from focus is constant, so shadow
      // direction/length never changes; the fixed frustum gives
      // map-size-independent shadow texel density.
      const sun = lights.directional;
      if (sun.castShadow) {
        sun.position.set(camState.targetX + sunOffset.x, sunOffset.y, camState.targetZ + sunOffset.z);
        sun.target.position.set(camState.targetX, 0, camState.targetZ);
        sun.target.updateMatrixWorld(); // target is not scene-added
      }
      startMeasure('render3d');
      renderer.render(scene, camera);
      endMeasure('render3d');
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
