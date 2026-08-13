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
  els.rerollRow = document.getElementById('reroll-row');
  els.biomeSelect = document.getElementById('biome-select');
  els.biomeRow = document.getElementById('biome-row');
  els.floorCheck = document.getElementById('floor-check');
  els.outlineCheck = document.getElementById('outline-check');
  els.resetCameraBtn = document.getElementById('reset-camera-btn');
  els.info = document.getElementById('info');
  els.viewport = document.getElementById('viewport');
  els.canvas = document.getElementById('preview-canvas');

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
