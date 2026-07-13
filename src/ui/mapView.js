import { camera, resetCamera, applyCameraTransform } from '../render/hexmap.js';
import { HEX_WIDTH, HEX_HEIGHT } from '../render/hexmap.js';
import { TERRAIN, coordKey, parseKey, distance } from '../world/map.js';
import { FACTIONS } from '../core/factions.js';
import { occupiedByMob, occupiedByChampion, occupiedByTrader } from '../game/entityQueries.js';
import { getHumanView } from '../game/vision.js';
import { movementRange } from '../game/movement.js';

/**
 * Zoom the map by a factor, keeping the center point stable.
 */
export function zoomMap(factor, svgEl) {
  if (!svgEl) return;
  const rect = svgEl.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const newScale = Math.max(0.35, Math.min(3.5, camera.scale * factor));
  camera.tx = centerX - (centerX - camera.tx) * (newScale / camera.scale);
  camera.ty = centerY - (centerY - camera.ty) * (newScale / camera.scale);
  camera.scale = newScale;
  applyCameraTransform(svgEl);
}

/**
 * Reset camera to default position and scale.
 */
export function resetCameraView(svgEl) {
  resetCamera();
  if (svgEl) applyCameraTransform(svgEl);
}

/**
 * Center the camera on the currently active champion.
 * Uses stored camera offsets from the last render (no re-render).
 */
export function centerOnChampion(champion, svgEl) {
  if (!champion || !svgEl) return;
  if (camera.offsetX == null || camera.offsetY == null) return;
  const cx = camera.offsetX + (HEX_WIDTH * (champion.pos.q + champion.pos.r / 2));
  const cy = camera.offsetY + (HEX_HEIGHT * champion.pos.r);
  const rect = svgEl.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  camera.tx = centerX - cx * camera.scale;
  camera.ty = centerY - cy * camera.scale;
  applyCameraTransform(svgEl);
}

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
  if (zoomEl) zoomEl.textContent = `${Math.round(camera.scale * 100)}%`;
}

// Attach to window for script-based main.js
window.zoomMap = zoomMap;
window.resetCameraView = resetCameraView;
window.centerOnChampion = centerOnChampion;
window.getTooltipContent = getTooltipContent;
window.refreshZoomDisplay = refreshZoomDisplay;
