/**
 * animationParams.js — Movement animation durations, curve parameters, and champion Y offsets.
 */

/** Default champion movement animation duration (ms). */
export const MOVE_ANIM_DURATION = 250;
/** Base move duration (ms), used when no per-champ override. */
export const MOVE_DURATION = 500;

/** Champion vertical height offset above terrain surface (world units). */
export const CHAMPION_HEIGHT_OFFSET = 0.15;

// ---- Lift curve ----
/** Lift rise phase end (fraction of t from 0-1). */
export const LIFT_RISE_END = 0.2;
/** Lift descent phase start (fraction of t). */
export const LIFT_DESCENT_START = 0.8;
/** Lift arc height above terrain (world units). */
export const LIFT_HEIGHT = 0.25;

// ---- Tilt curve ----
/** Tilt phase start (fraction of t). */
export const TILT_PHASE_START = 0.2;
/** Tilt phase end (fraction of t). */
export const TILT_PHASE_END = 0.8;
/** Max tilt angle (radians). */
export const TILT_MAX_ANGLE = Math.PI / 12; // 15°

// ---- Swing curve ----
/** Swing phase start (fraction of t). */
export const SWING_START = 0.1;
/** Swing phase end (fraction of t). */
export const SWING_END = 0.9;
/** Swing travel range in normalized t. */
export const SWING_TRAVEL_RANGE = 0.7;
/** Swing amplitude (world units lateral). */
export const SWING_AMPLITUDE = 0.05;

/** Head offset above body (world units). */
export const HEAD_BODY_OFFSET = 0.3;
