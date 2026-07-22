import * as THREE from '../../../vendor/three.module.js';

/**
 * Create and add ambient, hemisphere, and directional lights to a scene.
 *
 * @param {THREE.Scene} scene
 * @param {object} [options]
 * @param {boolean} [options.shadows]
 * @returns {{ ambient: THREE.AmbientLight, hemisphere: THREE.HemisphereLight, directional: THREE.DirectionalLight }}
 */
export function addLights(scene, { shadows = false } = {}) {
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

  return { ambient, hemisphere, directional: dirLight };
}
