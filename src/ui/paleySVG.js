import { FACTIONS, beats } from '../game/rules/factionData.js';
import { iconSpritePath } from './iconPaths.js';
import { PALEY_SVG_WIDTH, PALEY_SVG_HEIGHT, PALEY_RADIUS_FACTOR, PALEY_CENTER_Y_OFFSET, PALEY_NODE_RADIUS_SEL, PALEY_NODE_RADIUS, PALEY_NODE_STROKE_SEL, PALEY_NODE_STROKE, PALEY_GLYPH_SIZE, PALEY_ICON_SIZE_HALF, PALEY_LABEL_OFFSET, PALEY_LABEL_FONT_SIZE, PALEY_EDGE_STRIDES } from '../params/ui/uiParams.js';

export function paleySVG(highlight=-1, w=PALEY_SVG_WIDTH, h=PALEY_SVG_HEIGHT, R){
  const cx=w/2, cy=h/2+PALEY_CENTER_Y_OFFSET;
  if (R === undefined) R = Math.min(w, h) * PALEY_RADIUS_FACTOR; // proportional to viewBox
  const pts = FACTIONS.map((f,i)=>{
    const ang = -Math.PI/2 + i*2*Math.PI/7;
    return {x: cx + Math.cos(ang)*R, y: cy + Math.sin(ang)*R, f, i};
  });
  // Use the body font token (with Georgia as legacy fallback)
  let s = `<svg viewBox="0 0 ${w} ${h}" width="100%" xmlns="http://www.w3.org/2000/svg" style="font-family:var(--font-body, Georgia, serif)">`;
  // edges — CSS handles stroke color/opacity/width; JS adds beat-based classes
  pts.forEach((p,i)=>{
    PALEY_EDGE_STRIDES.forEach(off=>{
      const j=(i+off)%7;
      const q=pts[j];
      let cls = 'rt-heptagram-line';
      if (highlight === i) {
        cls += beats(p.f, q.f) ? ' rt-beats-win' : ' rt-beats-lose';
      } else if (highlight === j) {
        cls += beats(q.f, p.f) ? ' rt-beats-win' : ' rt-beats-lose';
      }
      s += `<line class="${cls}" data-from="${i}" data-to="${j}" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/>`;
    });
  });
  // nodes
  pts.forEach(p=>{
    const isHi = p.i===highlight;
    // Use token-based stroke (ivory) and ink-soft for label; CSS variables resolve in inline SVG
    s += `<circle class="rt-heptagram-node paley-item paley-item--f${p.i}" data-index="${p.i}" cx="${p.x}" cy="${p.y}" r="${isHi?PALEY_NODE_RADIUS_SEL:PALEY_NODE_RADIUS}" fill="${p.f.color}" style="stroke:var(--ivory)" stroke-width="${isHi?PALEY_NODE_STROKE_SEL:PALEY_NODE_STROKE}"/>`;
    s += `<g transform="translate(${p.x-PALEY_ICON_SIZE_HALF}, ${p.y-PALEY_ICON_SIZE_HALF})"><use href="${iconSpritePath(p.f.glyphId)}#${p.f.glyphId}" width="${PALEY_GLYPH_SIZE}" height="${PALEY_GLYPH_SIZE}"/></g>`;
    s += `<text class="rt-heptagram-label" x="${p.x}" y="${p.y+PALEY_LABEL_OFFSET}" text-anchor="middle" font-size="${PALEY_LABEL_FONT_SIZE}" style="pointer-events:none">${p.f.short}</text>`;
  });
  s += `</svg>`;
  return s;
}
