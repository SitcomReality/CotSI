/**
 * math.js — Pointer → world math for the preview canvas: NDC conversion,
 * mesh raycasting, and the gizmo drag-plane / frame-conversion math.
 * Pure helpers — no event listeners, no module state beyond the shared
 * viewport handles (camera / scene / meshPrefix live in viewportState).
 */
import * as THREE from '../../../../../src/vendor/three.module.js';
import { viewport } from '../viewportState.js';

/** Pointer client coords → normalized device coords for the canvas. */
export function pointerNDC(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  return new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1,
  );
}

/** Raycast the preview object meshes → the hit part's id, or null. */
export function pickPart(raycaster, ndc) {
  viewport.scene.updateMatrixWorld(); // raycasts must see fresh overlay/object positions
  raycaster.setFromCamera(ndc, viewport.camera);
  const hits = raycaster.intersectObject(viewport.objectGroup, true);
  if (hits.length === 0) return null;
  const name = hits[0].object.name;
  return name.startsWith(viewport.meshPrefix + '-') ? name.slice(viewport.meshPrefix.length + 1) : null;
}

/**
 * Where the pointer ray crosses the gizmo drag plane: the plane through
 * `origin` perpendicular to the camera view direction (`planeNormal`).
 * Projecting the pointer onto this plane keeps the drag delta aligned with the
 * mouse on screen — the classic gizmo slide plane. (A closest-point-to-axis-
 * line projection instead gives the OPPOSITE sense of motion: tilting the ray
 * upward sweeps the axis-intersection downward under the preview camera angle.)
 */
export function planePoint(raycaster, ndc, origin, planeNormal) {
  raycaster.setFromCamera(ndc, viewport.camera);
  const ray = raycaster.ray;
  const denom = ray.direction.dot(planeNormal);
  if (Math.abs(denom) < 1e-8) return origin.clone(); // edge-on — degenerate
  const t = origin.clone().sub(ray.origin).dot(planeNormal) / denom;
  return ray.origin.clone().addScaledVector(ray.direction, t);
}

/**
 * Convert a world-space delta along a unit axis into the selected node's parent
 * frame: deltaLocal = parentRotᵀ · (axis · amount) / itemScale. parentRot is
 * the rotation-only matrix of the parent chain (column-major 16); dividing by
 * itemScale converts back to descriptor localPos units (pre-scale). Exact when
 * ancestor scales and the biome factor are identity — true for every current
 * object and the default preview (biomeId null).
 */
export function worldDeltaToLocal(parentRot, axis, amount) {
  const wx = axis.x * amount;
  const wy = axis.y * amount;
  const wz = axis.z * amount;
  const m = parentRot;
  return {
    x: m[0] * wx + m[1] * wy + m[2] * wz,
    y: m[4] * wx + m[5] * wy + m[6] * wz,
    z: m[8] * wx + m[9] * wy + m[10] * wz,
  };
}
