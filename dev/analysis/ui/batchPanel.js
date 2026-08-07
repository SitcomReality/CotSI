/**
 * batchPanel.js — Batch analysis and download controls for the analysis page.
 *
 * Handles batch-run orchestration, LUT/report downloads, and the DOM
 * helpers for reading batch configuration from controls.
 */
import { S } from '../state.js';
import { els } from '../domRefs.js';
import { runBatch } from '../batch/batchRunner.js';
import { formatBatchReport, calibrationToJSON } from '../stats/batchReport.js';
import { createProgressBar } from '../batch/progressBar.js';

// ─── DOM helpers ──────────────────────────────────────────────────────────────

/**
 * Read generation options from DOM controls.
 * @returns {{ multiBiome: boolean }}
 */
export function getGenerationOptions() {
  return {
    multiBiome: els.multiBiomeCheck.checked,
  };
}

// ── Calibration state ────────────────────────────────────────────────
let _lastCalibration = null;

/** Count of enabled batch-output checkboxes, shown in the panel summary badge. */
function updateBatchBadge() {
  if (!els.batchSummaryBadge) return;
  const enabled = document.querySelectorAll('.batch-outputs input[type="checkbox"]:checked').length;
  const total = document.querySelectorAll('.batch-outputs input[type="checkbox"]').length;
  els.batchSummaryBadge.textContent = `${enabled} of ${total} outputs`;
}

// ─── Batch analysis ───────────────────────────────────────────────────

/**
 * Read radii from checkbox DOM elements.
 * @returns {number[]}
 */
export function getSelectedRadii() {
  const radii = [];
  if (els.batchRadii7?.checked) radii.push(7);
  if (els.batchRadii21?.checked) radii.push(21);
  if (els.batchRadii35?.checked) radii.push(35);
  if (els.batchRadii77?.checked) radii.push(77);
  return radii.length > 0 ? radii : [21]; // fallback
}

/**
 * Read all output/data toggles from DOM.
 * @returns {object}
 */
export function getBatchOptions() {
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
 * Toggle all batch output checkboxes on or off.
 */
export function setAllBatchOutputs(checked) {
  const checkboxes = document.querySelectorAll('.batch-outputs input[type="checkbox"]');
  for (const cb of checkboxes) {
    cb.checked = checked;
  }
}

/**
 * Run a complete batch analysis across all selected (seeds × radii).
 * Replaces the old multi-seed, test-runner, and threshold-derivation paths.
 */
export async function runBatchAnalysis() {
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
    els.statsBody.textContent = formatBatchReport(result, { ...options, multiBiome: genOptions.multiBiome });

    // ── Enable download buttons if thresholds were derived ─────────────
    if (result.calibration) {
      els.btnDownloadLuts.disabled = false;
    }
    // Batch report button always enabled after a run
    els.btnDownloadBatchReport.disabled = false;
  } catch (err) {
    els.statsBody.textContent = `Batch analysis error:\n${err.message}\n${err.stack || ''}`;
  } finally {
    progressBar.hide();
    els.btnBatchRun.disabled = false;
  }
}

// ─── Download helpers ──────────────────────────────────────────────────

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
  const text = els.statsBody.textContent;
  if (!text || text === 'Loading...') return;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const ts = new Date().toISOString().replace(/:/g, '-');
  a.download = `batch_report_${ts}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Bind batch controls ───────────────────────────────────────────────

/**
 * Wire batch-related DOM event listeners.
 */
export function bindBatchControls() {
  els.btnBatchRun.addEventListener('click', () => {
    runBatchAnalysis();
  });

  // Toggle all / deselect all batch outputs
  if (els.btnBatchToggleAll) {
    els.btnBatchToggleAll.addEventListener('click', () => {
      setAllBatchOutputs(true);
      updateBatchBadge();
    });
  }
  if (els.btnBatchDeselectAll) {
    els.btnBatchDeselectAll.addEventListener('click', () => {
      setAllBatchOutputs(false);
      updateBatchBadge();
    });
  }

  // Summary badge stays in sync with the output checkboxes
  for (const cb of document.querySelectorAll('.batch-outputs input[type="checkbox"]')) {
    cb.addEventListener('change', updateBatchBadge);
  }
  updateBatchBadge();

  // Download LUTs / batch report
  if (els.btnDownloadLuts) {
    els.btnDownloadLuts.addEventListener('click', downloadLUTs);
  }
  if (els.btnDownloadBatchReport) {
    els.btnDownloadBatchReport.addEventListener('click', downloadBatchReport);
  }
}
