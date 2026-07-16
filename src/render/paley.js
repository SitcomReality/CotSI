import { FACTIONS, beats } from '../core/factions.js';

export function paleySVG(highlight=-1, w=300, h=250){
  const cx=w/2, cy=h/2+4, R=94;
  const pts = FACTIONS.map((f,i)=>{
    const ang = -Math.PI/2 + i*2*Math.PI/7;
    return {x: cx + Math.cos(ang)*R, y: cy + Math.sin(ang)*R, f, i};
  });
  let s = `<svg viewBox="0 0 ${w} ${h}" width="100%" xmlns="http://www.w3.org/2000/svg" style="font-family:Georgia,serif">`;
  // edges — CSS handles stroke color/opacity/width; JS adds beat-based classes
  pts.forEach((p,i)=>{
    [1,2,4].forEach(off=>{
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
    s += `<circle data-index="${p.i}" cx="${p.x}" cy="${p.y}" r="${isHi?17:14}" fill="${p.f.color}" stroke="#fff8e8" stroke-width="${isHi?2.5:1.6}"/>`;
    s += `<text x="${p.x}" y="${p.y+4}" text-anchor="middle" fill="white" font-size="${isHi?13:12}" font-weight="700" style="pointer-events:none">${p.f.glyph}</text>`;
    s += `<text x="${p.x}" y="${p.y+28}" text-anchor="middle" fill="#4a2f18" font-size="9" style="pointer-events:none">${p.f.short}</text>`;
  });
  s += `</svg>`;
  return s;
}