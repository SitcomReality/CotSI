/**
 * restructure/index.js — Barrel: parts-tree structural edits (nest/ungroup,
 * move into/out of a group) + the gizmo localPos-delta helper.
 */
export { addLocalDelta } from './localDelta.js';
export { nestNode, canUngroup, ungroupNode } from './nest.js';
export { duplicateNode, duplicateInList } from './duplicate.js';
export {
  canMoveInto,
  groupTargets,
  moveIntoGroup,
  canMoveIntoFrame,
  moveTargets,
  moveIntoOption,
  canExtract,
  extractNode,
} from './move.js';
