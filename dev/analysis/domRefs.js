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
  els.hvSlider = $('hv-slider');
  els.hvValue = $('hv-value');
  els.wtSlider = $('wt-slider');
  els.wtValue = $('wt-value');
  els.mtSlider = $('mt-slider');
  els.mtValue = $('mt-value');
  els.btnGenerate = $('btn-generate');
  els.btnPresetDefault = $('btn-preset-default');
  els.btnPresetAlt = $('btn-preset-alt');
  els.btnPresetRandom = $('btn-preset-random');
  els.toggleChamps = $('toggle-champs');
  els.toggleMobs = $('toggle-mobs');
  els.toggleTraders = $('toggle-traders');
  els.toggleBases = $('toggle-bases');
  els.toggleFeatures = $('toggle-features');
  els.toggleDebris = $('toggle-debris');
  els.viewMode = $('view-mode');
  els.btnCycleToggle = $('btn-cycle-toggle');
  els.btnNextRandom = $('btn-next-random');
  els.cycleSpeed = $('cycle-speed');
  els.cycleSpeedValue = $('cycle-speed-value');
  els.multiCount = $('multi-count');
  els.btnMultiGenerate = $('btn-multi-generate');
  els.btnExportPng = $('btn-export-png');
  els.btnExportJson = $('btn-export-json');

  // Calibration checkboxes
  els.calibFreq = $('calib-freq');
  els.calibHist = $('calib-hist');
  els.calibLut   = $('calib-lut');

  // Multi-seed output checkboxes
  els.multiTerrain   = $('multi-terrain');
  els.multiTraders   = $('multi-traders');
  els.multiChampions = $('multi-champions');
  els.statsPanel = $('stats-panel');
  els.multiBiomeCheck = $('multi-biome-check');
  els.legend = $('legend');
  els.loading = $('loading');
  els.mapArea = $('map-area');

  // The canvas element is shared via state for rendering and export
  S.canvasEl = $('map-canvas');
}
