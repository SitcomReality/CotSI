/**
 * leftPanel.js
 *
 * Champion Card with stacked-paper vellum panel, faction left-edge rule,
 * HP bar (ink fill / vellum-2 track), compact resource icon-wells,
 * equipment with monoline SVGs, collapsed potency accordion (native <details>),
 * and gold CTA button.
 *
 */
import { FACTIONS, potencyWithPrimary, ARTIFACTS } from '../../core/factions.js';
import { dailyMoves } from '../../game/championMovement.js';

export function renderLeftPanel(state, champ) {
  if (!champ) {
    return '<div class="panel left-champion-card"><div class="mini" style="color:var(--ink-soft);padding:8px 0">No active champion</div></div>';
  }

  const fac = FACTIONS[champ.faction];
  const pots = potencyWithPrimary(champ);
  const maxMoves = dailyMoves(state, champ);
  const hpPct = Math.min(100, Math.max(0, Math.round((champ.hp / champ.maxHp) * 100)));
  const artifactLabel = champ.artifact
    ? (ARTIFACTS.find(a => a.id === champ.artifact)?.name || champ.artifact)
    : '— none —';

  return `
  <div class="panel left-champion-card" style="--faction-color:${fac.color}">
    <!-- Header: faction dot, name, moves -->
    <div class="left-champ-header">
      <span class="left-faction-dot" style="background:${fac.color}"></span>
      <span class="left-champ-name">${fac.name}</span>
      <span class="left-champ-moves">
        <svg width="12" height="12"><use href="assets/icons/sprite.svg#i-move"/></svg>
        ${champ.moves}/${maxMoves}
      </span>
    </div>

    <!-- HP row: label + ink-fill bar + numeric -->
    <div class="left-hp-row">
      <span class="left-hp-label">HP</span>
      <span class="left-hp-track"><span class="left-hp-fill" style="width:${hpPct}%"></span></span>
      <span class="left-hp-value">${champ.hp}/${champ.maxHp}</span>
    </div>

    <!-- Resources row: compact icon wells -->
    <div class="left-resources-row">
      <span class="left-res-item">
        <svg width="14" height="14"><use href="assets/icons/sprite.svg#i-collect"/></svg>
        ${champ.relics} Relics
      </span>
      <span class="left-res-item">
        <svg width="14" height="14"><use href="assets/icons/sprite.svg#i-trade"/></svg>
        ${champ.gold} Gold
      </span>
      <span class="left-res-item">
        <svg width="14" height="14"><use href="assets/icons/sprite.svg#d-knot"/></svg>
        ${champ.knot} Knots
      </span>
    </div>

    <!-- Equipment row: monoline icons + names -->
    <div class="left-equip-row">
      <span class="left-equip-item">
        <svg width="14" height="14"><use href="assets/icons/sprite.svg#i-attack"/></svg>
        ${champ.weapon}
      </span>
      <span class="left-equip-item">
        <svg width="14" height="14"><use href="assets/icons/sprite.svg#i-flee"/></svg>
        ${champ.armor}
      </span>
      <span class="left-equip-artifact">
        Artifact: ${artifactLabel}
      </span>
    </div>

    <!-- Potency: collapsed by default (native <details>/<summary>) -->
    <details class="left-potency-details">
      <summary class="left-potency-summary">
        Potency <span class="left-potency-arrow">▶</span>
      </summary>
      <div class="left-potency-bars">
        ${FACTIONS.map((f, i) => `
          <div class="left-potency-row">
            <span class="left-potency-dot" style="background:${f.color}"></span>
            <span class="left-potency-track"><span class="left-potency-fill" style="width:${Math.min(100, pots[i] * 6)}%;background:${f.color}"></span></span>
            <span class="left-potency-num ${i === champ.faction ? 'is-primary' : ''}">${pots[i]}</span>
          </div>
        `).join('')}
      </div>
    </details>

    <!-- Action buttons: Inspect (ink) + End Turn (gold) -->
    <div class="left-actions-row">
      <button class="btn left-inspect-btn" data-action="inspect">Inspect</button>
      <button class="btn btn-gold left-endturn-btn" data-action="endTurn">End Turn</button>
    </div>
  </div>
  `;
}