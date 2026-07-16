import { TERRAIN } from '../world/map.js';
import { FACTIONS } from '../core/factions.js';
import { occupiedByMob, occupiedByChampion, occupiedByTrader } from '../game/entityQueries.js';
import { getHumanView } from '../game/vision.js';
import { movementRange } from '../game/championMovement.js';
import { getSceneContext } from '../render/hexmap3d/hexmap3d-index.js';

/**
 * Get tooltip HTML for a given hex key.
 */
export function getTooltipContent(gameState, key, activeChampion) {
  const t = gameState.tiles[key];
  if (!t) return null;
  const humanView = getHumanView(gameState);
  const visible = humanView.visible.has(key);
  const explored = humanView.explored.has(key);
  if (!explored) return null;

  let html = `<b>${key}</b> — ${TERRAIN[t.terrain].label}`;
  if (t.feature) {
    html += `<br>◈ ${t.feature.kind}`;
    if (t.feature.kind === 'knot' && !t.feature.mined) html += ` (${t.feature.amount})`;
    if (t.feature.kind === 'tree' && t.feature.ripe !== false) html += ' 🍃';
  }

  const mob = occupiedByMob(gameState, key);
  if (mob) html += `<br>⚠ ${mob.name} ${mob.hp}/${mob.maxHp}hp`;

  const ch = occupiedByChampion(gameState, key);
  if (ch) html += `<br>${FACTIONS[ch.faction].glyph} ${ch.name} ${ch.hp}/${ch.maxHp}hp`;

  const trader = occupiedByTrader(gameState, key);
  if (trader) html += '<br>₳ Wandering Trader';

  if (activeChampion && activeChampion.controller === 'human') {
    const range = movementRange(gameState, activeChampion);
    if (range[key] !== undefined && range[key] > 0) {
      html += `<br><span style="color:#b88728">● Reachable (${range[key]} move)</span>`;
    }
  }

  if (!visible) html = `<i style="color:#7a5634">[Explored]</i> ` + html;
  return html;
}
/**
 * Update the zoom percentage display in the HUD.
 */
export function refreshZoomDisplay() {
  const zoomEl = document.getElementById('hudZoom');
  if (!zoomEl) return;

  const ctx3d = getSceneContext();
  const pct = ctx3d
    ? Math.round(100 * 40 / ctx3d.getCameraState().frustumSize)
    : 100;
  zoomEl.textContent = pct + '%';
}

// Attach to window for script-based main.js
window.getTooltipContent = getTooltipContent;
window.refreshZoomDisplay = refreshZoomDisplay;
