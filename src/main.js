import { FACTIONS, ARTIFACTS } from './core/factions.js';
import { createGame, getChampion, movementRange, moveChampion, finishTurn, advanceTurn, addLog, isDigEligible, getHumanView, refreshVision, checkVictory } from './game/state.js';
import { renderHexMapSVG } from './render/hexmap.js';
import { renderLeftPanel, renderRightPanel, renderLog } from './render/ui.js';
import { paleySVG } from './render/paley.js';
import { runBotTurn as aiDecide } from './game/ai.js';
import { resolveCombatRound, finalizeCombat } from './game/combat.js';
import { coordKey, parseKey, distance, TERRAIN } from './world/map.js';
import { occupiedByMob, occupiedByChampion, occupiedByTrader } from './game/state.js';

let G=null;
let combatUI=null;

// --- SETUP UI wiring (runs in browser) ---
window.addEventListener('DOMContentLoaded', initSetup);

function initSetup(){
  const fl = document.getElementById('factionList');
  if(!fl) return; // not on setup page
  const roster = FACTIONS.map((f,i)=> ({...f, enabled:i<4, human:i===0}));
  function draw(){
    fl.innerHTML='';
    roster.forEach((r,idx)=>{
      const div=document.createElement('div');
      div.className='fopt'+(r.enabled?' on':'');
      div.innerHTML = `<div class="fdot" style="background:${r.color}"></div>
        <div style="flex:1"><div style="font-weight:700;color:${r.color}">${r.glyph} ${r.name}</div><div style="font-size:11px;color:#6a4a2a">${r.trait}</div></div>
        <button class="fctrl" data-i="${idx}">${r.human?'Human':'Bot'}</button>`;
      div.onclick = (e)=>{ if(e.target.classList.contains('fctrl')) return; r.enabled=!r.enabled; draw(); };
      fl.appendChild(div);
    });
    fl.querySelectorAll('.fctrl').forEach(btn=>{
      btn.onclick = (e)=>{ e.stopPropagation(); const ro = roster[+btn.dataset.i]; ro.human=!ro.human; btn.textContent = ro.human?'Human':'Bot'; };
    });
  }
  draw();
  document.getElementById('beginBtn')?.addEventListener('click', ()=>{
    const chosen = roster.filter(r=>r.enabled);
    if(chosen.length<2){ alert('Choose at least 2 champions'); return; }
    const sizeEl = document.querySelector('.size-pill.active');
    const radius = sizeEl ? parseInt(sizeEl.dataset.r) : 7;
    const relicTarget = parseInt(document.getElementById('relicTarget')?.value || '7',10);
    const lastStanding = document.getElementById('optLast')?.checked ?? true;
    G = createGame({
      seed: document.getElementById('seedInput')?.value || 'glut-'+Math.floor(Math.random()*999),
      radius,
      champions: chosen.map(c=> ({faction:c.id, controller: c.human?'human':'bot'})),
      objectives:{ relicRace:true, relicTarget, lastStanding }
    });
    document.getElementById('setup').style.display='none';
    document.getElementById('game').style.display='grid';
    bindGameUI();
    refreshAll();
  });
  document.querySelectorAll('.size-pill').forEach(p=>{
    p.addEventListener('click', ()=>{
      document.querySelectorAll('.size-pill').forEach(x=>x.classList.remove('active'));
      p.classList.add('active');
    });
  });
}

function bindGameUI(){
  document.getElementById('btnEndTurn')?.addEventListener('click', onEndTurn);
  // delegate end turn (left panel re-renders)
  document.addEventListener('click', e=>{
    if(e.target && e.target.id==='btnEndTurn') onEndTurn();
    if(e.target && e.target.id==='btnInspect') toast('Click a highlighted hex to move. Adjacent foes to duel. End turn on empty parchment to dig.');
  });
}

function currentChamp(){ return G ? G.champions.find(c=> c.id===G.activeChampionId) : null; }

function refreshAll(){
  if(!G) return;
  const ch = currentChamp();
  // left
  document.getElementById('leftMount').innerHTML = renderLeftPanel(G, ch);
  // right
  document.getElementById('rightMount').innerHTML = renderRightPanel(G);
  // map
  const {svg} = renderHexMapSVG(G, ()=>{});
  document.getElementById('mapMount').innerHTML = svg;
  wireMapClicks();
  wirePaleyHover();
  // log
  document.getElementById('logMount').innerHTML = renderLog(G);
  // hud
  if(ch){
    document.getElementById('hudMoves').textContent = ch.moves;
    document.getElementById('hudPos').textContent = `${ch.pos.q},${ch.pos.r}`;
    document.getElementById('hudSight').textContent = ch.sight + (ch.artifact==='lens'?1:0);
    document.getElementById('dayLabel').textContent = `Day ${G.day} • ${G.weather.name}`;
  }
  // bot auto
  if(ch && ch.controller==='bot' && !G.reward && !G.notice && !G.winnerId){
    setTimeout(runBot, 620);
  }
  checkVictory(G);
  if(G.winnerId) showVictory();
}

function wireMapClicks(){
  document.querySelectorAll('#mapMount .hex-tile').forEach(el=>{
    el.addEventListener('click', ()=> onHexClick(el.getAttribute('data-key')));
    el.addEventListener('mouseenter', e=>{
      const key = el.getAttribute('data-key');
      showTooltip(e, key);
    });
    el.addEventListener('mouseleave', hideTooltip);
  });
}

function showTooltip(evt, key){
  const t = G.tiles[key]; if(!t) return;
  const tt = document.getElementById('tooltip');
  let html = `<b>${key}</b> — ${TERRAIN[t.terrain].label}`;
  if(t.feature) html += `<br>◈ ${t.feature.kind}`;
  const mob = occupiedByMob(G,key); if(mob) html += `<br>⚠ ${mob.name} ${mob.hp}hp`;
  const ch = occupiedByChampion(G,key); if(ch) html += `<br>${FACTIONS[ch.faction].glyph} ${ch.name}`;
  tt.innerHTML = html;
  tt.style.left = (evt.clientX+14)+'px';
  tt.style.top = (evt.clientY+14)+'px';
  tt.style.display='block';
}
function hideTooltip(){ document.getElementById('tooltip').style.display='none'; }

function onHexClick(key){
  if(!G || G.reward || G.notice || G.winnerId) return;
  const ch = currentChamp(); if(!ch || ch.controller!=='human') return;
  const range = movementRange(G, ch);
  const tile = G.tiles[key];
  if(!tile) return;
  // interaction if adjacent enemy
  const mob = occupiedByMob(G,key);
  const other = occupiedByChampion(G,key);
  const trader = occupiedByTrader(G,key);
  const dist = distance(ch.pos, parseKey(key));
  if((mob||other) && dist===1){
    startCombat(ch, mob||other);
    return;
  }
  if(trader && dist===1){ openTrader(trader); return; }
  if(tile.feature?.kind==='base' && dist===1){ interactBase(ch, tile); refreshAll(); return; }
  // move
  if(range[key]!==undefined && range[key]>0){
    moveChampion(G, ch, key, range[key]);
    refreshAll();
    if(ch.moves<=0) pulseEnd();
  }
}

function interactBase(ch, tile){
  if(tile.feature.faction === ch.faction){
    const healed = Math.ceil(ch.maxHp*0.5);
    ch.hp = Math.min(ch.maxHp, ch.hp+healed);
    ch.moves=0;
    addLog(G, `${ch.name} receives sanctuary (+${healed} HP).`);
  } else {
    const cost = ch.faction===4 ? 14 : 18;
    if(ch.gold >= cost){ ch.gold-=cost; ch.tokens[tile.feature.faction]++; ch.moves=0; addLog(G, `${ch.name} buys ${FACTIONS[tile.feature.faction].name} token.`); }
    else toast('Not enough gold.');
  }
}

function onEndTurn(){
  if(!G) return;
  const ch=currentChamp(); if(!ch || ch.controller!=='human') return;
  if(ch.moves>0){
    if(!confirm(isDigEligible(G,ch) ? 'End turn here and dig for rewards?' : 'End turn with moves remaining?')) return;
  }
  finishTurn(G);
  refreshAll();
}

function runBot(){
  const decision = aiDecide(G);
  const ch = currentChamp();
  if(!decision || decision.action==='end'){ finishTurn(G); refreshAll(); return; }
  if(decision.action==='attackChampion' || decision.action==='attackMob'){
    startCombat(ch, decision.target);
    return;
  }
  if(decision.action==='move'){
    const key = coordKey(decision.to);
    const range = movementRange(G, ch);
    const cost = range[key] ?? decision.cost ?? 1;
    moveChampion(G, ch, key, cost);
    refreshAll();
    setTimeout(()=>{ finishTurn(G); refreshAll(); }, 380);
  }
}

// ---- Combat UI ----
function startCombat(attacker, defender){
  combatUI = {
    a: attacker, b: defender,
    round:1,
    picksA:[],
    picksB:[],
  };
  openCombatModal();
}

function openCombatModal(){
  const modal = document.getElementById('combatModal');
  modal.style.display='flex';
  renderCombat();
}
function closeCombat(){ document.getElementById('combatModal').style.display='none'; combatUI=null; }

function renderCombat(){
  if(!combatUI) return;
  const {a,b,round,picksA} = combatUI;
  document.getElementById('combatRoundLabel').textContent = `Round ${round} — choose 2 Paley powers`;
  document.getElementById('leftCombat').innerHTML = combatantCard(a,true);
  document.getElementById('rightCombat').innerHTML = combatantCard(b,false);
  document.querySelectorAll('#leftCombat .ctok').forEach(el=>{
    el.onclick = ()=>{
      const f = +el.dataset.f;
      if(picksA.includes(f)) { combatUI.picksA = picksA.filter(x=>x!==f); }
      else if(picksA.length<2){ picksA.push(f); }
      renderCombat();
    };
  });
  // update pick slots
  ['sA1','sA2'].forEach((id,i)=>{
    const el=document.getElementById(id);
    const p=picksA[i];
    if(p!=null){ const fac=FACTIONS[p]; el.textContent=fac.glyph+' '+fac.name; el.style.borderColor=fac.color; el.style.background=fac.color+'22'; }
    else { el.textContent = i===0?'Pick 1':'Pick 2'; el.style.borderColor=''; el.style.background=''; }
  });
  document.getElementById('commitCombat').disabled = picksA.length!==2;
}

function combatantCard(ent, isLeft){
  const isChamp = !!ent.tokens;
  const pots = isChamp ? (()=>{
    const { potencyWithPrimary } = window.__SUPERNAL__ || {};
    // fallback inline
    const t = ent.tokens.slice(); t[ent.faction] += ent.relics||0;
    let weakest = Math.min(...t.filter((_,i)=> i!==ent.faction));
    if(!isFinite(weakest)) weakest=0; t[ent.faction]+=weakest; return t;
  })() : ent.potencies;
  return `<h3 style="color:${FACTIONS[ent.faction||0].color}">${ent.name||FACTIONS[ent.faction].name+' Champion'}</h3>
  <div class="hpbar"><div class="hpfill" style="width:${Math.round(ent.hp/ent.maxHp*100)}%"></div></div>
  <div class="mini">${ent.hp} / ${ent.maxHp} HP</div>
  <div class="combat-tokens">${pots.map((v,i)=>`
    <div class="ctok ${isLeft && combatUI.picksA.includes(i)?'sel':''}" data-f="${i}" style="border-color:${FACTIONS[i].color}66">
      <div style="font-weight:800">${v}</div><div style="font-size:9px;color:${FACTIONS[i].color}">${FACTIONS[i].glyph}</div>
    </div>`).join('')}</div>`;
}

window.commitCombat = function(){
  if(!combatUI || combatUI.picksA.length!==2) return;
  const {a,b} = combatUI;
  // bot picks
  const potsB = b.tokens ? (()=>{ const t=b.tokens.slice(); t[b.faction]+=b.relics||0; let w=Math.min(...t.filter((_,i)=>i!==b.faction)); if(!isFinite(w))w=0; t[b.faction]+=w; return t; })() : b.potencies;
  const idxs=[...potsB.keys()].sort((x,y)=>potsB[y]-potsB[x]);
  combatUI.picksB = idxs.slice(0,2);
  // show picks
  combatUI.picksB.forEach((p,i)=>{
    const el=document.getElementById(i===0?'sB1':'sB2');
    const fac=FACTIONS[p]; el.textContent = fac.glyph+' '+fac.name; el.style.borderColor=fac.color; el.style.background=fac.color+'22';
  });
  // resolve
  const res = resolveCombatRound(G, a, b, combatUI.picksA, combatUI.picksB);
  document.getElementById('csLeft').textContent = res.scoreA;
  document.getElementById('csRight').textContent = res.scoreB;
  document.getElementById('combatLog').textContent = res.log;
  let dmg=0, to='none';
  if(res.scoreA > res.scoreB){ dmg=res.scoreA-res.scoreB; b.hp-=dmg; to='defender'; }
  else if(res.scoreB > res.scoreA){ dmg=res.scoreB-res.scoreA; a.hp-=dmg; to='attacker'; }
  setTimeout(()=>{
    if(!b.alive || b.hp<=0){ b.alive=false; const rew=finalizeCombat(G,a,b,true); closeCombat(); openRewardModal(a, rew); refreshAll(); return; }
    if(!a.alive || a.hp<=0){ a.alive=false; closeCombat(); refreshAll(); toast('You were defeated.', true); return; }
    combatUI.round++; combatUI.picksA=[]; combatUI.picksB=[];
    renderCombat();
  }, 1050);
};

function openRewardModal(champ, rew){
  if(champ.controller!=='human' || !rew) return;
  const modal=document.getElementById('rewardModal');
  document.getElementById('rewardTitle').textContent='Combat Victory';
  document.getElementById('rewardBody').textContent=`Relic secured. +${rew.gold} gold.`;
  modal.style.display='flex';
}
window.closeReward = function(){ document.getElementById('rewardModal').style.display='none'; };

function openTrader(tr){
  toast('Trader: Moonberry 14g • Token 22g • Weapon 34g');
}

function wirePaleyHover(){
  const mount=document.getElementById('paleyMount');
  if(!mount) return;
  mount.innerHTML = paleySVG(window._paleyHi ?? -1);
  const svg=mount.querySelector('svg');
  if(!svg) return;
  // crude hover: map mouse to 7 nodes
  svg.addEventListener('mousemove', e=>{
    const r=svg.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width*300;
    const y=(e.clientY-r.top)/r.height*250;
    // find nearest node
    const nodes = FACTIONS.map((_,i)=>{
      const ang=-Math.PI/2 + i*2*Math.PI/7;
      return {i, nx:150+Math.cos(ang)*94, ny:129+Math.sin(ang)*94};
    });
    let best=-1, bd=22;
    nodes.forEach(n=>{ const d=Math.hypot(n.nx-x, n.ny-y); if(d<bd){bd=d; best=n.i;} });
    if(best!==window._paleyHi){ window._paleyHi=best; mount.innerHTML = paleySVG(best); wirePaleyHover(); }
  });
  svg.addEventListener('mouseleave', ()=>{ window._paleyHi=-1; mount.innerHTML = paleySVG(-1); wirePaleyHover(); });
}

function pulseEnd(){ const b=document.getElementById('btnEndTurn'); if(!b) return; b.style.transform='scale(1.05)'; setTimeout(()=>b.style.transform='',160); }
function toast(msg, bad){ const t=document.getElementById('toast'); t.textContent=msg; t.style.borderColor = bad ? '#c44' : '#b99b6a'; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1800); }
function showVictory(){
  if(!G.winnerId) return;
  const w = G.champions.find(c=>c.id===G.winnerId);
  if(!w) return;
  document.getElementById('victoryText').innerHTML = `<span style="color:${FACTIONS[w.faction].color}">${w.name}</span><br><span style="font-size:16px;color:#5a3a22">${G.victoryReason}</span>`;
  document.getElementById('victoryModal').style.display='flex';
}
window.restartToSetup = ()=>{ location.reload(); };

// expose for combat card fallback
window.__SUPERNAL__ = { potencyWithPrimary: (ch)=>{ const t=ch.tokens.slice(); t[ch.faction]+=ch.relics||0; let w=Math.min(...t.filter((_,i)=>i!==ch.faction)); if(!isFinite(w)) w=0; t[ch.faction]+=w; return t; } };
