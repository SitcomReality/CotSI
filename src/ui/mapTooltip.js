import { svgIcon } from './svgIcon.js';
import { TERRAIN } from '../game/rules/terrainTypes.js';
import { FACTIONS } from '../game/rules/factionData.js';
import { terrainCost } from '../game/rules/movementCosts.js';
import { getArchetype } from '../game/rules/archetypes.js';
import { occupiedByMob, occupiedByChampion, occupiedByTrader } from '../game/state/entityQueries.js';
import { getHumanView } from '../game/state/fogOfWar.js';
import { pathToward } from '../game/state/championMovement.js';
import { h } from './domBuilder.js';

const maybe = (test, ...args) => test ? args : [];

/** Canonical display name for a feature kind, from the archetype registry
 *  (src/game/rules/archetypeData/features.js). Kinds without an archetype
 *  (e.g. 'base') fall back to the raw kind. */
function featureName(kind) {
  return getArchetype(`feature_${kind}`)?.name ?? kind;
}

export function getTooltipContent(gameState, key, activeChampion) {
  return getTooltipContentAndPreview(gameState, key, activeChampion)?.content ?? null;
}

/**
 * Build the tooltip DOM plus the path-preview overlay data for a hex.
 * Returns null for unexplored/unknown hexes. The preview (weighted path from
 * the active human champion to this hex, or null) is consumed by the runtime
 * to drive the pathPreview overlay layer.
 * @returns {{ content: HTMLElement, preview: { keys: string[], cost: number } | null } | null}
 */
export function getTooltipContentAndPreview(gameState, key, activeChampion) {
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

  /* ---- movement: terrain cost + weighted path (human champion only) ---- */
  let costText = null;
  let pathText = null;
  let preview = null;
  if (activeChampion && activeChampion.controller === 'human') {
    const stepCost = terrainCost(activeChampion, t.terrain);
    costText = `${TERRAIN[t.terrain].label} · ${stepCost} AP`;
    // Same semantics as a click (pathToward): in-range hexes preview the
    // cheapest path; out-of-range hexes preview the affordable prefix the
    // champion would actually walk toward them.
    const toward = pathToward(gameState, activeChampion, key);
    if (toward && toward.path.length > 0) {
      preview = { keys: toward.path, cost: toward.cost };
      pathText = `Path: ${toward.path.length} hex${toward.path.length > 1 ? 'es' : ''} · ${toward.cost} AP`;
    }
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
    ...maybe(pathText,
      h('span', { class: 'hex-tooltip__reachable' }, pathText)
    ),
  ];

  const container = h('div', { class: 'hex-tooltip__inner' }, ...lines);

  // prepend explored indicator if fogged
  if (!visible) {
    const exploredTag = h('i', { class: 'hex-tooltip__explored' }, '[Explored]');
    container.prepend(exploredTag, ' ');
  }

  return { content: container, preview };
}


