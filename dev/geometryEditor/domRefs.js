/**
 * domRefs.js — DOM element cache for the geometry editor page.
 */

export const els = {};

export function cacheDom() {
  els.objectSelect = document.getElementById('object-select');
  els.occupiedCheck = document.getElementById('occupied-check');
  els.rerollBtn = document.getElementById('reroll-btn');
  els.info = document.getElementById('info');
  els.viewport = document.getElementById('viewport');
  els.canvas = document.getElementById('preview-canvas');

  els.objectEdit = document.getElementById('object-edit');
  els.partsEdit = document.getElementById('parts-edit');
  els.partInspector = document.getElementById('part-inspector');
  els.downloadBtn = document.getElementById('download-btn');
  els.loadFile = document.getElementById('load-file');
  els.loadError = document.getElementById('load-error');
}
