import { FACTIONS } from '../core/factions.js';

/** Show a brief toast notification. Pass bad=true for error styling. */
export function toast(msg, bad) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.borderColor = bad ? '#c44' : '#b99b6a';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}

/** Brief visual pulse on the End Turn button. */
export function pulseEnd() {
  const b = document.getElementById('btnEndTurn');
  if (!b) return;
  b.style.transform = 'scale(1.05)';
  setTimeout(() => (b.style.transform = ''), 160);
}

/** Display the victory modal. */
export function showVictory(G) {
  if (!G || !G.winnerId) return;
  const w = G.champions.find((c) => c.id === G.winnerId);
  if (!w) return;
  const el = document.getElementById('victoryText');
  if (!el) return;
  el.innerHTML = `<span style="color:${FACTIONS[w.faction].color}">${w.name}</span><br><span style="font-size:16px;color:#5a3a22">${G.victoryReason}</span>`;
  document.getElementById('victoryModal').style.display = 'flex';
}