import { FACTIONS, beats } from '../core/factions.js';
import { paleySVG } from '../render/heptagramSVG.js';

let highlighted = -1;
let selected = -1;
let mountId = 'paleyMount';

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
export function getHeptagramHighlight() {
  return Math.max(highlighted, selected);
}

function _bindHover(mount) {
  const svg = mount.querySelector('svg');
  if (!svg) return;

  // Clear previous highlight state
  highlighted = -1;

  const onOver = (e) => {
    const circle = e.target.closest('circle[data-index]');
    if (!circle) return;
    const idx = parseInt(circle.getAttribute('data-index'));
    if (idx === highlighted) return;
    // Clear previous beat classes from all lines
    if (highlighted >= 0) {
      svg.querySelectorAll('.rt-heptagram-line.rt-beats-win, .rt-heptagram-line.rt-beats-lose')
        .forEach(el => el.classList.remove('rt-beats-win', 'rt-beats-lose'));
    }
    // Add beat-based classes to connected lines
    svg.querySelectorAll(`line[data-from="${idx}"], line[data-to="${idx}"]`).forEach(el => {
      const from = parseInt(el.getAttribute('data-from'));
      const to = parseInt(el.getAttribute('data-to'));
      const other = (from === idx) ? to : from;
      el.classList.add(beats(idx, other) ? 'rt-beats-win' : 'rt-beats-lose');
    });
    highlighted = idx;
    if (typeof window._onPaleyHover === 'function') {
      window._onPaleyHover(idx);
    }
  };

  const onLeave = () => {
    if (highlighted >= 0) {
      svg.querySelectorAll('.rt-heptagram-line.rt-beats-win, .rt-heptagram-line.rt-beats-lose')
        .forEach(el => el.classList.remove('rt-beats-win', 'rt-beats-lose'));
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
export function initHeptagramWidget(elId = 'paleyMount') {
  mountId = elId;
  highlighted = -1;
  selected = -1;
  const mount = document.getElementById(mountId);
  if (!mount) return;
  mount.innerHTML = paleySVG(-1);
  _bindHover(mount);
}

// Attach to window for script-based main.js
window.setHeptagramHighlight = setHeptagramHighlight;
window.getHeptagramHighlight = getHeptagramHighlight;
window.initHeptagramWidget = initHeptagramWidget;