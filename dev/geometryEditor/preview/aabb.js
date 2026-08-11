/**
 * aabb.js — World AABB computation for the previewed parts.
 */
import * as THREE from '../../../src/vendor/three.module.js';
import { viewport } from './viewportState.js';

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
    const mesh = viewport.partIdToMesh.get(id);
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
