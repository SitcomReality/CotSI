// descriptors/index.js — barrel re-export
export {
  SHAPE_TYPES,
  OBJECT_KINDS,
  EMPHASIS_BEHAVIORS,
  PLACEMENT_MODES,
  SCHEMA_VERSION,
  OBJECT_DEFAULTS,
  PART_TRANSFORM_DEFAULTS,
  validateDescriptor,
  validateShapeParams,
  validateTransform,
  validatePart,
  normalizeDescriptor,
} from './schema.js';

export {
  recordsForDescriptor,
} from './recordBuilder.js';

export {
  geometryForShape,
  materialForPart,
} from './shapeFactories.js';

export {
  buildDescriptorMeshes,
} from './meshAssembly.js';
