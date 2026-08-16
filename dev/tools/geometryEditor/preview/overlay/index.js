/**
 * overlay/index.js — Selection overlay for the preview: the always-on origin
 * marker and the AABB wireframe around the selected node. The 3-axis
 * translation gizmo lives in gizmo.js (its arrows + drag frame); this module
 * composes the overlay group and updates the highlight from the selection
 * payload main.js supplies. The barrel re-exports the gizmo's public surface,
 * so the overlay's original API is unchanged.
 */
import * as THREE from '../../../../../src/vendor/three.module.js';
import { viewport } from '../viewportState.js';
import { buildGizmo, hideGizmo, showGizmo, setDragInfo } from './gizmo.js';

export { getDragInfo, pickGizmoArrow } from './gizmo.js';

/** Selection overlay scene objects. */
let overlayGroup = null;   // the overlay's scene group (set by buildSelectionOverlay)
let wireframe = null;      // AABB edges around the selected node
let originMarker = null;

/** The wireframe material — transparent:true moves the box to the transparent
 *  pass, drawn after ALL opaque geometry; with depthTest off it never hides
 *  behind the part. */
function makeWireframe() {
  const w = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    new THREE.LineBasicMaterial({ color: 0xffc25e, transparent: true, depthTest: false, depthWrite: false }),
  );
  w.renderOrder = 10;
  w.visible = false;
  return w;
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

/** Build the always-on origin marker, selection wireframe and gizmo arrows. */
export function buildSelectionOverlay(group) {
  overlayGroup = group;
  originMarker = makeOriginMarker();
  group.add(originMarker);

  wireframe = makeWireframe();
  group.add(wireframe);

  buildGizmo(group);
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
    setDragInfo(null);
    if (wireframe) wireframe.visible = false;
    hideGizmo();
    viewport.dirty = true;
    return;
  }
  const origin = new THREE.Vector3(payload.origin.x, payload.origin.y, payload.origin.z);
  setDragInfo({
    partId: payload.partId,
    parentRot: payload.parentRot,
    itemScale: payload.itemScale,
    origin,
  });
  if (payload.box) {
    wireframe.position.set(payload.box.center.x, payload.box.center.y, payload.box.center.z);
    wireframe.scale.set(payload.box.size.x, payload.box.size.y, payload.box.size.z);
    wireframe.visible = true;
  } else {
    wireframe.visible = false;
  }
  showGizmo(origin);
  viewport.dirty = true;
}
