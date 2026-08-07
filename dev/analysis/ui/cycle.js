/**
 * cycle.js — Seed navigation and random map cycle for the analysis page.
 *
 * Provides seed stepping (prev/next), random seed generation, and
 * an auto-play cycle managed via play/pause controls with a speed slider.
 *
 * Seed stepping logic lives in ./seedStepper.js.
 */
import { S } from '../state.js';
import { els } from '../domRefs.js';
import { generateSingleSeed } from '../generation/generate.js';
import { renderAndFit } from '../render/orchestrate.js';
import { updateStats } from '../stats/statsDisplay.js';
import { updateLegend } from '../legend/legend.js';
import { getArchetype } from '../../../src/game/rules/archetypes.js';
import { computeStep } from './seedStepper.js';

// ─── Generation helpers ──────────────────────────────────────────────────────

/**
 * Read the current generation parameters from the UI and produce a
 * fully-generated, noise-enriched result.
 */
function doGenerate(seedText) {
  const radius = parseInt(els.radius.value, 10) || 21;
  const biomeId = els.biome.value;
  const biomeDef = getArchetype(biomeId) || getArchetype('biome_default');
  const multiBiome = els.multiBiomeCheck.checked;
  const result = generateSingleSeed(seedText, radius, biomeDef, { multiBiome });
  S.lastResult = result;
  els.headerSeed.textContent = seedText;
  els.headerRadius.textContent = String(radius);
}

/**
 * Generate a map from the seed currently in the input, update all display panels.
 * Stops the cycle if it was running.
 */
function generateFromCurrentSeed() {
  if (S.cycleOn) stopCycle();
  const seedText = els.seed.value || 'glut-17';
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

// ─── Seed stepping ───────────────────────────────────────────────────────────

/**
 * Step the seed by `delta`, delegating to seedStepper logic.
 */
function stepSeed(delta) {
  const value = els.seed.value.trim();
  const result = computeStep(value, delta);

  if (!result) return; // backward step on non-numeric seed — no-op

  els.seed.value = result.text;
  if (result.changed) {
    generateFromCurrentSeed();
  }
}

/**
 * Step to the next seed (increment).
 */
export function nextSeed() {
  stepSeed(1);
}

/**
 * Step to the previous seed (decrement).
 */
export function prevSeed() {
  stepSeed(-1);
}

// ─── Generate random seed ────────────────────────────────────────────────────

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

// ─── Cycle controls ─────────────────────────────────────────────────────────

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
