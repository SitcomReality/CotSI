/**
 * overlay.js — Selection overlay for the preview: the always-on origin marker,
 * the AABB wireframe around the selected node, and the 3-axis translation gizmo.
 * Owns the overlay's scene objects and the gizmo drag frame (currentDragInfo)
 * as module-level state.
 */
import * as THREE from '../../../src/vendor/three.module.js';
import { viewport } from './viewportState.js';

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

/** Selection overlay scene objects. */
let overlayGroup = null;   // the overlay's scene group (set by buildSelectionOverlay)
let wireframe = null;      // AABB edges around the selected node
let gizmoGroup = null;     // the three translation arrows
let originMarker = null;

/**
 * Frame info for the currently selected node, used by the gizmo drag math:
 * partId, parentRot (rotation-only matrix of the parent chain), itemScale, and
 * the node's world origin.
 */
let currentDragInfo = null;

/** Build the always-on origin marker, selection wireframe and gizmo arrows. */
export function buildSelectionOverlay(group) {
  overlayGroup = group;
  originMarker = makeOriginMarker();
  group.add(originMarker);

  wireframe = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    // transparent:true moves the box to the transparent pass, drawn after ALL
    // opaque geometry — with depthTest off it never hides behind the part.
    new THREE.LineBasicMaterial({ color: 0xffc25e, transparent: true, depthTest: false, depthWrite: false }),
  );
  wireframe.renderOrder = 10;
  wireframe.visible = false;
  group.add(wireframe);

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

/** Small always-on cross at the item origin (world 0,0,0, just above the tile). */
export function makeOriginMarker() {
  const mat = new THREE.LineBasicMaterial({
    color: 0x9fc5e8,
    transparent: true,
    opacity: 0.85,
    depthTest: false,
    depthWrite: false,
  });
  const half = 0.045;
  const pts = [
    new THREE.Vector3(-half, 0, 0), new THREE.Vector3(half, 0, 0),
    new THREE.Vector3(0, -half, 0), new THREE.Vector3(0, half, 0),
    new THREE.Vector3(0, 0, -half), new THREE.Vector3(0, 0, half),
  ];
  const marker = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), mat);
  marker.position.y = 0.001;
  return marker;
}

/**
 * Position the selection highlight + gizmo for the selected node, or hide both
 * when `payload` is null (the origin marker stays). Payload fields come from
 * main.js: partId, origin (node world origin), parentRot (rotation-only matrix
 * of the node's parent chain, column-major 16), itemScale, and box (the AABB
 * center + size, or null when the node has no rendered geometry).
 */
export function updateSelectionOverlay(payload) {
  if (!overlayGroup) return;
  if (!payload) {
    currentDragInfo = null;
    if (wireframe) wireframe.visible = false;
    if (gizmoGroup) gizmoGroup.visible = false;
    viewport.dirty = true;
    return;
  }
  const origin = new THREE.Vector3(payload.origin.x, payload.origin.y, payload.origin.z);
  currentDragInfo = {
    partId: payload.partId,
    parentRot: payload.parentRot,
    itemScale: payload.itemScale,
    origin,
  };
  if (payload.box) {
    wireframe.position.set(payload.box.center.x, payload.box.center.y, payload.box.center.z);
    wireframe.scale.set(payload.box.size.x, payload.box.size.y, payload.box.size.z);
    wireframe.visible = true;
  } else {
    wireframe.visible = false;
  }
  gizmoGroup.position.copy(origin);
  gizmoGroup.visible = true;
  viewport.dirty = true;
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

/** Current gizmo drag frame ({ partId, parentRot, itemScale, origin }) or null. */
export function getDragInfo() {
  return currentDragInfo;
}
