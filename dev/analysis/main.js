/**
 * main.js — UI controller for the headless map analysis page.
 *
 * Wires DOM controls to generation, rendering, stats, and multi-seed analysis.
 */
import { generateTiles } from '../../src/game/rules/terrainGenerator.js';
import { makeRng } from '../../src/engine/rules/seededRng.js';
import { getArchetype, listArchetypes } from '../../src/game/rules/archetypes.js';
import '../../src/game/rules/archetypeData/index.js'; // side-effect: populate registry
import { createChampions } from '../../src/game/state/championFactory.js';
import { createMobs, createTraders } from '../../src/game/state/entityFactory.js';
import { TERRAIN } from '../../src/game/rules/terrainTypes.js';
import { coordKey } from '../../src/engine/rules/hexGrid.js';
import { createCamera, fitCameraToRadius, screenToWorld, renderMap } from './renderer.js';
import {
  terrainDistribution,
  featureCounts,
  debrisCounts,
  mountainAnalysis,
  waterAnalysis,
  entityStats,
  traderAnalysis,
} from './stats.js';
import { runMultiSeed } from './multiSeed.js';

// ─── Default config ──────────────────────────────────────────────────────────

const DEFAULT_CHAMPIONS = [
  { faction: 0 }, { faction: 1 }, { faction: 2 },
  { faction: 3 }, { faction: 4 }, { faction: 5 }, { faction: 6 },
];

// ─── State ───────────────────────────────────────────────────────────────────

let lastResult = null; // { tiles, champions, mobs, traders, baseKeys, biomeDef }
let camera = createCamera();
let canvasEl, ctx;

// ─── DOM refs ────────────────────────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

const els = {};

function cacheDom() {
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
  els.multiCount = $('multi-count');
  els.btnMultiGenerate = $('btn-multi-generate');
  els.btnExportPng = $('btn-export-png');
  els.btnExportJson = $('btn-export-json');
  els.statsPanel = $('stats-panel');
  els.loading = $('loading');
  els.mapArea = $('map-area');
  canvasEl = $('map-canvas');
}

// ─── Generation ──────────────────────────────────────────────────────────────

function getMapSettings() {
  return {
    heightVariation: parseFloat(els.hvSlider.value),
    wateriness: parseFloat(els.wtSlider.value),
    mountainousness: parseFloat(els.mtSlider.value),
  };
}

function getOptions() {
  return {
    showChampions: els.toggleChamps.checked,
    showMobs: els.toggleMobs.checked,
    showTraders: els.toggleTraders.checked,
    showBases: els.toggleBases.checked,
    showFeatures: els.toggleFeatures.checked,
    showDebris: els.toggleDebris.checked,
    palette: lastResult?.biomeDef?.palette || null,
  };
}

function generateSingleSeed(seedText) {
  const radius = parseInt(els.radius.value, 10) || 21;
  const biomeId = els.biome.value;
  const biomeDef = getArchetype(biomeId) || getArchetype('biome_default');
  const mapSettings = getMapSettings();

  const tiles = generateTiles(seedText, radius, biomeDef, mapSettings);
  const rng = makeRng(seedText);
  const rand = () => rng();

  const { champions, used } = createChampions({
    tiles, champions: DEFAULT_CHAMPIONS, rand, radius,
  });

  const baseKeys = new Set();
  for (const key of Object.keys(tiles)) {
    if (tiles[key].feature?.kind === 'base') baseKeys.add(key);
  }

  const mobs = createMobs({ tiles, rand, used, radius });
  const traders = createTraders({ tiles, rand, used, champions });

  lastResult = { tiles, champions, mobs, traders, baseKeys, biomeDef, radius, seed: seedText };
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function resizeCanvas() {
  const rect = els.mapArea.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvasEl.width = rect.width * dpr;
  canvasEl.height = rect.height * dpr;
  canvasEl.style.width = rect.width + 'px';
  canvasEl.style.height = rect.height + 'px';
  ctx = canvasEl.getContext('2d');
  return { w: rect.width, h: rect.height, dpr };
}

function render() {
  if (!lastResult || !ctx) return;
  const { w, h, dpr } = resizeCanvas();
  const { tiles, champions, mobs, traders } = lastResult;
  const options = getOptions();
  renderMap(ctx, tiles, { champions, mobs, traders }, camera, options, w, h, dpr);
}

function renderAndFit() {
  if (!lastResult) return;
  const { w, h, dpr } = resizeCanvas();
  fitCameraToRadius(camera, lastResult.radius, w, h);
  render();
}

// ─── Stats display ───────────────────────────────────────────────────────────

function formatStats() {
  if (!lastResult) return 'No map generated yet.';

  const { tiles, champions, mobs, traders, baseKeys, radius, seed, biomeDef } = lastResult;

  const terrainStats = terrainDistribution(tiles);
  const featCounts = featureCounts(tiles);
  const debCounts = debrisCounts(tiles);
  const mtStats = mountainAnalysis(tiles);
  const wtStats = waterAnalysis(tiles);
  const entStats = entityStats(champions, mobs, traders);
  const traderPositions = traderAnalysis(tiles, traders, baseKeys);

  const lines = [];
  lines.push(`Seed: ${seed}  |  Radius: ${radius}  |  Biome: ${biomeDef?.name || 'default'}`);
  lines.push(`Tiles: ${terrainStats.total}`);
  lines.push('');

  // Terrain distribution
  lines.push('Terrain:');
  for (const [t, d] of Object.entries(terrainStats.dist)) {
    const label = (TERRAIN[t]?.label || t).padEnd(12);
    const bar = '█'.repeat(Math.round(parseFloat(d.pct) / 2));
    lines.push(`  ${label} ${String(d.count).padStart(5)}  ${String(d.pct).padStart(5)}%  ${bar}`);
  }

  lines.push('');
  lines.push(`Features:  trees=${featCounts.trees}  knots=${featCounts.knots}  bases=${featCounts.bases}`);
  lines.push(`Debris:    tufts=${debCounts.tufts}  rocks=${debCounts.rocks}  flowers=${debCounts.flowers}`);
  lines.push(`Mountains: total=${mtStats.total}  peaks=${mtStats.peaks}  slopes=${mtStats.slopes}  isolated=${mtStats.isolated}`);
  lines.push(`Water:     total=${wtStats.total}  lakes=${wtStats.lakes}  oceans=${wtStats.oceans}`);
  lines.push('');

  // Entities
  lines.push(`Entities:  champions=${entStats.champions}  mobs=${entStats.mobs}  traders=${entStats.traders}`);
  if (traderPositions.length > 0) {
    lines.push('Trader positions:');
    for (const tp of traderPositions) {
      lines.push(`  (${tp.pos.q}, ${tp.pos.r})  center dist=${tp.distToCenter}  nearest base=${tp.minBaseDist ?? 'N/A'}`);
    }
  }

  return lines.join('\n');
}

function updateStats() {
  els.statsPanel.textContent = formatStats();
}

// ─── Multi-seed ──────────────────────────────────────────────────────────────

function formatMultiStats(result) {
  const { aggregate, traderHeatmap } = result;
  const lines = [];

  lines.push(`=== Multi-Seed Report ===`);
  lines.push(`Seeds: ${aggregate.seedCount}  |  Radius: ${aggregate.radius}  |  Base seed: ${aggregate.baseSeed}`);
  lines.push('');

  lines.push('Terrain distribution (mean % ± stddev):');
  for (const [t, d] of Object.entries(aggregate.terrain)) {
    const label = (TERRAIN[t]?.label || t).padEnd(12);
    lines.push(`  ${label} ${d.mean.padStart(5)}%  ±${d.stddev.padStart(5)}  (min ${d.min}%, max ${d.max}%)`);
  }

  lines.push('');
  lines.push('Trader position heatmap (top 15 hexes by seed count):');
  const sorted = [...traderHeatmap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  for (const [key, count] of sorted) {
    const pct = ((count / aggregate.seedCount) * 100).toFixed(1);
    lines.push(`  ${key.padStart(8)}  ${count}/${aggregate.seedCount}  (${pct}%)`);
  }

  return lines.join('\n');
}

async function doMultiSeedGenerate() {
  const baseSeed = els.seed.value || 'glut-17';
  const count = parseInt(els.multiCount.value, 10) || 50;
  const radius = parseInt(els.radius.value, 10) || 21;
  const biomeId = els.biome.value;
  const biomeDef = getArchetype(biomeId) || getArchetype('biome_default');
  const mapSettings = getMapSettings();

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
      onProgress: (current, total) => {
        els.loading.textContent = `Generating ${current} / ${total}...`;
      },
    });

    // Generate the last seed for the map display
    const lastSeedText = `${baseSeed}-${count - 1}`;
    generateSingleSeed(lastSeedText);
    renderAndFit();
    updateStats();

    // Show multi-seed report inline
    els.statsPanel.textContent += '\n\n' + formatMultiStats(result);
  } finally {
    els.loading.classList.remove('visible');
    els.btnMultiGenerate.disabled = false;
  }
}

// ─── Canvas interaction ──────────────────────────────────────────────────────

let isDragging = false;
let dragStart = { x: 0, y: 0 };
let dragCameraStart = { x: 0, y: 0 };

function setupCanvasInteraction() {
  els.mapArea.addEventListener('wheel', (e) => {
    e.preventDefault();
    const { w, h } = resizeCanvas();
    const worldBefore = screenToWorld(camera, e.offsetX, e.offsetY, w, h);
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    camera.zoom = Math.max(0.1, Math.min(10, camera.zoom * factor));
    // Zoom toward cursor
    const worldAfter = screenToWorld(camera, e.offsetX, e.offsetY, w, h);
    camera.x += worldBefore.x - worldAfter.x;
    camera.y += worldBefore.y - worldAfter.y;
    render();
  }, { passive: false });

  els.mapArea.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
    dragCameraStart = { x: camera.x, y: camera.y };
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = (e.clientX - dragStart.x) / camera.zoom;
    const dy = (e.clientY - dragStart.y) / camera.zoom;
    camera.x = dragCameraStart.x + dx;
    camera.y = dragCameraStart.y + dy;
    render();
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  window.addEventListener('resize', () => {
    renderAndFit();
  });
}

// ─── Export ──────────────────────────────────────────────────────────────────

function exportPng() {
  if (!canvasEl) return;
  // Render at current resolution
  render();
  canvasEl.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cotsi-map-${lastResult?.seed || 'export'}.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

function exportJson() {
  if (!lastResult) return;
  const { tiles, champions, mobs, traders, seed, radius } = lastResult;
  const data = { seed, radius, tiles, champions, mobs, traders };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cotsi-data-${seed}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Init ────────────────────────────────────────────────────────────────────

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
    els.loading.classList.add('visible');
    els.loading.textContent = 'Generating...';

    // Use setTimeout to let the loading indicator paint
    setTimeout(() => {
      try {
        generateSingleSeed(seedText);
        renderAndFit();
        updateStats();
      } finally {
        els.loading.classList.remove('visible');
      }
    }, 10);
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
    if (toggle) toggle.addEventListener('change', render);
  }

  // Export
  els.btnExportPng.addEventListener('click', exportPng);
  els.btnExportJson.addEventListener('click', exportJson);
}

function init() {
  cacheDom();
  populateBiomes();
  bindControls();
  setupCanvasInteraction();

  // Generate default map on load
  els.seed.value = 'glut-17';
  generateSingleSeed('glut-17');
  renderAndFit();
  updateStats();
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
