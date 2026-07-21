import { FACTIONS, beats } from '../game/rules/factionData.js';
import { paleySVG } from './paleySVG.js';

let selected = -1;
let mountId = 'paleyMount';

/**
 * Set the document-level cross-highlight data attribute.
 * This triggers CSS rules in paleyCrossHighlight.css to show
 * win/lose glow relationships on all .paley-item--fN elements.
 * Pass -1 to clear.
 */
export function setCrossHighlight(factionIdx) {
  if (factionIdx >= 0 && factionIdx < 7) {
    document.documentElement.dataset.crossHighlight = String(factionIdx);
  } else {
    delete document.documentElement.dataset.crossHighlight;
  }
}

/** Highlight a faction node on the Paley wheel, -1 to clear */
export function setHeptagramHighlight(factionIdx) {
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
  // Update circle size
  svg.querySelectorAll('circle').forEach(c => {
    const idx = parseInt(c.getAttribute('data-index'));
    const isSel = idx === factionIdx;
    c.setAttribute('r', isSel ? 17 : 14);
    c.setAttribute('stroke-width', isSel ? 2.5 : 1.6);
  });
}

/** Get current selected faction index */
export function getHeptagramHighlight() {
  return selected;
}

/** Initialize the Paley widget inside a given element */
export function initHeptagramWidget(elId = 'paleyMount') {
  mountId = elId;
  selected = -1;
  const mount = document.getElementById(mountId);
  if (!mount) return;
  mount.innerHTML = paleySVG(-1);
  // Wire hover handlers on heptagram nodes for cross-highlight
  const svg = mount.querySelector('svg');
  if (svg) {
    svg.querySelectorAll('.rt-heptagram-node').forEach(circle => {
      const idx = parseInt(circle.getAttribute('data-index'), 10);
      circle.addEventListener('mouseenter', () => setCrossHighlight(idx));
      circle.addEventListener('mouseleave', () => setCrossHighlight(-1));
    });
  }
}
