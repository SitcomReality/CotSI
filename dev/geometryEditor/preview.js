/**
 * preview.js — Three.js preview for the geometry editor.
 *
 * Standalone dev page (not game UI), so it runs its own render loop on
 * requestAnimationFrame with a dirty flag instead of the game clock. Renders
 * a descriptor through the generic pipeline — recordBuilder → meshAssembly —
 * with the game's toon material and lighting, on a hex tile with a faint ring
 * marking where dispersed clusters land (DECOR_DEEMPHASIS ring 0.68–0.88).
 *
 * Viewport tooling lives here too: click-to-select (raycast on pointer-up when
 * the pointer barely moved), a world-AABB wireframe around the selected node,
 * an always-on origin marker, and a 3-axis translation gizmo. The module stays
 * render-only — it exposes data + callbacks and never reads editor state;
 * main.js supplies the frames, AABB and mutations via
 * bindViewportCallbacks() / updateSelectionOverlay().
 *
 * Orbit: drag rotates, scroll zooms. Dragging a gizmo arrow suppresses orbit.
 */
import * as THREE from '../../src/vendor/three.module.js';
import { toonMaterial } from '../../src/render/hexmap3d/scene/materials.js';
import { addLights } from '../../src/render/hexmap3d/scene/lightSetup.js';
import { hexCornersXZ, HEX_RADIUS } from '../../src/render/hexmap3d/hexWorldSpace.js';
import { buildDescriptorMeshes } from '../../src/render/hexmap3d/features/descriptors/meshAssembly.js';

const TARGET = new THREE.Vector3(0, 0.35, 0);

/** Pointer movement (px) tolerated before a pointer-up counts as a click. */
const CLICK_MOVE_PX = 4;

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

let renderer = null;
let scene = null;
let camera = null;
let objectGroup = null;
let floorGroup = null;
let overlayGroup = null;
let dirty = true;

/** The preview's InstancedMeshes keyed by partId (built by the latest showRecords). */
let partIdToMesh = new Map();
let meshPrefix = '';

/** Selection overlay scene objects. */
let wireframe = null;   // AABB edges around the selected node
let gizmoGroup = null;  // the three translation arrows
let originMarker = null;

/** Callbacks wired by the editor (bindViewportCallbacks). */
let viewportCallbacks = { onSelect: null, onMutateLocalPos: null };

/**
 * Frame info for the currently selected node, used by the gizmo drag math:
 * partId, parentRot (rotation-only matrix of the parent chain), itemScale, and
 * the node's world origin.
 */
let currentDragInfo = null;

/** Orbit state around TARGET: theta (yaw), phi (pitch), radius (zoom). */
const orbit = { theta: Math.PI / 4, phi: Math.PI / 3.4, radius: 3.6 };

/** Side length of the toggleable y=0 floor plane (world units). */
const FLOOR_SIZE = 6;

/**
 * Set up the preview scene on the given canvas element.
 * @param {HTMLCanvasElement} canvas
 */
export function createPreview(canvas) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x26303e);

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  addLights(scene, { shadows: false });
  addFloor(scene);

  objectGroup = new THREE.Group();
  scene.add(objectGroup);

  // The selection overlay lives OUTSIDE objectGroup so showRecords()'s clear
  // loop never touches it and raycasts on objectGroup never hit it.
  overlayGroup = new THREE.Group();
  overlayGroup.name = 'selection-overlay';
  scene.add(overlayGroup);
  buildSelectionOverlay(overlayGroup);

  addFloorReference(scene);

  bindPointer(canvas);
  resize();
  window.addEventListener('resize', resize);

  requestAnimationFrame(tick);
}

/** Mark the scene dirty — renders on the next frame. */
export function requestRender() {
  dirty = true;
}

/**
 * Show or hide the y=0 floor reference plane. Useful for spotting features
 * that are unintentionally buried below the ground surface.
 * @param {boolean} visible
 */
export function setFloorVisible(visible) {
  if (!floorGroup) return;
  floorGroup.visible = visible;
  requestRender();
}

/**
 * Replace the previewed object with records built from the descriptor.
 * @param {object} descriptor - normalized descriptor
 * @param {object[]} records  - instance records (recordsForDescriptor output)
 */
export function showRecords(descriptor, records) {
  for (const child of [...objectGroup.children]) {
    objectGroup.remove(child);
  }
  const meshes = buildDescriptorMeshes(descriptor, records, descriptor.id);
  for (const mesh of meshes) objectGroup.add(mesh);

  // Mesh names are `${descriptor.id}-${partId}` (meshAssembly.js) — the
  // partId → mesh map powers worldAABBForPartIds and click-to-select.
  meshPrefix = descriptor.id;
  const prefix = descriptor.id + '-';
  partIdToMesh = new Map();
  for (const mesh of meshes) {
    if (mesh.name.startsWith(prefix)) partIdToMesh.set(mesh.name.slice(prefix.length), mesh);
  }
  requestRender();
}

// ── Selection overlay (origin marker, AABB wireframe, gizmo) ─────────────────

/** Build the always-on origin marker, selection wireframe and gizmo arrows. */
function buildSelectionOverlay(group) {
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
function makeOriginMarker() {
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
 * The world AABB of the given part ids — the union over every instance of each
 * part's mesh (from the actual instance matrices, so root and nested records
 * both report exact bounds). Returns { min, max, center, size } as plain
 * objects, or null when none of the ids have a rendered mesh.
 */
export function worldAABBForPartIds(ids) {
  const box = new THREE.Box3();
  const tmpBox = new THREE.Box3();
  const tmpMatrix = new THREE.Matrix4();
  const tmpVec = new THREE.Vector3();
  let found = false;
  for (const id of ids) {
    const mesh = partIdToMesh.get(id);
    if (!mesh) continue;
    mesh.geometry.computeBoundingBox();
    const local = mesh.geometry.boundingBox;
    if (!local) continue;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, tmpMatrix);
      tmpBox.copy(local).applyMatrix4(tmpMatrix);
      box.union(tmpBox);
      found = true;
    }
  }
  if (!found) return null;
  const center = box.getCenter(tmpVec);
  const cx = center.x;
  const cy = center.y;
  const cz = center.z;
  const size = box.getSize(tmpVec);
  return {
    min: { x: box.min.x, y: box.min.y, z: box.min.z },
    max: { x: box.max.x, y: box.max.y, z: box.max.z },
    center: { x: cx, y: cy, z: cz },
    size: { x: size.x, y: size.y, z: size.z },
  };
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
    requestRender();
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
  requestRender();
}

/** Wire the editor's selection + mutation callbacks (main.js). */
export function bindViewportCallbacks(callbacks) {
  viewportCallbacks = { onSelect: null, onMutateLocalPos: null, ...callbacks };
}

// ── Pointer handling: orbit, click-to-select, gizmo drag ────────────────────

function tick() {
  if (dirty) {
    updateCamera();
    renderer.render(scene, camera);
    dirty = false;
  }
  requestAnimationFrame(tick);
}

function updateCamera() {
  const { theta, phi, radius } = orbit;
  camera.position.set(
    TARGET.x + radius * Math.sin(phi) * Math.cos(theta),
    TARGET.y + radius * Math.cos(phi),
    TARGET.z + radius * Math.sin(phi) * Math.sin(theta),
  );
  camera.lookAt(TARGET);
}

function resize() {
  const parent = renderer.domElement.parentElement;
  const w = parent ? parent.clientWidth : 1;
  const h = parent ? parent.clientHeight : 1;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  requestRender();
}

/** Pointer client coords → normalized device coords for the canvas. */
function pointerNDC(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  return new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1,
  );
}

/**
 * Pointer handling on the canvas: orbit drag, click-to-select (raycast on
 * pointer-up when the pointer barely moved), and gizmo drags (pointer-down on
 * an arrow captures the pointer and suppresses orbit).
 */
function bindPointer(canvas) {
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
      const origin = currentDragInfo.origin.clone();
      const planeNormal = new THREE.Vector3();
      camera.getWorldDirection(planeNormal);
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
        const { partId, parentRot, itemScale } = currentDragInfo;
        const deltaLocal = worldDeltaToLocal(parentRot, gizmoDrag.axis, deltaWorld / itemScale);
        if (viewportCallbacks.onMutateLocalPos) {
          viewportCallbacks.onMutateLocalPos(partId, deltaLocal);
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
      orbit.theta -= dx * 0.005;
      orbit.phi = Math.max(0.15, Math.min(Math.PI / 2.1, orbit.phi - dy * 0.005));
      requestRender();
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
      if (viewportCallbacks.onSelect) viewportCallbacks.onSelect(partId);
    }
  });

  canvas.addEventListener('pointercancel', () => {
    gizmoDrag = null;
    orbitDrag = false;
    canvas.style.cursor = '';
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    orbit.radius = Math.max(1.4, Math.min(9, orbit.radius * (1 + Math.sign(e.deltaY) * 0.08)));
    requestRender();
  }, { passive: false });
}

/** Raycast the preview object meshes → the hit part's id, or null. */
function pickPart(raycaster, ndc) {
  scene.updateMatrixWorld(); // raycasts must see fresh overlay/object positions
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(objectGroup, true);
  if (hits.length === 0) return null;
  const name = hits[0].object.name;
  return name.startsWith(meshPrefix + '-') ? name.slice(meshPrefix.length + 1) : null;
}

/** Raycast the gizmo's invisible grab spheres → its axis entry, or null. */
function pickGizmoArrow(raycaster, ndc) {
  if (!gizmoGroup || !gizmoGroup.visible || !currentDragInfo) return null;
  scene.updateMatrixWorld(); // raycasts must see fresh gizmo positions
  raycaster.setFromCamera(ndc, camera);
  const spheres = gizmoGroup.children.map((arrow) => arrow.userData.hit).filter(Boolean);
  if (spheres.length === 0) return null;
  const hits = raycaster.intersectObjects(spheres, false);
  if (hits.length === 0) return null;
  const key = hits[0].object.parent.userData.axisKey;
  return GIZMO_AXES.find((a) => a.key === key) ?? null;
}

/**
 * Where the pointer ray crosses the gizmo drag plane: the plane through
 * `origin` perpendicular to the camera view direction (`planeNormal`).
 * Projecting the pointer onto this plane keeps the drag delta aligned with the
 * mouse on screen — the classic gizmo slide plane. (A closest-point-to-axis-
 * line projection instead gives the OPPOSITE sense of motion: tilting the ray
 * upward sweeps the axis-intersection downward under the preview camera angle.)
 */
function planePoint(raycaster, ndc, origin, planeNormal) {
  raycaster.setFromCamera(ndc, camera);
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
function worldDeltaToLocal(parentRot, axis, amount) {
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

/** Hex tile floor + outline + faint dispersed-ring reference. */
function addFloor(target) {
  const corners = hexCornersXZ(0, 0, HEX_RADIUS);

  // Filled hex tile — shape points in XY, rotated into the XZ plane.
  const shape = new THREE.Shape();
  corners.forEach((c, i) => (i === 0 ? shape.moveTo(c.x, c.z) : shape.lineTo(c.x, c.z)));
  shape.closePath();
  const tileGeo = new THREE.ShapeGeometry(shape);
  tileGeo.rotateX(Math.PI / 2);
  const tile = new THREE.Mesh(tileGeo, toonMaterial({ color: 0x55703f }));
  tile.position.y = -0.02;
  target.add(tile);

  // Hex outline.
  const outlinePts = [...corners, corners[0]].map((c) => new THREE.Vector3(c.x, 0.002, c.z));
  const outline = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(outlinePts),
    new THREE.LineBasicMaterial({ color: 0x101820 }),
  );
  target.add(outline);

  // Faint circle marking where dispersed clusters land.
  const ringPts = [];
  const ringR = 0.78 * HEX_RADIUS;
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    ringPts.push(new THREE.Vector3(Math.cos(a) * ringR, 0.001, Math.sin(a) * ringR));
  }
  const ring = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(ringPts),
    new THREE.LineBasicMaterial({ color: 0x3a4a5c, transparent: true, opacity: 0.6 }),
  );
  target.add(ring);
}

/**
 * Toggleable y=0 floor reference: an opaque plane plus grid lines. Hidden by
 * default; setFloorVisible() controls it. The plane occludes anything on the
 * far side (depth-tested, opaque), so viewed from above only the parts of an
 * object that poke above ground are visible — anything below the floor is
 * hidden behind the plane.
 */
function addFloorReference(target) {
  floorGroup = new THREE.Group();
  floorGroup.name = 'floor-reference';

  // Opaque plane fill at y=0 — the ground surface. Depth writing stays on so
  // geometry on the far side of the plane is obscured.
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE),
    new THREE.MeshBasicMaterial({
      color: 0x4a6a8a,
      side: THREE.DoubleSide,
    }),
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -0.002;
  floorGroup.add(plane);

  // Grid lines just above the plane — the clear ground-level reference.
  const grid = new THREE.GridHelper(FLOOR_SIZE, FLOOR_SIZE, 0x6a8aaa, 0x3a4a5c);
  grid.position.y = 0.005;
  floorGroup.add(grid);

  floorGroup.visible = false;
  target.add(floorGroup);
}
