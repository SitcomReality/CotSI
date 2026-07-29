/**
 * main.js — UI controller for the headless map analysis page.
 *
 * Entry point for the analysis tool. Wires DOM controls to generation,
 * rendering, stats, and batch analysis modules.
 */
import { S } from '../state.js';
import { els, cacheDom } from '../domRefs.js';
import { generateSingleSeed } from '../generation/generate.js';
import { renderAndFit } from '../render/orchestrate.js';
import { updateLegend } from '../legend/legend.js';
import { updateStats } from '../stats/statsDisplay.js';
import { setupCanvasInteraction } from './canvas.js';
import { pickAndGenerateRandom, startCycle, stopCycle } from './cycle.js';
import { exportPng, exportJson } from './export.js';
import { getArchetype, listArchetypes } from '../../../src/game/rules/archetypes.js';
import '../../../src/game/rules/archetypeData/index.js'; // side-effect: populate registry
import { runBatch } from '../batch/batchRunner.js';
import { formatBatchReport, calibrationToJSON } from '../stats/batchReport.js';
import { createProgressBar } from '../batch/progressBar.js';

// ─── DOM helpers ──────────────────────────────────────────────────────────────

function getGenerationOptions() {
  return {
    multiBiome: els.multiBiomeCheck.checked,
  };
}

/**
 * Generate a map from the given seed, store it in state, and update
 * all display panels. Shows the loading indicator during generation.
 */
function loadAndDisplay(seedText) {
  els.loading.classList.add('visible');
  els.loading.textContent = 'Generating...';

  setTimeout(() => {
    try {
      const radius = parseInt(els.radius.value, 10) || 21;
      const biomeId = els.biome.value;
      const biomeDef = getArchetype(biomeId) || getArchetype('biome_default');
      const genOptions = getGenerationOptions();
      const result = generateSingleSeed(seedText, radius, biomeDef, genOptions);
      S.lastResult = result;

      renderAndFit();
      updateStats();
      updateLegend(S.viewMode);
    } finally {
      els.loading.classList.remove('visible');
    }
  }, 10);
}

// ─── Biome select ─────────────────────────────────────────────────────────────

function populateBiomes() {
  const biomeIds = listArchetypes('biome');
  for (const id of biomeIds) {
    const def = getArchetype(id);
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = def?.name || id;
    els.biome.appendChild(opt);
  }
}

// ── Calibration state ────────────────────────────────────────────────
let _lastCalibration = null;

// ─── Batch analysis ───────────────────────────────────────────────────

/**
 * Read radii from checkbox DOM elements.
 * @returns {number[]}
 */
function getSelectedRadii() {
  const radii = [];
  if (els.batchRadii7?.checked) radii.push(7);
  if (els.batchRadii21?.checked) radii.push(21);
  if (els.batchRadii50?.checked) radii.push(50);
  if (els.batchRadii100?.checked) radii.push(100);
  return radii.length > 0 ? radii : [21]; // fallback
}

/**
 * Read all output/data toggles from DOM.
 * @returns {object}
 */
function getBatchOptions() {
  return {
    terrain:       els.batchTerrain?.checked       ?? true,
    traderHeatmap: els.batchTraders?.checked       ?? true,
    championHeatmap: els.batchChampions?.checked   ?? false,
    histograms:    els.batchHistograms?.checked    ?? false,
    luts:          els.batchLuts?.checked          ?? false,
    frequency:     els.batchFrequency?.checked     ?? false,
    snapshot:      els.batchSnapshot?.checked      ?? true,
    seam:          els.batchSeam?.checked          ?? false,
    climate:       els.batchClimate?.checked       ?? false,
    thresholds:    els.batchThresholds?.checked    ?? true,
    spatial:       els.batchSpatial?.checked       ?? false,
    correlations:  els.batchCorrelations?.checked  ?? false,
  };
}

/**
 * Run a complete batch analysis across all selected (seeds × radii).
 * Replaces the old multi-seed, test-runner, and threshold-derivation paths.
 */
async function runBatchAnalysis() {
  const baseSeed = els.seed.value || 'glut-17';
  const seedCount = parseInt(els.batchCount.value, 10) || 50;
  const radii = getSelectedRadii();
  const options = getBatchOptions();
  const genOptions = getGenerationOptions();

  // ── Create progress bar ────────────────────────────────────────────
  const progressBar = createProgressBar(
    els.batchProgressFill,
    els.batchProgressText,
    els.batchProgress
  );

  els.btnBatchRun.disabled = true;
  els.btnDownloadThresholds.disabled = true;
  els.btnDownloadLuts.disabled = true;
  els.btnDownloadBatchReport.disabled = true;
  progressBar.show('Starting batch...');

  try {
    // Yield to let the progress bar render
    await new Promise(r => setTimeout(r, 0));

    const result = await runBatch({
      baseSeed,
      seedCount,
      radii,
      options,
      multiBiome: genOptions.multiBiome,
      onProgress: (step, total, detail) => {
        progressBar.update(step + 1, total, detail);
      },
    });

    _lastCalibration = result.calibration;

    // ── Format and display the report ──────────────────────────────────
    els.statsPanel.textContent = formatBatchReport(result, { ...options, multiBiome: genOptions.multiBiome });

    // ── Enable download buttons if thresholds were derived ─────────────
    if (result.calibration) {
      els.btnDownloadThresholds.disabled = false;
      els.btnDownloadLuts.disabled = false;
    }
    // Batch report button always enabled after a run
    els.btnDownloadBatchReport.disabled = false;
  } catch (err) {
    els.statsPanel.textContent = `Batch analysis error:\n${err.message}\n${err.stack || ''}`;
  } finally {
    progressBar.hide();
    els.btnBatchRun.disabled = false;
  }
}

// ─── Download helpers ──────────────────────────────────────────────────

function downloadThresholds() {
  if (!_lastCalibration) return;
  const doc = calibrationToJSON(_lastCalibration, false);
  if (!doc) return;
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'calibration_v1.json';
  a.click();
  URL.revokeObjectURL(url);
}

function downloadLUTs() {
  if (!_lastCalibration) return;
  const doc = calibrationToJSON(_lastCalibration, true);
  if (!doc) return;
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'calibration_v1_luts.json';
  a.click();
  URL.revokeObjectURL(url);
}

function downloadBatchReport() {
  const text = els.statsPanel.textContent;
  if (!text || text === 'Loading...') return;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'batch_report.txt';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Bind controls ────────────────────────────────────────────────────────────

function bindControls() {
  // Seed presets
  els.btnPresetDefault.addEventListener('click', () => {
    els.seed.value = 'glut-17';
  });
  els.btnPresetAlt.addEventListener('click', () => {
    els.seed.value = 'glut-42';
  });
  els.btnPresetRandom.addEventListener('click', () => {
    els.seed.value = 'glut-' + Math.floor(Math.random() * 9999);
  });

  // Generate single seed
  els.btnGenerate.addEventListener('click', () => {
    const seedText = els.seed.value || 'glut-17';
    loadAndDisplay(seedText);
  });

  // Batch analysis
  els.btnBatchRun.addEventListener('click', () => {
    runBatchAnalysis();
  });

  // Download thresholds / LUTs
  if (els.btnDownloadThresholds) {
    els.btnDownloadThresholds.addEventListener('click', downloadThresholds);
  }
  if (els.btnDownloadLuts) {
    els.btnDownloadLuts.addEventListener('click', downloadLUTs);
  }
  if (els.btnDownloadBatchReport) {
    els.btnDownloadBatchReport.addEventListener('click', downloadBatchReport);
  }

  // Entity toggles re-render
  const toggles = [
    els.toggleChamps, els.toggleMobs, els.toggleTraders,
    els.toggleBases, els.toggleFeatures, els.toggleDebris,
  ];
  for (const toggle of toggles) {
    if (toggle) toggle.addEventListener('change', renderAndFit);
  }

  // View mode
  els.viewMode.addEventListener('change', () => {
    S.viewMode = els.viewMode.value;
    renderAndFit();
    updateLegend(S.viewMode);
  });

  // Multi-biome toggle: regenerate and re-render
  els.multiBiomeCheck.addEventListener('change', () => {
    const seedText = els.seed.value || 'glut-17';
    loadAndDisplay(seedText);
  });

  // Random cycle
  els.btnCycleToggle.addEventListener('click', () => {
    if (S.cycleOn) {
      stopCycle();
    } else {
      startCycle();
    }
  });

  els.cycleSpeed.addEventListener('input', () => {
    const val = parseFloat(els.cycleSpeed.value);
    els.cycleSpeedValue.textContent = val.toFixed(1) + 's';
    if (S.cycleOn) {
      if (S.cycleIntervalId) {
        clearInterval(S.cycleIntervalId);
      }
      const intervalMs = val * 1000;
      S.cycleIntervalId = setInterval(pickAndGenerateRandom, intervalMs);
    }
  });

  els.btnNextRandom.addEventListener('click', () => {
    if (S.cycleOn) stopCycle();
    pickAndGenerateRandom();
  });

  // Export
  els.btnExportPng.addEventListener('click', exportPng);
  els.btnExportJson.addEventListener('click', exportJson);
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  cacheDom();
  populateBiomes();
  bindControls();
  setupCanvasInteraction();

  // Generate default map on load
  els.seed.value = 'glut-17';
  loadAndDisplay('glut-17');
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
