import * as THREE from '../../../vendor/three.module.js';
import { shadowLightConfig } from '../../shadowLightConfig.js';
import {
  WATER_RIPPLE_SPEED,
  WATER_FLOW_SPEED,
  WATER_FLOW_WAVE_LENGTH,
  WATER_SHORE_FREQ,
  WATER_SHORE_SPEED,
  WATER_SHORE_FLOW_SPEED,
  WATER_SHORE_FLOW_WAVE_LENGTH,
  WATER_FROTH_STRENGTH,
  WATER_FROTH_COLOR,
  WATER_SPEC_STRENGTH,
  WATER_SPEC_COLOR,
  WATER_FRESNEL_POWER,
  WATER_FRESNEL_BASE,
  WATER_FRESNEL_STRENGTH,
  WATER_SPARKLE_FREQ,
  WATER_SPARKLE_ONSET,
  WATER_DEPTH_RAMP,
  WATER_DEPTH_SHALLOW,
  WATER_CREST_TINT,
  WATER_CREST_BRIGHTNESS,
  TERRAIN_COLOR,
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
 * SMOOTH-shaded (MeshPhong) so the specular sun glints and fresnel gather read
 * as continuous wet sheen rather than being quantized into flat cel bands —
 * the banding is exactly what made a large flat water body read as a rigid
 * solid. A subtle white sheen (emissive tint) keeps it reading as wet. The
 * vertex shader displaces the geometry:
 *   - flow:     river channels add waves traveling downstream along aWaterFlow
 *               (unit direction), so the surface never looks still AND rivers
 *               visibly flow toward their mouth.
 *   - shore:    non-river water ("Broken water" — lakes/ocean, which hug the map
 *               edge) adds the same traveling wave along aShoreFlow, a per-vertex
 *               radial vector pointing toward the map center, so the moat
 *               actually rolls in 3D toward the center (WATER_SHORE_FLOW_*). This
 *               moves the coarse hex fan so object shadows on it wobble and the
 *               water reads as having depth, replacing the removed fragment
 *               per-pixel chop as the water's wave. Rivers carry aShoreFlow=0/
 *               aShoreAmp=0.
 *   - ripple:   transformed.y += sin(uTime * WATER_RIPPLE_SPEED + aWaterPhase) * aWaterAmp
 *               (kept only on rivers; large water tiles carry amp 0).
 * Water is SMOOTH-shaded. The former per-pixel chop (WATER_CHOP_) and the
 * map-center swell shading (WATER_SHORE_AMP/ISO_SUPPRESS) are REMOVED — they
 * perturbed the fragment normal and produced the floating dark/bright wave
 * bands that read as "fake" waves on an otherwise flat surface. With them gone
 * the fragment normal is flat, so the broken-water surface shade is uniform
 * and its motion reads through the vertex swell (above). Remaining per-pixel
 * terms: the Blinn-Phong specular + value-noise sun glints (WATER_SPEC_* /
 * WATER_SPARKLE_* / WATER_FRESNEL_*), the shallow depth ramp, the waterline
 * froth (which still surges ashore along the radial direction), and the cyan
 * crest tint. The frame driver writes the single uTime uniform once per frame.
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
    'varying float vWaterFroth;\n' +
    'attribute float aWaterPhase;\n' +
    'attribute float aWaterAmp;\n' +
    'attribute vec2 aWaterFlow;\n' +
    'attribute float aWaterFlowAmp;\n' +
    'attribute vec2 aShoreFlow;\n' +
    'attribute float aShoreAmp;\n' +
    'attribute float aWaterline;\n' +
    'attribute float aWaterDepth;\n' +
    'varying float vWaterDepth;\n' +
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
      // Broken-water shore swell: non-river water (lakes/ocean — "Broken water")
      // displaces the whole hex fan with a traveling wave whose direction is the
      // per-vertex radial "toward the map center" vector, so the moat visibly
      // rolls in from the sea and object shadows on it wobble. Rivers carry
      // aShoreFlow = 0 / aShoreAmp = 0 so this term no-ops for channels — and,
      // crucially, the fragment glint / shallow-depth-ramp masks below still key
      // off the RIVER flow amplitude (vWaterFlowAmp), so broken water keeps its
      // glints and teal shore ramp. Same traveling-wave form as the flow term
      // above; crests advance toward the center as uTime grows.
      `float shoreAlong = dot( position.xz, aShoreFlow );\n` +
      `float shoreWave = sin( uTime * ${WATER_SHORE_FLOW_SPEED.toFixed(2)} - shoreAlong * ${(Math.PI * 2 / WATER_SHORE_FLOW_WAVE_LENGTH).toFixed(3)} + aWaterPhase );\n` +
      `transformed.xz += aShoreFlow * ( shoreWave * aShoreAmp );\n` +
      `transformed.y += shoreWave * aShoreAmp * 0.5;\n` +
      // Post-displacement world position drives the fragment chop (below).
      `vWaterWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;\n` +
      // Glint gates: river channels mask out via their flow amplitude, and
      // only near-horizontal top faces may glint (chunk meshes sit at
      // identity, so object-space normals are world normals — bank walls of
      // the water prism never flash).
      `vWaterFlowAmp = aWaterFlowAmp;\n` +
      `vWaterUp = normal.y;\n` +
      `vWaterFroth = aWaterline;\n` +
      `vWaterDepth = aWaterDepth;`
    );
  // Per-pixel wave shading (the WATER_CHOP crossing dapple and the WATER_SHORE
  // map-center swell that perturbed the fragment normal) is REMOVED — the water
  // wave now reads through the vertex shore swell instead. The remaining block
  // computes the sun glint (WATER_SPEC_* / WATER_SPARKLE_* / WATER_FRESNEL_*): a
  // Blinn-Phong highlight from the flat water normal, gathered at grazing angles
  // by a fresnel term, and broken into drifting sparkles by a value-noise mask.
  // The glint is also gated by the sun's shadow map (see the "Shadow mask on
  // the glint" block), so it never sparkles inside object shadows. The sparkle
  // is applied additively just before <opaque_fragment>, where outgoingLight
  // exists.
  const sunX = WATER_SUN_DIR[0].toFixed(4);
  const sunY = WATER_SUN_DIR[1].toFixed(4);
  const sunZ = WATER_SUN_DIR[2].toFixed(4);
  const specColor = WATER_SPEC_COLOR.map(c => c.toFixed(2)).join(', ');
  const frothColor = WATER_FROTH_COLOR.map(c => c.toFixed(2)).join(', ');
  const shallowColor = WATER_DEPTH_SHALLOW.map(c => c.toFixed(3)).join(', ');
  const deepColor = TERRAIN_COLOR.water.map(c => c.toFixed(3)).join(', ');
  const crestTint = WATER_CREST_TINT.map(c => c.toFixed(2)).join(', ');
  shader.fragmentShader =
    'uniform float uTime;\n' +
    'uniform vec2 uWaterCenter;\n' +
    'uniform float uWaterRadius;\n' +
    'varying vec3 vWaterWorld;\n' +
    'varying float vWaterFlowAmp;\n' +
    'varying float vWaterUp;\n' +
    'varying float vWaterFroth;\n' +
    'varying float vWaterDepth;\n' +
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
      // ── Water wave shading is gone; only the radial swell direction remains ──
      // The old dark/bright wave bands came from perturbing the fragment normal
      // with a chopSlope field (the WATER_CHOP crossing dapple + the WATER_SHORE
      // map-center swell). That per-pixel shading is REMOVED — the water
      // geometry itself now rolls toward the map center (the vertex aShoreFlow/
      // aShoreAmp swell), so the moat reads as having depth through real motion,
      // and the surface shading stays flat instead of showing streaks of dark
      // shadow drifting ashore. We still compute the radial direction + swell
      // phase here because the waterline froth (below) surges ashore along it.
      `vec2 vecToCenter = uWaterCenter - vWaterWorld.xz;\n` +
      `float distCenter = length( vecToCenter );\n` +
      `vec2 vWaterShore = vecToCenter / max( distCenter, 1e-4 );\n` +
      `float shoreW = dot( vWaterWorld.xz, vWaterShore ) * ${WATER_SHORE_FREQ.toFixed(2)} - uTime * ${WATER_SHORE_SPEED.toFixed(2)};\n` +
      // ── Sun glint (WATER_SPEC_* / WATER_SPARKLE_* / WATER_FRESNEL_*) ──
      // The broken-water normal is flat (the chop that used to vary it is
      // removed), so the old sun-facing wave-slope crest gate is disabled — it
      // would be a constant ≈ sun elevation and zero the glints. Glints are
      // shaped purely by the value-noise sparkle fleck mask, a mild fresnel
      // grazing gather, and the sun's shadow mask. Rivers mask out via their
      // flow amplitude; bank walls never glint (vWaterUp).
      `vec3 lightDir = normalize( ( viewMatrix * vec4( vec3( ${sunX}, ${sunY}, ${sunZ} ), 0.0 ) ).xyz );\n` +
      `vec3 viewDir = normalize( vViewPosition );\n` +
      `float nDotV = max( dot( normal, viewDir ), 0.0 );\n` +
      // ── Shadow mask on the glint ──
      // The glint reflects the sun, so it must vanish where an object blocks
      // that sun. The diffuse already receives a soft shadow (Three.js
      // multiplies directLight.color by getShadow inside RE_Direct), but the
      // glint is added after that and would otherwise keep sparkling inside
      // object shadows. Sample the SAME directional shadow map (VSM, single
      // tap) so the glint cutoff lines up pixel-for-pixel with the dark blob
      // already on the water. Guarded by USE_SHADOWMAP so it degrades to 1.0
      // (unchanged look) when shadows are disabled or no light casts them.
      `float glintShadow = 1.0;\n` +
      `#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0\n` +
      `  DirectionalLightShadow _glintShadow;\n` +
      `  _glintShadow = directionalLightShadows[ 0 ];\n` +
      `  glintShadow = receiveShadow ? getShadow( directionalShadowMap[ 0 ], _glintShadow.shadowMapSize, _glintShadow.shadowIntensity, _glintShadow.shadowBias, _glintShadow.shadowRadius, vDirectionalShadowCoord[ 0 ] ) : 1.0;\n` +
      `#endif\n` +
      // Flat normal → constant sun factor; disable the crest gate so the glints
      // are driven purely by sparkle + fresnel + shadow (see the glint comment).
      `float sunCrest = 1.0;\n` +
      `float fresnel = pow( 1.0 - nDotV, ${WATER_FRESNEL_POWER.toFixed(2)} );\n` +
      `float sparkle = smoothstep( ${WATER_SPARKLE_ONSET.toFixed(2)}, 1.0, waterValueNoise( vWaterWorld.xz * ${WATER_SPARKLE_FREQ.toFixed(2)} ) );\n` +
      `float glint = sunCrest * sparkle * ( ${WATER_FRESNEL_BASE.toFixed(2)} + ${WATER_FRESNEL_STRENGTH.toFixed(2)} * fresnel )\n` +
      `  * ( 1.0 - smoothstep( 0.0, 0.02, vWaterFlowAmp ) )\n` +
      `  * smoothstep( 0.5, 0.9, vWaterUp )\n` +
      `  * glintShadow;`
    ).replace(
      '#include <opaque_fragment>',
      // Shallow-water depth ramp: add a bright teal tint near the coast, fading
      // over WATER_DEPTH_RAMP world units. This gives the shoreline a tonal
      // transition so the waterline reads even before sparkle/froth start.
      // Rivers skip the ramp (they carry vWaterDepth 0 and their own color).
      `float depthFade = ( 1.0 - smoothstep( 0.0, ${WATER_DEPTH_RAMP.toFixed(2)}, vWaterDepth ) ) * ( 1.0 - smoothstep( 0.0, 0.02, vWaterFlowAmp ) );\n` +
      `outgoingLight += ( vec3( ${shallowColor} ) - vec3( ${deepColor} ) ) * depthFade * 0.4;\n` +
      // Subtle cyan sheen: a constant sun-facing luminance boost (the flat
      // broken-water normal makes dot(normal, lightDir) constant, so this reads
      // as an even minty tint rather than crest-crest variation).
      `float crestBright = dot( normal, lightDir ) * ${WATER_CREST_BRIGHTNESS.toFixed(3)};\n` +
      `outgoingLight += vec3( ${crestTint} ) * crestBright;\n` +
      // Sparkle on top of the smooth-shaded water: saturates to a cool white
      // where a wave face tilts into the sun.
      `outgoingLight += vec3( ${specColor} ) * ( glint * ${WATER_SPEC_STRENGTH.toFixed(2)} );\n` +
      // Waterline froth: a continuous 0..1 band hugging the coast (aWaterline),
      // brightened and pushed around by the swell so it reads as breaking foam
      // surging ashore rather than flickering in place.
      `float frothUV = dot( vWaterWorld.xz, vWaterShore ) * 0.9 + sin( shoreW * 0.8 ) * 0.35 + waterValueNoise( vWaterWorld.xz * 0.5 + uTime * 0.12 ) * 0.3;\n` +
      `outgoingLight += vec3( ${frothColor} ) * ( vWaterFroth * ${WATER_FROTH_STRENGTH.toFixed(2)} * ( 0.6 + 0.4 * sin( frothUV ) ) );\n` +
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
