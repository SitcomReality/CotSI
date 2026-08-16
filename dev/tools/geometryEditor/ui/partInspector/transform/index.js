/**
 * transform/index.js — Barrel: the part inspector's transform sections
 * (position / rotation / scale) + the shared setLocalPos helper.
 */
export { setLocalPos, renderPositionSection } from './position.js';
export { renderRotationSection } from './rotation.js';
export { renderScaleSection } from './scale.js';
