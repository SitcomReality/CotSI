import { svgIcon } from './svgIcon.js';
import { TERRAIN } from '../game/rules/terrainTypes.js';
import { FACTIONS } from '../game/rules/factionData.js';
import { terrainCost } from '../game/rules/movementCosts.js';
import { getArchetype } from '../game/rules/archetypes.js';
import { occupiedByMob, occupiedByChampion, occupiedByTrader } from '../game/state/entityQueries.js';
import { getHumanView } from '../game/state/fogOfWar.js';
import { h } from './domBuilder.js';

const maybe = (test, ...args) => test ? args : [];

/** Canonical display name for a feature kind, from the archetype registry
 *  (src/game/rules/archetypeData/features.js). Kinds without an archetype
 *  (e.g. 'base') fall back to the raw kind. */
function featureName(kind) {
  return getArchetype(`feature_${kind}`)?.name ?? kind;
}

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

  /* ---- movement: terrain step cost only (no path computation on hover —
   *  routes are click-to-preview, dev/docs/movementAndOccupation.md §5) ---- */
  let costText = null;
  if (activeChampion && activeChampion.controller === 'human') {
    costText = `${TERRAIN[t.terrain].label} · ${terrainCost(activeChampion, t.terrain)} AP`;
  }

  /* ---- feature ---- */
  let featureDesc = '';
  if (t.feature) {
    featureDesc = `◈ ${featureName(t.feature.kind)}`;
    if (t.feature.kind === 'knot' && !t.feature.mined) featureDesc += ` (${t.feature.amount})`;
    if (t.feature.kind === 'fruitTree' && t.feature.ripe !== false) featureDesc += ' 🍃';
  }

  /* ---- build fragment ---- */
  const lines = [
    h('span', { class: 'hex-tooltip__coords' },
      h('b', {}, key),
      ` — ${costText ?? TERRAIN[t.terrain].label}`
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
  ];

  const container = h('div', { class: 'hex-tooltip__inner' }, ...lines);

  // prepend explored indicator if fogged
  if (!visible) {
    const exploredTag = h('i', { class: 'hex-tooltip__explored' }, '[Explored]');
    container.prepend(exploredTag, ' ');
  }

  return container;
}


