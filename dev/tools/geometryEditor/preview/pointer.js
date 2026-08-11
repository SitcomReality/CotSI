/**
 * pointer.js — Pointer handling on the preview canvas: orbit drag, click-to-
 * select (raycast on pointer-up when the pointer barely moved), and gizmo drags
 * (pointer-down on an arrow captures the pointer and suppresses orbit).
 */
import * as THREE from '../../../../src/vendor/three.module.js';
import { viewport } from './viewportState.js';
import { getDragInfo, pickGizmoArrow } from './overlay.js';

/** Pointer movement (px) tolerated before a pointer-up counts as a click. */
const CLICK_MOVE_PX = 4;

/**
 * Pointer handling on the canvas: orbit drag, click-to-select (raycast on
 * pointer-up when the pointer barely moved), and gizmo drags (pointer-down on
 * an arrow captures the pointer and suppresses orbit).
 */
export function bindPointer(canvas) {
  const raycaster = new THREE.Raycaster();
  let orbitDrag = false;
  let gizmoDrag = null; // { axis, origin, planeNormal, p0, pointerId }
  let downX = 0;
  let downY = 0;
  let moved = 0;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener('pointerdown', (e) => {
    lastX = e.clientX;
    lastY = e.clientY;
    downX = e.clientX;
    downY = e.clientY;
    moved = 0;

    const arrow = pickGizmoArrow(raycaster, pointerNDC(e, canvas));
    if (arrow) {
      const origin = getDragInfo().origin.clone();
      const planeNormal = new THREE.Vector3();
      viewport.camera.getWorldDirection(planeNormal);
      gizmoDrag = {
        axis: arrow.dir,
        origin,
        planeNormal,
        p0: planePoint(raycaster, pointerNDC(e, canvas), origin, planeNormal),
        pointerId: e.pointerId,
      };
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
      return;
    }

    orbitDrag = true;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('pointermove', (e) => {
    const ndc = pointerNDC(e, canvas);

    if (gizmoDrag) {
      const p = planePoint(raycaster, ndc, gizmoDrag.origin, gizmoDrag.planeNormal);
      const deltaWorld = p.clone().sub(gizmoDrag.p0).dot(gizmoDrag.axis);
      if (deltaWorld !== 0) {
        gizmoDrag.p0.copy(p);
        const { partId, parentRot, itemScale } = getDragInfo();
        const deltaLocal = worldDeltaToLocal(parentRot, gizmoDrag.axis, deltaWorld / itemScale);
        if (viewport.viewportCallbacks.onMutateLocalPos) {
          viewport.viewportCallbacks.onMutateLocalPos(partId, deltaLocal);
        }
      }
      return;
    }

    if (orbitDrag) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      viewport.orbit.theta -= dx * 0.005;
      viewport.orbit.phi = Math.max(0.15, Math.min(Math.PI / 2.1, viewport.orbit.phi - dy * 0.005));
      viewport.dirty = true;
      return;
    }

    // Hover feedback: pointer over a gizmo arrow.
    canvas.style.cursor = pickGizmoArrow(raycaster, ndc) ? 'pointer' : '';
  });

  canvas.addEventListener('pointerup', (e) => {
    if (gizmoDrag) {
      gizmoDrag = null;
      canvas.style.cursor = '';
      return;
    }
    const wasOrbitDrag = orbitDrag;
    orbitDrag = false;
    canvas.style.cursor = '';
    if (wasOrbitDrag && moved < CLICK_MOVE_PX) {
      const partId = pickPart(raycaster, pointerNDC(e, canvas));
      if (viewport.viewportCallbacks.onSelect) viewport.viewportCallbacks.onSelect(partId);
    }
  });

  canvas.addEventListener('pointercancel', () => {
    gizmoDrag = null;
    orbitDrag = false;
    canvas.style.cursor = '';
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    viewport.orbit.radius = Math.max(1.4, Math.min(9, viewport.orbit.radius * (1 + Math.sign(e.deltaY) * 0.08)));
    viewport.dirty = true;
  }, { passive: false });
}

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
