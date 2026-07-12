import { TERRAIN, coordKey } from '../../world/map.js';
import { FACTIONS } from '../../core/factions.js';
import { occupiedByChampion, occupiedByMob, occupiedByTrader, movementRange, getHumanView } from '../../game/state.js';
import { camera } from './camera.js';
import { HEX_SIZE, HEX_WIDTH, HEX_HEIGHT } from './constants.js';
import { hexPoints } from './geometry.js';

export function renderHexMapSVG(state, onTileClick) {
  const active = state.champions.find(c=> c.id===state.activeChampionId);
  const range = (active && active.controller==='human' && !state.reward && !state.notice) ? movementRange(state, active) : {};
  const humanView = getHumanView(state);
  
  const tiles = Object.values(state.tiles);
  
  // Project all tiles
  const projected = tiles.map(t=> ({
    tile: t,
    q: t.q, r: t.r,
    x: HEX_WIDTH * (t.q + t.r/2),
    y: HEX_HEIGHT * t.r,
    key: coordKey(t)
  }));
  
  // Sort for depth rendering: back to front (higher r first, then higher q)
  // This ensures southern hexes render on top of northern ones
  projected.sort((a,b)=> (a.r - b.r) || (a.q - b.q));
  
  const xs = projected.map(p=>p.x), ys = projected.map(p=>p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const margin = 80;
  const width = maxX - minX + margin*2;
  const height = maxY - minY + margin*2;
  const offsetX = -minX + margin;
  const offsetY = -minY + margin;
  
  // Pre-compute fog overlay polygons for explored-but-not-visible
  const fogPolys = [];
  for(const p of projected){
    const key = p.key;
    const visible = humanView.visible.has(key);
    const explored = humanView.explored.has(key);
    if(explored && !visible){
      const cx = p.x + offsetX;
      const cy = p.y + offsetY;
      fogPolys.push(`<polygon points="${hexPoints(cx,cy)}" fill="#1a140a" opacity="0.22" class="fog-layer" data-key="${key}"/>`);
    }
  }
  
  let svg = `<svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="background:radial-gradient(800px 500px at 50% 0%, #f7e9c6 0%, #ead6a8 55%, #d8c089 100%);font-family:Georgia,'Times New Roman',serif;touch-action:none" id="hexMapSvg">
  <defs>
    <filter id="wobbleInk"><feTurbulence baseFrequency="0.018" numOctaves="2" seed="11" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="1.15"/></filter>
    <filter id="parchmentNoise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="0.4"/></filter>
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="2.5" result="blur"/>
      <feOffset dx="1.5" dy="3" result="offsetBlur"/>
      <feFlood flood-color="#1a140a" flood-opacity="0.35"/>
      <feComposite in2="offsetBlur" operator="in"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="tallShadow" x="-30%" y="-40%" width="160%" height="180%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur"/>
      <feOffset dx="2" dy="6" result="offsetBlur"/>
      <feFlood flood-color="#1a140a" flood-opacity="0.28"/>
      <feComposite in2="offsetBlur" operator="in"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="mountainShadow" x="-40%" y="-60%" width="180%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur"/>
      <feOffset dx="3" dy="10" result="offsetBlur"/>
      <feFlood flood-color="#1a140a" flood-opacity="0.22"/>
      <feComposite in2="offsetBlur" operator="in"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <pattern id="parch" width="120" height="120" patternUnits="userSpaceOnUse">
      <rect width="120" height="120" fill="#ead6a8"/>
      <circle cx="20" cy="30" r="1" fill="#d4b87a44"/>
      <circle cx="80" cy="90" r="1.2" fill="#bfa06633"/>
    </pattern>
    <pattern id="mountainTex" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="40" height="40" fill="#b7aa92"/>
      <path d="M5,35 L20,5 L35,35 Z" fill="#a89a84" opacity="0.4"/>
      <path d="M10,35 L20,15 L30,35 Z" fill="#9a8c76" opacity="0.3"/>
    </pattern>
    <linearGradient id="treeGrad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#2f7e44"/>
      <stop offset="50%" stop-color="#4a9f5a"/>
      <stop offset="100%" stop-color="#6de98a"/>
    </linearGradient>
    <linearGradient id="baseGrad" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#8a6740"/>
      <stop offset="100%" stop-color="#b88728"/>
    </linearGradient>
  </defs>
  <!-- Background parchment -->
  <rect width="${width}" height="${height}" fill="url(#parch)"/>
  <!-- Transformable map layer -->
  <g id="mapLayer" transform="translate(${camera.tx},${camera.ty}) scale(${camera.scale})">`;
  
  // Render hexes back-to-front
  for(const p of projected){
    const key = p.key;
    const visible = humanView.visible.has(key);
    const explored = humanView.explored.has(key);
    if(!explored) continue;
    
    const cx = p.x + offsetX;
    const cy = p.y + offsetY;
    const tile = p.tile;
    const tinfo = TERRAIN[tile.terrain];
    const reachable = range[key]!==undefined && range[key]>0;
    
    // Base terrain hex
    const fill = visible ? tinfo.fill : '#d8c8a7';
    const opacity = visible ? 0.98 : 0.52;
    const stroke = reachable ? '#b88728' : (visible ? '#8a6740' : '#6a4a2a');
    const sw = reachable ? 2.8 : (visible ? 1.2 : 0.8);
    const filter = visible ? 'filter="url(#wobbleInk)"' : '';
    
    svg += `<g class="hex-group" data-key="${key}">`;
    svg += `<polygon class="hex-tile" points="${hexPoints(cx,cy)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" opacity="${opacity}" ${filter} style="cursor:pointer;transition:all .12s"/>`;
    
    // Terrain mark (subtle)
    if(explored && tinfo.mark){
      svg += `<text x="${cx}" y="${cy+4}" text-anchor="middle" font-size="10" fill="#5a3a22" opacity="0.5" style="pointer-events:none;font-family:Georgia,serif">${tinfo.mark}</text>`;
    }
    
    // === TALL FEATURES (rendered with depth: they cast shadows on hexes "behind" them) ===
    // We render shadows FIRST (on the hex behind), then the feature itself
    
    if(visible && tile.feature){
      const f = tile.feature;
      
      // Calculate shadow offset based on feature height
      // Shadow falls "south-west" (positive y, negative x in our coordinate system)
      // The hex "behind" (north-east) is at (q+1, r-1) roughly
      const shadowDx = -4;
      const shadowDy = 6;
      
      if(f.kind === 'mountain' || tile.terrain === 'mountain'){
        // Mountain: tall jagged shape extending upward
        // Shadow on hex behind (north-east)
        const shadowCx = cx + shadowDx * 2;
        const shadowCy = cy + shadowDy * 2;
        svg += `<polygon points="${hexPoints(shadowCx, shadowCy, HEX_SIZE*1.3)}" fill="#1a140a" opacity="0.18" filter="url(#mountainShadow)" style="pointer-events:none"/>`;
        
        // Mountain body - tall triangle extending above hex
        const peakY = cy - HEX_SIZE * 1.8;
        const baseY = cy + HEX_SIZE * 0.3;
        svg += `<path d="M${cx},${peakY} L${cx - HEX_SIZE*1.2},${baseY} L${cx + HEX_SIZE*1.2},${baseY} Z" fill="url(#mountainTex)" stroke="#7a6a50" stroke-width="1.5" filter="url(#tallShadow)" style="pointer-events:none"/>`;
        svg += `<path d="M${cx},${peakY - 8} L${cx - HEX_SIZE*0.8},${baseY - 10} L${cx + HEX_SIZE*0.8},${baseY - 10} Z" fill="#c8b8a0" opacity="0.6" style="pointer-events:none"/>`;
        // Snow cap
        svg += `<path d="M${cx},${peakY} L${cx - HEX_SIZE*0.4},${peakY + 20} L${cx + HEX_SIZE*0.4},${peakY + 20} Z" fill="#f0f0f0" opacity="0.9" style="pointer-events:none"/>`;
        
      } else if(f.kind === 'tree'){
        const ripe = f.ripe !== false;
        const trunkColor = ripe ? '#5a3a22' : '#7a5a3a';
        const canopyColor = ripe ? 'url(#treeGrad)' : '#6a8a5a';
        
        // Tree shadow on hex behind
        const shadowCx = cx + shadowDx;
        const shadowCy = cy + shadowDy;
        svg += `<ellipse cx="${shadowCx}" cy="${shadowCy + 8}" rx="${HEX_SIZE*0.7}" ry="${HEX_SIZE*0.35}" fill="#1a140a" opacity="0.15" filter="url(#dropShadow)" style="pointer-events:none"/>`;
        
        // Tree trunk
        svg += `<rect x="${cx-3}" y="${cy-2}" width="6" height="18" fill="${trunkColor}" style="pointer-events:none"/>`;
        // Tree canopy - extends upward
        svg += `<ellipse cx="${cx}" cy="${cy - HEX_SIZE*0.6}" rx="${HEX_SIZE*0.85}" ry="${HEX_SIZE*0.7}" fill="${canopyColor}" filter="url(#tallShadow)" style="pointer-events:none"/>`;
        svg += `<ellipse cx="${cx}" cy="${cy - HEX_SIZE*1.1}" rx="${HEX_SIZE*0.6}" ry="${HEX_SIZE*0.5}" fill="${canopyColor}" opacity="0.85" style="pointer-events:none"/>`;
        if(ripe){
          // Fruit sparkle
          svg += `<text x="${cx}" y="${cy - HEX_SIZE*1.3}" text-anchor="middle" font-size="14" fill="#ffd86b" style="pointer-events:none">✦</text>`;
        }
        
      } else if(f.kind === 'knot' && !f.mined){
        // God's Knot - glowing crystal
        const shadowCx = cx + shadowDx*0.5;
        const shadowCy = cy + shadowDy*0.5;
        svg += `<ellipse cx="${shadowCx}" cy="${shadowCy + 4}" rx="${HEX_SIZE*0.4}" ry="${HEX_SIZE*0.2}" fill="#1a140a" opacity="0.12" style="pointer-events:none"/>`;
        
        svg += `<polygon points="${cx},${cy-10} ${cx-8},${cy+4} ${cx+8},${cy+4}" fill="#7c3fb1" stroke="#b79aff" stroke-width="1.5" filter="url(#dropShadow)" style="pointer-events:none"/>`;
        svg += `<circle cx="${cx}" cy="${cy-2}" r="4" fill="#e8d0ff" opacity="0.8" style="pointer-events:none"/>`;
        svg += `<animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy-2}" to="360 ${cx} ${cy-2}" dur="6s" repeatCount="indefinite"/>`;
        
      } else if(f.kind === 'base'){
        const fac = FACTIONS[f.faction];
        // Base shadow (large structure)
        const shadowCx = cx + shadowDx*1.5;
        const shadowCy = cy + shadowDy*1.5;
        svg += `<polygon points="${hexPoints(shadowCx, shadowCy, HEX_SIZE*1.1)}" fill="#1a140a" opacity="0.18" filter="url(#tallShadow)" style="pointer-events:none"/>`;
        
        // Base structure - tower/keep extending upward
        const baseTop = cy - HEX_SIZE*1.2;
        const baseBottom = cy + HEX_SIZE*0.4;
        // Main tower
        svg += `<rect x="${cx-10}" y="${baseTop}" width="20" height="${baseBottom - baseTop}" fill="url(#baseGrad)" stroke="${fac.color}" stroke-width="2" filter="url(#tallShadow)" style="pointer-events:none"/>`;
        // Battlements
        svg += `<rect x="${cx-12}" y="${baseTop-4}" width="24" height="8" fill="${fac.color}" opacity="0.9" style="pointer-events:none"/>`;
        for(let i=0;i<3;i++){
          svg += `<rect x="${cx-10+i*10}" y="${baseTop-10}" width="6" height="10" fill="${fac.color}" style="pointer-events:none"/>`;
        }
        // Faction glyph on banner
        svg += `<text x="${cx}" y="${cy-2}" text-anchor="middle" font-size="16" fill="white" font-weight="800" style="pointer-events:none;text-shadow:1px 1px 2px #000">${fac.glyph}</text>`;
        // Banner
        svg += `<rect x="${cx-18}" y="${baseTop-22}" width="36" height="14" fill="${fac.color}" opacity="0.95" rx="3" style="pointer-events:none"/>`;
        svg += `<text x="${cx}" y="${baseTop-11}" text-anchor="middle" font-size="10" fill="white" font-weight="700" style="pointer-events:none">${fac.short}</text>`;
      }
    }
    
    // === UNITS (champions, mobs, traders) ===
    if(visible){
      const mob = occupiedByMob(state,key);
      if(mob){
        const fac = FACTIONS[mob.faction];
        // Mob shadow
        svg += `<ellipse cx="${cx}" cy="${cy+HEX_SIZE*0.5}" rx="${HEX_SIZE*0.55}" ry="${HEX_SIZE*0.2}" fill="#1a140a" opacity="0.15" style="pointer-events:none"/>`;
        // Mob token
        svg += `<circle cx="${cx}" cy="${cy+4}" r="${HEX_SIZE*0.55}" fill="${fac.color}" stroke="#21150d" stroke-width="2" filter="url(#dropShadow)"/>`;
        svg += `<text x="${cx}" y="${cy+9}" text-anchor="middle" font-size="10" fill="white" font-weight="700" style="pointer-events:none">M</text>`;
        // HP bar for damaged mobs
        if(mob.hp < mob.maxHp){
          const w = HEX_SIZE*1.1;
          const pct = mob.hp / mob.maxHp;
          svg += `<rect x="${cx-w/2}" y="${cy-HEX_SIZE*0.7}" width="${w}" height="4" fill="#3a1a1a" rx="2" style="pointer-events:none"/>`;
          svg += `<rect x="${cx-w/2}" y="${cy-HEX_SIZE*0.7}" width="${w*pct}" height="4" fill="#5fc98a" rx="2" style="pointer-events:none"/>`;
        }
      }
      const trader = occupiedByTrader(state,key);
      if(trader){
        svg += `<ellipse cx="${cx}" cy="${cy+HEX_SIZE*0.5}" rx="${HEX_SIZE*0.5}" ry="${HEX_SIZE*0.18}" fill="#1a140a" opacity="0.12" style="pointer-events:none"/>`;
        svg += `<polygon points="${cx},${cy-2} ${cx-8},${cy+10} ${cx+8},${cy+10}" fill="#4abf9a" stroke="#145a44" stroke-width="1.5" filter="url(#dropShadow)"/>`;
        svg += `<text x="${cx}" y="${cy+4}" text-anchor="middle" font-size="9" fill="white" font-weight="800" style="pointer-events-none">₳</text>`;
      }
      const champ = occupiedByChampion(state,key);
      if(champ){
        const fac = FACTIONS[champ.faction];
        const isActive = champ.id===state.activeChampionId;
        // Champion shadow
        svg += `<ellipse cx="${cx}" cy="${cy+HEX_SIZE*0.55}" rx="${HEX_SIZE*0.6}" ry="${HEX_SIZE*0.22}" fill="#1a140a" opacity="0.18" style="pointer-events:none"/>`;
        // Active champion halo
        if(isActive){
          svg += `<circle cx="${cx}" cy="${cy}" r="${HEX_SIZE*0.9}" fill="none" stroke="#ffd86b" stroke-width="2.5" opacity="0.9" stroke-dasharray="6 4"><animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="20s" repeatCount="indefinite"/></circle>`;
        }
        // Champion token
        svg += `<circle cx="${cx}" cy="${cy}" r="${HEX_SIZE*0.6}" fill="${fac.color}" stroke="${isActive?'#fff3bf':'#21150d'}" stroke-width="${isActive?3.5:2.5}" filter="url(#dropShadow)"/>`;
        svg += `<text x="${cx}" y="${cy+5}" text-anchor="middle" font-size="${HEX_SIZE*0.55}" fill="white" font-weight="800" font-family="Georgia,serif" style="pointer-events:none;text-shadow:1px 1px 2px #000">${fac.glyph}</text>`;
        // HP bar
        if(champ.hp < champ.maxHp){
          const w = HEX_SIZE*1.3;
          const pct = Math.max(0, champ.hp / champ.maxHp);
          svg += `<rect x="${cx-w/2}" y="${cy-HEX_SIZE*0.9}" width="${w}" height="5" fill="#3a1a1a" rx="2.5" style="pointer-events:none"/>`;
          svg += `<rect x="${cx-w/2}" y="${cy-HEX_SIZE*0.9}" width="${w*pct}" height="5" fill="url(#treeGrad)" rx="2.5" style="pointer-events:none"/>`;
        }
      }
    }
    
    svg += `</g>`; // close hex-group
  }
  
  // Fog of war overlay (explored but not visible) - rendered on top
  for(const fog of fogPolys){
    svg += fog;
  }
  
  svg += `</g></svg>`; // close mapLayer and svg
  
  return {svg, width, height, offsetX, offsetY, hexSize: HEX_SIZE};
}