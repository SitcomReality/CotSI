import * as THREE from '../../../vendor/three.module.js';
import { PAN_EPSILON } from '../../../params/render/cameraParams.js';

/**
 * Convert screen‑space pointer deltas (dx pixels right, dy pixels down)
 * into a world‑space XZ pan vector using the camera's orientation.
 *
 * The camera's quaternion already accounts for both pitch and yaw
 * (CAMERA_YAW = π/6 from cameraState.js), so this function transparently
 * produces correctly-oriented world-space pan vectors — no manual yaw
 * adjustment is needed here or by callers.
 */
export function screenToWorldPan(dx, dy, camera) {
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up    = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  right.y = 0;
  up.y    = 0;
  if (right.lengthSq() < PAN_EPSILON) right.set(1, 0, 0);
  if (up.lengthSq()    < PAN_EPSILON) up.set(0, 0, 1);
  right.normalize();
  up.normalize();
  // Flip horizontal sign for “push” style (right drag → left pan)
  // Keep vertical sign positive so that a downward drag pans the camera upward
  return right.multiplyScalar(-dx).add(up.multiplyScalar(dy));
}