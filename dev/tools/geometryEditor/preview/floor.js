/**
 * floor.js — Hex tile floor + toggleable y=0 floor reference for the preview.
 */
import * as THREE from '../../../../src/vendor/three.module.js';
import { toonMaterial } from '../../../../src/render/hexmap3d/scene/materials.js';
import { hexCornersXZ, HEX_RADIUS } from '../../../../src/render/hexmap3d/hexWorldSpace.js';
import { viewport } from './viewportState.js';

/** Side length of the toggleable y=0 floor plane (world units). */
const FLOOR_SIZE = 6;

/** Hex tile floor + outline + faint dispersed-ring reference. */
export function addFloor(target) {
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
export function addFloorReference(target) {
  viewport.floorGroup = new THREE.Group();
  viewport.floorGroup.name = 'floor-reference';

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
  viewport.floorGroup.add(plane);

  // Grid lines just above the plane — the clear ground-level reference.
  const grid = new THREE.GridHelper(FLOOR_SIZE, FLOOR_SIZE, 0x6a8aaa, 0x3a4a5c);
  grid.position.y = 0.005;
  viewport.floorGroup.add(grid);

  viewport.floorGroup.visible = false;
  target.add(viewport.floorGroup);
}
