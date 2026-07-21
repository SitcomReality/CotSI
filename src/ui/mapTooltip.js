import { svgIcon } from './svgIcon.js';
import { TERRAIN } from '../game/rules/terrainGeneration.js';
import { FACTIONS } from '../game/rules/factionData.js';
import { occupiedByMob, occupiedByChampion, occupiedByTrader } from '../game/state/entityQueries.js';
import { getHumanView } from '../game/state/fogOfWar.js';
import { movementRange } from '../game/state/championMovement.js';
import { getSceneContext } from '../render/hexmap3d/hexMapRenderer.js';
import { h } from './domBuilder.js';

const maybe = (test, ...args) => test ? args : [];

export function getTooltipContent(gameState, key, activeChampion) {
  const t = gameState.tiles[key];
  if (!t) return null;

  const humanView = getHumanView(gameState);
  const explored = humanView.explored.has(key);
  if (!explored) return null;

  const visible = humanView.visible.has(key);

  /* ---- entities ---- */
  const mob = occupiedByMob(gameState, key);
  const ch = occupiedByChampion(gameState, key);
  const trader = occupiedByTrader(gameState, key);

  /* ---- movement ---- */
  let reachableText = null;
  if (activeChampion && activeChampion.controller === 'human') {
    const range = movementRange(gameState, activeChampion);
    if (range[key] !== undefined && range[key] > 0) {
      reachableText = `● Reachable (${range[key]} move)`;
    }
  }

  /* ---- feature ---- */
  let featureDesc = '';
  if (t.feature) {
    featureDesc = `◈ ${t.feature.kind}`;
    if (t.feature.kind === 'knot' && !t.feature.mined) featureDesc += ` (${t.feature.amount})`;
    if (t.feature.kind === 'tree' && t.feature.ripe !== false) featureDesc += ' 🍃';
  }

  /* ---- build fragment ---- */
  const lines = [
    h('span', { class: 'hex-tooltip__coords' },
      h('b', {}, key),
      ` — ${TERRAIN[t.terrain].label}`
    ),
    ...maybe(featureDesc,
      h('span', { class: 'hex-tooltip__feature' }, featureDesc)
    ),
    ...(mob
      ? [h('span', { class: 'hex-tooltip__mob' }, `⚠ ${mob.name} ${mob.hp}/${mob.maxHp}hp`)]
      : []
    ),
    ...(ch
      ? [h('span', { class: 'hex-tooltip__champion' },
          svgIcon(FACTIONS[ch.faction].glyphId, 14),
          ` ${ch.name} ${ch.hp}/${ch.maxHp}hp`
        )]
      : []
    ),
    ...(trader
      ? [h('span', { class: 'hex-tooltip__trader' }, '₳ Wandering Trader')]
      : []
    ),
    ...maybe(reachableText,
      h('span', { class: 'hex-tooltip__reachable' }, reachableText)
    ),
  ];

  const container = h('div', { class: 'hex-tooltip__inner' }, ...lines);

  // prepend explored indicator if fogged
  if (!visible) {
    const exploredTag = h('i', { class: 'hex-tooltip__explored' }, '[Explored]');
    container.prepend(exploredTag, ' ');
  }

  return container;
}

/**
 * Update the zoom percentage display in the HUD.
 * Percentage is map-relative: 100% = full-map view (referenceFrustum).
 * Falls back to the legacy hardcoded 40 when no reference is available.
 */
export function refreshZoomDisplay() {
  const zoomEl = document.getElementById('hudZoom');
  if (!zoomEl) return;

  const ctx3d = getSceneContext();
  const cs = ctx3d?.getCameraState();
  const pct = cs?.referenceFrustum
    ? Math.round(100 * cs.referenceFrustum / cs.frustumSize)
    : cs
      ? Math.round(100 * 40 / cs.frustumSize)
      : 100;
  zoomEl.textContent = pct + '%';
}
