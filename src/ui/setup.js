import { FACTIONS } from '../core/factions.js';

/**
 * Initialize the setup screen: faction roster, size pills, begin button.
 * Calls window.__beginGame(config) when the user clicks Begin (registered by app.js).
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
      const div = document.createElement('div');
      div.className = 'fopt' + (r.enabled ? ' on' : '');
      div.innerHTML = `<div class="fdot" style="background:${r.color}"></div>
        <div style="flex:1"><div style="font-weight:700;color:${r.color}">${r.glyph} ${r.name}</div><div style="font-size:11px;color:#6a4a2a">${r.trait}</div></div>
        <button class="fctrl" data-i="${idx}">${r.human ? 'Human' : 'Bot'}</button>`;
      div.onclick = (e) => {
        if (e.target.classList.contains('fctrl')) return;
        r.enabled = !r.enabled;
        draw();
      };
      fl.appendChild(div);
    });
    fl.querySelectorAll('.fctrl').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const ro = roster[+btn.dataset.i];
        ro.human = !ro.human;
        btn.textContent = ro.human ? 'Human' : 'Bot';
      };
    });
  }

  draw();

  document.getElementById('beginBtn')?.addEventListener('click', () => {
    const chosen = roster.filter((r) => r.enabled);
    if (chosen.length < 2) {
      alert('Choose at least 2 champions');
      return;
    }
    const sizeEl = document.querySelector('.size-pill.active');
    const radius = sizeEl ? parseInt(sizeEl.dataset.r) : 7;
    const relicTarget = parseInt(
      document.getElementById('relicTarget')?.value || '7',
      10
    );
    const lastStanding = document.getElementById('optLast')?.checked ?? true;

    // Fire the global callback registered by app.js
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

  document.querySelectorAll('.size-pill').forEach((p) => {
    p.addEventListener('click', () => {
      document.querySelectorAll('.size-pill').forEach((x) =>
        x.classList.remove('active')
      );
      p.classList.add('active');
    });
  });
}