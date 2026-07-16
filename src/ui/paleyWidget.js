import { FACTIONS, beats } from '../core/factions.js';
import { paleySVG } from '../render/paley.js';

let highlighted = -1;
let selected = -1;
let mountId = 'paleyMount';

/** Highlight a faction node on the Paley wheel, -1 to clear */
export function setPaleyHighlight(factionIdx) {
  selected = factionIdx;
  const mount = document.getElementById(mountId);
  if (!mount) return;
  const svg = mount.querySelector('svg');
  if (!svg) return;
  // Remove existing selected class
  svg.querySelectorAll('.rt-heptagram-line.selected').forEach(el => el.classList.remove('selected'));
  if (factionIdx >= 0) {
    svg.querySelectorAll(`line[data-from="${factionIdx}"], line[data-to="${factionIdx}"]`).forEach(el => el.classList.add('selected'));
  }
  // Update circle size – simple approach: toggle r attribute
  svg.querySelectorAll('circle').forEach(c => {
    const idx = parseInt(c.getAttribute('data-index'));
    const isSel = idx === factionIdx;
    c.setAttribute('r', isSel ? 17 : 14);
    c.setAttribute('stroke-width', isSel ? 2.5 : 1.6);
  });
  if (typeof window._onPaleyHover === 'function') {
    window._onPaleyHover(factionIdx);
  }
}

/** Get current highlighted faction index */
export function getPaleyHighlight() {
  return Math.max(highlighted, selected);
}

function _bindHover(mount) {
  const svg = mount.querySelector('svg');
  if (!svg) return;

  // Remove any old listeners by replacing SVG (since we can't easily remove anonymous listeners)
  // Simple: we'll just not clone; we'll rely on event delegation on mount.
  // Clear previous highlight state
  highlighted = -1;

  // Use event delegation on the SVG
  const onOver = (e) => {
    const circle = e.target.closest('circle[data-index]');
    if (!circle) return;
    const idx = parseInt(circle.getAttribute('data-index'));
    if (idx === highlighted) return;
    // Clear previous highlight
    if (highlighted >= 0) {
      svg.querySelectorAll('.rt-heptagram-line.rt-highlight').forEach(el => el.classList.remove('rt-highlight'));
    }
    // Add new highlight
    svg.querySelectorAll(`line[data-from="${idx}"], line[data-to="${idx}"]`).forEach(el => el.classList.add('rt-highlight'));
    highlighted = idx;
    if (typeof window._onPaleyHover === 'function') {
      window._onPaleyHover(idx);
    }
  };

  const onLeave = () => {
    if (highlighted >= 0) {
      svg.querySelectorAll('.rt-heptagram-line.rt-highlight').forEach(el => el.classList.remove('rt-highlight'));
      highlighted = -1;
      if (typeof window._onPaleyHover === 'function') {
        window._onPaleyHover(-1);
      }
    }
  };

  svg.addEventListener('mouseover', onOver);
  svg.addEventListener('mouseleave', onLeave);

  // Store so we can remove later if needed
  svg._paleyOver = onOver;
  svg._paleyLeave = onLeave;
}

/** Initialize the Paley widget inside a given element */
export function initPaleyWidget(elId = 'paleyMount') {
  mountId = elId;
  highlighted = -1;
  selected = -1;
  const mount = document.getElementById(mountId);
  if (!mount) return;
  mount.innerHTML = paleySVG(-1);
  _bindHover(mount);
}

// Attach to window for script-based main.js
window.setPaleyHighlight = setPaleyHighlight;
window.getPaleyHighlight = getPaleyHighlight;
window.initPaleyWidget = initPaleyWidget;

function _wire() {
  const mount = document.getElementById(mountId);
  if (!mount) return;
  const svg = mount.querySelector('svg');
  if (!svg) return;

  // Remove existing listeners by cloning
  const newSvg = svg.cloneNode(true);
  svg.parentNode.replaceChild(newSvg, svg);

  newSvg.addEventListener('mousemove', e => {
    const r = newSvg.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * 300;
    const y = (e.clientY - r.top) / r.height * 250;
    const nodes = FACTIONS.map((_, i) => {
      const ang = -Math.PI / 2 + i * 2 * Math.PI / 7;
      return { i, nx: 150 + Math.cos(ang) * 94, ny: 129 + Math.sin(ang) * 94 };
    });
    let best = -1, bd = 22;
    nodes.forEach(n => { const d = Math.hypot(n.nx - x, n.ny - y); if (d < bd) { bd = d; best = n.i; } });
    if (best !== highlighted) {
      highlighted = best;
      mount.innerHTML = paleySVG(best);
      _wire();
      // Also update combat token hover if applicable
      if (typeof window._onPaleyHover === 'function') {
        window._onPaleyHover(best);
      }
    }
  });

  newSvg.addEventListener('mouseleave', () => {
    if (highlighted !== -1) {
      highlighted = -1;
      mount.innerHTML = paleySVG(-1);
      _wire();
      if (typeof window._onPaleyHover === 'function') {
        window._onPaleyHover(-1);
      }
    }
  });
}
