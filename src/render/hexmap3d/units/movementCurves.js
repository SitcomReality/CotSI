/**
 * movementCurves.js — Pure animation-curve math for champion movement.
 *
 * Contains all stateless, pure animation functions: lift/tilt/swing curves,
 * position interpolation, frame transform application, and hex color parsing.
 * None of these functions access module state, Three.js scenes, or the clock.
 *
 * This file is safe to use in contexts that need the math but not the
 * animation state machine (e.g. unitMeshes.js uses hexToRgb).
 *
 * Layer: render/ — imports only vendor/ Three.
 */

import * as THREE from '../../../vendor/three.module.js';
import { LIFT_RISE_END, LIFT_DESCENT_START, LIFT_HEIGHT, TILT_PHASE_START, TILT_PHASE_END, TILT_MAX_ANGLE, SWING_START, SWING_END, SWING_TRAVEL_RANGE, SWING_AMPLITUDE } from '../../../params/render/animationParams.js';

// ─── Tunable constants ───────────────────────────────────────────────────────

/** Base duration of a single-hex movement animation in milliseconds. */
export { MOVE_DURATION } from '../../../params/render/animationParams.js';

// ─── Color conversion ────────────────────────────────────────────────────────

/**
 * Convert a hex color string (#rrggbb) to an RGB array (0..1).
 * @param {string} hex
 * @returns {number[]}
 */
export function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

// ─── Animation curves ────────────────────────────────────────────────────────

/**
 * Lift height multiplier: 0 (resting) → 1 (fully lifted) → 0.
 * Parabolic: rises 0–20 %, stays elevated, descends 80–100 %.
 * @param {number} t — normalised progress (0..1)
 * @returns {number}
 */
export function liftCurve(t) {
  if (t <= LIFT_RISE_END) return t / LIFT_RISE_END;
  if (t >= LIFT_DESCENT_START) return (1 - t) / LIFT_RISE_END;
  return 1;
}

/**
 * Tilt angle (radians). Champion tilts backward during lift,
 * normalises during the place phase.
 * @param {number} t — normalised progress (0..1)
 * @returns {number}
 */
export function tiltCurve(t) {
  const max = TILT_MAX_ANGLE;
  if (t <= TILT_PHASE_START) return -max * (t / TILT_PHASE_START);
  if (t >= TILT_PHASE_END) return -max * ((1 - t) / TILT_PHASE_START);
  return -max;
}

/**
 * Side-to-side swing offset perpendicular to the movement direction.
 * Zero during lift/place; one full sinusoidal oscillation during travel.
 * @param {number} t — normalised progress (0..1)
 * @returns {number}
 */
export function swingCurve(t) {
  if (t <= SWING_START || t >= SWING_END) return 0;
  const travelT = (t - SWING_START) / SWING_TRAVEL_RANGE;
  return Math.sin(travelT * Math.PI * 2) * SWING_AMPLITUDE;
}

// ─── Position / frame logic ─────────────────────────────────────────────────

/**
 * Compute the world position at time t for interpolation snapping.
 * Uses linear XZ + lift curve for Y (matching applyAnimationFrame's shape).
 *
 * @param {{fromX:number, fromY:number, fromZ:number, toX:number, toY:number, toZ:number}} anim
 * @param {number} t — normalised progress (0..1)
 * @returns {{x:number, y:number, z:number}}
 */
export function computeInterpolatedPos(anim, t) {
  const x = anim.fromX + (anim.toX - anim.fromX) * t;
  const z = anim.fromZ + (anim.toZ - anim.fromZ) * t;
  const baseY = anim.fromY + (anim.toY - anim.fromY) * t;
  const y = baseY + liftCurve(t) * LIFT_HEIGHT;
  return { x, y, z };
}

/**
 * Set the animated miniature's group transform for the given progress t (0..1).
 *
 * The animating champion is the full descriptor miniature (all parts parented
 * to one THREE.Group by movementAnimator), so a single group transform drives
 * the whole piece: horizontal ease-out glide, vertical lift arc, side swing,
 * and a backward tilt that pivots about the miniature's base.
 *
 * @param {{fromX:number, fromY:number, fromZ:number, toX:number, toY:number, toZ:number, group:THREE.Group}} anim
 * @param {number} t — normalised progress (0..1)
 */
export function applyAnimationFrame(anim, t) {
  // Horizontal: ease-out quad so the champion "lands" softly
  const ease = 1 - Math.pow(1 - t, 2);
  const x = anim.fromX + (anim.toX - anim.fromX) * ease;
  const z = anim.fromZ + (anim.toZ - anim.fromZ) * ease;

  // Vertical: linear base (respects terrain height difference) + lift arc
  const baseY = anim.fromY + (anim.toY - anim.fromY) * t;
  const y = baseY + liftCurve(t) * LIFT_HEIGHT;

  // Swing: perpendicular to the movement vector on the XZ plane
  const dx = anim.toX - anim.fromX;
  const dz = anim.toZ - anim.fromZ;
  const moveLen = Math.sqrt(dx * dx + dz * dz);
  let swingX = 0, swingZ = 0;
  if (moveLen > 0.001) {
    const perpX = -dz / moveLen;
    const perpZ = dx / moveLen;
    const off = swingCurve(t);
    swingX = perpX * off;
    swingZ = perpZ * off;
  }

  const tilt = tiltCurve(t);

  anim.group.position.set(x + swingX, y, z + swingZ);
  anim.group.rotation.set(tilt, 0, 0);
}
