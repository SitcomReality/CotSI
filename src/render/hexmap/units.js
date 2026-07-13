// Unit renderers: champions, mobs, traders on the hex map

import { FACTIONS } from '../../core/factions.js';
import { HEX_SIZE } from './constants.js';
import {
  MOB_SHADOW_OPACITY, MOB_TEXT_COLOR, MOB_OUTLINE_COLOR,
  TRADER_SHADOW_OPACITY, TRADER_BODY, TRADER_STROKE,
  CHAMP_SHADOW_OPACITY, CHAMP_HALO_COLOR, CHAMP_ACTIVE_STROKE, CHAMP_INACTIVE_STROKE,
  HP_BAR_BG, HP_BAR_FILL, HP_BAR_GRADIENT,
  HP_CHAMP_BAR_Y_OFFSET, HP_MOB_BAR_Y_OFFSET,
} from './theme.js';

/** Render a mob token (circle with faction color + "M" glyph) */
export function renderMob(cx, cy, mob) {
  let svg = '';
  const fac = FACTIONS[mob.faction];
  if (!fac) return svg;
  
  // Shadow
  svg += `<ellipse cx="${cx}" cy="${cy + HEX_SIZE * 0.5}" rx="${HEX_SIZE * 0.55}" ry="${HEX_SIZE * 0.2}" fill="#1a140a" opacity="${MOB_SHADOW_OPACITY}" style="pointer-events:none"/>`;
  
  // Token
  svg += `<circle cx="${cx}" cy="${cy + 4}" r="${HEX_SIZE * 0.55}" fill="${fac.color}" stroke="${MOB_OUTLINE_COLOR}" stroke-width="2" filter="url(#dropShadow)"/>`;
  svg += `<text x="${cx}" y="${cy + 9}" text-anchor="middle" font-size="10" fill="${MOB_TEXT_COLOR}" font-weight="700" style="pointer-events:none">M</text>`;
  
  // HP bar (only if damaged)
  if (mob.hp < mob.maxHp) {
    const w = HEX_SIZE * 1.1;
    const pct = mob.hp / mob.maxHp;
    const barY = cy - HEX_SIZE * HP_MOB_BAR_Y_OFFSET;
    svg += `<rect x="${cx - w / 2}" y="${barY}" width="${w}" height="4" fill="${HP_BAR_BG}" rx="2" style="pointer-events:none"/>`;
    svg += `<rect x="${cx - w / 2}" y="${barY}" width="${w * pct}" height="4" fill="${HP_BAR_FILL}" rx="2" style="pointer-events:none"/>`;
  }
  return svg;
}

/** Render a trader token (diamond with ₳ glyph) */
export function renderTrader(cx, cy) {
  let svg = '';
  svg += `<ellipse cx="${cx}" cy="${cy + HEX_SIZE * 0.5}" rx="${HEX_SIZE * 0.5}" ry="${HEX_SIZE * 0.18}" fill="#1a140a" opacity="${TRADER_SHADOW_OPACITY}" style="pointer-events:none"/>`;
  svg += `<polygon points="${cx},${cy - 2} ${cx - 8},${cy + 10} ${cx + 8},${cy + 10}" fill="${TRADER_BODY}" stroke="${TRADER_STROKE}" stroke-width="1.5" filter="url(#dropShadow)"/>`;
  svg += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="9" fill="white" font-weight="800" style="pointer-events:none">₳</text>`;
  return svg;
}

/** Render a champion token (circle + faction glyph + optional halo + HP bar) */
export function renderChampion(cx, cy, champ, isActive) {
  let svg = '';
  const fac = FACTIONS[champ.faction];
  if (!fac) return svg;
  
  // Shadow
  svg += `<ellipse cx="${cx}" cy="${cy + HEX_SIZE * 0.55}" rx="${HEX_SIZE * 0.6}" ry="${HEX_SIZE * 0.22}" fill="#1a140a" opacity="${CHAMP_SHADOW_OPACITY}" style="pointer-events:none"/>`;
  
  // Active champion rotating halo
  if (isActive) {
    svg += `<circle cx="${cx}" cy="${cy}" r="${HEX_SIZE * 0.9}" fill="none" stroke="${CHAMP_HALO_COLOR}" stroke-width="2.5" opacity="0.9" stroke-dasharray="6 4"><animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="20s" repeatCount="indefinite"/></circle>`;
  }
  
  // Token circle
  const strokeColor = isActive ? CHAMP_ACTIVE_STROKE : CHAMP_INACTIVE_STROKE;
  const strokeW = isActive ? 3.5 : 2.5;
  svg += `<circle cx="${cx}" cy="${cy}" r="${HEX_SIZE * 0.6}" fill="${fac.color}" stroke="${strokeColor}" stroke-width="${strokeW}" filter="url(#dropShadow)"/>`;
  svg += `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="${HEX_SIZE * 0.55}" fill="white" font-weight="800" font-family="Georgia,serif" style="pointer-events:none;text-shadow:1px 1px 2px #000">${fac.glyph}</text>`;

  // HP bar (only if damaged)
  if (champ.hp < champ.maxHp) {
    const w = HEX_SIZE * 1.3;
    const pct = Math.max(0, champ.hp / champ.maxHp);
    const barY = cy - HEX_SIZE * HP_CHAMP_BAR_Y_OFFSET;
    svg += `<rect x="${cx - w / 2}" y="${barY}" width="${w}" height="5" fill="${HP_BAR_BG}" rx="2.5" style="pointer-events:none"/>`;
    svg += `<rect x="${cx - w / 2}" y="${barY}" width="${w * pct}" height="5" fill="${HP_BAR_GRADIENT}" rx="2.5" style="pointer-events:none"/>`;
  }

  return svg;
}

/**
 * Render all units present on a hex.
 * Pass the resolved mob/trader/champ objects from the orchestrator.
 */
export function renderUnitTokens(cx, cy, { mob, trader, champ, isActive }) {
  let svg = '';
  if (mob)    svg += renderMob(cx, cy, mob);
  if (trader) svg += renderTrader(cx, cy);
  if (champ)  svg += renderChampion(cx, cy, champ, isActive);
  return svg;
}