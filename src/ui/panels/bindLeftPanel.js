import { championVM } from '../viewModels/championVM.js';
import { currentChamp } from '../../game/session/liveGame.js';
import { FACTIONS } from '../../core/factions.js';
import { h } from '../utils/dom.js';

export function bindLeftPanel(G) {
  const el = document.getElementById('championCard');
  if (!el) return;

  const card = el.querySelector('.left-champion-card');
  if (!card) return;

  const ch = currentChamp();

  // Null-champ guard: fill data-ui fields with placeholder dashes,
  // do NOT use el.textContent = … which would destroy the skeleton.
  if (!ch) {
    card.style.removeProperty('--faction-color');
    card.style.removeProperty('--champ-hp-pct');
    card.querySelectorAll('[data-ui]').forEach(n => { n.textContent = '--'; });
    const bars = card.querySelector('.left-potency-bars');
    if (bars) bars.replaceChildren();
    return;
  }

  const vm = championVM(G, ch);

  // CSS custom properties on the card element
  card.style.setProperty('--faction-color', vm.factionColor);
  card.style.setProperty('--champ-hp-pct', vm.hpPct); // unitless number

  // Helper: set textContent on a data-ui element
  const set = (sel, val) => {
    const n = card.querySelector(`[data-ui="${sel}"]`);
    if (n) n.textContent = val;
  };

  set('name', vm.name);
  set('hpValue', `${vm.hp}/${vm.maxHp}`);
  set('moves', `${vm.moves}/${vm.maxMoves}`);
  set('gold', vm.gold);
  set('relics', vm.relics);
  set('knot', vm.knot);
  set('weapon', vm.weapon);
  set('armor', vm.armor);
  set('artifact', vm.artifactLabel);

  // Potency bars: rebuild fresh children each refresh
  const container = card.querySelector('.left-potency-bars');
  if (container) {
    container.replaceChildren();
    vm.pots.forEach((v, i) => {
      const fac = FACTIONS[i];
      const isPrimary = i === ch.faction; // preserve visual regression fix
      container.appendChild(
        h('div', { class: 'left-potency-row' },
          h('span', { class: 'left-potency-dot', style: { background: fac.color } }),
          h('span', { class: 'left-potency-track' },
            h('span', { class: 'left-potency-fill', style: { width: Math.min(100, v * 6) + '%', background: fac.color } })
          ),
          h('span', { class: 'left-potency-num' + (isPrimary ? ' is-primary' : '') }, String(v))
        )
      );
    });
  }
}