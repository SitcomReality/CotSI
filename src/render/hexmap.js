// SVG illuminated manuscript hex map
import { TERRAIN, coordKey, parseKey } from '../world/map.js';
import { FACTIONS } from '../core/factions.js';
import { occupiedByChampion, occupiedByMob, occupiedByTrader, movementRange, getHumanView } from '../game/state.js';

export function renderHexMapSVG(state, onTileClick){
  const active = state.champions.find(c=> c.id===state.activeChampionId);
  const range = (active && active.controller==='human' && !state.reward && !state.notice) ? movementRange(state, active) : {};
  const humanView = getHumanView(state);
  const hexSize = 30;
  const tiles = Object.values(state.tiles);
  const projected = tiles.map(t=> ({
    tile:t,
    x: hexSize * Math.sqrt(3) * (t.q + t.r/2),
    y: hexSize * 1.5 * t.r
  }));
  const xs = projected.map(p=>p.x), ys = projected.map(p=>p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const margin=64;
  const width = maxX-minX+margin*2;
  const height = maxY-minY+margin*2;
  const points = (cx,cy)=> Array.from({length:6},(_,i)=>{
    const a = Math.PI/180*(60*i-30); return `${cx + hexSize*Math.cos(a)},${cy + hexSize*Math.sin(a)}`;
  }).join(' ');

  let svg = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:radial-gradient(800px 500px at 50% 0%, #f7e9c6 0%, #ead6a8 55%, #d8c089 100%);font-family:Georgia,'Times New Roman',serif">
  <defs>
    <filter id="wobbleInk"><feTurbulence baseFrequency="0.018" numOctaves="2" seed="11" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="1.15"/></filter>
    <filter id="parchmentNoise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0.4"/></filter>
    <pattern id="parch" width="120" height="120" patternUnits="userSpaceOnUse">
      <rect width="120" height="120" fill="#ead6a8"/>
      <circle cx="20" cy="30" r="1" fill="#d4b87a44"/>
      <circle cx="80" cy="90" r="1.2" fill="#bfa06633"/>
    </pattern>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#parch)"/>`;

  for(const p of projected){
    const key = coordKey(p.tile);
    const visible = humanView.visible.has(key);
    const explored = humanView.explored.has(key);
    if(!explored) continue;
    const cx = p.x - minX + margin;
    const cy = p.y - minY + margin;
    const tinfo = TERRAIN[p.tile.terrain];
    const fill = visible ? tinfo.fill : '#d8c8a7';
    const opacity = visible ? 0.98 : 0.52;
    const reachable = range[key]!==undefined && range[key]>0;
    const stroke = reachable ? '#b88728' : '#8a6740';
    const sw = reachable ? 2.6 : 1.1;
    svg += `<polygon points="${points(cx,cy)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${opacity}" ${visible?`filter="url(#wobbleInk)"`:''} data-key="${key}" class="hex-tile" style="cursor:pointer;transition:all .12s"/>`;
    if(explored){
      svg += `<text x="${cx}" y="${cy+4}" text-anchor="middle" font-size="10" fill="#5a3a22" opacity="0.55" style="pointer-events:none;font-family:Georgia,serif">${tinfo.mark||''}</text>`;
    }
    if(visible && p.tile.feature){
      const f = p.tile.feature;
      if(f.kind==='tree'){
        const ripe = f.ripe !== false;
        svg += `<text x="${cx}" y="${cy-7}" text-anchor="middle" font-size="16" fill="${ripe?'#2f7e44':'#8a8a5a'}" style="pointer-events:none;font-weight:700">❦</text>`;
      } else if(f.kind==='knot' && !f.mined){
        svg += `<text x="${cx}" y="${cy-6}" text-anchor="middle" font-size="14" fill="#7c3fb1" style="pointer-events:none">✦</text>`;
      } else if(f.kind==='base'){
        const fac = FACTIONS[f.faction];
        svg += `<circle cx="${cx}" cy="${cy-8}" r="10" fill="${fac.color}" opacity="0.92"/>`;
        svg += `<text x="${cx}" y="${cy-4}" text-anchor="middle" font-size="11" fill="white" style="pointer-events:none;font-weight:800">${fac.glyph}</text>`;
      }
    }
    if(visible){
      const mob = occupiedByMob(state,key);
      if(mob){
        const fac = FACTIONS[mob.faction];
        svg += `<circle cx="${cx}" cy="${cy+9}" r="8.5" fill="${fac.color}" stroke="#21150d" stroke-width="1.8"/>`;
        svg += `<text x="${cx}" y="${cy+13}" text-anchor="middle" font-size="9" fill="white" style="pointer-events:none;font-weight:700">M</text>`;
      }
      const trader = occupiedByTrader(state,key);
      if(trader){
        svg += `<polygon points="${cx},${cy+2} ${cx-7},${cy+12} ${cx+7},${cy+12}" fill="#4abf9a" stroke="#145a44" stroke-width="1.5"/>`;
      }
      const champ = occupiedByChampion(state,key);
      if(champ){
        const fac = FACTIONS[champ.faction];
        const isActive = champ.id===state.activeChampionId;
        if(isActive){
          svg += `<circle cx="${cx}" cy="${cy}" r="18" fill="none" stroke="#ffd86b" stroke-width="2.2" opacity="0.9" stroke-dasharray="4 3"><animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="18s" repeatCount="indefinite"/></circle>`;
        }
        svg += `<circle cx="${cx}" cy="${cy}" r="13.5" fill="${fac.color}" stroke="${isActive?'#fff3bf':'#21150d'}" stroke-width="${isActive?3:2}"/>`;
        svg += `<text x="${cx}" y="${cy+4.5}" text-anchor="middle" font-size="13" fill="white" style="pointer-events:none;font-weight:800;font-family:Georgia,serif">${fac.glyph}</text>`;
      }
    }
    if(!visible && explored){
      svg += `<polygon points="${points(cx,cy)}" fill="#1a140a" opacity="0.22" style="pointer-events:none"/>`;
    }
  }
  svg += `</svg>`;
  return {svg, width, height, minX, minY, margin, hexSize};
}
