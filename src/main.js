import { FACTIONS, ARTIFACTS, beats } from './core/factions.js';
import { createGame, getChampion, movementRange, moveChampion, finishTurn, advanceTurn, addLog, isDigEligible, getHumanView, refreshVision, checkVictory } from './game/state.js';
import { renderHexMapSVG, setupMapInteraction, camera, resetCamera, HEX_WIDTH, HEX_HEIGHT } from './render/hexmap.js';
import { renderLeftPanel, renderRightPanel, renderLog } from './render/ui.js';
import { paleySVG } from './render/paley.js';
import { runBotTurn as aiDecide } from './game/ai.js';
import { 
  createCombatState, getActiveCombatant, isPickingPhase, isRevealPhase,
  recordCombatPick, advanceCombatPhase, processReveal, resolveRoundDamage,
  nextCombatRound, botCombatPick, getAvailablePicks, finalizeCombat
} from './game/combat.js';
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
    resetCamera();
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
  document.getElementById('zoomIn')?.addEventListener('click', ()=> zoomMap(1.3));
  document.getElementById('zoomOut')?.addEventListener('click', ()=> zoomMap(0.77));
  document.getElementById('zoomReset')?.addEventListener('click', resetCameraView);
  document.getElementById('centerChampion')?.addEventListener('click', centerOnChampion);
  document.addEventListener('click', e=>{
    if(e.target && e.target.id==='btnEndTurn') onEndTurn();
    if(e.target && e.target.id==='btnInspect') toast('Click a highlighted hex to move. Adjacent foes to duel. End turn on empty parchment to dig.');
  });
  // Keyboard shortcuts
  window.addEventListener('keydown', (e)=>{
    if(e.target.tagName === 'INPUT') return;
    if(e.key === 'c' || e.key === 'C') centerOnChampion();
    if(e.key === 'r' || e.key === 'R') resetCameraView();
    if(e.key === '+' || e.key === '=') zoomMap(1.3);
    if(e.key === '-' || e.key === '_') zoomMap(0.77);
    if(e.key === ' ') { e.preventDefault(); onEndTurn(); }
  });
}

function zoomMap(factor){
  const svgEl = document.getElementById('hexMapSvg');
  if(!svgEl) return;
  const rect = svgEl.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const newScale = Math.max(0.35, Math.min(3.5, camera.scale * factor));
  camera.tx = centerX - (centerX - camera.tx) * (newScale / camera.scale);
  camera.ty = centerY - (centerY - camera.ty) * (newScale / camera.scale);
  camera.scale = newScale;
  applyCameraTransform(svgEl);
  refreshZoomDisplay();
}

function resetCameraView(){
  resetCamera();
  const svgEl = document.getElementById('hexMapSvg');
  if(svgEl) applyCameraTransform(svgEl);
  refreshZoomDisplay();
}

function centerOnChampion(){
  const ch = currentChamp();
  if(!ch) return;
  const svgEl = document.getElementById('hexMapSvg');
  if(!svgEl) return;
  const mapResult = renderHexMapSVG(G, onHexClick); // recalc to get offsets
  const cx = mapResult.offsetX + (HEX_WIDTH * (ch.pos.q + ch.pos.r/2));
  const cy = mapResult.offsetY + (HEX_HEIGHT * ch.pos.r);
  const rect = svgEl.getBoundingClientRect();
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  // Center the champion
  camera.tx = centerX - cx * camera.scale;
  camera.ty = centerY - cy * camera.scale;
  applyCameraTransform(svgEl);
}

function refreshZoomDisplay(){
  const zoomEl = document.getElementById('hudZoom');
  if(zoomEl) zoomEl.textContent = `${Math.round(camera.scale * 100)}%`;
}

function currentChamp(){ return G ? G.champions.find(c=> c.id===G.activeChampionId) : null; }

function refreshAll(){
  if(!G) return;
  const ch = currentChamp();
  document.getElementById('leftMount').innerHTML = renderLeftPanel(G, ch);
  document.getElementById('rightMount').innerHTML = renderRightPanel(G);
  const mapResult = renderHexMapSVG(G, onHexClick);
  document.getElementById('mapMount').innerHTML = mapResult.svg;
  // Store offsets for click detection in camera
  camera.offsetX = mapResult.offsetX;
  camera.offsetY = mapResult.offsetY;
  // Setup pan/zoom, click handling, and tooltips
  const svgEl = document.getElementById('hexMapSvg');
  if(svgEl) setupMapInteraction(svgEl, onHexClick, getTooltipContent);
  wirePaleyHover();
  document.getElementById('logMount').innerHTML = renderLog(G);
  if(ch){
    document.getElementById('hudMoves').textContent = ch.moves;
    document.getElementById('hudPos').textContent = `${ch.pos.q},${ch.pos.r}`;
    document.getElementById('hudSight').textContent = ch.sight + (ch.artifact==='lens'?1:0);
    document.getElementById('dayLabel').textContent = `Day ${G.day} • ${G.weather.name}`;
    // Update zoom indicator
    const zoomPct = Math.round(camera.scale * 100);
    const zoomEl = document.getElementById('hudZoom');
    if(zoomEl) zoomEl.textContent = `${zoomPct}%`;
  }
  // Handle artifact choice reward (start of game)
  if(G.reward && G.reward.choices && !G.reward.guaranteed?.length){
    openArtifactChoiceModal(G.reward);
  }
  // bot auto (skip if any modal open)
  if(ch && ch.controller==='bot' && !G.reward && !G.notice && !G.winnerId){
    setTimeout(runBot, 620);
  }
  checkVictory(G);
  if(G.winnerId) showVictory();
}

function getTooltipContent(key){
  if(!G) return null;
  const t = G.tiles[key]; if(!t) return null;
  const humanView = getHumanView(G);
  const visible = humanView.visible.has(key);
  const explored = humanView.explored.has(key);
  if(!explored) return null;
  let html = `<b>${key}</b> — ${TERRAIN[t.terrain].label}`;
  if(t.feature) html += `<br>◈ ${t.feature.kind}${t.feature.kind==='knot' && !t.feature.mined ? ` (${t.feature.amount})` : ''}${t.feature.kind==='tree' && t.feature.ripe!==false ? ' 🍃' : ''}`;
  const mob = occupiedByMob(G,key); if(mob) html += `<br>⚠ ${mob.name} ${mob.hp}/${mob.maxHp}hp`;
  const ch = occupiedByChampion(G,key); if(ch) html += `<br>${FACTIONS[ch.faction].glyph} ${ch.name} ${ch.hp}/${ch.maxHp}hp`;
  const trader = occupiedByTrader(G,key); if(trader) html += `<br>₳ Wandering Trader`;
  const active = currentChamp();
  if(active && active.controller==='human'){
    const range = movementRange(G, active);
    if(range[key]!==undefined && range[key]>0) html += `<br><span style="color:#b88728">● Reachable (${range[key]} move)</span>`;
  }
  if(!visible) html = `<i style="color:#7a5634">[Explored]</i> ` + html;
  return html;
}

function onHexClick(key){
  if(!G || G.reward || G.notice || G.winnerId) return;
  const ch = currentChamp(); if(!ch || ch.controller!=='human') return;
  const range = movementRange(G, ch);
  const tile = G.tiles[key];
  if(!tile) return;
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

// ---- Combat UI (Phased: 4 turns per round) ----
function startCombat(attacker, defender){
  combatUI = createCombatState(attacker, defender);
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
  const { attacker, defender, round, phase, roundPicks, roundScores, lastReveal, combatLog, awaitingPick } = combatUI;
  
  const phaseLabels = {
    'pick1_attacker': 'Round ' + round + ' — Attacker chooses 1st power',
    'pick1_defender': 'Round ' + round + ' — Defender chooses 1st power',
    'reveal1': 'Round ' + round + ' — Revealing 1st clash',
    'pick2_defender': 'Round ' + round + ' — Defender chooses 2nd power',
    'pick2_attacker': 'Round ' + round + ' — Attacker chooses 2nd power',
    'reveal2': 'Round ' + round + ' — Revealing final clash',
    'round_end': 'Round ' + round + ' complete'
  };
  document.getElementById('combatRoundLabel').textContent = phaseLabels[phase] || 'Combat';

  document.getElementById('leftCombat').innerHTML = combatantCard(attacker, true, roundPicks.attacker, phase, awaitingPick === 'attacker' && isPickingPhase(combatUI));
  document.getElementById('rightCombat').innerHTML = combatantCard(defender, false, roundPicks.defender, phase, awaitingPick === 'defender' && isPickingPhase(combatUI));
  wireCombatTokenHover();

  updatePickSlots(roundPicks, lastReveal);

  if(isRevealPhase(combatUI)){
    setTimeout(() => processRevealPhase(), 600);
    return;
  }

  if(phase === 'round_end'){
    setTimeout(() => handleRoundEnd(), 800);
    return;
  }

  const commitBtn = document.getElementById('commitCombat');
  if(commitBtn){
    const active = getActiveCombatant(combatUI);
    const isHuman = active.controller === 'human';
    const currentPicks = roundPicks[awaitingPick];
    commitBtn.disabled = !isHuman || currentPicks.length >= 1;
    commitBtn.textContent = isHuman ? 'Commit Power' : 'Waiting...';
    commitBtn.style.opacity = isHuman ? '1' : '0.6';
  }

  if(isPickingPhase(combatUI)){
    const active = getActiveCombatant(combatUI);
    if(active.controller === 'bot'){
      setTimeout(() => makeBotPick(), 500);
    }
  }
}

function updatePickSlots(roundPicks, lastReveal){
  ['sA1','sA2'].forEach((id,i)=>{
    const el = document.getElementById(id);
    const pick = roundPicks.attacker[i];
    if(pick != null){ 
      const fac = FACTIONS[pick]; 
      el.textContent = fac.glyph + ' ' + fac.name; 
      el.style.borderColor = fac.color; 
      el.style.background = fac.color + '22'; 
    } else { 
      el.textContent = i===0 ? 'Pick 1' : 'Pick 2'; 
      el.style.borderColor = ''; 
      el.style.background = ''; 
    }
    if(lastReveal && lastReveal.pickA === pick){
      el.style.boxShadow = '0 0 8px #5fbf7a';
    }
  });
  ['sB1','sB2'].forEach((id,i)=>{
    const el = document.getElementById(id);
    const pick = roundPicks.defender[i];
    if(pick != null){ 
      const fac = FACTIONS[pick]; 
      el.textContent = fac.glyph + ' ' + fac.name; 
      el.style.borderColor = fac.color; 
      el.style.background = fac.color + '22'; 
    } else { 
      el.textContent = '???'; 
      el.style.borderColor = ''; 
      el.style.background = ''; 
    }
    if(lastReveal && lastReveal.pickB === pick){
      el.style.boxShadow = '0 0 8px #5fbf7a';
    }
  });
}

function processRevealPhase(){
  if(!combatUI || !isRevealPhase(combatUI)) return;
  const reveal = processReveal(G, combatUI);
  if(reveal){
    document.getElementById('csLeft').textContent = combatUI.roundScores.attacker;
    document.getElementById('csRight').textContent = combatUI.roundScores.defender;
    document.getElementById('combatLog').textContent = reveal.logA + '  vs  ' + reveal.logB;
    animateReveal(reveal);
  }
  setTimeout(() => {
    advanceCombatPhase(combatUI);
    renderCombat();
  }, 1200);
}

function animateReveal(reveal){
  const leftSlots = document.querySelectorAll('#leftCombat .ctok');
  const rightSlots = document.querySelectorAll('#rightCombat .ctok');
  leftSlots.forEach(el => { if(+el.dataset.f === reveal.pickA) el.style.transform = 'scale(1.15)'; });
  rightSlots.forEach(el => { if(+el.dataset.f === reveal.pickB) el.style.transform = 'scale(1.15)'; });
  setTimeout(() => {
    leftSlots.forEach(el => el.style.transform = '');
    rightSlots.forEach(el => el.style.transform = '');
  }, 1000);
}

function handleRoundEnd(){
  if(!combatUI || combatUI.phase !== 'round_end') return;
  
  const { attacker, defender, roundScores } = combatUI;
  const { scoreA, scoreB } = applyFinalBonuses(G, attacker, defender, roundScores.attacker, roundScores.defender);
  combatUI.roundScores.attacker = scoreA;
  combatUI.roundScores.defender = scoreB;
  
  document.getElementById('csLeft').textContent = scoreA;
  document.getElementById('csRight').textContent = scoreB;
  
  const dmgResult = resolveRoundDamage(G, combatUI);
  document.getElementById('combatLog').textContent = `Round ${combatUI.round} damage: ${dmgResult.to === 'attacker' ? attacker.name : defender.name} takes ${dmgResult.damage}`;
  
  if(dmgResult.defenderDead){
    const rew = finalizeCombat(G, attacker, defender, true);
    closeCombat();
    openRewardModal(attacker, rew);
    refreshAll();
    return;
  }
  if(dmgResult.attackerDead){
    closeCombat();
    refreshAll();
    toast('You were defeated.', true);
    return;
  }
  
  setTimeout(() => {
    nextCombatRound(combatUI);
    renderCombat();
  }, 1500);
}

function applyFinalBonuses(state, A, B, scoreA, scoreB){
  const week = Math.floor((state.day-1)/7)+1;
  if(A.faction===0){ scoreB = Math.max(0, scoreB - week); }
  if(B.faction===0){ scoreA = Math.max(0, scoreA - week); }
  let bonusA = state.weather.score[A.faction] || 0;
  if(A.tokens){
    if(A.artifact==='margin') bonusA += 2;
    if(A.faction===6){
      const missing = A.maxHp - A.hp;
      bonusA += Math.ceil(missing/10) * Math.ceil(week/3);
    }
  }
  let bonusB = state.weather.score[B.faction] || 0;
  if(B.tokens){
    if(B.artifact==='margin') bonusB += 2;
    if(B.faction===6){
      const missing = B.maxHp - B.hp;
      bonusB += Math.ceil(missing/10) * Math.ceil(week/3);
    }
  }
  scoreA += bonusA;
  scoreB += bonusB;
  return { scoreA, scoreB };
}

function makeBotPick(){
  if(!combatUI || !isPickingPhase(combatUI)) return;
  const active = getActiveCombatant(combatUI);
  if(active.controller !== 'bot') return;
  
  const available = getAvailablePicks(active);
  const opponent = combatUI.awaitingPick === 'attacker' ? combatUI.defender : combatUI.attacker;
  const opponentPicks = combatUI.roundPicks[combatUI.awaitingPick === 'attacker' ? 'defender' : 'attacker'];
  const pick = botCombatPick(active, opponentPicks, available);
  
  recordCombatPick(combatUI, pick);
  advanceCombatPhase(combatUI);
  renderCombat();
}

window.commitCombat = function(){
  if(!combatUI || !isPickingPhase(combatUI)) return;
  const active = getActiveCombatant(combatUI);
  if(active.controller !== 'human') return;
  
  const selectedEls = document.querySelectorAll('#leftCombat .ctok.sel, #rightCombat .ctok.sel');
  if(selectedEls.length === 0){
    toast('Select a power first!');
    return;
  }
  const pick = +selectedEls[0].dataset.f;
  
  recordCombatPick(combatUI, pick);
  advanceCombatPhase(combatUI);
  renderCombat();
};

function combatantCard(ent, isLeft, roundPicks, phase, isActivePicker){
  const isChamp = !!ent.tokens;
  const pots = isChamp ? (()=>{
    const t = ent.tokens.slice(); t[ent.faction] += ent.relics||0;
    let weakest = Math.min(...t.filter((_,i)=> i!==ent.faction));
    if(!isFinite(weakest)) weakest=0; t[ent.faction]+=weakest; return t;
  })() : ent.potencies;
  
  const lockedPicks = new Set(roundPicks);
  
  return `<h3 style="color:${FACTIONS[ent.faction||0].color}">${ent.name||FACTIONS[ent.faction].name+' Champion'}</h3>
  <div class="hpbar"><div class="hpfill" style="width:${Math.round(ent.hp/ent.maxHp*100)}%"></div></div>
  <div class="mini">${ent.hp} / ${ent.maxHp} HP</div>
  <div class="combat-tokens">${pots.map((v,i)=>`<div class="ctok ${lockedPicks.has(i)?'used':''} ${isLeft && isActivePicker && !lockedPicks.has(i)?'pickable':''}" data-f="${i}" style="border-color:${FACTIONS[i].color}66; opacity:${lockedPicks.has(i)?0.5:1}"><div style="font-weight:800">${v}</div><div style="font-size:9px;color:${FACTIONS[i].color}">${FACTIONS[i].glyph}</div></div>`).join('')}</div>`;
}

function wireCombatTokenHover(){
  document.querySelectorAll('.combat-tokens .ctok:not(.used)').forEach(el=>{
    el.addEventListener('mouseenter', ()=> onCombatTokenHover(+el.dataset.f));
    el.addEventListener('mouseleave', ()=> onCombatTokenHover(-1));
    el.addEventListener('click', ()=> {
      if(el.classList.contains('pickable')){
        document.querySelectorAll('.combat-tokens .ctok').forEach(e=> e.classList.remove('sel'));
        el.classList.add('sel');
      }
    });
  });
}

function onCombatTokenHover(factionIdx){
  document.querySelectorAll('.combat-tokens .ctok').forEach(el=>{
    const f = +el.dataset.f;
    if(factionIdx === -1){
      el.style.boxShadow = '';
      el.style.transform = '';
      el.style.zIndex = '';
    } else if(f === factionIdx){
      el.style.boxShadow = '0 0 12px #5fbf7a, 0 0 24px #5fbf7a88';
      el.style.transform = 'scale(1.12)';
      el.style.zIndex = '10';
    } else if(beats(factionIdx, f)){
      el.style.boxShadow = '0 0 8px #5fbf7a88';
      el.style.opacity = '0.9';
    } else if(beats(f, factionIdx)){
      el.style.boxShadow = '0 0 8px #c44';
      el.style.opacity = '0.7';
    } else {
      el.style.opacity = '0.4';
    }
  });
  const paleyMount = document.getElementById('paleyMount');
  if(paleyMount){
    window._paleyHi = factionIdx;
    paleyMount.innerHTML = paleySVG(factionIdx);
    wirePaleyHover();
  }
}

function openRewardModal(champ, rew){
  if(champ.controller!=='human' || !rew) return;
  const modal=document.getElementById('rewardModal');
  document.getElementById('rewardTitle').textContent='Combat Victory';
  document.getElementById('rewardBody').textContent=`Relic secured. +${rew.gold} gold.`;
  modal.style.display='flex';
}
window.closeReward = function(){ document.getElementById('rewardModal').style.display='none'; };

function openArtifactChoiceModal(reward){
  const modal = document.getElementById('rewardModal');
  document.getElementById('rewardTitle').textContent = reward.title;
  const choicesHtml = reward.choices.map((c, i) => `
    <div class="artifact-choice" data-idx="${i}" style="
      background:#fff7dfaa;border:2px solid #d0a86a;border-radius:10px;padding:12px;margin:8px 0;
      cursor:pointer;transition:border-color .15s,background .15s;
    ">
      <div style="font-weight:800;color:#9a5a12;font-size:15px">${c.label}</div>
      <div class="mini" style="color:#5a3a22;margin-top:4px">${c.detail}</div>
    </div>
  `).join('');
  document.getElementById('rewardBody').innerHTML = `${reward.body}<div style="margin-top:10px">${choicesHtml}</div>`;
  modal.style.display='flex';
  document.querySelectorAll('.artifact-choice').forEach(el => {
    el.onmouseenter = () => { el.style.borderColor = '#b88728'; el.style.background = '#fff4cf'; };
    el.onmouseleave = () => { el.style.borderColor = '#d0a86a'; el.style.background = '#fff7dfaa'; };
    el.onclick = () => {
      const idx = +el.dataset.idx;
      const choice = reward.choices[idx];
      const ch = getChampion(G, reward.championId);
      if(ch){
        ch.artifact = choice.artifactId;
        ch.offeredArtifact = true;
        addLog(G, `${ch.name} claims the ${choice.label}.`);
        G.reward = null;
        modal.style.display = 'none';
        refreshAll();
      }
    };
  });
}

function openTrader(tr){
  toast('Trader: Moonberry 14g • Token 22g • Weapon 34g');
}

function wirePaleyHover(){
  const mount=document.getElementById('paleyMount');
  if(!mount) return;
  mount.innerHTML = paleySVG(window._paleyHi ?? -1);
  const svg=mount.querySelector('svg');
  if(!svg) return;
  svg.addEventListener('mousemove', e=>{
    const r=svg.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width*300;
    const y=(e.clientY-r.top)/r.height*250;
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

window.__SUPERNAL__ = { potencyWithPrimary: (ch)=>{ const t=ch.tokens.slice(); t[ch.faction]+=ch.relics||0; let w=Math.min(...t.filter((_,i)=>i!==ch.faction)); if(!isFinite(w)) w=0; t[ch.faction]+=w; return t; } };