/**
 * preview.js — Three.js preview for the geometry editor.
 *
 * Standalone dev page (not game UI), so it runs its own render loop on
 * requestAnimationFrame with a dirty flag instead of the game clock. Renders
 * a descriptor through the generic pipeline — recordBuilder → meshAssembly —
 * with the game's toon material and lighting, on a hex tile with a faint ring
 * marking where dispersed clusters land (DECOR_DEEMPHASIS ring 0.68–0.88).
 *
 * Orbit: drag rotates, scroll zooms.
 */
import * as THREE from '../../src/vendor/three.module.js';
import { toonMaterial } from '../../src/render/hexmap3d/scene/materials.js';
import { addLights } from '../../src/render/hexmap3d/scene/lightSetup.js';
import { hexCornersXZ, HEX_RADIUS } from '../../src/render/hexmap3d/hexWorldSpace.js';
import { buildDescriptorMeshes } from '../../src/render/hexmap3d/features/descriptors/meshAssembly.js';

const TARGET = new THREE.Vector3(0, 0.35, 0);

let renderer = null;
let scene = null;
let camera = null;
let objectGroup = null;
let dirty = true;

/** Orbit state around TARGET: theta (yaw), phi (pitch), radius (zoom). */
const orbit = { theta: Math.PI / 4, phi: Math.PI / 3.4, radius: 3.6 };

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

  bindOrbit(canvas);
  resize();
  window.addEventListener('resize', resize);

  requestAnimationFrame(tick);
}

/** Mark the scene dirty — renders on the next frame. */
export function requestRender() {
  dirty = true;
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
  requestRender();
}

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

function bindOrbit(canvas) {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    orbit.theta -= dx * 0.005;
    orbit.phi = Math.max(0.15, Math.min(Math.PI / 2.1, orbit.phi - dy * 0.005));
    requestRender();
  });

  canvas.addEventListener('pointerup', () => {
    dragging = false;
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    orbit.radius = Math.max(1.4, Math.min(9, orbit.radius * (1 + Math.sign(e.deltaY) * 0.08)));
    requestRender();
  }, { passive: false });
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
