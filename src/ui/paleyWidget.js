import { FACTIONS, beats } from '../core/factions.js';
import { paleySVG } from '../render/paley.js';

let highlighted = -1;
let mountId = 'paleyMount';

/** Highlight a faction node on the Paley wheel, -1 to clear */
export function setPaleyHighlight(factionIdx) {
  highlighted = factionIdx;
  const mount = document.getElementById(mountId);
  if (!mount) return;
  mount.innerHTML = paleySVG(factionIdx);
  _wire();
}

/** Get current highlighted faction index */
export function getPaleyHighlight() {
  return highlighted;
}

/** Initialize the Paley widget inside a given element */
export function initPaleyWidget(elId = 'paleyMount') {
  mountId = elId;
  highlighted = -1;
  const mount = document.getElementById(mountId);
  if (!mount) return;
  mount.innerHTML = paleySVG(-1);
  _wire();
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
