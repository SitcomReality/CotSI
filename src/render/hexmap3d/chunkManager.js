// src/render/hexmap3d/chunkManager.js
// Chunk mesh tracking, creation, and disposal.
// Owns the chunkMeshes Map and all chunk-level disposal logic.

const chunkMeshes = new Map();

/**
 * Look up a chunk entry by key.
 * @param {string} ck - Chunk key ("q,r")
 * @returns {{ group: THREE.Group, terrain: THREE.Mesh, features: (InstancedMesh|Group)[], exploredCount: number }|undefined}
 */
export function getChunkEntry(ck) {
  return chunkMeshes.get(ck);
}

/**
 * Store a chunk entry.
 */
export function setChunkEntry(ck, entry) {
  chunkMeshes.set(ck, entry);
}

/**
 * Remove a chunk entry from the map without disposal.
 */
export function deleteChunkEntry(ck) {
  chunkMeshes.delete(ck);
}

/**
 * Iterate all chunk entries.
 * @param {(ck: string, entry: Object) => void} fn
 */
export function forEachChunk(fn) {
  for (const [ck, entry] of chunkMeshes) {
    fn(ck, entry);
  }
}

/**
 * Clear all chunk entries without disposal (caller must dispose first).
 */
export function clearChunkEntries() {
  chunkMeshes.clear();
}

/**
 * Return all chunk terrain meshes as an array (for raycasting).
 * @returns {THREE.Mesh[]}
 */
export function getAllTerrainMeshes() {
  const arr = [];
  for (const [, entry] of chunkMeshes) {
    if (entry.terrain) arr.push(entry.terrain);
  }
  return arr;
}

/**
 * Count how many tiles in a tile array are in the explored set.
 * @param {{ q: number, r: number }[]} chunkTiles
 * @param {Set<string>} explored
 * @returns {number}
 */
export function countExploredInChunk(chunkTiles, explored) {
  let count = 0;
  for (const tile of chunkTiles) {
    if (explored.has(`${tile.q},${tile.r}`)) count++;
  }
  return count;
}

/**
 * Dispose all meshes belonging to a chunk and remove from tracking Map.
 * @param {string} ck - Chunk key
 * @param {THREE.Scene} scene - Scene to remove the chunk group from
 */
export function disposeChunk(ck, scene) {
  const entry = chunkMeshes.get(ck);
  if (!entry) return;

  // Dispose terrain
  disposeMeshRecursive(entry.terrain);

  // Dispose feature meshes (may include THREE.Group with children)
  for (const fm of entry.features) {
    disposeMeshRecursive(fm);
  }

  // Remove group from scene
  if (entry.group) scene.remove(entry.group);

  chunkMeshes.delete(ck);
}

/**
 * Recursively dispose geometry and material of a mesh and its children.
 * Does NOT remove from scene (caller handles scene removal).
 * @param {THREE.Object3D|undefined|null} obj
 */
export function disposeMeshRecursive(obj) {
  if (!obj) return;
  // Recurse into children first
  if (obj.children && obj.children.length > 0) {
    for (const child of [...obj.children]) {
      disposeMeshRecursive(child);
    }
  }
  if (obj.geometry) obj.geometry.dispose();
  if (obj.material) {
    if (Array.isArray(obj.material)) {
      obj.material.forEach(m => m.dispose());
    } else {
      obj.material.dispose();
    }
  }
}
