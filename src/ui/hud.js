import { FACTIONS } from '../core/factions.js';
import { h } from './utils/dom.js';

/** Show a brief toast notification. Pass bad=true for error styling. */
export function toast(msg, bad) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  if (bad) {
    t.classList.add('toast--bad');
  } else {
    t.classList.remove('toast--bad');
  }
  t.classList.add('show');
  setTimeout(() => {
    t.classList.remove('show');
    t.classList.remove('toast--bad');
  }, 1800);
}

/** Brief visual pulse on the End Turn button (in the left champion card). */
export function pulseEnd() {
  const b = document.querySelector('.left-endturn-btn');
  if (!b) return;
  b.classList.add('is-pulsing');
  setTimeout(() => b.classList.remove('is-pulsing'), 160);
}

/** Display the victory modal. */
export function showVictory(G) {
  if (!G || !G.winnerId) return;
  const w = G.champions.find((c) => c.id === G.winnerId);
  if (!w) return;
  const el = document.getElementById('victoryText');
  if (!el) return;

  const faction = FACTIONS[w.faction];
  el.textContent = '';

  const nameSpan = h('span', {
    class: 'victory-name',
    style: { '--faction-color': faction.color }
  }, w.name);

  const subSpan = h('span', { class: 'victory-sub' }, G.victoryReason);

  el.appendChild(nameSpan);
  el.appendChild(subSpan);

  document.getElementById('victoryModal').style.display = 'flex';
}