// src/render/hexmap3d/worldObjects/baseMeshes.js
import { FACTIONS } from '../../../game/rules/factionData.js';
import { hexCenter3D } from '../hexWorldSpace.js';
import { hillFloorY } from './hillFloor.js';
import { normalizeDescriptor } from './descriptors/schema.js';
import { recordsForEntity } from './descriptors/recordBuilder.js';
import { buildDescriptorMeshes } from './descriptors/meshAssembly.js';
import { BASE_DESCRIPTOR } from './descriptors/data/base.js';

/**
 * Base meshes now render through the generic descriptor pipeline: the base
 * descriptor (descriptors/data/base.js) holds the tower + cap + per-faction
 * decoration as 7 faction variants; here the tile's faction is mapped onto an
 * entity ({ faction, colors }) whose records recordsForEntity derives, and
 * buildDescriptorMeshes assembles one InstancedMesh per part (instanced across
 * all visible bases).
 *
 * The old hard-coded 7-branch decoration switch and the per-base geometry
 * (baseGeometries.js) are gone; the look is preserved (tower/cap in the
 * faction base color, decoration in the faction accent color).
 */

const hexColor = (hex) => parseInt(hex.slice(1), 16);

const normalizedCache = new Map();
function normalizedBase() {
  let normalized = normalizedCache.get(BASE_DESCRIPTOR.id);
  if (!normalized) {
    normalized = normalizeDescriptor(BASE_DESCRIPTOR);
    normalizedCache.set(BASE_DESCRIPTOR.id, normalized);
  }
  return normalized;
}

/** Map a base tile feature onto the entity shape recordsForEntity expects. */
function entityForBaseFeature(feature) {
  const fac = FACTIONS[feature.faction];
  if (!fac) return null;
  return {
    faction: fac.short,
    colors: { factionBase: hexColor(fac.base), factionAccent: hexColor(fac.color) },
  };
}

/**
 * Instance records for every visible base in a tile collection. The full-map
 * path walks `visible` keys against state.tiles (a "q,r"-keyed accessor — the
 * game's tile proxy), the chunk path walks a chunk tile array with a visibility
 * Set — the same two shapes the old builder handled.
 */
function collectBaseRecords(tilesOrArray, visible) {
  const records = [];
  const normalized = normalizedBase();

  if (Array.isArray(tilesOrArray)) {
    for (const tile of tilesOrArray) {
      const key = `${tile.q},${tile.r}`;
      if (!visible.has(key)) continue;
      if (!tile.feature || tile.feature.kind !== 'base') continue;
      const entity = entityForBaseFeature(tile.feature);
      if (!entity) continue;
      const surfaceY = hillFloorY(tile);
      const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);
      records.push(...recordsForEntity(normalized, entity, { x, y: surfaceY, z }));
    }
    return records;
  }

  for (const key of visible) {
    const tile = tilesOrArray[key];
    if (!tile || !tile.feature || tile.feature.kind !== 'base') continue;
    const entity = entityForBaseFeature(tile.feature);
    if (!entity) continue;
    const surfaceY = hillFloorY(tile);
    const { x, z } = hexCenter3D(tile.q, tile.r, surfaceY);
    records.push(...recordsForEntity(normalized, entity, { x, y: surfaceY, z }));
  }
  return records;
}

/**
 * Build base InstancedMeshes for visible tiles with a 'base' feature.
 * @param {Map} state.tiles
 * @param {string[]} visible - hex keys currently visible
 * @returns {THREE.InstancedMesh[]}
 */
export function buildBaseMeshes(state, visible) {
  return buildDescriptorMeshes(normalizedBase(), collectBaseRecords(state.tiles, visible), 'base');
}

/**
 * Build base InstancedMeshes for a single chunk's tiles.
 * @param {object[]} chunkTiles - Array of tile objects in this chunk
 * @param {Set<string>} visible - Set of hex keys currently visible
 * @returns {THREE.InstancedMesh[]}
 */
export function buildChunkBaseMeshes(chunkTiles, visible) {
  return buildDescriptorMeshes(normalizedBase(), collectBaseRecords(chunkTiles, visible), 'base');
}
