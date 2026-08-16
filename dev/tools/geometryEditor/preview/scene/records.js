/**
 * records.js — Replacing the previewed object: record arrays → InstancedMesh
 * display via the game's meshAssembly pipeline, optionally with the ink-outline
 * twins. Single-tile (showRecords) and multi-tile strip (showRecordsMulti)
 * variants share the same rebuild path.
 */
import { buildDescriptorMeshes } from '../../../../../src/render/hexmap3d/worldObjects/descriptors/meshAssembly.js';
import { addOutlines } from '../../../../../src/render/hexmap3d/scene/outline.js';
import { viewport } from '../viewportState.js';

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
  viewport.dirty = true;
}
