import { FACTIONS } from '../core/factions.js';
import { h } from './utils/dom.js';
import { registerAction } from './actionBus.js';
import { toast } from './hud.js';

/**
 * Initialize the setup screen: faction roster, size pills, begin button.
 * Uses data-action delegation via actionBus.js for all interactions.
 */
export function initSetup() {
  const fl = document.getElementById('factionList');
  if (!fl) return; // not on setup page

  // Build roster — no duplicate `controller` field; derived at begin time.
  const roster = FACTIONS.map((f, i) => ({
    ...f,
    enabled: i < 4,
    human: i === 0,
  }));

  function draw() {
    fl.replaceChildren();
    roster.forEach((r, idx) => {
      const btnLabel = r.human ? 'Human' : 'Bot';
      const el = h(
        'div',
        {
          class: 'fopt paley-item paley-item--f' + idx + (r.enabled ? ' on' : ''),
          dataAction: 'toggleFaction',
          dataIdx: idx,
          style: { '--faction-color': r.color },
        },
        h('div', { class: 'fdot' }),
        h('div', { class: 'faction-info' },
          h('div', { class: 'faction-name' }, `${r.glyph} ${r.name}`),
          h('div', { class: 'faction-trait' }, r.trait)
        ),
        h('button', { class: 'fctrl', dataAction: 'toggleController', dataIdx: idx }, btnLabel)
      );
      fl.appendChild(el);
    });
  }

  draw();

  // ---- Delegated actions ----

  registerAction('toggleFaction', (el) => {
    const idx = parseInt(el.dataset.idx, 10);
    roster[idx].enabled = !roster[idx].enabled;
    draw();
  });

  registerAction('toggleController', (el) => {
    const idx = parseInt(el.dataset.idx, 10);
    roster[idx].human = !roster[idx].human;
    draw();
  });

  registerAction('selectSize', (el) => {
    document.querySelectorAll('.size-pill').forEach((x) =>
      x.classList.remove('active')
    );
    el.classList.add('active');
  });

  registerAction('beginGame', () => {
    const chosen = roster.filter((r) => r.enabled);
    if (chosen.length < 2) {
      toast('Choose at least 2 champions', true);
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
        // Derive controller from `human` — no duplicate field on roster.
        champions: chosen.map((c) => ({
          faction: c.id,
          controller: c.human ? 'human' : 'bot',
        })),
        objectives: { relicRace: true, relicTarget, lastStanding },
      });
    }
  });
}