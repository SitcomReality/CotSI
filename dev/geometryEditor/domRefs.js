/**
 * domRefs.js — DOM element cache for the geometry editor page.
 */

export const els = {};

export function cacheDom() {
  els.objectList = document.getElementById('object-list');
  els.objectFilter = document.getElementById('object-filter');
  els.objectFilterCount = document.getElementById('object-filter-count');
  els.occupiedCheck = document.getElementById('occupied-check');
  els.rerollBtn = document.getElementById('reroll-btn');
  els.occupiedRow = document.getElementById('occupied-row');
  els.rerollRow = document.getElementById('reroll-row');
  els.info = document.getElementById('info');
  els.viewport = document.getElementById('viewport');
  els.canvas = document.getElementById('preview-canvas');

  els.inspector = document.getElementById('inspector');
  els.partsEdit = document.getElementById('parts-edit');
  els.downloadBtn = document.getElementById('download-btn');
  els.loadFile = document.getElementById('load-file');
  els.loadError = document.getElementById('load-error');
}
