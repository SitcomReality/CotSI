/**
 * pointer/index.js — Pointer handling on the preview canvas: orbit drag,
 * click-to-select (raycast on pointer-up when the pointer barely moved), and
 * gizmo drags (pointer-down on an arrow captures the pointer and suppresses
 * orbit). The raycast / plane / frame math lives in math.js; this module owns
 * the drag session state and the event listeners.
 */
import * as THREE from '../../../../../src/vendor/three.module.js';
import { viewport } from '../viewportState.js';
import { getDragInfo, pickGizmoArrow } from '../overlay/index.js';
import { pointerNDC, pickPart, planePoint, worldDeltaToLocal } from './math.js';

export { pointerNDC, pickPart, planePoint, worldDeltaToLocal } from './math.js';

/** Pointer movement (px) tolerated before a pointer-up counts as a click. */
const CLICK_MOVE_PX = 4;

/**
 * Bind orbit / click-select / gizmo-drag pointer handling to the canvas.
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
