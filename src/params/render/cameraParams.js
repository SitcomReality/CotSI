/**
 * cameraParams.js — Camera frustum, zoom, pan, and centering parameters for the 3D orthographic view.
 */

/** Default frustum size (vertical world units visible at zoom=1). */
export const DEFAULT_FRUSTUM = 6;
/** Absolute minimum frustum (closest zoom allowed). */
export const ZOOM_MIN_FRUSTUM = 5;
/** Absolute maximum frustum (farthest zoom allowed). */
export const ZOOM_MAX_FRUSTUM = 20;
/** Fit-to-map margin multiplier. */
export const FIT_MAP_MARGIN = 1.6;
/** Max zoom-out margin multiplier. */
export const MAX_ZOOM_MARGIN = 3.5;
/** Sight-zoom margin multiplier (tighter than fit-map). */
export const SIGHT_ZOOM_MARGIN = 1.4;
/** Fallback reference frustum when state has none. */
export const DEFAULT_REFERENCE_FRUSTUM = 40;

/** Camera pitch (isometric angle) in radians. */
export const CAMERA_PITCH = Math.PI / 3.5; // ~51.4°
/** Camera yaw in radians (30° = south-west looking north-east). */
export const CAMERA_YAW = Math.PI / 6;
/** Camera distance from target along look vector. */
export const CAMERA_DISTANCE = 50;

/** Camera near plane. */
export const CAMERA_NEAR = 0.1;
/** Camera far plane. */
export const CAMERA_FAR = 200;
/** Initial orthographic camera frustum (±) before applyCameraState. */
export const INITIAL_FRUSTUM = 10;

/** Temporary ground plane size (width/height). */
export const GROUND_PLANE_SIZE = 60;
/** Temporary ground plane Y offset below terrain. */
export const GROUND_PLANE_Y = -0.2;

/** Max pixel ratio cap (clamp DPR for performance). */
export const MAX_PIXEL_RATIO = 2;
/** Clear color (dark parchment background). */
export const CLEAR_COLOR = 0x5c5242;

/** Camera zoom close-up percentage when focusing on champion. */
export const CAMERA_CHAMPION_ZOOM_PERCENT = 1200;

/** Zoom-in factor (frustum multiplier per zoom step). */
export const ZOOM_IN_FACTOR = 0.8;
/** Zoom-out factor (frustum multiplier per zoom step). */
export const ZOOM_OUT_FACTOR = 1.25;
/** Wheel zoom factor per scroll step. */
export const ZOOM_STEP_FACTOR = 1.1; // zoom-in uses 1/ZOOM_STEP_FACTOR

/** Epsilon for sin(pitch) — treats near-zero pitch as flat. */
export const PITCH_EPSILON = 0.01;
/** Epsilon for degenerate pan vectors. */
export const PAN_EPSILON = 0.001;
/** Fallback margin fraction when pitch/yaw unknown. */
export const FALLBACK_MARGIN_FRACTION = 0.2;
/** Clamp margin to this fraction of map half-dimension. */
export const PAN_MARGIN_CLAMP = 0.9;

/** Default camera-pan animation duration (ms). */
export const PAN_ANIMATION_DURATION = 200;

/** Shadow camera initial frustum (±). */
export const SHADOW_INITIAL_FRUSTUM = 15;
