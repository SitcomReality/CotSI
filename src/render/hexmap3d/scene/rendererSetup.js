import * as THREE from '../../../vendor/three.module.js';

/**
 * Create and configure the WebGLRenderer.
 *
 * @param {HTMLElement} mountElement
 * @param {object} [options]
 * @param {boolean} [options.shadows]
 * @returns {THREE.WebGLRenderer}
 */
export function createRenderer(mountElement, { shadows = false } = {}) {
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

  return renderer;
}
