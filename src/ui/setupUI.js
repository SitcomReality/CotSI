import { FACTIONS } from '../core/factions.js';
import { h } from './utils/dom.js';
import { registerAction } from './actionBus.js';

/**
 * Initialize the setup screen: faction roster, size pills, begin button.
 * Uses data-action delegation via actionBus.js for all faction interactions.
 */
export function initSetup() {
  const fl = document.getElementById('factionList');
  if (!fl) return; // not on setup page

  const roster = FACTIONS.map((f, i) => ({
    ...f,
    enabled: i < 4,
    human: i === 0,
    controller: i === 0 ? 'human' : 'bot',
  }));

  function draw() {
    fl.innerHTML = '';
    roster.forEach((r, idx) => {
      const btnLabel = r.human ? 'Human' : 'Bot';
      const el = h(
        'div',
        { class: 'fopt' + (r.enabled ? ' on' : ''), dataAction: 'toggleFaction', dataIdx: idx },
        h('div', { class: 'fdot', style: { background: r.color } }),
        h('div', { style: { flex: '1' } },
          h('div', { style: { fontWeight: '700', color: r.color } }, `${r.glyph} ${r.name}`),
          h('div', { style: { fontSize: '11px', color: '#6a4a2a' } }, r.trait)
        ),
        h('button', { class: 'fctrl', dataAction: 'toggleController', dataIdx: idx }, btnLabel)
      );
      fl.appendChild(el);
    });
  }

  draw();

  // Register delegated actions
  registerAction('toggleFaction', (el) => {
    const idx = parseInt(el.dataset.idx, 10);
    roster[idx].enabled = !roster[idx].enabled;
    draw();
  });

  registerAction('toggleController', (el) => {
    const idx = parseInt(el.dataset.idx, 10);
    roster[idx].human = !roster[idx].human;
    // update controller field to match
    roster[idx].controller = roster[idx].human ? 'human' : 'bot';
    draw();
  });

  // Set data-action on begin button (can also be set directly in HTML)
  const beginBtn = document.getElementById('beginBtn');
  if (beginBtn) {
    beginBtn.setAttribute('data-action', 'beginGame');
  }

  registerAction('beginGame', () => {
    const chosen = roster.filter((r) => r.enabled);
    if (chosen.length < 2) {
      alert('Choose at least 2 champions');
      return;
    }
    const sizeEl = document.querySelector('.size-pill.active');
    const radius = sizeEl ? parseInt(sizeEl.dataset.r, 10) : 7;
    const relicTarget = parseInt(
      document.getElementById('relicTarget')?.value || '7',
      10
    );
    const lastStanding = document.getElementById('optLast')?.checked ?? true;

    if (window.__beginGame) {
      window.__beginGame({
        seed:
          document.getElementById('seedInput')?.value ||
          'glut-' + Math.floor(Math.random() * 999),
        radius,
        champions: chosen.map((c) => ({
          faction: c.id,
          controller: c.human ? 'human' : 'bot',
        })),
        objectives: { relicRace: true, relicTarget, lastStanding },
      });
    }
  });

  // Size pills – kept as-is for now (not part of step 1 refactor)
  document.querySelectorAll('.size-pill').forEach((p) => {
    p.addEventListener('click', () => {
      document.querySelectorAll('.size-pill').forEach((x) =>
        x.classList.remove('active')
      );
      p.classList.add('active');
    });
  });
}