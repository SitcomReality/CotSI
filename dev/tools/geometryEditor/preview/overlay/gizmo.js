/**
 * gizmo.js — The selection translation gizmo: three axis arrows with
 * invisible grab spheres, plus the shared drag-frame info.
 *
 * Owns the gizmo's scene group and the current drag frame ({ partId,
 * parentRot, itemScale, origin }) as module state — the gizmo is built once
 * (buildGizmo), shown/hidden at the selection origin (showGizmo / hideGizmo),
 * and raycast for pointer interaction (pickGizmoArrow). The drag-frame setter
 * (setDragInfo) is called by the overlay's updateSelectionOverlay.
 */
import * as THREE from '../../../../../src/vendor/three.module.js';
import { viewport } from '../viewportState.js';

/** Gizmo arrow size (world units — the preview camera sits at radius ~3.6). */
const ARROW_LENGTH = 0.2;
const ARROW_HEAD_LENGTH = 0.07;
const ARROW_HEAD_WIDTH = 0.035;

/** Gizmo axes: unit world direction + color per axis. */
const GIZMO_AXES = [
  { key: 'x', dir: new THREE.Vector3(1, 0, 0), color: 0xff6b5e },
  { key: 'y', dir: new THREE.Vector3(0, 1, 0), color: 0x7ddb7d },
  { key: 'z', dir: new THREE.Vector3(0, 0, 1), color: 0x6ba8ff },
];

/** The three translation arrows (a THREE.Group added to the overlay group). */
let gizmoGroup = null;

/**
 * Frame info for the currently selected node, used by the gizmo drag math:
 * partId, parentRot (rotation-only matrix of the parent chain), itemScale, and
 * the node's world origin.
 */
let currentDragInfo = null;

/** Build the three gizmo arrows (with their grab spheres) into `group`. */
export function buildGizmo(group) {
  gizmoGroup = new THREE.Group();
  gizmoGroup.visible = false;
  for (const axis of GIZMO_AXES) {
    const arrow = new THREE.ArrowHelper(
      axis.dir,
      new THREE.Vector3(),
      ARROW_LENGTH,
      axis.color,
      ARROW_HEAD_LENGTH,
      ARROW_HEAD_WIDTH,
    );
    arrow.userData.axisKey = axis.key;
    // Invisible grab sphere — a far fatter raycast target than the thin shaft.
    // Stored on userData.hit: pickGizmoArrow raycasts exactly these spheres.
    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 10, 8),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    // The ArrowHelper maps its local +Y onto the axis direction, so the grab
    // sphere rides the shaft in the arrow's own frame (placing it at
    // axis.dir·k in local coords would drop it on −Y for the X/Z arrows).
    hit.position.set(0, ARROW_LENGTH * 0.65, 0);
    arrow.add(hit);
    arrow.userData.hit = hit;
    // The shaft + head also render in the transparent pass (always on top).
    for (const mat of [arrow.line.material, arrow.cone.material]) {
      mat.transparent = true;
      mat.depthTest = false;
      mat.depthWrite = false;
    }
    gizmoGroup.add(arrow);
  }
  group.add(gizmoGroup);
}

/** Hide the gizmo (selection cleared or stale). */
export function hideGizmo() {
  if (gizmoGroup) gizmoGroup.visible = false;
}

/** Move the gizmo to `origin` (a THREE.Vector3) and show it. */
export function showGizmo(origin) {
  if (!gizmoGroup) return;
  gizmoGroup.position.copy(origin);
  gizmoGroup.visible = true;
}

/** Record the current selection's drag frame ({ partId, parentRot, itemScale, origin }). */
export function setDragInfo(info) {
  currentDragInfo = info;
}

/** Current gizmo drag frame ({ partId, parentRot, itemScale, origin }) or null. */
export function getDragInfo() {
  return currentDragInfo;
}

/** Raycast the gizmo's invisible grab spheres → its axis entry, or null. */
export function pickGizmoArrow(raycaster, ndc) {
  if (!gizmoGroup || !gizmoGroup.visible || !currentDragInfo) return null;
  viewport.scene.updateMatrixWorld(); // raycasts must see fresh gizmo positions
  raycaster.setFromCamera(ndc, viewport.camera);
  const spheres = gizmoGroup.children.map((arrow) => arrow.userData.hit).filter(Boolean);
  if (spheres.length === 0) return null;
  const hits = raycaster.intersectObjects(spheres, false);
  if (hits.length === 0) return null;
  const key = hits[0].object.parent.userData.axisKey;
  return GIZMO_AXES.find((a) => a.key === key) ?? null;
}
