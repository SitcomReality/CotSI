import * as THREE from '../../../vendor/three.module.js';
import { shadowLightConfig } from '../../shadowLightConfig.js';
import {
  WATER_RIPPLE_SPEED,
  WATER_FLOW_SPEED,
  WATER_FLOW_WAVE_LENGTH,
  WATER_CHOP_FREQ_1,
  WATER_CHOP_DIR_1,
  WATER_CHOP_FREQ_2,
  WATER_CHOP_DIR_2,
  WATER_CHOP_FREQ_3,
  WATER_CHOP_DIR_3,
  WATER_CHOP_SPEED,
  WATER_CHOP_STRENGTH,
  GLINT_FREQ,
  GLINT_DENSITY,
  GLINT_CYCLE_SPEED,
  GLINT_ONSET,
  GLINT_MIN_SLOPE,
  GLINT_RADIUS,
  GLINT_DRIFT,
  GLINT_BRIGHTNESS,
  GLINT_COLOR,
  SPARKLE_TWINKLE_SPEED,
  SPARKLE_TWINKLE_AMP,
} from '../../../params/render/terrainParams.js';

/** Horizontal direction toward the sun (shadowLightConfig aims it at the
 * origin) — wave-face slope is projected onto this to pick glint faces.
 * Recomputed here so the glints follow sun tweaks in shadowLightConfig. */
const GLINT_SUN = (() => {
  const sp = shadowLightConfig.sunPosition;
  const len = Math.hypot(sp.x, sp.z) || 1;
  return [ (sp.x / len).toFixed(3), (sp.z / len).toFixed(3) ];
})();

/**
 * Three-stop toon gradient (dark → mid → white) shared by every toon material.
 * The hard band transitions give the cel-shaded look of the "painted
 * miniature" puppet layer (see aestheticConventions §11). Values follow the
 * official MeshToonMaterial gradient-map recipe: 1×3 red-channel texture,
 * nearest filtering (hard steps, no smoothing), sRGB so the stops land where
 * the inked ramp intends them.
 */
export const toonGradientMap = (() => {
  // RGBAFormat is required for sRGB color space in WebGL2.  Four-channel
  // dupe: every pixel is (stop, stop, stop, 255) so MeshToonMaterial's
  // red-channel-only gradient read produces the same stops.
  const stops = [0, 128, 255];
  const data = new Uint8Array(stops.length * 4);
  for (let i = 0; i < stops.length; i++) {
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = stops[i];
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
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
    'varying vec3 vWaterWorld;\n' +
    'varying float vWaterFlowAmp;\n' +
    'varying float vWaterUp;\n' +
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
      `transformed.y += sin( uTime * ${WATER_RIPPLE_SPEED.toFixed(2)} + aWaterPhase ) * aWaterAmp;\n` +
      // Post-displacement world position drives the fragment chop (below).
      `vWaterWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;\n` +
      // Glint gates: river channels mask out via their flow amplitude, and
      // only near-horizontal top faces may glint (chunk meshes sit at
      // identity, so object-space normals are world normals — bank walls of
      // the water prism never flash).
      `vWaterFlowAmp = aWaterFlowAmp;\n` +
      `vWaterUp = normal.y;`
    );
  // Chop: three crossed animated sine trains perturb the fragment normal, so
  // the toon ramp renders them as drifting light/dark patches — gentle
  // non-directional ripples on large water bodies (params: terrainParams.js).
  // The same block computes the sun-glint mask (GLINT_* params): cellular
  // flecks over a slowly drifting world-space grid that flash to a stark peak
  // only where the wave slope tilts toward the sun — so glints ride the chop
  // trains instead of pulsing in place. The mask is applied additively just
  // before <opaque_fragment>, where outgoingLight exists.
  shader.fragmentShader =
    'uniform float uTime;\n' +
    'varying vec3 vWaterWorld;\n' +
    'varying float vWaterFlowAmp;\n' +
    'varying float vWaterUp;\n' +
    // Deterministic [0,1) hash — same formula family as the JS-side hashes
    // (buildWaterMesh.js), keeping the look codebase-native.
    'float glintHash( vec2 p ) {\n' +
    '  return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 );\n' +
    '}\n' +
    shader.fragmentShader.replace(
      '#include <normal_fragment_begin>',
      `#include <normal_fragment_begin>\n` +
      `float chopC1 = dot( vWaterWorld.xz, vec2( ${WATER_CHOP_DIR_1[0].toFixed(2)}, ${WATER_CHOP_DIR_1[1].toFixed(2)} ) ) * ${WATER_CHOP_FREQ_1.toFixed(2)} + uTime * ${WATER_CHOP_SPEED.toFixed(2)} * 1.00;\n` +
      `float chopC2 = dot( vWaterWorld.xz, vec2( ${WATER_CHOP_DIR_2[0].toFixed(2)}, ${WATER_CHOP_DIR_2[1].toFixed(2)} ) ) * ${WATER_CHOP_FREQ_2.toFixed(2)} + uTime * ${WATER_CHOP_SPEED.toFixed(2)} * 1.35;\n` +
      `float chopC3 = dot( vWaterWorld.xz, vec2( ${WATER_CHOP_DIR_3[0].toFixed(2)}, ${WATER_CHOP_DIR_3[1].toFixed(2)} ) ) * ${WATER_CHOP_FREQ_3.toFixed(2)} + uTime * ${WATER_CHOP_SPEED.toFixed(2)} * 0.80;\n` +
      `vec3 chopSlope = vec3(\n` +
      `  cos( chopC1 ) * ${(WATER_CHOP_DIR_1[0] * WATER_CHOP_FREQ_1).toFixed(3)} + cos( chopC2 ) * ${(WATER_CHOP_DIR_2[0] * WATER_CHOP_FREQ_2).toFixed(3)} + cos( chopC3 ) * ${(WATER_CHOP_DIR_3[0] * WATER_CHOP_FREQ_3).toFixed(3)},\n` +
      `  0.0,\n` +
      `  cos( chopC1 ) * ${(WATER_CHOP_DIR_1[1] * WATER_CHOP_FREQ_1).toFixed(3)} + cos( chopC2 ) * ${(WATER_CHOP_DIR_2[1] * WATER_CHOP_FREQ_2).toFixed(3)} + cos( chopC3 ) * ${(WATER_CHOP_DIR_3[1] * WATER_CHOP_FREQ_3).toFixed(3)} );\n` +
      // View-space approximation: water is near-horizontal and toon banding
      // only depends on dot(n, l), so offsetting the normal directly reads
      // correctly without exact frame math.
      `normal = normalize( normal + chopSlope * ${(WATER_CHOP_STRENGTH * 0.05).toFixed(4)} );\n` +
      // ── Sun glints (GLINT_* in terrainParams.js) ──
      `vec2 glintUv = vWaterWorld.xz * ${GLINT_FREQ.toFixed(2)} + uTime * vec2( ${GLINT_DRIFT[0].toFixed(3)}, ${GLINT_DRIFT[1].toFixed(3)} );\n` +
      `vec2 glintCell = floor( glintUv );\n` +
      `vec2 glintLocal = fract( glintUv );\n` +
      `vec2 glintSpot = vec2( glintHash( glintCell + 47.7 ), glintHash( glintCell + 91.3 ) ) * 0.6 + 0.2;\n` +
      `float glintExists = step( ${(1 - GLINT_DENSITY).toFixed(2)}, glintHash( glintCell + 19.19 ) );\n` +
      `float glintCrest = sin( uTime * ${GLINT_CYCLE_SPEED.toFixed(2)} + glintHash( glintCell ) * 6.28318 );\n` +
      `float glintFlash = smoothstep( ${GLINT_ONSET.toFixed(2)}, 0.999, glintCrest );\n` +
      `float glintFace = step( ${GLINT_MIN_SLOPE.toFixed(2)}, chopSlope.x * ${GLINT_SUN[0]} + chopSlope.z * ${GLINT_SUN[1]} );\n` +
      `float glintFleck = 1.0 - smoothstep( ${(GLINT_RADIUS * 0.45).toFixed(3)}, ${GLINT_RADIUS.toFixed(3)}, length( glintLocal - glintSpot ) );\n` +
      `float glintMask = glintExists * glintFlash * glintFace * glintFleck\n` +
      `  * ( 1.0 - smoothstep( 0.0, 0.02, vWaterFlowAmp ) )\n` +
      `  * smoothstep( 0.5, 0.9, vWaterUp );`
    ).replace(
      '#include <opaque_fragment>',
      // Peak flash drives the water color to stark white (saturates the add).
      `outgoingLight += vec3( ${GLINT_COLOR.map(c => c.toFixed(2)).join(', ')} ) * ( glintMask * ${GLINT_BRIGHTNESS.toFixed(2)} );\n` +
      `#include <opaque_fragment>`
    );
};

/**
 * Feature-FX star accents (featureFx.js — God's Knot rainbow sparkles, ripe
 * Peridexion fruit glints, collect bursts). Small unlit stars twinkle via a
 * per-instance phase attribute that scales the star around its own center.
 * Unlit so the stars read as self-luminous. (Formerly the water sparkle
 * material — water glints now live inside waterMaterial as a shader term.)
 */
export const fxStarMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
// Module-level asset shared across chunks — disposal guards skip it (see sceneContext.js).
fxStarMaterial.userData.shared = true;

fxStarMaterial.onBeforeCompile = (shader) => {
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

/**
 * Feature FX glow (featureFx.js) — soft additive ring hovering above a
 * charged Blessed Font. Unlit additive so it reads as emitted light; the
 * per-instance aSparklePhase drives a slow breathing pulse of the ring's
 * radius. depthWrite stays off so units/features behind it render normally.
 */
export const fxGlowMaterial = new THREE.MeshBasicMaterial({
  color: 0xbfe8ff,
  transparent: true,
  opacity: 0.5,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.DoubleSide,
});
// Module-level asset shared across chunks — disposal guards skip it (see sceneContext.js).
fxGlowMaterial.userData.shared = true;

fxGlowMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = waterTimeUniform;
  shader.vertexShader =
    'uniform float uTime;\n' +
    'attribute float aSparklePhase;\n' +
    shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\n` +
      // Breathing pulse: scale the flat ring around its own center.
      `transformed.xz *= 1.0 + 0.12 * sin( uTime * 2.2 + aSparklePhase );`
    );
};
