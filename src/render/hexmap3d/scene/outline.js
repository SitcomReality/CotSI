// src/render/hexmap3d/scene/outline.js
// Comic-book ink outlines (inverted-hull technique) for the Puppet layer.
//
// Every outlined mesh gets a twin: a clone of its geometry with vertices
// pushed outward along their normals, rendered backface-only in the ink
// color. The twin reuses the source's instance matrices (or local transform),
// so outline thickness scales with each instance's visual size automatically —
// a giant mountain gets a proportionally heavier line than a tiny champion.
//
// Drawing order: hulls render first (renderOrder -1) with depth writes ON;
// the source mesh renders after and overwrites the hull's interior, leaving
// only the silhouette rim of ink. Terrain deliberately has no outlines —
// coverage is units + features only (see aestheticConventions §11 note).
//
// See aestheticConventions §11 (toon/outline pass) and §13.3 (the ink line is
// structural, not an interaction state).

import * as THREE from '../../../vendor/three.module.js';

/** Ink outline color — matches --ink-line (#121418), aestheticConventions §4.1 */
export const INK_LINE = 0x121418;

/**
 * Hull displacement in geometry-local units. Instance scaling scales it with
 * the mesh, so this is a proportional "line weight" rather than an absolute
 * pixel width. Tuned for the current low-poly scale (hex radius 1.0); adjust
 * here to make the ink heavier or finer everywhere at once.
 */
export const OUTLINE_WIDTH = 0.02;

/**
 * Shared ink outline material. `side: BackSide` shows only the hull's back
 * faces, which peek out around the source's silhouette. `fog: true` keeps
 * outlines receding with the map like everything else. Marked shared: never
 * disposed (see the disposal guards in sceneContext.js / chunkManager.js), so
 * it is compiled once and reused by every hull.
 */
export const outlineMaterial = new THREE.MeshBasicMaterial({
  color: INK_LINE,
  side: THREE.BackSide,
  fog: true,
});
outlineMaterial.userData.shared = true;

// Per-source-geometry displaced hull geometry cache. Keyed by the source
// geometry so repeated outline twins (per chunk rebuild, per-frame units,
// movement animations) reuse the same displaced mesh instead of re-running
// the vertex pass. Hull geometries are marked shared for the disposal guards.
const outlineGeoCaches = new WeakMap();

/**
 * Get (and cache) the inverted-hull clone of `sourceGeo`: vertices displaced
 * outward along their normals by OUTLINE_WIDTH.
 *
 * @param {THREE.BufferGeometry} sourceGeo
 * @returns {THREE.BufferGeometry}
 */
export function getOutlineGeometry(sourceGeo) {
  let hull = outlineGeoCaches.get(sourceGeo);
  if (!hull) {
    hull = sourceGeo.clone();
    const pos = hull.getAttribute('position');
    let normals = hull.getAttribute('normal');
    if (!normals) {
      hull.computeVertexNormals();
      normals = hull.getAttribute('normal');
    }
    const displaced = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      n.fromBufferAttribute(normals, i);
      displaced[i * 3]     = v.x + n.x * OUTLINE_WIDTH;
      displaced[i * 3 + 1] = v.y + n.y * OUTLINE_WIDTH;
      displaced[i * 3 + 2] = v.z + n.z * OUTLINE_WIDTH;
    }
    hull.setAttribute('position', new THREE.BufferAttribute(displaced, 3));
    hull.computeBoundingSphere();
    hull.userData.shared = true;
    outlineGeoCaches.set(sourceGeo, hull);
  }
  return hull;
}

/**
 * Build the ink-outline twin of an existing InstancedMesh. Same count and
 * instance matrices as the source → identical placement and scale, so the
 * line weight follows each instance's visual size.
 *
 * @param {THREE.InstancedMesh} source
 * @returns {THREE.InstancedMesh}
 */
export function outlineTwinFor(source) {
  const hull = new THREE.InstancedMesh(getOutlineGeometry(source.geometry), outlineMaterial, source.count);
  hull.instanceMatrix.copy(source.instanceMatrix);
  hull.instanceMatrix.needsUpdate = true;
  hull.name = `${source.name || 'mesh'}-outline`;
  hull.renderOrder = -1;
  hull.frustumCulled = source.frustumCulled;
  hull.userData.outlineOf = source;
  return hull;
}

/**
 * Add ink outlines to a built mesh, returning the meshes to place in the
 * scene: `[source, ...hulls]` for a Mesh/InstancedMesh, or `[source]` for a
 * Group whose Mesh children get hulls added *inside* the group (so they
 * inherit the group transform). Anything else passes through unchanged.
 *
 * @param {THREE.Object3D} mesh
 * @returns {THREE.Object3D[]}
 */
export function addOutlines(mesh) {
  if (mesh.isGroup) {
    for (const child of [...mesh.children]) {
      if (!child.isMesh) continue;
      const hull = new THREE.Mesh(getOutlineGeometry(child.geometry), outlineMaterial);
      hull.position.copy(child.position);
      hull.quaternion.copy(child.quaternion);
      hull.scale.copy(child.scale);
      hull.name = `${child.name || 'mesh'}-outline`;
      hull.renderOrder = -1;
      hull.userData.outlineOf = child;
      mesh.add(hull);
    }
    return [mesh];
  }
  if (mesh.isInstancedMesh) {
    return [mesh, outlineTwinFor(mesh)];
  }
  return [mesh];
}
