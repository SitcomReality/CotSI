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
  WATER_CHOP_FREQ_4,
  WATER_CHOP_DIR_4,
  WATER_CHOP_SPEED,
  WATER_CHOP_STRENGTH,
  WATER_CHOP_WARP_FREQ,
  WATER_CHOP_WARP_STRENGTH,
  WATER_CHOP_BREATHE_STRENGTH,
  WATER_SHORE_FREQ,
  WATER_SHORE_SPEED,
  WATER_SHORE_AMP,
  WATER_SHORE_ISO_SUPPRESS,
  WATER_SHORE_INNER,
  WATER_SHORE_OUTER,
  WATER_SPEC_SHININESS,
  WATER_SPEC_STRENGTH,
  WATER_SPEC_COLOR,
  WATER_FRESNEL_POWER,
  WATER_FRESNEL_STRENGTH,
  WATER_SPARKLE_FREQ,
  WATER_SPARKLE_SPEED,
  WATER_SPARKLE_ONSET,
  SPARKLE_TWINKLE_SPEED,
  SPARKLE_TWINKLE_AMP,
} from '../../../params/render/terrainParams.js';

/**
 * World-space unit direction from the surface toward the sun (the
 * DirectionalLight targets the origin, so normalize(sunPosition)). The specular
 * sparkle needs the full 3D direction (not just the horizontal sun, which was
 * enough for the old flat slope gate), and it's recomputed here so the glints
 * follow sun tweaks in shadowLightConfig.
 */
const WATER_SUN_DIR = (() => {
  const sp = shadowLightConfig.sunPosition;
  const len = Math.hypot(sp.x, sp.y, sp.z) || 1;
  return [sp.x / len, sp.y / len, sp.z / len];
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
 * Shared water-surface material. Unlike the cel terrain (3-band toon), water is
 * SMOOTH-shaded (MeshPhong) so the per-pixel chop normal field renders as
 * continuous swells instead of being quantized into a couple of flat cel bands
 * — the banding is exactly what made a large flat water body read as a rigid
 * solid. A subtle white sheen (emissive tint) keeps it reading as wet. The
 * vertex shader displaces only rivers:
 *   - flow:     river channels add waves traveling downstream along aWaterFlow
 *               (unit direction), so the surface never looks still AND rivers
 *               visibly flow toward their mouth.
 *   - ripple:   transformed.y += sin(uTime * WATER_RIPPLE_SPEED + aWaterPhase) * aWaterAmp
 *               (kept only on rivers; large water tiles carry amp 0).
 * Large water (lakes/ocean) keeps a perfectly flat top face — buildWaterMesh.js
 * writes zero amp for water tiles, so the coarse hex fan is never deformed and
 * won't cast a striated moving shadow. All of its motion is per-pixel: the
 * chop trains perturb the fragment normal, a map-center swell rolls in from the
 * map edge, and a Blinn-Phong specular + value-noise mask adds the sun glints
 * (WATER_SPEC_* / WATER_SPARKLE_* / WATER_FRESNEL_*). The swell directs toward
 * uWaterCenter as a continuous radial field, so touching water tiles are
 * seamless. The frame driver writes the single uTime uniform once per frame.
 */
export const waterMaterial = new THREE.MeshPhongMaterial({
  vertexColors: true,
  side: THREE.FrontSide,
  // No built-in Blinn-Phong specular — the additive sparkle term below owns
  // the glints, so we control their shape and they don't double up.
  specular: 0x000000,
  shininess: 0,
});
// Module-level asset shared across chunks — disposal guards skip it (see sceneContext.js).
waterMaterial.userData.shared = true;

/** Shared uTime uniform — the frame driver mutates `.value` once per rAF tick. */
export const waterTimeUniform = { value: 0 };

/**
 * Shared uniforms for the map-center-toward swell. The map is always centered
 * at world origin (0,0); the radius is set once from gameState.radius (see
 * initMap3d.js). The swell direction is a continuous radial field, so touching
 * water tiles are seamless by construction.
 */
export const waterCenterUniform = { value: new THREE.Vector2(0, 0) };
export const waterRadiusUniform = { value: 1 };

waterMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.uTime = waterTimeUniform;
  shader.uniforms.uWaterCenter = waterCenterUniform;
  shader.uniforms.uWaterRadius = waterRadiusUniform;
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
  // Chop: four crossing sine trains, sampled at a domain-warped position and
  // breathing in slow patches, perturb the fragment normal so the smooth (Phong)
  // shading renders them as organic swells (params: terrainParams.js). The same
  // block computes the sun glint (WATER_SPEC_* / WATER_SPARKLE_* / WATER_FRESNEL_*):
  // a Blinn-Phong highlight from the chopped normal, gathered at grazing angles
  // by a fresnel term, and broken into drifting sparkles by a value-noise mask —
  // so glints ride the chop instead of sitting as flat discs. The mask is applied
  // additively just before <opaque_fragment>, where outgoingLight exists.
  const sunX = WATER_SUN_DIR[0].toFixed(4);
  const sunY = WATER_SUN_DIR[1].toFixed(4);
  const sunZ = WATER_SUN_DIR[2].toFixed(4);
  const specColor = WATER_SPEC_COLOR.map(c => c.toFixed(2)).join(', ');
  const chopStrength = (WATER_CHOP_STRENGTH * 0.05).toFixed(4);
  shader.fragmentShader =
    'uniform float uTime;\n' +
    'uniform vec2 uWaterCenter;\n' +
    'uniform float uWaterRadius;\n' +
    'varying vec3 vWaterWorld;\n' +
    'varying float vWaterFlowAmp;\n' +
    'varying float vWaterUp;\n' +
    // Deterministic [0,1) hash — same formula family as the JS-side hashes
    // (buildWaterMesh.js), keeping the look codebase-native.
    'float glintHash( vec2 p ) {\n' +
    '  return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 );\n' +
    '}\n' +
    // Smooth value noise (bilinear interpolation of glintHash) — used to break
    // the specular highlight into drifting sparkle cells without per-pixel hash
    // shimmer (which would alias).
    'float waterValueNoise( vec2 p ) {\n' +
    '  vec2 i = floor( p );\n' +
    '  vec2 f = fract( p );\n' +
    '  vec2 u = f * f * ( 3.0 - 2.0 * f );\n' +
    '  return mix( mix( glintHash( i ), glintHash( i + vec2( 1.0, 0.0 ) ), u.x ),\n' +
    '              mix( glintHash( i + vec2( 0.0, 1.0 ) ), glintHash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y );\n' +
    '}\n' +
    shader.fragmentShader.replace(
      '#include <normal_fragment_begin>',
      `#include <normal_fragment_begin>\n` +
      // ── Swell chop (domain-warped, crossing, in-place breathing) ──
      // Sample a domain-warped position so crest lines bend — no rigid, straight,
      // world-aligned stripes. Train 2 & 4 travel the opposite way so the chop
      // crosses rather than rolls one absolute direction, the freqs are
      // incommensurate so the field never repeats cleanly, and a slow BREATHE
      // swells amplitude in patches (WATER_CHOP_* in terrainParams.js).
      `vec2 wPos = vWaterWorld.xz;\n` +
      `vec2 wF = wPos * ${WATER_CHOP_WARP_FREQ.toFixed(3)} + uTime * 0.045;\n` +
      `vec2 wWarp = ( vec2( waterValueNoise( wF ), waterValueNoise( wF + vec2( 37.7, 91.3 ) ) ) - 0.5 ) * ${WATER_CHOP_WARP_STRENGTH.toFixed(3)};\n` +
      `vec2 wWave = wPos + wWarp;\n` +
      `float chopC1 = dot( wWave, vec2( ${WATER_CHOP_DIR_1[0].toFixed(2)}, ${WATER_CHOP_DIR_1[1].toFixed(2)} ) ) * ${WATER_CHOP_FREQ_1.toFixed(2)} + uTime * ${WATER_CHOP_SPEED.toFixed(2)} * 1.00;\n` +
      `float chopC2 = dot( wWave, vec2( ${WATER_CHOP_DIR_2[0].toFixed(2)}, ${WATER_CHOP_DIR_2[1].toFixed(2)} ) ) * ${WATER_CHOP_FREQ_2.toFixed(2)} - uTime * ${WATER_CHOP_SPEED.toFixed(2)} * 1.35;\n` +
      `float chopC3 = dot( wWave, vec2( ${WATER_CHOP_DIR_3[0].toFixed(2)}, ${WATER_CHOP_DIR_3[1].toFixed(2)} ) ) * ${WATER_CHOP_FREQ_3.toFixed(2)} + uTime * ${WATER_CHOP_SPEED.toFixed(2)} * 0.80;\n` +
      `float chopC4 = dot( wWave, vec2( ${WATER_CHOP_DIR_4[0].toFixed(2)}, ${WATER_CHOP_DIR_4[1].toFixed(2)} ) ) * ${WATER_CHOP_FREQ_4.toFixed(2)} - uTime * ${WATER_CHOP_SPEED.toFixed(2)} * 1.10;\n` +
      `float wBreathe = 1.0 - ${WATER_CHOP_BREATHE_STRENGTH.toFixed(3)} * ( 0.5 + 0.5 * waterValueNoise( wPos * 0.12 + uTime * 0.08 ) );\n` +
      // ── Swell rolls toward the map center (seamless radial field) ──
      // Broken water hugs the map edge, so a single low-frequency train rolls
      // toward uWaterCenter: its crest lines run perpendicular to that radial
      // direction and it dominates the local chop (ISO_SUPPRESS), so waves read
      // as coming in off the sea rather than dappling. Because the direction is
      // a continuous function of world position, touching tiles are seamless —
      // the only "turn" is the smooth rotation near map corners. A smooth ramp
      // on distance-from-center fades the swell so central lakes keep the
      // isotropic chop (WATER_SHORE_* in terrainParams.js).
      `vec2 vecToCenter = uWaterCenter - vWaterWorld.xz;\n` +
      `float distCenter = length( vecToCenter );\n` +
      `vec2 vWaterShore = vecToCenter / max( distCenter, 1e-4 );\n` +
      `float vWaterCoast = smoothstep( ${WATER_SHORE_INNER.toFixed(3)} * uWaterRadius, ${WATER_SHORE_OUTER.toFixed(3)} * uWaterRadius, distCenter );\n` +
      `float shoreW = dot( wWave, vWaterShore ) * ${WATER_SHORE_FREQ.toFixed(2)} - uTime * ${WATER_SHORE_SPEED.toFixed(2)};\n` +
      `vec2 shoreSlope = cos( shoreW ) * ${WATER_SHORE_FREQ.toFixed(2)} * vWaterShore;\n` +
      `vec3 chopSlope = vec3(\n` +
      `  ( ( cos( chopC1 ) * ${(WATER_CHOP_DIR_1[0] * WATER_CHOP_FREQ_1).toFixed(3)} + cos( chopC2 ) * ${(WATER_CHOP_DIR_2[0] * WATER_CHOP_FREQ_2).toFixed(3)} + cos( chopC3 ) * ${(WATER_CHOP_DIR_3[0] * WATER_CHOP_FREQ_3).toFixed(3)} + cos( chopC4 ) * ${(WATER_CHOP_DIR_4[0] * WATER_CHOP_FREQ_4).toFixed(3)} ) * wBreathe ) * ( 1.0 - ${WATER_SHORE_ISO_SUPPRESS.toFixed(2)} * vWaterCoast ) + vWaterCoast * ${WATER_SHORE_AMP.toFixed(2)} * shoreSlope.x,\n` +
      `  0.0,\n` +
      `  ( ( cos( chopC1 ) * ${(WATER_CHOP_DIR_1[1] * WATER_CHOP_FREQ_1).toFixed(3)} + cos( chopC2 ) * ${(WATER_CHOP_DIR_2[1] * WATER_CHOP_FREQ_2).toFixed(3)} + cos( chopC3 ) * ${(WATER_CHOP_DIR_3[1] * WATER_CHOP_FREQ_3).toFixed(3)} + cos( chopC4 ) * ${(WATER_CHOP_DIR_4[1] * WATER_CHOP_FREQ_4).toFixed(3)} ) * wBreathe ) * ( 1.0 - ${WATER_SHORE_ISO_SUPPRESS.toFixed(2)} * vWaterCoast ) + vWaterCoast * ${WATER_SHORE_AMP.toFixed(2)} * shoreSlope.y );\n` +
      // View-space approximation: water is near-horizontal and the Lambert
      // diffuse only depends on dot(n, l), so offsetting the normal directly
      // reads correctly without exact frame math.
      `normal = normalize( normal + chopSlope * ${chopStrength} );\n` +
      // ── Specular sun glints (WATER_SPEC_* / WATER_SPARKLE_* / WATER_FRESNEL_*) ──
      // Blinn-Phong highlight from the chopped normal: glints appear only on
      // wave faces tilting toward the sun, scatter with the chop, gather at
      // grazing (distant) angles, and are broken into drifting sparkles by a
      // value-noise mask. Rivers mask themselves out via their flow amplitude
      // (they shimmer by flowing instead); bank walls never glint (vWaterUp).
      `vec3 lightDir = normalize( ( viewMatrix * vec4( vec3( ${sunX}, ${sunY}, ${sunZ} ), 0.0 ) ).xyz );\n` +
      `vec3 viewDir = normalize( vViewPosition );\n` +
      `vec3 halfDir = normalize( lightDir + viewDir );\n` +
      `float nDotH = max( dot( normal, halfDir ), 0.0 );\n` +
      `float nDotV = max( dot( normal, viewDir ), 0.0 );\n` +
      `float spec = pow( nDotH, ${WATER_SPEC_SHININESS.toFixed(1)} );\n` +
      `float fresnel = pow( 1.0 - nDotV, ${WATER_FRESNEL_POWER.toFixed(2)} );\n` +
      `float sunFacing = smoothstep( -0.05, 0.35, dot( normal, lightDir ) );\n` +
      `float sparkle = smoothstep( ${WATER_SPARKLE_ONSET.toFixed(2)}, 1.0, waterValueNoise( vWaterWorld.xz * ${WATER_SPARKLE_FREQ.toFixed(2)} + vec2( uTime * ${WATER_SPARKLE_SPEED.toFixed(2)}, uTime * ${WATER_SPARKLE_SPEED.toFixed(2)} * 0.61 ) ) );\n` +
      `float glint = spec * sparkle * ( 0.2 + ${WATER_FRESNEL_STRENGTH.toFixed(2)} * fresnel ) * sunFacing\n` +
      `  * ( 1.0 - smoothstep( 0.0, 0.02, vWaterFlowAmp ) )\n` +
      `  * smoothstep( 0.5, 0.9, vWaterUp );`
    ).replace(
      '#include <opaque_fragment>',
      // Sparkle on top of the smooth-shaded water: saturates to a cool white
      // where a wave face tilts into the sun.
      `outgoingLight += vec3( ${specColor} ) * ( glint * ${WATER_SPEC_STRENGTH.toFixed(2)} );\n` +
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
