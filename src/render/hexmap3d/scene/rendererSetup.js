import * as THREE from '../../../vendor/three.module.js';
import { shadowLightConfig, SHADOW_MAP_TYPES } from '../../shadowLightConfig.js';
import { MAX_PIXEL_RATIO, CLEAR_COLOR } from '../../../params/render/cameraParams.js';

/**
 * Create and configure the WebGLRenderer.
 *
 * @param {HTMLElement} mountElement
 * @param {object} [options]
 * @param {boolean} [options.shadows]
 * @returns {THREE.WebGLRenderer}
 */
export function createRenderer(mountElement, { shadows = false } = {}) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    // Prefer the discrete GPU on hybrid systems; no visual change.
    powerPreference: 'high-performance',
  });
  // Clamp without rounding up: Math.round turned fractional DPR (1.25/1.5/1.75)
  // into 2, rendering ~1.8x the pixels on those displays for no visual gain.
  renderer.setPixelRatio(Math.max(0.5, Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO)));
  renderer.setClearColor(CLEAR_COLOR); // dark parchment (contrast with terrain colors)
  // The scene always draws a full-viewport background texture (sceneSetup.js),
  // so the color clear is redundant — keep the depth/stencil clears only.
  renderer.autoClearColor = false;

  // Shadow maps are re-rendered on request only (see sceneSetup's tick): the
  // sun tracks the camera focus, so a static frame can reuse the last map.
  renderer.shadowMap.autoUpdate = false;
  if (shadows && shadowLightConfig.enabled) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = SHADOW_MAP_TYPES[shadowLightConfig.shadowMapType] ?? THREE.PCFSoftShadowMap;
    renderer.shadowMap.needsUpdate = true;
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

  return renderer;
}
