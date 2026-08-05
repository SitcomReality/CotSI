/**
 * domRefs.js — DOM element references for the analysis page.
 *
 * Caches frequently-used elements by id so modules don't query the DOM
 * repeatedly. Import `els` after `cacheDom()` has been called (at init).
 */
import { S } from './state.js';

/**
 * Shorthand for document.getElementById.
 */
export function $(id) {
  return document.getElementById(id);
}

/**
 * Cache of DOM element references, populated by cacheDom().
 * Every module that needs a UI element imports `els` and reads its property.
 */
export const els = {};

/**
 * Populate the `els` cache with all controls and display elements.
 * Must be called once during startup (before any event bindings).
 */
export function cacheDom() {
  els.seed = $('seed-input');
  els.radius = $('radius-input');
  els.biome = $('biome-select');

  els.btnGenerate = $('btn-generate');
  els.btnPresetDefault = $('btn-preset-default');
  els.btnPresetAlt = $('btn-preset-alt');
  els.btnPresetRandom = $('btn-preset-random');
  els.btnRadius7 = $('btn-radius-7');
  els.btnRadius21 = $('btn-radius-21');
  els.btnRadius35 = $('btn-radius-35');
  els.btnRadius77 = $('btn-radius-77');
  els.toggleChamps = $('toggle-champs');
  els.toggleMobs = $('toggle-mobs');
  els.toggleTraders = $('toggle-traders');
  els.toggleBases = $('toggle-bases');
  els.toggleFeatures = $('toggle-features');
  els.viewMode = $('view-mode');
  els.btnCycleToggle = $('btn-cycle-toggle');
  els.btnNextRandom = $('btn-next-random');
  els.btnPrevSeed = $('btn-prev-seed');
  els.btnNextSeed = $('btn-next-seed');
  els.cycleSpeed = $('cycle-speed');
  els.cycleSpeedValue = $('cycle-speed-value');
  els.multiBiomeCheck = $('multi-biome-check');
  els.btnExportPng = $('btn-export-png');
  els.btnExportJson = $('btn-export-json');
  els.statsPanel = $('stats-panel');
  els.legend = $('legend');
  els.loading = $('loading');
  els.mapArea = $('map-area');

  // Batch analysis
  els.batchCount = $('batch-count');
  els.batchRadii7 = $('batch-radius-7');
  els.batchRadii21 = $('batch-radius-21');
  els.batchRadii35 = $('batch-radius-35');
  els.batchRadii77 = $('batch-radius-77');
  els.batchTerrain = $('batch-terrain');
  els.batchTraders = $('batch-traders');
  els.batchChampions = $('batch-champions');
  els.batchHistograms = $('batch-histograms');
  els.batchLuts = $('batch-luts');
  els.batchFrequency = $('batch-frequency');
  els.batchSnapshot = $('batch-snapshot');
  els.batchSeam = $('batch-seam');
  els.batchClimate = $('batch-climate');
  els.batchThresholds = $('batch-thresholds');
  els.batchSpatial = $('batch-spatial');
  els.batchCorrelations = $('batch-correlations');
  els.btnBatchRun = $('btn-batch-run');
  els.btnBatchToggleAll = $('btn-batch-toggle-all');
  els.btnBatchDeselectAll = $('btn-batch-deselect-all');
  els.batchProgressFill = $('batch-progress-fill');
  els.batchProgressText = $('batch-progress-text');
  els.batchProgress = $('batch-progress');
  els.btnDownloadLuts = $('btn-download-luts');
  els.btnDownloadBatchReport = $('btn-download-batch-report');
  els.legend = $('legend');
  els.loading = $('loading');
  els.mapArea = $('map-area');

  // The canvas element is shared via state for rendering and export
  S.canvasEl = $('map-canvas');
}
