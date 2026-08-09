/**
 * gameBuilder.js — Game-side resolution: tiles → descriptors → InstancedMeshes.
 *
 * The descriptor-pipeline replacement for the per-kind builders it supersedes
 * (mountainMeshes.js, knotMeshes.js, simpleFeatureMeshes.js, hillDecorMeshes.js
 * and the solitary-tree half of trees/treeRecordsForTile.js). Dispatch matches
 * the old builders' rules; once a tile resolves to a descriptor,
 * recordsForDescriptor → buildDescriptorMeshes renders it.
 *
 * A tile may resolve to several objects, one group per descriptor:
 *   feature (claims the hex center; gated on the visible set):
 *     knot feature (unmined)      → knot descriptor
 *     tree on open terrain → solitary tree descriptor
 *     any other kind with a descriptor → that descriptor (26 simple archetypes)
 *   terrain decoration (composes with the feature above; also rendered on
 *   explored-but-out-of-sight tiles, where it shows its unoccupied state):
 *     mountain terrain            → mountain descriptor (emphasis 'none')
 *     forest/denseForest          → grove descriptor; the Painforest biome
 *       picks its gnarled `painforest` variant. Dispersed to a ring near the
 *       hex edge when a non-tree feature claims the center, hidden when an
 *       occupant and feature share the tile
 *     hill terrain                → hill descriptor; sunk below the surface
 *       when the center is claimed, hidden when occupant + feature share it
 *     marsh/plateau/plains/desert/beach → ground decor descriptor
 *       (groundDecor.js): the plateau mound sinks like the hill mound, the
 *       clustered growth (reeds/grass/scrub/driftwood) disperses when the
 *       center is claimed, hidden when occupant + feature share it
 *
 * Kept on the legacy tree builder (not migrated — procedural, see
 * descriptors/data/): fruitTree. Champion bases stay on baseMeshes.js
 * (out of scope).
 */

import { collectInstances } from '../meshBuilder.js';
import { buildDescriptorMeshes } from './meshAssembly.js';
import { recordsForDescriptor } from './recordBuilder.js';
import { normalizeDescriptor } from './schema.js';
import { descriptorById } from './data/index.js';
import { GROVE_DESCRIPTOR } from './data/grove.js';
import { HILL_DESCRIPTOR } from './data/hills.js';
import { KNOT_DESCRIPTOR } from './data/knots.js';
import { MOUNTAIN_DESCRIPTOR } from './data/mountains.js';
import { biomeTintForTile } from '../biomeTint.js';
import { coordKey } from '../../../../engine/rules/hexGrid.js';
import { PLAINS_GRASS_DESCRIPTOR } from './data/plainsGrass.js';
import { MARSH_REEDS_DESCRIPTOR } from './data/marshReeds.js';
import { PLATEAU_MOUND_DESCRIPTOR } from './data/plateauMound.js';
import { DESERT_SCRUB_DESCRIPTOR } from './data/desertScrub.js';
import { BEACH_DRIFTWOOD_DESCRIPTOR } from './data/beachDriftwood.js';
import {
  DECOR_STATE, DECORATION, decorState, isTileOccupied,
} from '../decorEmphasis.js';

/** Terrains whose default look is a scattered tree grove. */
const GROVE_TERRAINS = new Set(['forest', 'denseForest']);

/**
 * True for a woods tile: the grove is the terrain decoration (descriptor
 * data — Painforest woods pick the gnarled `painforest` grove variant via
 * recordBuilder's cluster rule).
 */
function isWoodsTerrain(tile) {
  return GROVE_TERRAINS.has(tile.terrain);
}

/**
 * The simple ground-level terrain decorations — one named decor per terrain,
 * table-driven so a tile's decor comes from its terrain. Plateau mounds sink
 * like hill mounds; the clustered growth (reeds, grass, scrub, driftwood)
 * disperses when the hex center is claimed. Water, river, and ice stay bare.
 */
const SIMPLE_DECOR_BY_TERRAIN = new Map([
  ['marsh', { descriptor: MARSH_REEDS_DESCRIPTOR, decoration: DECORATION.MARSH }],
  ['plateau', { descriptor: PLATEAU_MOUND_DESCRIPTOR, decoration: DECORATION.PLATEAU }],
  ['plains', { descriptor: PLAINS_GRASS_DESCRIPTOR, decoration: DECORATION.PLAINS }],
  ['desert', { descriptor: DESERT_SCRUB_DESCRIPTOR, decoration: DECORATION.DESERT }],
  ['beach', { descriptor: BEACH_DRIFTWOOD_DESCRIPTOR, decoration: DECORATION.BEACH }],
]);

/**
 * Normalize a raw descriptor once per id. The data files ship schema-level
 * descriptors (no applied defaults); recordsForDescriptor and the mesh
 * assembler both expect the normalized form the editor edits.
 */
const normalizedCache = new Map();
function normalizedDescriptor(raw) {
  let normalized = normalizedCache.get(raw.id);
  if (!normalized) {
    normalized = normalizeDescriptor(raw);
    normalizedCache.set(raw.id, normalized);
  }
  return normalized;
}

/**
 * The mountain terrain decoration, or null. Mountains are terrain (emphasis
 * 'none' — never displaced), so they resolve independently of the feature pass
 * and, like the other terrain decorations, stay visible on explored tiles that
 * are out of sight.
 */
function resolveMountainForTile(tile) {
  if (tile.terrain !== 'mountain') return null;
  return { descriptor: normalizedDescriptor(MOUNTAIN_DESCRIPTOR), displacement: {} };
}

/** The feature that claims the hex center, or null. */
function resolveFeatureForTile(tile, occupants) {
  const kind = tile.feature?.kind;
  const occupied = isTileOccupied(occupants, tile);
  if (kind === 'knot') {
    if (tile.feature.mined) return null;
    return { descriptor: normalizedDescriptor(KNOT_DESCRIPTOR), displacement: { displaced: occupied } };
  }
  if (kind === 'fruitTree') return null; // legacy tree builder
  if (kind === 'tree') {
    // On woods this is the grove (or the legacy Painforest grove) — the
    // solitary landmark renders only on open terrain.
    if (isWoodsTerrain(tile)) return null;
    return { descriptor: normalizedDescriptor(descriptorById(kind)), displacement: { displaced: occupied } };
  }
  const descriptor = kind ? descriptorById(kind) : null;
  if (descriptor?.kind === 'feature') {
    return { descriptor: normalizedDescriptor(descriptor), displacement: { displaced: occupied } };
  }
  return null;
}

/**
 * The grove terrain decoration, or null. `visible` gates the unoccupied look:
 * while a tile is out of sight its occupants and features are not rendered,
 * so the grove shows its natural (NORMAL) state regardless of what sits on
 * the hex.
 */
function resolveGroveForTile(tile, occupants, visible = true) {
  if (!isWoodsTerrain(tile)) return null;
  const kind = tile.feature?.kind;
  if (kind === 'fruitTree') return null; // fruit tree claims the tile — no grove
  const mode = decorState({
    hasOccupant: visible && isTileOccupied(occupants, tile),
    hasFeature: visible && !!tile.feature && kind !== 'tree',
    decoration: DECORATION.GROVE,
  });
  return {
    descriptor: normalizedDescriptor(GROVE_DESCRIPTOR),
    displacement: {
      hidden: mode === DECOR_STATE.HIDDEN,
      displaced: mode === DECOR_STATE.DISPERSED,
    },
  };
}

/**
 * The hill mound terrain decoration, or null. `visible` gates the unoccupied
 * look: out of sight the mound renders at full size (NORMAL), not sunk or
 * hidden by occupants/features it cannot be seen next to.
 */
function resolveHillForTile(tile, occupants, visible = true) {
  if (tile.terrain !== 'hill') return null;
  const mode = decorState({
    hasOccupant: visible && isTileOccupied(occupants, tile),
    hasFeature: visible && !!tile.feature,
    decoration: DECORATION.HILL,
  });
  return {
    descriptor: normalizedDescriptor(HILL_DESCRIPTOR),
    displacement: {
      hidden: mode === DECOR_STATE.HIDDEN,
      displaced: mode === DECOR_STATE.SUNK,
    },
  };
}

/**
 * The simple ground-level terrain decoration (marsh/plateau/plains/desert/
 * beach), or null. Same visible-gating as the hill mound: out of sight the
 * decor renders in its natural (unclaimed) state.
 */
function resolveSimpleDecorForTile(tile, occupants, visible = true) {
  const entry = SIMPLE_DECOR_BY_TERRAIN.get(tile.terrain);
  if (!entry) return null;
  const mode = decorState({
    hasOccupant: visible && isTileOccupied(occupants, tile),
    hasFeature: visible && !!tile.feature,
    decoration: entry.decoration,
  });
  return {
    descriptor: normalizedDescriptor(entry.descriptor),
    displacement: {
      hidden: mode === DECOR_STATE.HIDDEN,
      displaced: mode !== DECOR_STATE.NORMAL,
    },
  };
}

/**
 * Every descriptor resolution for one tile (features + terrain decorations),
 * or an empty array. Exported for tests and tooling.
 *
 * @param {object} tile - Tile with `terrain`, `feature`, `q`, `r`
 * @param {Set<string>} occupants - "q,r" keys of tiles with an occupant
 * @param {boolean} [visible=true] - whether the tile is currently visible;
 *        when false the terrain decorations resolve in their unoccupied state
 *        (features still resolve — visibility gating happens at collect time)
 * @returns {{ descriptor: object, displacement: object }[]}
 */
export function resolveDescriptorForTile(tile, occupants, visible = true) {
  return [
    resolveMountainForTile(tile),
    resolveFeatureForTile(tile, occupants),
    resolveGroveForTile(tile, occupants, visible),
    resolveHillForTile(tile, occupants, visible),
    resolveSimpleDecorForTile(tile, occupants, visible),
  ].filter(Boolean);
}

/**
 * Collect instance records from every gated tile, grouped by descriptor id.
 * Runs one pass per resolution rule so a tile may contribute to several groups
 * (a knot on a forest tile resolves to both the knot and the dispersed grove).
 *
 * Terrain decorations are purely cosmetic — they may render on explored tiles
 * outside the view radius (fog doesn't hide them the way it hides features and
 * units). They are gated on `decorVisible` (visible ∪ explored); the feature
 * pass stays gated on `visible`. While a tile is out of sight its decor
 * resolves unoccupied (the resolvers receive `visible = false`).
 *
 * Per-part biome tints are computed once per tile (cached per call): the
 * tile's neighbor-blended biome colors (biomeTint.js), gated on the same
 * `decorVisible` set — the decor analogue of the terrain blend's `explored`.
 *
 * @param {Map|object[]} tilesOrArray - state.tiles Map or chunkTiles array
 * @param {Set<string>}  visible      - Set of "q,r" keys currently visible
 * @param {Set<string>}  occupants    - "q,r" keys of tiles with an occupant
 * @param {Set<string>}  [decorVisible=visible] - gate for terrain decorations
 * @param {Map|null}     [biomeColors] - biome id → { primary, accent }; when
 *        absent every part keeps its default color (no biome tint)
 * @returns {Map<string, object[]>} descriptor id → instance records
 */
function collectDescriptorRecords(tilesOrArray, visible, occupants, decorVisible = visible, biomeColors = null) {
  const groups = new Map();
  // Tile lookup for the tint's neighbor averaging — the Map is used as-is, an
  // array chunk becomes a Map (neighbors outside the chunk are simply skipped).
  const tilesByKey = tilesOrArray instanceof Map
    ? tilesOrArray
    : new Map(tilesOrArray.map((t) => [coordKey(t), t]));

  const tintCache = new Map();
  const tintFor = (tile) => {
    const key = coordKey(tile);
    if (!tintCache.has(key)) {
      tintCache.set(key, biomeTintForTile(tile, tilesByKey, biomeColors, decorVisible));
    }
    return tintCache.get(key);
  };

  const runPass = (resolve, gate) => {
    collectInstances(
      tilesOrArray, gate,
      (tile) => resolve(tile) !== null,
      (tile, worldPos) => {
        const { descriptor, displacement } = resolve(tile);
        const records = recordsForDescriptor(descriptor, tile, worldPos, undefined, displacement, tintFor(tile));
        if (records.length === 0) return null;
        let list = groups.get(descriptor.id);
        if (!list) {
          list = [];
          groups.set(descriptor.id, list);
        }
        list.push(...records);
        return null;
      },
    );
  };

  runPass((tile) => resolveMountainForTile(tile), decorVisible);
  runPass((tile) => resolveFeatureForTile(tile, occupants), visible);
  runPass(
    (tile) => resolveGroveForTile(tile, occupants, visible.has(`${tile.q},${tile.r}`)),
    decorVisible,
  );
  runPass(
    (tile) => resolveHillForTile(tile, occupants, visible.has(`${tile.q},${tile.r}`)),
    decorVisible,
  );
  runPass(
    (tile) => resolveSimpleDecorForTile(tile, occupants, visible.has(`${tile.q},${tile.r}`)),
    decorVisible,
  );
  return groups;
}

/** Assemble one InstancedMesh per part geometry for every descriptor group. */
function buildGroups(groups) {
  const results = [];
  for (const [id, records] of groups) {
    if (records.length === 0) continue;
    results.push(...buildDescriptorMeshes(normalizedDescriptor(descriptorById(id)), records, id));
  }
  return results;
}

/**
 * Build descriptor-driven feature InstancedMeshes for the current full state.
 * @param {object} state - Game state (state.tiles Map, state.biomeColors Map)
 * @param {Set<string>} visible - Set of "q,r" keys currently visible
 * @param {Set<string>} occupants - "q,r" keys of tiles with an occupant
 * @param {Set<string>} [decorVisible=visible] - gate for terrain decorations
 *        (visible ∪ explored); features stay gated on `visible`
 * @returns {THREE.InstancedMesh[]}
 */
export function buildDescriptorFeatureMeshes(state, visible, occupants, decorVisible = visible) {
  return buildGroups(collectDescriptorRecords(state.tiles, visible, occupants, decorVisible, state.biomeColors ?? null));
}

/**
 * Build descriptor-driven feature InstancedMeshes for a single chunk's tiles.
 * @param {object[]} chunkTiles - Array of tile objects in this chunk
 * @param {Set<string>} visible - Set of "q,r" keys currently visible
 * @param {Set<string>} occupants - "q,r" keys of tiles with an occupant
 * @param {Set<string>} [decorVisible=visible] - gate for terrain decorations
 *        (visible ∪ explored); features stay gated on `visible`
 * @param {Map|null} [biomeColors] - biome id → { primary, accent } (state
 *        carries it; the chunk entry point has no state, so callers pass it —
 *        see featureMeshes.js). Absent = default part colors, no biome tint.
 * @returns {THREE.InstancedMesh[]}
 */
export function buildChunkDescriptorFeatureMeshes(chunkTiles, visible, occupants, decorVisible = visible, biomeColors = null) {
  return buildGroups(collectDescriptorRecords(chunkTiles, visible, occupants, decorVisible, biomeColors));
}
