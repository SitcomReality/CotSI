import { championVM } from '../viewModels/championViewModel.js';
import { currentChamp } from '../../game/state/liveGame.js';
import { FACTIONS } from '../../game/rules/factionData.js';
import { h } from '../domBuilder.js';

/**
 * Enable or disable the End Turn button based on whether a human champion is active.
 */
function syncEndTurnBtn(isHumanTurn) {
  const btn = document.querySelector('.left-endturn-btn');
  if (!btn) return;
  // Only touch button state when enabling — the "Ending Turn…" disabled state
  // set by onEndTurn should persist until a human turn actually arrives.
  if (isHumanTurn) {
    btn.disabled = false;
    btn.textContent = 'End Turn';
    btn.classList.remove('is-ending');
  } else {
    btn.disabled = true;
    // Don't change text — may be "Ending Turn…" from onEndTurn, or staying
    // disabled during bot turns which is fine either way.
  }
}

export function bindLeftPanel(G) {
  const el = document.getElementById('championCard');
  if (!el) {
    console.warn('[bindLeftPanel] #championCard not found');
    return;
  }

  const card = el.querySelector('.left-champion-card');
  if (!card) {
    console.warn('[bindLeftPanel] .left-champion-card not found inside #championCard');
    return;
  }

  const ch = currentChamp();

  // Null-champ guard: fill data-ui fields with placeholder dashes,
  // do NOT use el.textContent = … which would destroy the skeleton.
  if (!ch) {
    card.style.removeProperty('--faction-color');
    card.style.removeProperty('--champ-hp-pct');
    card.querySelectorAll('[data-ui]').forEach(n => { n.textContent = '--'; });
    const bars = card.querySelector('.left-potency-bars');
    if (bars) bars.replaceChildren();
    syncEndTurnBtn(false);
    return;
  }

  // End Turn button state
  syncEndTurnBtn(ch.controller === 'human');

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
        h('div', { class: 'left-potency-row paley-item paley-item--f' + i },
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