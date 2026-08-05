import * as THREE from '../../../vendor/three.module.js';
import { WATER_RIPPLE_SPEED } from '../../../params/render/terrainParams.js';

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

/**
 * Shared water-surface material. Same toon shading as the terrain, but the
 * vertex shader additionally bobs water vertices by
 *   transformed.y += sin(uTime * WATER_RIPPLE_SPEED + aWaterPhase) * aWaterAmp
 * so the surface is never perfectly still. The ripple is entirely GPU-side:
 * phase/amplitude come from static per-vertex attributes (buildWaterMesh.js)
 * and the frame driver only writes the single uTime uniform once per frame.
 */
export const waterMaterial = toonMaterial({
  vertexColors: true,
  side: THREE.FrontSide,
});
// Module-level asset shared across chunks — disposal guards skip it (see sceneContext.js).
waterMaterial.userData.shared = true;

/** Shared uTime uniform — the frame driver mutates `.value` once per rAF tick. */
export const waterTimeUniform = { value: 0 };

waterMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = waterTimeUniform;
  shader.vertexShader =
    'uniform float uTime;\n' +
    'attribute float aWaterPhase;\n' +
    'attribute float aWaterAmp;\n' +
    shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\n` +
      `transformed.y += sin(uTime * ${WATER_RIPPLE_SPEED.toFixed(2)} + aWaterPhase) * aWaterAmp;`
    );
};
