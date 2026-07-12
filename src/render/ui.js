import { FACTIONS, potencyWithPrimary } from '../core/factions.js';
import { paleySVG } from './paley.js';

export function renderLeftPanel(state, champ){
  if(!champ) return '<div class="panel">No active champion</div>';
  const fac = FACTIONS[champ.faction];
  const pots = potencyWithPrimary(champ);
  return `
  <div class="panel brand-panel">
    <div class="turn-who">
      <div class="turn-avatar" style="background:${fac.color}; box-shadow:0 0 16px ${fac.glow}66">${fac.glyph}</div>
      <div>
        <div class="turn-name" style="color:${fac.color}">${champ.name}</div>
        <div class="turn-meta">${champ.controller} • Week ${Math.floor((state.day-1)/7)+1} • Day ${state.day}</div>
      </div>
    </div>
  </div>
  <div class="panel stat-grid">
    <div class="sbox"><div class="sl">HP</div><div class="sv" style="color:#2f9f5a">${champ.hp}/${champ.maxHp}</div></div>
    <div class="sbox"><div class="sl">Relics</div><div class="sv">${champ.relics}</div></div>
    <div class="sbox"><div class="sl">Gold</div><div class="sv" style="color:#b88728">${champ.gold}</div></div>
    <div class="sbox"><div class="sl">God's Knot</div><div class="sv">${champ.knot}</div></div>
    <div class="sbox"><div class="sl">Moves</div><div class="sv">${champ.moves}</div></div>
    <div class="sbox"><div class="sl">Sight</div><div class="sv">${champ.sight + (champ.artifact==='lens'?1:0)}</div></div>
  </div>
  <div class="panel">
    <h4>Potency — Paley tokens</h4>
    ${FACTIONS.map((f,i)=> `
      <div class="tk-row">
        <div class="tk-dot" style="background:${f.color}; box-shadow:0 0 8px ${f.glow}55"></div>
        <div class="tk-bar"><div class="tk-fill" style="width:${Math.min(100, pots[i]*6)}%; background:${f.color}"></div></div>
        <div class="tk-num" style="${i===champ.faction?'color:#b8741a;font-weight:800':''}">${pots[i]}</div>
      </div>
    `).join('')}
    <div class="hint">Primary = tokens + relics + weakest secondary.</div>
  </div>
  <div class="panel">
    <h4>Equipment</h4>
    <div class="equip-grid">
      <div class="equip"><b>Robes</b><div>${champ.armor}</div></div>
      <div class="equip"><b>Implement</b><div>${champ.weapon}</div></div>
    </div>
    <div class="mini" style="margin-top:6px">Artifact: ${champ.artifact ? champ.artifact : '— none —'}</div>
  </div>
  <div class="panel actions">
    <button class="btn" id="btnInspect">Inspect</button>
    <button class="btn end" id="btnEndTurn">End Turn ⟳</button>
  </div>
  `;
}

export function renderRightPanel(state){
  const w = state.weather;
  return `
  <div class="panel">
    <h4>Paley Heptagram</h4>
    <div id="paleyMount">${paleySVG(-1)}</div>
    <div class="hint" style="text-align:center">Hover a node: green beats, red loses. i → i+1,i+2,i+4</div>
  </div>
  <div class="panel">
    <h4>Divine Weather — ${w.name}</h4>
    <div style="font-size:13px;color:#5a3a22;line-height:1.5">${w.text}</div>
    <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:5px">
      ${w.potency.map((v,i)=> v!==0 ? `<span class="wtag" style="border-color:${FACTIONS[i].color}77">${FACTIONS[i].glyph} ${v>0?'+':''}${v}</span>`:'').join('')}
    </div>
    <div class="mini" style="margin-top:6px">Day length ×${w.dayLength}</div>
  </div>
  <div class="panel score-panel" style="flex:1;overflow:auto">
    <h4>Champion Ledger</h4>
    ${state.champions.map(c=>{
      const f=FACTIONS[c.faction];
      const me = c.id===state.activeChampionId;
      return `<div class="score-entry ${me?'me':''}" style="opacity:${c.alive?1:.5};border-left:4px solid ${f.color}">
        <div><b style="color:${f.color}">${f.glyph} ${f.name}</b> <span class="mini">• ${c.controller}</span></div>
        <div class="mini">HP ${Math.max(0,c.hp)} • Relics ${c.relics} • Gold ${c.gold}</div>
        <div style="display:flex;gap:3px;margin-top:4px">${c.tokens.map((t,fi)=> `<span style="background:${FACTIONS[fi].color};color:#fff;font-size:9px;padding:1px 4px;border-radius:3px;opacity:.92">${t}</span>`).join('')}</div>
      </div>`;
    }).join('')}
  </div>
  `;
}

export function renderLog(state){
  return `<div class="log">${state.logs.map(l=> `<div class="logline">${l}</div>`).join('')}</div>`;
}
