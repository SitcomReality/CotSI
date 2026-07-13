// Terrain feature renderers: mountains, trees, God's Knots, faction bases

import { TERRAIN } from '../../world/map.js';
import { FACTIONS } from '../../core/factions.js';
import { HEX_SIZE } from './constants.js';
import { hexPoints } from './geometry.js';
import {
  SHADOW_COLOR,
  MOUNTAIN_BODY_FILL, MOUNTAIN_BODY_INK, MOUNTAIN_HIGHLIGHT, MOUNTAIN_SNOW, MOUNTAIN_SHADOW_OPACITY,
  TREE_TRUNK_RIPE, TREE_TRUNK_BARE, TREE_CANOPY_RIPE, TREE_CANOPY_BARE, TREE_FRUIT_COLOR, TREE_SHADOW_OPACITY,
  KNOT_BODY, KNOT_GLOW, KNOT_INNER, KNOT_SHADOW_OPACITY,
  BASE_SHADOW_OPACITY,
} from './theme.js';

// Shadow offset direction: falls south-west in our coordinate system
// The "behind" hex (north-east) is roughly (q+1, r-1).
const SHADOW_DX = -4;
const SHADOW_DY = 6;

/** Return hex corner points string with a custom size */
function hexPointsSized(cx, cy, size) {
  return hexPoints(cx, cy, size);
}

/** Render a mountain feature (tall jagged peak extending upward) */
export function renderMountain(cx, cy) {
  let svg = '';
  const shadowCx = cx + SHADOW_DX * 2;
  const shadowCy = cy + SHADOW_DY * 2;
  svg += `<polygon points="${hexPointsSized(shadowCx, shadowCy, HEX_SIZE * 1.3)}" fill="${SHADOW_COLOR}" opacity="${MOUNTAIN_SHADOW_OPACITY}" filter="url(#mountainShadow)" style="pointer-events:none"/>`;

  const peakY = cy - HEX_SIZE * 1.8;
  const baseY = cy + HEX_SIZE * 0.3;
  const w = HEX_SIZE * 1.2;
  svg += `<path d="M${cx},${peakY} L${cx - w},${baseY} L${cx + w},${baseY} Z" fill="${MOUNTAIN_BODY_FILL}" stroke="${MOUNTAIN_BODY_INK}" stroke-width="1.5" filter="url(#tallShadow)" style="pointer-events:none"/>`;
  svg += `<path d="M${cx},${peakY - 8} L${cx - HEX_SIZE * 0.8},${baseY - 10} L${cx + HEX_SIZE * 0.8},${baseY - 10} Z" fill="${MOUNTAIN_HIGHLIGHT}" opacity="0.6" style="pointer-events:none"/>`;
  // Snow cap
  svg += `<path d="M${cx},${peakY} L${cx - HEX_SIZE * 0.4},${peakY + 20} L${cx + HEX_SIZE * 0.4},${peakY + 20} Z" fill="${MOUNTAIN_SNOW}" opacity="0.9" style="pointer-events:none"/>`;
  return svg;
}

/** Render a tree feature (trunk + canopy + optional fruit sparkle) */
export function renderTree(cx, cy, feature) {
  let svg = '';
  const ripe = feature.ripe !== false;

  // Shadow
  const shadowCx = cx + SHADOW_DX;
  const shadowCy = cy + SHADOW_DY;
  svg += `<ellipse cx="${shadowCx}" cy="${shadowCy + 8}" rx="${HEX_SIZE * 0.7}" ry="${HEX_SIZE * 0.35}" fill="${SHADOW_COLOR}" opacity="${TREE_SHADOW_OPACITY}" filter="url(#dropShadow)" style="pointer-events:none"/>`;

  // Trunk
  const trunkColor = ripe ? TREE_TRUNK_RIPE : TREE_TRUNK_BARE;
  svg += `<rect x="${cx - 3}" y="${cy - 2}" width="6" height="18" fill="${trunkColor}" style="pointer-events:none"/>`;

  // Canopy (two ellipses stacked)
  const canopyColor = ripe ? TREE_CANOPY_RIPE : TREE_CANOPY_BARE;
  svg += `<ellipse cx="${cx}" cy="${cy - HEX_SIZE * 0.6}" rx="${HEX_SIZE * 0.85}" ry="${HEX_SIZE * 0.7}" fill="${canopyColor}" filter="url(#tallShadow)" style="pointer-events:none"/>`;
  svg += `<ellipse cx="${cx}" cy="${cy - HEX_SIZE * 1.1}" rx="${HEX_SIZE * 0.6}" ry="${HEX_SIZE * 0.5}" fill="${canopyColor}" opacity="0.85" style="pointer-events:none"/>`;

  if (ripe) {
    svg += `<text x="${cx}" y="${cy - HEX_SIZE * 1.3}" text-anchor="middle" font-size="14" fill="${TREE_FRUIT_COLOR}" style="pointer-events:none">✦</text>`;
  }
  return svg;
}

/** Render a God's Knot feature (glowing crystal, if unmined) */
export function renderKnot(cx, cy) {
  let svg = '';
  const sdx = SHADOW_DX * 0.5;
  const sdy = SHADOW_DY * 0.5;
  svg += `<ellipse cx="${cx + sdx}" cy="${cy + sdy + 4}" rx="${HEX_SIZE * 0.4}" ry="${HEX_SIZE * 0.2}" fill="${SHADOW_COLOR}" opacity="${KNOT_SHADOW_OPACITY}" style="pointer-events:none"/>`;

  svg += `<polygon points="${cx},${cy - 10} ${cx - 8},${cy + 4} ${cx + 8},${cy + 4}" fill="${KNOT_BODY}" stroke="${KNOT_GLOW}" stroke-width="1.5" filter="url(#dropShadow)" style="pointer-events:none"/>`;
  svg += `<circle cx="${cx}" cy="${cy - 2}" r="4" fill="${KNOT_INNER}" opacity="0.8" style="pointer-events:none"/>`;
  svg += `<animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy - 2}" to="360 ${cx} ${cy - 2}" dur="6s" repeatCount="indefinite"/>`;
  return svg;
}

/** Render a faction base structure (tower + battlements + banner) */
export function renderBase(cx, cy, factionId) {
  let svg = '';
  const fac = FACTIONS[factionId];
  if (!fac) return svg;

  // Shadow
  const sdx = SHADOW_DX * 1.5;
  const sdy = SHADOW_DY * 1.5;
  svg += `<polygon points="${hexPointsSized(cx + sdx, cy + sdy, HEX_SIZE * 1.1)}" fill="${SHADOW_COLOR}" opacity="${BASE_SHADOW_OPACITY}" filter="url(#tallShadow)" style="pointer-events:none"/>`;

  // Tower
  const top    = cy - HEX_SIZE * 1.2;
  const bottom = cy + HEX_SIZE * 0.4;
  svg += `<rect x="${cx - 10}" y="${top}" width="20" height="${bottom - top}" fill="url(#baseGrad)" stroke="${fac.color}" stroke-width="2" filter="url(#tallShadow)" style="pointer-events:none"/>`;

  // Battlements
  svg += `<rect x="${cx - 12}" y="${top - 4}" width="24" height="8" fill="${fac.color}" opacity="0.9" style="pointer-events:none"/>`;
  for (let i = 0; i < 3; i++) {
    svg += `<rect x="${cx - 10 + i * 10}" y="${top - 10}" width="6" height="10" fill="${fac.color}" style="pointer-events:none"/>`;
  }

  // Faction glyph
  svg += `<text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="16" fill="white" font-weight="800" style="pointer-events:none;text-shadow:1px 1px 2px #000">${fac.glyph}</text>`;

  // Banner
  svg += `<rect x="${cx - 18}" y="${top - 22}" width="36" height="14" fill="${fac.color}" opacity="0.95" rx="3" style="pointer-events:none"/>`;
  svg += `<text x="${cx}" y="${top - 11}" text-anchor="middle" font-size="10" fill="white" font-weight="700" style="pointer-events:none">${fac.short}</text>`;

  return svg;
}

/** Dispatch feature rendering by kind */
export function renderFeature(cx, cy, tile) {
  const f = tile.feature;
  if (!f) return '';

  if (f.kind === 'mountain' || tile.terrain === 'mountain') {
    return renderMountain(cx, cy);
  }
  if (f.kind === 'tree') {
    return renderTree(cx, cy, f);
  }
  if (f.kind === 'knot' && !f.mined) {
    return renderKnot(cx, cy);
  }
  if (f.kind === 'base') {
    return renderBase(cx, cy, f.faction);
  }
  return '';
}