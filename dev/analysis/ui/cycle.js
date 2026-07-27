/**
 * cycle.js — Random map cycle for the analysis page.
 *
 * Generates a random seed at regular intervals and updates the display.
 * Managed via play/pause controls and a speed slider.
 */
import { S } from '../state.js';
import { els } from '../domRefs.js';
import { generateSingleSeed } from '../generation/generate.js';
import { renderAndFit } from '../render/orchestrate.js';
import { updateStats } from '../stats/statsDisplay.js';
import { updateLegend } from '../legend/legend.js';
import { getArchetype } from '../../../src/game/rules/archetypes.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Read the current generation parameters from the UI and produce a
 * fully-generated, noise-enriched result.
 */
function doGenerate(seedText) {
  const radius = parseInt(els.radius.value, 10) || 21;
  const biomeId = els.biome.value;
  const biomeDef = getArchetype(biomeId) || getArchetype('biome_default');
  const multiBiome = els.multiBiomeCheck.checked;
  const mapSettings = {
    heightVariation: parseFloat(els.hvSlider.value),
    wateriness: parseFloat(els.wtSlider.value),
    mountainousness: parseFloat(els.mtSlider.value),
  };
  const result = generateSingleSeed(seedText, radius, biomeDef, mapSettings, { multiBiome });
  S.lastResult = result;
}

// ─── Generate random seed ─────────────────────────────────────────────────────

/**
 * Pick a random seed, generate a map, and update the full display.
 */
export function pickAndGenerateRandom() {
  const seedText = 'glut-' + Math.floor(Math.random() * 9999);
  els.seed.value = seedText;
  els.loading.classList.add('visible');
  els.loading.textContent = 'Generating...';
  setTimeout(() => {
    try {
      doGenerate(seedText);
      renderAndFit();
      updateStats();
      updateLegend(S.viewMode);
    } finally {
      els.loading.classList.remove('visible');
    }
  }, 10);
}

// ─── Cycle controls ───────────────────────────────────────────────────────────

/**
 * Start the random cycle timer.
 */
export function startCycle() {
  if (S.cycleIntervalId) return;
  S.cycleOn = true;
  const intervalMs = parseFloat(els.cycleSpeed.value) * 1000;
  S.cycleIntervalId = setInterval(pickAndGenerateRandom, intervalMs);
  els.btnCycleToggle.textContent = '⏸ Pause';
  els.btnCycleToggle.classList.add('playing');
}

/**
 * Stop the random cycle timer.
 */
export function stopCycle() {
  if (S.cycleIntervalId) {
    clearInterval(S.cycleIntervalId);
    S.cycleIntervalId = null;
  }
  S.cycleOn = false;
  els.btnCycleToggle.textContent = '▶ Play';
  els.btnCycleToggle.classList.remove('playing');
}

/**
 * Restart the cycle timer (e.g. after a speed change).
 */
export function restartCycle() {
  stopCycle();
  if (S.cycleOn) startCycle();
}
