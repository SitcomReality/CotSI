import * as THREE from '../../../vendor/three.module.js';

/**
 * Three-stop toon gradient (dark → mid → white) shared by every toon material.
 * The hard band transitions give the cel-shaded look of the "painted
 * miniature" puppet layer (see aestheticConventions §11). Values follow the
 * official MeshToonMaterial gradient-map recipe: 1×3 red-channel texture,
 * nearest filtering (hard steps, no smoothing), sRGB so the stops land where
 * the inked ramp intends them.
 */
export const toonGradientMap = (() => {
  const tex = new THREE.DataTexture(new Uint8Array([0, 128, 255]), 3, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
})();

/**
 * Build a MeshToonMaterial sharing the toon gradient map.
 * Note: this Three.js build has no `flatShading` material option (it was
 * removed from all materials) — the faceted look comes from the geometries'
 * own per-face normals, so none of the old flatShading flags are needed.
 *
 * @param {object} [overrides] - extra MeshToonMaterial options (color, vertexColors, map, emissive, ...)
 * @returns {THREE.MeshToonMaterial}
 */
export function toonMaterial(overrides = {}) {
  return new THREE.MeshToonMaterial({ gradientMap: toonGradientMap, ...overrides });
}

/** Single shared material for all terrain — vertex colors drive the look */
export const terrainMaterial = toonMaterial({
  vertexColors: true,
  side: THREE.FrontSide,
});
// Module-level asset shared across chunks — disposal guards skip it (see sceneContext.js).
terrainMaterial.userData.shared = true;
