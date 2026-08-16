/**
 * scene/index.js — Preview scene construction and the render loop.
 *
 * createPreview() builds everything (renderer, scene, lights, floor, object
 * group, selection overlay) and wires the sub-modules (floor, overlay, pointer)
 * into the shared viewport state. Owns the dirty-flag render loop and the
 * floor-visibility toggle; the object-mesh pipeline lives in records.js and
 * the orbit camera in camera.js. The barrel re-exports the original scene
 * module's public API unchanged.
 */
import * as THREE from '../../../../../src/vendor/three.module.js';
import { addLights } from '../../../../../src/render/hexmap3d/scene/lightSetup.js';
import { viewport } from '../viewportState.js';
import { addFloor, addFloorReference } from '../floor.js';
import { buildSelectionOverlay } from '../overlay/index.js';
import { bindPointer } from '../pointer/index.js';
import { updateCamera, resetCamera } from './camera.js';
import { showRecords, showRecordsMulti } from './records.js';

export { resetCamera } from './camera.js';
export { showRecords, showRecordsMulti } from './records.js';

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

function tick() {
  if (viewport.dirty) {
    updateCamera();
    viewport.renderer.render(viewport.scene, viewport.camera);
    viewport.dirty = false;
  }
  requestAnimationFrame(tick);
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
