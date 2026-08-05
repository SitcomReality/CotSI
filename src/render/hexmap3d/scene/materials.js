import * as THREE from '../../../vendor/three.module.js';
import {
  WATER_RIPPLE_SPEED,
  WATER_FLOW_SPEED,
  WATER_FLOW_WAVE_LENGTH,
  SPARKLE_TWINKLE_SPEED,
  SPARKLE_TWINKLE_AMP,
} from '../../../params/render/terrainParams.js';

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
 * vertex shader additionally displaces water vertices:
 *   - ripple:   transformed.y += sin(uTime * WATER_RIPPLE_SPEED + aWaterPhase) * aWaterAmp
 *   - flow:     river channels add waves traveling downstream along aWaterFlow
 *               (unit direction), so the surface never looks still AND rivers
 *               visibly flow toward their mouth.
 * Phase/amplitude come from static per-vertex attributes (buildWaterMesh.js);
 * the frame driver writes the single uTime uniform once per frame. Still water
 * has zero flow/amp attributes, so the flow terms are no-ops for lakes/ocean.
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
    'attribute vec2 aWaterFlow;\n' +
    'attribute float aWaterFlowAmp;\n' +
    shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\n` +
      // Flow: along = world-space distance along the flow axis; the phase
      // advances with it, so sine crests travel toward the river mouth.
      `float flowAlong = dot( position.xz, aWaterFlow );\n` +
      `float flowWave = sin( uTime * ${WATER_FLOW_SPEED.toFixed(2)} - flowAlong * ${(Math.PI * 2 / WATER_FLOW_WAVE_LENGTH).toFixed(3)} + aWaterPhase );\n` +
      `transformed.xz += aWaterFlow * ( flowWave * aWaterFlowAmp );\n` +
      `transformed.y += flowWave * aWaterFlowAmp * 0.5;\n` +
      `transformed.y += sin( uTime * ${WATER_RIPPLE_SPEED.toFixed(2)} + aWaterPhase ) * aWaterAmp;`
    );
};

/**
 * Sparkle glints for still water (waterSparkles.js). Small unlit 4-point stars
 * sit just above the water surface: per-instance phase/amplitude attributes
 * (computed in JS with the exact same position hash as the water mesh) bob
 * them in sync with the water beneath, and a per-instance twinkle pulse scales
 * the star around its own center. Unlit so glints read as specular highlights.
 */
export const waterSparkleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
// Module-level asset shared across chunks — disposal guards skip it (see sceneContext.js).
waterSparkleMaterial.userData.shared = true;

waterSparkleMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = waterTimeUniform;
  shader.vertexShader =
    'uniform float uTime;\n' +
    'attribute float aSparklePhase;\n' +
    'attribute float aSparkleAmp;\n' +
    shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\n` +
      // Bob with the same ripple the water below uses (same phase/amp values —
      // computed from the instance world position by the same JS hash).
      `transformed.y += sin( uTime * ${WATER_RIPPLE_SPEED.toFixed(2)} + aSparklePhase ) * aSparkleAmp;\n` +
      // Twinkle: scale the star around its own center (local verts are
      // origin-centered) with a per-instance phase.
      `transformed.xz *= 1.0 + ${SPARKLE_TWINKLE_AMP.toFixed(2)} * sin( uTime * ${SPARKLE_TWINKLE_SPEED.toFixed(2)} + aSparklePhase * 1.7 );`
    );
};
