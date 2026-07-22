import * as THREE from '../../../vendor/three.module.js';
import { shadowLightConfig } from '../../shadowLightConfig.js';

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
    // Initial modest frustum; setShadowMapExtent() resizes to match the map.
    dirLight.shadow.camera.left = -15;
    dirLight.shadow.camera.right = 15;
    dirLight.shadow.camera.top = 15;
    dirLight.shadow.camera.bottom = -15;
    dirLight.shadow.bias = cfg.bias;
    dirLight.shadow.normalBias = cfg.normalBias;
    dirLight.shadow.radius = cfg.radius;
  }

  return { ambient, hemisphere, directional: dirLight };
}

/**
 * Size the directional light's shadow camera frustum to cover the full hex
 * map (plus generous padding for cast shadows off the edge).
 *
 * The shadow camera looks from the light's fixed position toward the map
 * center (0, 0, 0). Its local axes are rotated relative to world X/Z
 * (because the light comes from north-east at ~51° pitch), so we compute
 * the frustum directly from the map's world extent rather than deriving
 * values from the main camera's view.
 *
 * Call this ONCE from initMap3D, after fitCameraToMap is known.
 *
 * @param {THREE.DirectionalLight} light
 * @param {number} mapRadius - Map radius in hexes
 */
export function setShadowMapExtent(light, mapRadius) {
  if (!light.castShadow) return;

  // Map world extent (see cameraZoomMath.js fitCameraToMap).
  const mapWidth  = Math.sqrt(3) * mapRadius * 2;  // ~3.464 * radius
  const mapHeight = 1.5 * mapRadius * 2;            // 3 * radius
  const mapExtent = Math.max(mapWidth, mapHeight);

  // Generous padding so tall objects at the map edge still cast visible
  // shadows onto the map rather than off the shadow map.
  const padding = shadowLightConfig.frustumPadding;
  const shadowWorldExtent = mapExtent * padding;

  // The shadow camera's local axes are rotated relative to world space.
  // Setting left/right = top/bottom to a single value oversized enough
  // for both axes ensures the full map is covered regardless of the
  // shadow camera's orientation relative to world X/Z.
  const halfExtent = shadowWorldExtent / 2;

  light.shadow.camera.left   = -halfExtent;
  light.shadow.camera.right  =  halfExtent;
  light.shadow.camera.top    =  halfExtent;
  light.shadow.camera.bottom = -halfExtent;

  // Target stays at map center — light direction is static.
  light.target.position.set(0, 0, 0);
  light.shadow.camera.updateProjectionMatrix();
}
