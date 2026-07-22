/**
 * headerDetailCard.js — Detail dropdown DOM builder and positioning.
 *
 * Exports:
 *   buildDetailCard(vm, champ)  — DOM fragment using h()
 *   positionDetail(headerEl, detailEl, slot)  — getBoundingClientRect layout math
 */

import { h } from '../domBuilder.js';
import { FACTIONS } from '../../game/rules/factionData.js';

/**
 * Build the detail dropdown DOM fragment using championVM() + h().
 * No inline styles except dynamic --faction-color on the header dot.
 */
export function buildDetailCard(vm, champ) {
  const fac = FACTIONS[champ.faction];

  // Potency rows: one per faction with a non-zero value
  const potRows = [];
  for (let i = 0; i < vm.pots.length; i++) {
    const val = vm.pots[i];
    if (val <= 0) continue;
    potRows.push(
      h('div', { class: 'detail__pot-row paley-item paley-item--f' + i },
        h('span', { class: 'detail__pot-dot', style: { background: FACTIONS[i].color } }),
        h('span', { class: 'detail__pot-name' }, FACTIONS[i].short),
        h('span', { class: 'detail__pot-val' }, String(val))
      )
    );
  }

  return h('div', { class: 'champion-detail__inner' },
    h('div', { class: 'detail__header' },
      h('span', { class: 'detail__faction-dot', style: { background: fac.color } }),
      h('span', { class: 'detail__name', style: { color: fac.color } }, champ.name)
    ),
    h('div', { class: 'detail__stat' },
      h('span', { class: 'detail__stat-val' }, `${vm.hp} / ${vm.maxHp}`)
    ),
    h('div', { class: 'detail__resources' },
      h('span', { class: 'detail__gold' }, String(vm.gold)),
      ' ',
      h('span', { class: 'detail__knot' }, `${vm.knot} knot${vm.knot !== 1 ? 's' : ''}`)
    ),
    h('div', { class: 'detail__potency' },
      h('div', { class: 'detail__section-label' }, 'Potency'),
      ...(potRows.length > 0 ? potRows : [h('div', { class: 'detail__empty' }, '— none —')])
    )
  );
}

/**
 * Position the detail card relative to the header bar and the pill slot.
 * Uses getBoundingClientRect() math to keep the card within bounds.
 */
export function positionDetail(headerEl, detailEl, slot) {
  const sr = slot.getBoundingClientRect();
  const hr = headerEl.getBoundingClientRect();
  let left = sr.left - hr.left;
  if (left + 180 > hr.width) left = hr.width - 180;
  if (left < 0) left = 0;
  detailEl.style.left = left + 'px';
  detailEl.style.top = hr.height + 'px';
}
