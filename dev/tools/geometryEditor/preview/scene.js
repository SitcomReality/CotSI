/**
 * scene.js — Preview scene construction, render loop, and the object-mesh
 * pipeline. createPreview() builds everything and wires the sub-modules
 * (floor, overlay, pointer) into the shared viewport state. showRecords()
 * optionally adds the game's ink-outline twins; resetCamera() snaps the orbit
 * to the in-game camera angle.
 */
import * as THREE from '../../../../src/vendor/three.module.js';
import { addLights } from '../../../../src/render/hexmap3d/scene/lightSetup.js';
import { addOutlines } from '../../../../src/render/hexmap3d/scene/outline.js';
import { CAMERA_PITCH, CAMERA_YAW } from '../../../../src/params/render/cameraParams.js';
import { buildDescriptorMeshes } from '../../../../src/render/hexmap3d/worldObjects/descriptors/meshAssembly.js';
import { viewport } from './viewportState.js';
import { addFloor, addFloorReference } from './floor.js';
import { buildSelectionOverlay } from './overlay.js';
import { bindPointer } from './pointer.js';

const TARGET = new THREE.Vector3(0, 0.35, 0);

/**
 * Set up the preview scene on the given canvas element.
 * @param {HTMLCanvasElement} canvas
 */
export function createPreview(canvas) {
  viewport.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  viewport.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  viewport.scene = new THREE.Scene();
  viewport.scene.background = new THREE.Color(0x26303e);

  viewport.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  addLights(viewport.scene, { shadows: false });
  addFloor(viewport.scene);

  viewport.objectGroup = new THREE.Group();
  viewport.scene.add(viewport.objectGroup);

  // The selection overlay lives OUTSIDE objectGroup so showRecords()'s clear
  // loop never touches it and raycasts on objectGroup never hit it.
  const overlayGroup = new THREE.Group();
  overlayGroup.name = 'selection-overlay';
  viewport.scene.add(overlayGroup);
  buildSelectionOverlay(overlayGroup);

  addFloorReference(viewport.scene);

  bindPointer(canvas);
  resize();
  window.addEventListener('resize', resize);

  requestAnimationFrame(tick);
}

/** Mark the scene dirty — renders on the next frame. */
export function requestRender() {
  viewport.dirty = true;
}

/**
 * Show or hide the y=0 floor reference plane. Useful for spotting features
 * that are unintentionally buried below the ground surface.
 * @param {boolean} visible
 */
export function setFloorVisible(visible) {
  if (!viewport.floorGroup) return;
  viewport.floorGroup.visible = visible;
  requestRender();
}

/**
 * Replace the previewed object with records built from the descriptor.
 * @param {object} descriptor - normalized descriptor
 * @param {object[]} records  - instance records (recordsForDescriptor output)
 * @param {{ outlines?: boolean }} [options] - preview presentation options
 */
export function showRecords(descriptor, records, { outlines = false } = {}) {
  showRecordsMulti(descriptor, [records], { outlines });
}

/**
 * Replace the previewed object with records from SEVERAL tiles at once — the
 * tile-strip diversity view (decorComposition.md §6.3). Each tile's records
 * were built at its own translated origin, so the combined set renders the
 * neighborhood in one pass (records → one InstancedMesh per partId, like the
 * game's chunk builder). The selection map is cleared — the strip is an
 * acceptance view, not an editing surface.
 * @param {object} descriptor - normalized descriptor
 * @param {object[][]} recordsPerTile - one records array per strip tile
 * @param {{ outlines?: boolean }} [options] - preview presentation options
 */
export function showRecordsMulti(descriptor, recordsPerTile, { outlines = false } = {}) {
  for (const child of [...viewport.objectGroup.children]) {
    viewport.objectGroup.remove(child);
  }
  let meshes = buildDescriptorMeshes(descriptor, recordsPerTile.flat(), descriptor.id);
  if (outlines) meshes = meshes.flatMap(addOutlines);
  for (const mesh of meshes) viewport.objectGroup.add(mesh);

  viewport.meshPrefix = descriptor.id;
  viewport.partIdToMesh = new Map();
  requestRender();
}

/**
 * Reset the orbit to the in-game camera angle (cameraParams: CAMERA_YAW 30°,
 * CAMERA_PITCH ≈51.4°). The editor's phi is a polar angle from the Y axis, so
 * the game's elevation pitch maps to π/2 − pitch; theta is the yaw. Zoom
 * (radius) and the preview target stay as the user left them.
 */
export function resetCamera() {
  viewport.orbit.theta = CAMERA_YAW;
  viewport.orbit.phi = Math.PI / 2 - CAMERA_PITCH;
  requestRender();
}

function tick() {
  if (viewport.dirty) {
    updateCamera();
    viewport.renderer.render(viewport.scene, viewport.camera);
    viewport.dirty = false;
  }
  requestAnimationFrame(tick);
}

function updateCamera() {
  const { theta, phi, radius } = viewport.orbit;
  viewport.camera.position.set(
    TARGET.x + radius * Math.sin(phi) * Math.cos(theta),
    TARGET.y + radius * Math.cos(phi),
    TARGET.z + radius * Math.sin(phi) * Math.sin(theta),
  );
  viewport.camera.lookAt(TARGET);
}

function resize() {
  const parent = viewport.renderer.domElement.parentElement;
  const w = parent ? parent.clientWidth : 1;
  const h = parent ? parent.clientHeight : 1;
  viewport.renderer.setSize(w, h);
  viewport.camera.aspect = w / h;
  viewport.camera.updateProjectionMatrix();
  requestRender();
}
