/**
 * scene.js — Preview scene construction, render loop, and the object-mesh
 * pipeline. createPreview() builds everything and wires the sub-modules
 * (floor, overlay, pointer) into the shared viewport state.
 */
import * as THREE from '../../../src/vendor/three.module.js';
import { addLights } from '../../../src/render/hexmap3d/scene/lightSetup.js';
import { buildDescriptorMeshes } from '../../../src/render/hexmap3d/worldObjects/descriptors/meshAssembly.js';
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
 */
export function showRecords(descriptor, records) {
  for (const child of [...viewport.objectGroup.children]) {
    viewport.objectGroup.remove(child);
  }
  const meshes = buildDescriptorMeshes(descriptor, records, descriptor.id);
  for (const mesh of meshes) viewport.objectGroup.add(mesh);

  // Mesh names are `${descriptor.id}-${partId}` (meshAssembly.js) — the
  // partId → mesh map powers worldAABBForPartIds and click-to-select.
  viewport.meshPrefix = descriptor.id;
  const prefix = descriptor.id + '-';
  viewport.partIdToMesh = new Map();
  for (const mesh of meshes) {
    if (mesh.name.startsWith(prefix)) viewport.partIdToMesh.set(mesh.name.slice(prefix.length), mesh);
  }
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
