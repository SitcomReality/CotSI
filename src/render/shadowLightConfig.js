// src/render/shadowLightConfig.js
// Single source of truth for shadow and lighting parameters.
// Tune sunlight angle, intensity, shadow quality, blur, and fill lights here.

export const shadowLightConfig = {
  /** Master toggle — set false to disable all shadows. */
  enabled: true,

  // ---- Shadow map ----
  shadowMapType: 'VSMShadowMap',
  /** Shadow map resolution per side (2048 or 4096). */
  mapSize: 2048,
  cameraNear: 0.5,
  cameraFar: 100,
  /** Multiplier applied to the map extent when sizing the shadow frustum.
   *  Must be >= 1.0 to cover the full map; 2.0 gives 1× margin on each side. */
  frustumPadding: 2.0,
  /** Depth bias to reduce shadow acne. */
  bias: -0.00005,
  /** Normal bias for smoother self-shadow avoidance. */
  normalBias: 0.005,
  /** PCF blur radius — higher values soften shadow edges. Default 1.0. */
  radius: 1.0,

  // ---- Directional (sun) slight ----
  sunColor: 0xfff4e0,
  sunIntensity: 3.0,
  /** Light position in world space (direction is toward origin). */

    // x:10, y:15, z:5    = sun in bottom right, shadows point up-left
    // x:-10, y:15, z:-5  = sun in top left, shadows point down and rightwards
  sunPosition: { x: -20, y: 10, z: -3 },

  // ---- Ambient fill ----
  ambientColor: 0xc8b898,
  ambientIntensity: 0.6,

  // ---- Hemisphere (sky/ground gradient) ----
  hemisphereSkyColor: 0xffe8c8,
  hemisphereGroundColor: 0x8a6a3a,
  hemisphereIntensity: 0.4,
};

/** Map config shadowMapType key to Three.js constant. */
export const SHADOW_MAP_TYPES = {
  BasicShadowMap: 0,
  PCFShadowMap: 1,
  PCFSoftShadowMap: 2,
  VSMShadowMap: 3,
};
