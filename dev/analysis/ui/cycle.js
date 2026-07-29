/**
 * cycle.js — Seed navigation and random map cycle for the analysis page.
 *
 * Provides seed stepping (prev/next), random seed generation, and
 * an auto-play cycle managed via play/pause controls with a speed slider.
 */
import { S } from '../state.js';
import { els } from '../domRefs.js';
import { generateSingleSeed } from '../generation/generate.js';
import { renderAndFit } from '../render/orchestrate.js';
import { updateStats } from '../stats/statsDisplay.js';
import { updateLegend } from '../legend/legend.js';
import { getArchetype } from '../../../src/game/rules/archetypes.js';

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
 * Parse the numeric suffix from a seed string (e.g. "glut-42" → prefix "glut-", width 2, value 42).
 * Returns null if the seed has no trailing number.
 */
function parseSeed(value) {
  const match = value.trim().match(/^(.*?)(\d+)$/);
  if (!match) return null;
  return { prefix: match[1], digits: match[2], width: match[2].length, value: parseInt(match[2], 10) };
}

/**
 * Step the seed by `delta`, preserving any zero-padding on the numeric suffix.
 * - "glut-42" +1 → "glut-43"
 * - "glut-009" +1 → "glut-010"  (padding preserved)
 * - "glut-0" -1  → "glut-0"     (floored at 0)
 * - "hello" +1   → "hello-1"    (appends -1 for non-numeric seeds)
 * - "hello" -1   → no-op        (no numeric component to decrement)
 */
function stepSeed(delta) {
  const value = els.seed.value.trim();
  const parsed = parseSeed(value);

  if (!parsed) {
    // Non-numeric seed: only step forward (append -1), backward does nothing
    if (delta > 0) {
      els.seed.value = value ? `${value}-1` : 'seed-1';
      generateFromCurrentSeed();
    }
    return;
  }

  const { prefix, width } = parsed;
  const current = parsed.value;
  const next = Math.max(0, current + delta);
  els.seed.value = prefix + String(next).padStart(width, '0');
  generateFromCurrentSeed();
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
