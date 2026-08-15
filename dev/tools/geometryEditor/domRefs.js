/**
 * domRefs.js — DOM element cache for the geometry editor page.
 */

export const els = {};

export function cacheDom() {
  els.chrome = document.getElementById('chrome');
  els.browser = document.getElementById('browser');
  els.browserToggle = document.getElementById('browser-toggle');
  els.objectList = document.getElementById('object-list');
  els.objectFilter = document.getElementById('object-filter');
  els.objectFilterCount = document.getElementById('object-filter-count');
  els.occupiedCheck = document.getElementById('occupied-check');
  els.rerollBtn = document.getElementById('reroll-btn');
  els.occupiedRow = document.getElementById('occupied-row');
  els.stateSelect = document.getElementById('state-select');
  els.stateRow = document.getElementById('state-row');
  els.canonicalCheck = document.getElementById('canonical-check');
  els.canonicalRow = document.getElementById('canonical-row');
  els.rerollRow = document.getElementById('reroll-row');
  els.biomeSelect = document.getElementById('biome-select');
  els.biomeRow = document.getElementById('biome-row');
  els.terrainSelect = document.getElementById('terrain-select');
  els.terrainRow = document.getElementById('terrain-row');
  els.floorCheck = document.getElementById('floor-check');
  els.outlineCheck = document.getElementById('outline-check');
  els.resetCameraBtn = document.getElementById('reset-camera-btn');
  els.undoBtn = document.getElementById('undo-btn');
  els.previewTools = document.getElementById('preview-tools');
  els.previewToolsToggle = document.getElementById('preview-tools-toggle');
  els.info = document.getElementById('info');
  els.viewport = document.getElementById('viewport');
  els.canvas = document.getElementById('preview-canvas');
  els.stripRow = document.getElementById('strip-row');
  els.stripCheck = document.getElementById('strip-check');
  els.stripSeed = document.getElementById('strip-seed');
  els.stripHistogram = document.getElementById('strip-histogram');

  els.inspector = document.getElementById('inspector');
  els.inspectorBody = document.getElementById('inspector-body');
  els.partsEdit = document.getElementById('parts-edit');
  els.downloadBtn = document.getElementById('download-btn');
  els.saveBtn = document.getElementById('save-btn');
  els.loadFile = document.getElementById('load-file');
  els.loadError = document.getElementById('load-error');
  els.newFeatureBtn = document.getElementById('new-feature-btn');
  els.newDecorBtn = document.getElementById('new-decor-btn');
  els.newMobBtn = document.getElementById('new-mob-btn');
  els.newItemBtn = document.getElementById('new-item-btn');
  els.atlasStatus = document.getElementById('atlas-status');
}
