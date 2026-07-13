import { TERRAIN } from '../../world/map.js';
import { movementRange, getHumanView, occupiedByChampion, occupiedByMob, occupiedByTrader } from '../../game/state.js';
import { camera } from './camera.js';
import { HEX_SIZE } from './constants.js';
import { hexPoints } from './geometry.js';
import { renderDefs } from './defs.js';
import { projectTile, sortByDepth, computeViewport, fogOverlays } from './layout.js';
import { renderFeature } from './features.js';
import { renderUnitTokens } from './units.js';
import {
  HEX_FILL_VISIBLE, HEX_FILL_DIMMED, HEX_FILL_FOG,
  HEX_STROKE_NORMAL, HEX_STROKE_FOG, HEX_STROKE_REACHABLE,
  HEX_STROKE_WIDTH_NORMAL, HEX_STROKE_WIDTH_FOG, HEX_STROKE_WIDTH_REACHABLE,
  TERRAIN_MARK_COLOR, TERRAIN_MARK_OPACITY,
} from './theme.js';

/**
 * Build the complete SVG string for the hex-map view.
 * Orchestrates layout, theme, features, and units from their dedicated modules.
 */
export function renderHexMapSVG(state, onTileClick) {
  const active = state.champions.find(c => c.id === state.activeChampionId);
  const range = (active && active.controller === 'human' && !state.reward && !state.notice)
    ? movementRange(state, active)
    : {};
  const humanView = getHumanView(state);

  // ── Layout ──
  const tiles = Object.values(state.tiles);
  const projected = tiles.map(projectTile);
  sortByDepth(projected);
  const vp = computeViewport(projected);
  const { width, height, offsetX, offsetY } = vp;
  const fogPolys = fogOverlays(projected, humanView, offsetX, offsetY);

  // ── SVG header with background gradient ──
  const bgGrad = 'radial-gradient(800px 500px at 50% 0%, #f7e9c6 0%, #ead6a8 55%, #d8c089 100%)';
  let svg = `<svg viewBox=\"0 0 ${width} ${height}\" width=\"100%\" height=\"100%\" xmlns=\"http://www.w3.org/2000/svg\" style=\"background:${bgGrad};font-family:Georgia,'Times New Roman',serif;touch-action:none\" id=\"hexMapSvg\">
${renderDefs()}
  <!-- Background parchment -->
  <rect width=\"${width}\" height=\"${height}\" fill=\"url(#parch)\"/>
  <!-- Transformable map layer -->
  <g id=\"mapLayer\" transform=\"translate(${camera.tx},${camera.ty}) scale(${camera.scale})\">`;

  // ── Hex tiles (back-to-front) ──
  for (const p of projected) {
    const key = p.key;
    const visible = humanView.visible.has(key);
    const explored = humanView.explored.has(key);
    if (!explored) continue;

    const cx = p.x + offsetX;
    const cy = p.y + offsetY;
    const tile = p.tile;
    const tinfo = TERRAIN[tile.terrain];
    const reachable = range[key] !== undefined && range[key] > 0;

    // Hex styling based on visibility / reachability
    const fill    = visible ? tinfo.fill : HEX_FILL_FOG;
    const opacity = visible ? HEX_FILL_VISIBLE : HEX_FILL_DIMMED;
    const stroke  = reachable ? HEX_STROKE_REACHABLE : (visible ? HEX_STROKE_NORMAL : HEX_STROKE_FOG);
    const sw      = reachable ? HEX_STROKE_WIDTH_REACHABLE : (visible ? HEX_STROKE_WIDTH_NORMAL : HEX_STROKE_WIDTH_FOG);
    const filter  = visible ? 'filter=\"url(#wobbleInk)\"' : '';

    svg += `<g class=\"hex-group\" data-key=\"${key}\">`;
    svg += `<polygon class=\"hex-tile\" points=\"${hexPoints(cx, cy)}\" fill=\"${fill}\" stroke=\"${stroke}\" stroke-width=\"${sw}\" opacity=\"${opacity}\" ${filter} style=\"cursor:pointer;transition:all .12s\"/>`;

    // Terrain mark (subtle)
    if (explored && tinfo.mark) {
      svg += `<text x=\"${cx}\" y=\"${cy + 4}\" text-anchor=\"middle\" font-size=\"10\" fill=\"${TERRAIN_MARK_COLOR}\" opacity=\"${TERRAIN_MARK_OPACITY}\" style=\"pointer-events:none;font-family:Georgia,serif\">${tinfo.mark}</text>`;
    }

    // Tall features (mountains, trees, knots, bases)
    if (visible && tile.feature) {
      svg += renderFeature(cx, cy, tile);
    }

    // Units (priority: mob > trader > champion)
    if (visible) {
      const mob    = occupiedByMob(state, key);
      const trader = mob ? null : occupiedByTrader(state, key);
      const champ  = (mob || trader) ? null : occupiedByChampion(state, key);
      const isActive = champ ? champ.id === state.activeChampionId : false;
      svg += renderUnitTokens(cx, cy, { mob, trader, champ, isActive });
    }

    svg += `</g>`;
  }

  // Fog of war overlay (explored but not visible)
  for (const fog of fogPolys) svg += fog;

  svg += `</g></svg>`;
  return { svg, width, height, offsetX, offsetY, hexSize: HEX_SIZE };
}