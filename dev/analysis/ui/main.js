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

  els.loading.classList.add('visible');
  els.loading.textContent = `Generating 0 / ${count}...`;
  els.btnMultiGenerate.disabled = true;

  try {
    const result = await runMultiSeed({
      baseSeed,
      count,
      radius,
      biomeDef,
      mapSettings,
      multiBiome: genOptions.multiBiome,
      onProgress: (current, total) => {
        els.loading.textContent = `Generating ${current} / ${total}...`;
      },
    });

    // Generate the last seed for the map display
    const lastSeedText = `${baseSeed}-${count - 1}`;
    const displayResult = generateSingleSeed(lastSeedText, radius, biomeDef, mapSettings, genOptions);
    enrichWithNoise(displayResult.tiles, lastSeedText);
    S.lastResult = displayResult;
    renderAndFit();
    updateStats();
    updateLegend(S.viewMode);

    // Show multi-seed report inline
    els.statsPanel.textContent += '\n\n' + formatMultiStats(result);
  } finally {
    els.loading.classList.remove('visible');
    els.btnMultiGenerate.disabled = false;
  }
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
