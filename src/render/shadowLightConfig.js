// src/render/shadowLightConfig.js
// Single source of truth for shadow and lighting parameters.
// Tune sunlight angle, intensity, shadow quality, blur, and fill lights here.

export const shadowLightConfig = {
  /** Master toggle — set false to disable all shadows. */
  enabled: true,

  // ---- Shadow map ----
  shadowMapType: 'PCFSoftShadowMap',
  /** Shadow map resolution per side (2048 or 4096). */
  mapSize: 2048,
  cameraNear: 0.5,
  cameraFar: 100,
  /** Multiplier applied to the map extent when sizing the shadow frustum. */
  frustumPadding: 2.0,
  /** Depth bias to reduce shadow acne. */
  bias: -0.0005,
  /** Normal bias for smoother self-shadow avoidance. */
  normalBias: 0.02,
  /** PCF blur radius — higher values soften shadow edges. Default 1.0. */
  radius: 1.0,

  // ---- Directional (sun) light ----
  sunColor: 0xfff4e0,
  sunIntensity: 3.0,
  /** Light position in world space (direction is toward origin). */
  sunPosition: { x: 15, y: 25, z: 10 },

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
