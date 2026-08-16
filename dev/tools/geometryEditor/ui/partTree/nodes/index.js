/**
 * nodes/index.js — Barrel: fresh-node factories + node transform math.
 */
export {
  freshId,
  motifScoped,
  makeGroupNode,
  makeLeafNode,
  makeAlternativesNode,
} from './constructors.js';
export {
  nodeRotationMatrix,
  rotateVec3,
  rootToNestedTransform,
} from './transform.js';
