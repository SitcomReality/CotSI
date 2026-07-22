// src/render/hexmap3d/features/geometries/index.js — barrel re-export
export {
  getTreeTrunkGeo,
  getTreeCanopyRoundGeo,
  getTreeCanopyTallGeo,
  getTreeCanopyWideGeo,
  getTreeCanopyGeo,
} from './treeGeometries.js';

export {
  getMountainGeo,
  getMountainPeakGeo,
  getMountainSlopeGeo,
} from './mountainGeometries.js';

export {
  getKnotGeo,
} from './knotGeometries.js';

export {
  getDebrisTuftGeo,
  getDebrisRockGeo,
  getDebrisFlowerGeo,
} from './debrisGeometries.js';

export {
  getBaseSpikeGeo,
  getBaseRingGeo,
  getBaseRingDotGeo,
} from './baseGeometries.js';
