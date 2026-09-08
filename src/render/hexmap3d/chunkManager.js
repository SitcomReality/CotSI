// src/render/hexmap3d/chunkManager.js
// Chunk mesh tracking, creation, and disposal.
// Owns the chunkMeshes Map and all chunk-level disposal logic.

const chunkMeshes = new Map();

/**
 * Look up a chunk entry by key.
 * @param {string} ck - Chunk key ("q,r")
 * @returns {{ group: THREE.Group, terrain: THREE.Mesh, water: THREE.Mesh, features: (InstancedMesh|Group)[], exploredCount: number }|undefined}
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
 * Includes the per-chunk water meshes so water hexes remain pickable.
 * @returns {THREE.Mesh[]}
 */
export function getAllTerrainMeshes() {
  const arr = [];
  for (const [, entry] of chunkMeshes) {
    if (entry.terrain) arr.push(entry.terrain);
    if (entry.water) arr.push(entry.water);
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
 * What a chunk needs rebuilt, from its render entry and current state.
 *
 * `full` rebuilds terrain + water + world objects: the entry is missing, or
 * the explored count grew (terrain/water gate on `explored`, so newly revealed
 * tiles must be added). `features` rebuilds only the world-object meshes: a
 * runtime dirty mark with an unchanged explored count comes from feature or
 * occupancy changes, and terrain/water do not depend on either.
 *
 * @param {object|undefined} entry - Chunk render entry (see getChunkEntry)
 * @param {object} chunk           - Game-state chunk
 * @param {number} exploredCount   - Explored tiles in this chunk
 * @returns {'full'|'features'|'none'}
 */
export function chunkRebuildMode(entry, chunk, exploredCount) {
  if (!entry) return 'full';
  if (exploredCount !== entry.exploredCount) return 'full';
  return chunk.dirty ? 'features' : 'none';
}

/**
 * Swap a chunk's world-object meshes, leaving terrain and water untouched.
 * Disposes the old feature meshes, adds the new ones to the existing group, and
 * refreshes the group's world matrix (the scene's auto-update is off).
 * @param {object} entry        - Chunk render entry
 * @param {THREE.Object3D[]} newFeatures
 */
export function replaceChunkFeatures(entry, newFeatures) {
  for (const fm of entry.features) {
    disposeMeshRecursive(fm);
    entry.group.remove(fm);
  }
  for (const fm of newFeatures) entry.group.add(fm);
  entry.features = newFeatures;
  entry.group.updateMatrixWorld(true);
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

  // Dispose water mesh
  disposeMeshRecursive(entry.water);

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
 * Shared module-level assets (marked `userData.shared`) are skipped — they are
 * reused across chunks and owned for the life of the renderer (see outline.js).
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
  if (obj.isInstancedMesh) obj.dispose();
  if (obj.geometry && !obj.geometry.userData?.shared) obj.geometry.dispose();
  if (obj.material) {
    if (Array.isArray(obj.material)) {
      obj.material.forEach(m => { if (!m.userData?.shared) m.dispose(); });
    } else if (!obj.material.userData?.shared) {
      obj.material.dispose();
    }
  }
}
