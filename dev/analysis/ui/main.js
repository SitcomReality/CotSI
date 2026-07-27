/**
 * main.js — UI controller for the headless map analysis page.
 *
 * Entry point for the analysis tool. Wires DOM controls to generation,
 * rendering, stats, and multi-seed analysis modules.
 */
import { S } from '../state.js';
import { els, cacheDom } from '../domRefs.js';
import { generateSingleSeed, enrichWithNoise } from '../generation/generate.js';
import { renderAndFit } from '../render/orchestrate.js';
import { updateLegend } from '../legend/legend.js';
import { updateStats, formatMultiStats } from '../stats/statsDisplay.js';
import { setupCanvasInteraction } from './canvas.js';
import { pickAndGenerateRandom, startCycle, stopCycle } from './cycle.js';
import { exportPng, exportJson } from './export.js';
import { getArchetype, listArchetypes } from '../../../src/game/rules/archetypes.js';
import '../../../src/game/rules/archetypeData/index.js'; // side-effect: populate registry
import { runMultiSeed } from '../generation/multiSeed.js';

// ── Calibration imports ─────────────────────────────────────────────────────
import { verifyFrequency } from '../generation/frequencyVerification.js';
import { NOISE_CONFIG } from '../generation/noiseConfig.js';
import {
  formatMultiCalibrationReport,
  formatFrequencyReport,
  buildAndFormatLUTs,
} from '../stats/calibrationDisplay.js';
import {
  calibratePipeline,
  exportCalibrationV1,
  formatCalibrationReport,
  generateSeeds,
} from '../generation/thresholdDerivation.js';

// ── Test imports ────────────────────────────────────────────────────────────
import { runSnapshotTests, formatSnapshotReport } from '../generation/snapshotTest.js';
import { runSeamTest, formatSeamReport } from '../generation/seamTest.js';
import { runClimateCoverageTest, formatClimateCoverageReport } from '../generation/climateCoverage.js';

// ─── DOM helpers ──────────────────────────────────────────────────────────────

function getMapSettings() {
  return {
    heightVariation: parseFloat(els.hvSlider.value),
    wateriness: parseFloat(els.wtSlider.value),
    mountainousness: parseFloat(els.mtSlider.value),
  };
}

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
      const mapSettings = getMapSettings();
      const genOptions = getGenerationOptions();
      const result = generateSingleSeed(seedText, radius, biomeDef, mapSettings, genOptions);
      enrichWithNoise(result.tiles, seedText);
      S.lastResult = result;

      renderAndFit();
      updateStats();
      updateLegend(S.viewMode);
    } finally {
      els.loading.classList.remove('visible');
    }
  }, 10);
}

// ── Threshold derivation state ─────────────────────────────────────────
let _lastCalibration = null;

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

// ─── Multi-seed ───────────────────────────────────────────────────────────────

async function doMultiSeedGenerate() {
  const baseSeed = els.seed.value || 'glut-17';
  const count = parseInt(els.multiCount.value, 10) || 50;
  const radius = parseInt(els.radius.value, 10) || 21;
  const biomeId = els.biome.value;
  const biomeDef = getArchetype(biomeId) || getArchetype('biome_default');
  const mapSettings = getMapSettings();
  const genOptions = getGenerationOptions();

  // ── Read calibration toggles ─────────────────────────────────
  const doFreq  = els.calibFreq?.checked ?? false;
  const doHist  = els.calibHist?.checked ?? false;
  const doLut   = els.calibLut?.checked  ?? false;
  const collectCalib = doHist || doLut;

  // ── Read output toggles ──────────────────────────────────────
  const showTerrain   = els.multiTerrain?.checked ?? true;
  const showTraders   = els.multiTraders?.checked ?? true;
  const showChampions = els.multiChampions?.checked ?? false;

  els.loading.classList.add('visible');
  els.loading.textContent = `Generating 0 / ${count}...`;
  els.btnMultiGenerate.disabled = true;

  try {
    // ── 1. Frequency Verification (optional, radius 50 once) ────
    let freqResults = null;
    if (doFreq) {
      try {
        freqResults = verifyFrequency(baseSeed, 50);
      } catch (err) {
        freqResults = [{ error: `Frequency verification failed: ${err.message}` }];
      }
    }

    // ── 2. Multi-seed generation (+ optional calibration) ───────
    const result = await runMultiSeed({
      baseSeed,
      count,
      radius,
      biomeDef,
      mapSettings,
      multiBiome: genOptions.multiBiome,
      collectCalibration: collectCalib,
      noiseConfig: collectCalib ? NOISE_CONFIG : null,
      onProgress: (current, total) => {
        els.loading.textContent = `Generating ${current} / ${total}...`;
      },
    });

    // ── 3. Display the last seed's map ───────────────────────────
    const lastSeedText = `${baseSeed}-${count - 1}`;
    const displayResult = generateSingleSeed(lastSeedText, radius, biomeDef, mapSettings, genOptions);
    enrichWithNoise(displayResult.tiles, lastSeedText);
    S.lastResult = displayResult;
    renderAndFit();
    updateStats();
    updateLegend(S.viewMode);

    // ── 4. Assemble output ───────────────────────────────────────
    const outputParts = [];

    // Multi-seed stats (with toggles)
    outputParts.push(formatMultiStats(result, { showTerrain, showTraders, showChampions }));

    // Calibration report (if any calibration was requested)
    if (doFreq || collectCalib) {
      outputParts.push('');

      // Multi-seed calibration: pooled histograms
      if (doHist || doLut) {
        outputParts.push(formatMultiCalibrationReport(result.calibrationResults, doFreq ? freqResults : null));
      } else if (doFreq && freqResults) {
        // Frequency only — use the existing formatter
        outputParts.push(formatFrequencyReport(freqResults));
      }

      // Quantile LUTs (built from pooled histograms)
      if (doLut && result.calibrationResults) {
        const { report: lutReport } = buildAndFormatLUTs(result.calibrationResults);
        outputParts.push(lutReport);
      }
    }

    els.statsPanel.textContent = outputParts.join('\n');
  } finally {
    els.loading.classList.remove('visible');
    els.btnMultiGenerate.disabled = false;
  }
}

// ─── Test runner ──────────────────────────────────────────────────────────────

async function runAllTests() {
  els.loading.classList.add('visible');
  els.loading.textContent = 'Running tests...';
  els.btnRunTests.disabled = true;

  const parts = [];

  try {
    // Yield to let the loading indicator render
    await new Promise(r => setTimeout(r, 0));

    // Snapshot tests
    const snapshotResult = runSnapshotTests();
    parts.push(formatSnapshotReport(snapshotResult));
    parts.push('');

    // Seam test
    const seamResult = runSeamTest();
    parts.push(formatSeamReport(seamResult));
    parts.push('');

    // Climate coverage report
    const climateResult = runClimateCoverageTest();
    parts.push(formatClimateCoverageReport(climateResult));
  } catch (err) {
    parts.push(`Test runner error: ${err.message}`);
  } finally {
    els.loading.classList.remove('visible');
    els.btnRunTests.disabled = false;
  }

  els.statsPanel.textContent = parts.join('\n');
}

// ─── Threshold derivation ─────────────────────────────────────────────────────

async function deriveThresholds() {
  els.loading.classList.add('visible');
  els.loading.textContent = 'Deriving thresholds...';
  els.btnDeriveThresholds.disabled = true;
  els.btnDownloadCalib.disabled = true;

  try {
    // Yield to let the loading indicator render
    await new Promise(r => setTimeout(r, 0));

    const baseSeed = els.seed.value || 'glut-17';
    const count = parseInt(els.multiCount.value, 10) || 50;
    const radius = parseInt(els.radius.value, 10) || 21;
    const seeds = generateSeeds(baseSeed, count);

    const result = calibratePipeline({
      seeds,
      radii: [radius],
      noiseConfig: NOISE_CONFIG,
    });

    _lastCalibration = result;

    // Display the report
    els.statsPanel.textContent = formatCalibrationReport(result);
    els.btnDownloadCalib.disabled = false;
  } catch (err) {
    els.statsPanel.textContent = `Threshold derivation error: ${err.message}\n${err.stack || ''}`;
  } finally {
    els.loading.classList.remove('visible');
    els.btnDeriveThresholds.disabled = false;
  }
}

function downloadCalibrationV1() {
  if (!_lastCalibration) return;
  const calibDoc = exportCalibrationV1(_lastCalibration);
  const blob = new Blob([JSON.stringify(calibDoc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'calibration_v1.json';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Bind controls ────────────────────────────────────────────────────────────

function bindControls() {
  // Slider labels
  els.hvSlider.addEventListener('input', () => { els.hvValue.textContent = els.hvSlider.value; });
  els.wtSlider.addEventListener('input', () => { els.wtValue.textContent = els.wtSlider.value; });
  els.mtSlider.addEventListener('input', () => { els.mtValue.textContent = els.mtSlider.value; });

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

  // Generate multi-seed
  els.btnMultiGenerate.addEventListener('click', () => {
    doMultiSeedGenerate();
  });

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

  // Run tests
  if (els.btnRunTests) {
    els.btnRunTests.addEventListener('click', runAllTests);
  }

  // Threshold derivation
  if (els.btnDeriveThresholds) {
    els.btnDeriveThresholds.addEventListener('click', deriveThresholds);
  }
  if (els.btnDownloadCalib) {
    els.btnDownloadCalib.addEventListener('click', downloadCalibrationV1);
  }
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
