import { FACTIONS } from '../game/rules/factionData.js';
import { h } from './domBuilder.js';
import { svgIcon } from './svgIcon.js';
import { paleySVG } from './paleySVG.js';
import { BALANCED_3P, TRAIT_DESCS } from './setupConstants.js';
import { gameMode, roster } from './setupScreen.js';

// ─── Cross-highlight (lazy import to avoid circular deps) ───

let _crossHighlightFn = null;

function setCrossHighlight(idx) {
  if (!_crossHighlightFn) {
    import('./heptagramWidget.js').then(m => {
      _crossHighlightFn = m.setCrossHighlight;
      _crossHighlightFn(idx);
    });
    return;
  }
  _crossHighlightFn(idx);
}

// ─── Shared geometry ───

/**
 * Read the heptagram mount SVG and compute node positions.
 * Returns null if the SVG element is not found.
 */
function getHeptagramGeometry(mount) {
  const svg = mount.querySelector('svg');
  if (!svg) return null;
  const vb = (svg.getAttribute('viewBox') || '0 0 700 580').split(' ').map(Number);
  const cx = vb[2] / 2;
  const cy = vb[3] / 2 + 4;
  // Must match paleySVG's R calculation: Math.min(w, h) * 0.32
  const R = Math.min(vb[2], vb[3]) * 0.32;

  const positions = FACTIONS.map((f, i) => {
    const ang = -Math.PI / 2 + i * 2 * Math.PI / 7;
    return { x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R, i, f };
  });

  return { svg, cx: vb[2] / 2, cy: vb[3] / 2 + 4, R, positions };
}

// ─── Badge DOM ───

/**
 * Draw/redraw the faction badge nodes overlaid on the heptagram.
 */
export function drawNodes(container, positions) {
  container.replaceChildren();

  positions.forEach((pos) => {
    const idx = pos.i;
    const r = roster[idx];
    const isEnabled = r.enabled || gameMode === 7;
    const isSelected = r.enabled;
    const classes = ['setup-node', 'paley-item', 'paley-item--f' + idx];
    if (isSelected) classes.push('on');
    if (!isEnabled && gameMode === 3) classes.push('locked');

    // Build the trait description line with icon
    const traitDesc = TRAIT_DESCS[idx];
    const traitEl = h('div', { class: 'setup-node-trait' },
      svgIcon(traitDesc.icon, 11),
      ' ',
      traitDesc.text
    );

    const node = h('div', {
      class: classes.join(' '),
      dataAction: gameMode === 3 && !isEnabled ? null : 'toggleFaction',
      dataIdx: idx,
      style: { '--faction-color': r.color, '--faction-base': r.base },
      mouseenter: () => setCrossHighlight(idx),
      mouseleave: () => setCrossHighlight(-1),
    },
      // Controller toggle (small, at top-right of node)
      h('button', {
        class: 'setup-node-ctrl',
        dataAction: 'toggleController',
        dataIdx: idx,
        title: r.human ? 'Switch to Bot' : 'Switch to Human',
      }, r.human ? 'H' : 'B'),

      // Faction glyph
      h('div', { class: 'setup-node-glyph' }, svgIcon(r.glyphId, 22)),

      // Faction name
      h('div', { class: 'setup-node-name' }, r.name),

      // Trait icon + description
      traitEl,

      // Lock overlay (for 3P mode disabled factions)
      gameMode === 3 && !isEnabled
        ? h('div', { class: 'setup-node-lock' },
            svgIcon('i-cancel', 16)
          )
        : null
    );

    // Position the node at the heptagram coordinates
    node.style.position = 'absolute';
    node.style.left = (pos.x - 75) + 'px';
    node.style.top = (pos.y - 48) + 'px';
    container.appendChild(node);
  });
}

// ─── Build ───

/**
 * Build the heptagram SVG and overlay faction badges.
 */
export function buildHeptagram() {
  const mount = document.getElementById('setupHeptagramSVG');
  if (!mount) return;

  // Render the base heptagram SVG (lines + node circles)
  mount.innerHTML = paleySVG(-1, 700, 580);

  const geo = getHeptagramGeometry(mount);
  if (!geo) return;

  // Inject SVG circle hover handlers
  geo.svg.querySelectorAll('.rt-heptagram-node').forEach(circle => {
    const idx = parseInt(circle.getAttribute('data-index'), 10);
    circle.addEventListener('mouseenter', () => setCrossHighlight(idx));
    circle.addEventListener('mouseleave', () => setCrossHighlight(-1));
  });

  const nodesEl = document.getElementById('setupNodes');
  if (!nodesEl) return;
  drawNodes(nodesEl, geo.positions);
}

// ─── Refresh ───

/**
 * Refresh the setup UI after roster or mode changes.
 */
export function refreshSetup() {
  const nodesEl = document.getElementById('setupNodes');
  if (!nodesEl) return;

  const mount = document.getElementById('setupHeptagramSVG');
  if (!mount) return;
  const geo = getHeptagramGeometry(mount);
  if (!geo) return;

  drawNodes(nodesEl, geo.positions);
}

// ─── Balance algorithm ───

/**
 * Get the third faction for a balanced 3P triple.
 * Returns the faction ID, or -1 if not determined yet / invalid.
 */
export function getBalancedThird(a, b) {
  const key = a < b ? a * 7 + b : b * 7 + a;
  const valid = BALANCED_3P[key];
  if (!valid || valid.length === 0) return -1;
  // Return the first valid third (there should be exactly 1)
  return valid[0];
}
