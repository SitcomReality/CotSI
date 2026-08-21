import * as THREE from '../../../vendor/three.module.js';
import { shadowLightConfig } from '../../shadowLightConfig.js';
import { SHADOW_INITIAL_FRUSTUM } from '../../../params/render/cameraParams.js';

/**
 * Create and add ambient, hemisphere, and directional lights to a scene.
 *
 * @param {THREE.Scene} scene
 * @param {object} [options]
 * @param {boolean} [options.shadows]
 * @returns {{ ambient: THREE.AmbientLight, hemisphere: THREE.HemisphereLight, directional: THREE.DirectionalLight }}
 */
export function addLights(scene, { shadows = false } = {}) {
  const cfg = shadowLightConfig;

  const ambient = new THREE.AmbientLight(cfg.ambientColor, cfg.ambientIntensity);
  scene.add(ambient);

  const hemisphere = new THREE.HemisphereLight(cfg.hemisphereSkyColor, cfg.hemisphereGroundColor, cfg.hemisphereIntensity);
  scene.add(hemisphere);

  const dirLight = new THREE.DirectionalLight(cfg.sunColor, cfg.sunIntensity);
  dirLight.position.set(cfg.sunPosition.x, cfg.sunPosition.y, cfg.sunPosition.z);
  scene.add(dirLight);

  if (shadows && cfg.enabled) {
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = cfg.mapSize;
    dirLight.shadow.mapSize.height = cfg.mapSize;
    dirLight.shadow.camera.near = cfg.cameraNear;
    dirLight.shadow.camera.far = cfg.cameraFar;
    // Fixed-size frustum, centered on the camera focus each frame
    // (see sceneSetup's tick) — map-size independent shadow texel density.
    dirLight.shadow.camera.left = -SHADOW_INITIAL_FRUSTUM;
    dirLight.shadow.camera.right = SHADOW_INITIAL_FRUSTUM;
    dirLight.shadow.camera.top = SHADOW_INITIAL_FRUSTUM;
    dirLight.shadow.camera.bottom = -SHADOW_INITIAL_FRUSTUM;
    dirLight.shadow.bias = cfg.bias;
    dirLight.shadow.normalBias = cfg.normalBias;
    dirLight.shadow.radius = cfg.radius;
  }

  return { ambient, hemisphere, directional: dirLight };
}
