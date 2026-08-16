/**
 * constructors.js — Fresh node factories for the parts tree.
 *
 * Id allocation (freshId), motif id-scoping (motifScoped), and the three node
 * shapes: shape leaves (makeLeafNode), pure-container groups (makeGroupNode),
 * and alternatives choice points (makeAlternativesNode).
 */
import {
  NESTED_PART_TRANSFORM_DEFAULTS,
  PART_TRANSFORM_DEFAULTS,
  SHAPE_TYPES,
} from '../../../../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import { listNodes } from '../walk.js';

/**
 * A fresh node id in the tree: `prefix` + a counter that skips ids already in
 * use (schema: ids must be unique across the whole parts tree).
 */
export function freshId(parts, prefix) {
  const taken = new Set(listNodes(parts).map((e) => e.node.id));
  let n = 1;
  while (taken.has(prefix + '-' + n)) n++;
  return prefix + '-' + n;
}

/**
 * Scope a fresh-id stem under the active motif on the v6 decor path
 * (decorComposition.md §2.2/§6.2 — a part added under motif M stores
 * `M/localId`, under an option `M/A/localId`), so editor-created ids carry
 * the motif context, stay unique across motifs without the author
 * hand-maintaining the global namespace, and the strip histogram's motif
 * attribution (`partId.startsWith(motifId + '-')`, previewSync.js) sees them.
 * Stems that already carry the motif prefix pass through unchanged
 * (hand-authored `cactus-trunk` stays `cactus-trunk` when wrapped into a
 * choice point). Outside motif decors (`motifId` null) the stem is used
 * verbatim.
 */
export function motifScoped(stem, motifId) {
  if (!motifId) return stem;
  return stem.startsWith(`${motifId}-`) ? stem : `${motifId}-${stem}`;
}

/** A new group node: identity transform (nested field set) + empty children. */
export function makeGroupNode(id) {
  return {
    id,
    transform: { ...NESTED_PART_TRANSFORM_DEFAULTS },
    children: [],
  };
}

/**
 * A new leaf node of `shape`. Root leaves (nested = false) get the full
 * grounding transform set (y/lift), so they render at the surface — the nested
 * set has no `y`, and recordBuilder's `worldPos.y + t.y` would go NaN without
 * it. Group children (nested = true) get the nested field set instead.
 */
export function makeLeafNode(shape, id, nested = false) {
  return {
    id,
    shape,
    params: { ...SHAPE_TYPES[shape].defaults },
    transform: { ...(nested ? NESTED_PART_TRANSFORM_DEFAULTS : PART_TRANSFORM_DEFAULTS) },
    color: 0xffffff,
  };
}

/**
 * A fresh `alternatives` choice point: one option (`<id>-option-1`, weight 1)
 * holding a copy of the selected node(s) the caller wraps — the "convert
 * selection to alternatives" entry. `seed` is assigned ONCE from the reserved
 * 100–199 lane (never recomputed from id/path — renaming or reordering must
 * not reshuffle in-world rolls, decorComposition.md §2.2).
 * @param {string} id - the node's id (unique across the tree)
 * @param {object[]} selectedParts - parts to seed the first option with
 * @param {Set<string>} takenSeeds - seeds already used in this descriptor
 */
export function makeAlternativesNode(id, selectedParts, takenSeeds) {
  let seed = 100;
  while (takenSeeds.has(seed)) seed++;
  takenSeeds.add(seed);
  const optionId = `${id}-option-1`;
  return {
    id,
    seed,
    default: optionId,
    alternatives: [
      { id: optionId, weight: 1, parts: selectedParts },
    ],
  };
}
