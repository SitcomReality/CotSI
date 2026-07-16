/**
 * rightPanel.js — Right sidebar panels: Heptagram, Divine Weather, Champion Ledger
 *
 * Styleguide compliance:
 * - All panels: var(--parchment) + var(--shadow-stack)
 * - Potency tokens: scaled circles using --token-color CSS var
 * - Active champion gets .is-active class for gold-trim highlight
 * - Dead champions: reduced opacity (0.5) but still readable
 */
import { FACTIONS } from '../../core/factions.js';
import { paleySVG } from '../heptagramSVG.js';

export function renderRightPanel(state) {
  const w = state.weather;
  const activeId = state.activeChampionId;
  const order = state.currentOrder || [];

  // Build champion rows sorted by turn order (currentOrder)
  const ledgerRows = order
    .map(id => state.champions.find(c => c.id === id))
    .filter(Boolean)
    .map((champ) => {
      const fac = FACTIONS[champ.faction];
      const isActive = champ.id === activeId;
      const isDead = !champ.alive;
      const maxTokens = Math.max(...champ.tokens, 1);

      const tokenSpans = champ.tokens.map((t, fi) => {
        if (t <= 0) return '';
        const size = Math.min(100, Math.round(60 + (t / maxTokens) * 40));
        return `<span class="rt-potency-token" style="--token-color:${FACTIONS[fi].color};--token-size:${size}%">${t}</span>`;
      }).join('');

      return `
        <div class="rt-ledger-row ${isActive ? 'is-active' : ''}" style="opacity:${isDead ? 0.5 : 1}">
          <div class="rt-ledger-row-main">
            <span class="rt-ledger-dot" style="background:${fac.color}"></span>
            <span class="rt-ledger-name">${fac.name}</span>
            <span class="rt-ledger-controller">${champ.controller}</span>
          </div>
          <div class="rt-ledger-stats">
            <span class="rt-ledger-stat">HP ${Math.max(0, champ.hp)}</span>
            <span class="rt-ledger-stat">Relics ${champ.relics}</span>
            <span class="rt-ledger-stat">Gold ${champ.gold}</span>
          </div>
          <div class="rt-potency-row">${tokenSpans}</div>
        </div>`;
    }).join('');

  return `
    <div class="panel rt-heptagram-card">
      <h4>Paley Heptagram</h4>
      <div id="paleyMount" class="rt-heptagram-svg">${paleySVG(-1)}</div>
      <div class="rt-heptagram-hint">i → i+1, i+2, i+4</div>
    </div>
    <div class="panel rt-weather-card">
      <h4>Divine Weather — ${w.name}</h4>
      <div class="rt-weather-text">${w.text}</div>
      <div class="rt-weather-tags">
        ${w.potency.map((v, i) =>
          v !== 0
            ? `<span class="rt-weather-tag rt-weather-tag--${v > 0 ? 'pos' : 'neg'}">
                ${FACTIONS[i].glyph} ${v > 0 ? '+' : ''}${v}
               </span>`
            : ''
        ).join('')}
      </div>
      <div class="rt-weather-daylen">Day length ×${w.dayLength}</div>
    </div>
    <div class="panel rt-ledger-card">
      <h4>Champion Ledger</h4>
      <div class="rt-ledger-list">${ledgerRows}</div>
    </div>
  `;
}