/**
 * partTree.js — Parts-tree walk + structural edits for the geometry editor.
 *
 * A descriptor's active parts (activeParts() in variantQuery.js) is a tree of
 * nodes: shape leaves (shape + params) and groups (a `children` array with no
 * shape of their own). These helpers walk that tree — selection resolution,
 * node counts, and the structural edits (nest/ungroup, move into/out of a
 * group) — keeping the tree logic out of the row renderers. Pure: no DOM, no
 * editor state, no game state, so the nest/ungroup/reparent math is
 * unit-testable in Node.
 *
 * Transform conventions (see schema.js / recordBuilder.js): every node's
 * transform composes as T(localPos) · R(localAxis, localAngle) · R_y(rotY) ·
 * S(scaleX, scaleY, scaleZ) in its parent's frame; root leaves additionally
 * ground with `y`/`lift`/`tilt`. All localPos values are pre-scale units.
 */
export {
  isGroupNode,
  isAlternativesNode,
  listNodes,
  countNodes,
  findNodeById,
  siblingList,
  siblingIds,
  descendantLeafIds,
} from './walk.js';
export {
  freshId,
  motifScoped,
  makeGroupNode,
  makeLeafNode,
  makeAlternativesNode,
  rootToNestedTransform,
} from './nodes.js';
export {
  addLocalDelta,
  nestNode,
  canUngroup,
  ungroupNode,
  canMoveInto,
  groupTargets,
  moveIntoGroup,
  canExtract,
  extractNode,
} from './restructure.js';
