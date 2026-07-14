import * as THREE from '../../../lib/three.module.js';

/**
 * Convert screen‑space pointer deltas (dx pixels right, dy pixels down)
 * into a world‑space XZ pan vector using the camera's orientation.
 */
export function screenToWorldPan(dx, dy, camera) {
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up    = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  right.y = 0;
  up.y    = 0;
  if (right.lengthSq() < 0.001) right.set(1, 0, 0);
  if (up.lengthSq()    < 0.001) up.set(0, 0, 1);
  right.normalize();
  up.normalize();
  // Flip horizontal sign for “push” style (right drag → left pan)
  // Keep vertical sign positive so that a downward drag pans the camera upward
  return right.multiplyScalar(-dx).add(up.multiplyScalar(dy));
}