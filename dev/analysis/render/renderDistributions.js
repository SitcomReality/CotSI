/**
 * renderDistributions.js — Histogram chart rendering for the analysis page.
 *
 * Draws 4 histogram panels (elevation, moisture, temperature, slope)
 * on the map canvas in a 2×2 grid. Each panel shows a 50-bin bar chart
 * with overlaid threshold lines from current terrain defaults.
 *
 * Pure rendering — reads noise config and seed from DOM, no state mutation.
 */
import { collectHistograms } from '../generation/histograms.js';
import { NOISE_CONFIG } from '../generation/noiseConfig.js';
import { els } from '../domRefs.js';

// ── Threshold definitions for overlay lines ────────────────────────────────

const THRESHOLD_LINES = {
  elevation: [
    { value: 0.07,  label: 'water',  color: '#5f9ac1' },
    { value: 0.905, label: 'mtn',    color: '#877c6a' },
    { value: 0.96,  label: 'peak',   color: '#b0b8c8' },
    { value: 0.985, label: 'float',  color: '#c0d8e8' },
  ],
  moisture: [
    { value: 0.20, label: 'desert', color: '#d6b15b' },
    { value: 0.58, label: 'marsh',  color: '#819966' },
    { value: 0.72, label: 'forest', color: '#4b8e41' },
    { value: 0.85, label: 'dense',  color: '#2d6b23' },
  ],
  temperature: [],
  slope: [],
};

const PANEL_LAYOUT = [
  { key: 'elevHist',  label: 'Elevation',    lines: THRESHOLD_LINES.elevation },
  { key: 'moistHist', label: 'Moisture',     lines: THRESHOLD_LINES.moisture },
  { key: 'tempHist',  label: 'Temperature',  lines: THRESHOLD_LINES.temperature },
  { key: 'slopeHist', label: 'Slope',        lines: THRESHOLD_LINES.slope },
];

const BINS = 50;

// ── Rendering constants ─────────────────────────────────────────────────────

const PADDING = { top: 28, right: 16, bottom: 22, left: 8 };
const PANEL_GAP = 12;
const BAR_COLOR = '#7ea8c4';
const BAR_COLOR_PEAK = '#c47e7e';
const GRID_COLOR = 'rgba(255,255,255,0.12)';
const TEXT_COLOR = '#ccc';
const LINE_LABEL_COLOR = '#fff';

/**
 * Render distribution histograms on the canvas.
 * Called from orchestrate.js when viewMode === 'distributions'.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} canvasW - Canvas CSS width
 * @param {number} canvasH - Canvas CSS height
 * @param {number} dpr      - Device pixel ratio
 */
export function renderDistributions(ctx, canvasW, canvasH, dpr) {
  const seedText = els.seed?.value || 'glut-17';
  const radius = parseInt(els.radius?.value, 10) || 21;

  let hists;
  try {
    hists = collectHistograms(seedText, radius, NOISE_CONFIG);
  } catch {
    ctx.fillStyle = '#c44';
    ctx.font = '14px monospace';
    ctx.fillText('Histogram collection failed — check console for errors.', 20, 40);
    return;
  }

  // 2×2 grid
  const cols = 2;
  const rows = 2;
  const panelW = (canvasW - PADDING.left - PADDING.right - PANEL_GAP) / cols;
  const panelH = (canvasH - PADDING.top - PADDING.bottom - PANEL_GAP) / rows;

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.textBaseline = 'top';
  ctx.font = '11px monospace';

  for (let i = 0; i < PANEL_LAYOUT.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const px = PADDING.left + col * (panelW + PANEL_GAP);
    const py = PADDING.top + row * (panelH + PANEL_GAP);

    drawPanel(ctx, px, py, panelW, panelH, PANEL_LAYOUT[i], hists);
  }

  ctx.restore();
}

function drawPanel(ctx, px, py, w, h, panel, hists) {
  const hist = hists[panel.key];
  if (!hist) return;

  const maxCount = Math.max(1, ...hist);
  const chartX = px;
  const chartY = py + 20;
  const chartW = w;
  const chartH = h - 20;

  // Title
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = '12px monospace';
  ctx.fillText(panel.label, px, py);

  // Grid lines (horizontal)
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5;
  for (let g = 0; g <= 4; g++) {
    const gy = chartY + (chartH * g) / 4;
    ctx.beginPath();
    ctx.moveTo(chartX, gy);
    ctx.lineTo(chartX + chartW, gy);
    ctx.stroke();

    // Y-axis labels
    const pct = 100 - (g * 25);
    ctx.fillStyle = TEXT_COLOR;
    ctx.fillText(`${pct}%`, chartX - 30, gy - 6);
  }

  // Bars
  const barW = chartW / BINS;
  for (let b = 0; b < BINS; b++) {
    const barH = (hist[b] / maxCount) * chartH;
    const bx = chartX + b * barW;
    const by = chartY + chartH - barH;

    // Highlight bins above 75th percentile
    const isHigh = b / BINS > 0.75;
    ctx.fillStyle = isHigh ? BAR_COLOR_PEAK : BAR_COLOR;
    ctx.fillRect(bx, by, Math.max(1, barW - 1), barH);
  }

  // Threshold lines
  if (panel.lines && panel.lines.length > 0) {
    for (const line of panel.lines) {
      const lx = chartX + line.value * chartW;
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(lx, chartY);
      ctx.lineTo(lx, chartY + chartH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label above the line
      ctx.fillStyle = line.color;
      ctx.font = '9px monospace';
      ctx.fillText(line.label, lx + 2, chartY);
    }
  }

  // X-axis: 0.0, 0.5, 1.0
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = '10px monospace';
  ctx.textBaseline = 'top';
  ctx.fillText('0.0', chartX, chartY + chartH + 4);
  ctx.fillText('0.5', chartX + chartW / 2 - 10, chartY + chartH + 4);
  ctx.fillText('1.0', chartX + chartW - 20, chartY + chartH + 4);
}
