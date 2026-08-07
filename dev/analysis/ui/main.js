/**
 * main.js — UI controller for the headless map analysis page.
 *
 * Entry point for the analysis tool. Wires DOM controls to generation,
 * rendering, stats, legend, batch, and cycle modules.
 *
 * Batch analysis and download controls live in ./batchPanel.js.
 */
import { S } from '../state.js';
import { els, cacheDom } from '../domRefs.js';
import { generateSingleSeed } from '../generation/generate.js';
import { renderAndFit } from '../render/orchestrate.js';
import { updateLegend } from '../legend/legend.js';
import { updateStats } from '../stats/statsDisplay.js';
import { setupCanvasInteraction } from './canvas.js';
import { pickAndGenerateRandom, startCycle, stopCycle, nextSeed, prevSeed } from './cycle.js';
import { exportPng, exportJson } from './export.js';
import { getArchetype, listArchetypes } from '../../../src/game/rules/archetypes.js';
import '../../../src/game/rules/archetypeData/index.js'; // side-effect: populate registry
import { getGenerationOptions, bindBatchControls, runBatchAnalysis } from './batchPanel.js';

// ─── Generate and display ───────────────────────────────────────────────────

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
      els.headerSeed.textContent = seedText;
      els.headerRadius.textContent = String(radius);

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

// ─── Sync state from DOM ────────────────────────────────────────────────

/**
 * Sync runtime state from DOM elements that may have been restored by browser
 * form autofill or cached values on page refresh. Call before the first render.
 */
function syncStateFromDom() {
  S.viewMode = els.viewMode.value;
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

  // Radius presets — set the input and regenerate so the map matches
  const radiusPresets = [
    { btn: els.btnRadius7, radius: 7 },
    { btn: els.btnRadius21, radius: 21 },
    { btn: els.btnRadius35, radius: 35 },
    { btn: els.btnRadius77, radius: 77 },
  ];
  for (const { btn, radius } of radiusPresets) {
    if (!btn) continue;
    btn.addEventListener('click', () => {
      els.radius.value = radius;
      const seedText = els.seed.value || 'glut-17';
      loadAndDisplay(seedText);
    });
  }

  // Generate single seed
  els.btnGenerate.addEventListener('click', () => {
    const seedText = els.seed.value || 'glut-17';
    loadAndDisplay(seedText);
  });

  // Seed navigation (prev / next)
  if (els.btnPrevSeed) {
    els.btnPrevSeed.addEventListener('click', prevSeed);
  }
  if (els.btnNextSeed) {
    els.btnNextSeed.addEventListener('click', nextSeed);
  }

  // Entity toggles re-render
  const toggles = [
    els.toggleChamps, els.toggleMobs, els.toggleTraders,
    els.toggleBases, els.toggleFeatures,
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

  // Batch controls (delegated to batchPanel)
  bindBatchControls();
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  cacheDom();
  populateBiomes();
  syncStateFromDom();
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
