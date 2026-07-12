import { FACTIONS, ARTIFACTS, potencyWithPrimary } from '../core/factions.js';
import { weatherForDay } from '../core/weather.js';
import { makeRng, stringSeed } from '../core/rng.js';
import { generateTiles, hexRing, nearestOpenKey, coordKey, parseKey, distance, neighbors, TERRAIN } from '../world/map.js';

export function createGame({seed='glut-17', radius=7, champions=[], objectives={relicRace:true, relicTarget:7, lastStanding:true}}){
  const tiles = generateTiles(seed, radius);
  const rng = makeRng(seed);
  const rand = ()=> rng();
  const state = {
    screen:'world',
    seed, radius, day:1,
    weather: weatherForDay(1),
    tiles, champions:[], mobs:[], traders:[],
    currentOrder:[], globalOrder:[],
    activeChampionId:'',
    objectives,
    logs:['The page wakes. The Interregnum begins.'],
    selectedTile:null,
    reward:null,
    notice:null,
    winnerId:null,
    victoryReason:'',
    _rng: rng,
  };

  const ring = hexRing(Math.max(2, radius-2));
  const used = new Set();
  champions.forEach((entry, index)=>{
    const baseGuess = ring[Math.floor((index / champions.length) * ring.length) % ring.length];
    const baseKey = nearestOpenKey(tiles, baseGuess, used, true);
    used.add(baseKey);
    tiles[baseKey].terrain='plains';
    tiles[baseKey].feature = {kind:'base', faction: entry.faction};
    const startKey = nearestOpenKey(tiles, parseKey(baseKey), used, false);
    used.add(startKey);
    const start = parseKey(startKey);
    const tokens = Array(7).fill(1);
    tokens[entry.faction] = 3;
    state.champions.push({
      id:`champ-${entry.faction}-${index}`,
      name:`${FACTIONS[entry.faction].name} Champion`,
      faction: entry.faction,
      controller: entry.controller,
      pos:start, hp:100, maxHp:100,
      baseMove:5, moves:0, sight:4,
      gold:24, knot:0, relics:0,
      tokens,
      artifact:null,
      armor:'worn linen', weapon:'ash staff',
      offeredArtifact:false, pendingDig:false, lastActionCombat:false,
      alive:true, visible:[], explored:[],
    });
  });

  // mobs
  const mobNames=['Ink Bear','Lunar Leopard','Snail Knight','Solar Tapir','Abusive Mushroom','Marginal Goose','Scorpiocelot'];
  const passable = Object.keys(tiles).filter(k=> TERRAIN[tiles[k].terrain].passable && !tiles[k].feature && !used.has(k));
  const mobCount = Math.max(6, radius*2);
  for(let i=0;i<mobCount;i++){
    if(!passable.length) break;
    const key = passable.splice(Math.floor(rand()*passable.length),1)[0];
    const faction = Math.floor(rand()*7);
    const potencies = Array(7).fill(0).map((_,c)=> 3 + (c===faction?5:0) + ([1,2,4].includes((c-faction+7)%7)?1:0));
    state.mobs.push({
      id:`mob-${i}`, name: mobNames[i % mobNames.length],
      faction, pos: parseKey(key),
      hp: 36 + Math.floor(rand()*18), maxHp: 52,
      potencies, alive:true, tier:1, lootGold: 12+Math.floor(rand()*14),
      aggressive: rand()<0.25,
    });
  }

  // traders
  for(let i=0;i<3;i++){
    const key = Object.keys(tiles).find(k=> TERRAIN[tiles[k].terrain].passable && !tiles[k].feature && !used.has(k));
    if(!key) break;
    used.add(key);
    state.traders.push({
      id:`tr-${i}`, pos: parseKey(key),
      stock: traderStock(rand),
      targetBaseKey: Object.keys(tiles).filter(k=> tiles[k].feature?.kind==='base')[i % champions.length] || key,
      movesPerDay:2,
    });
  }

  state.currentOrder = shuffle([...state.champions.map(c=>c.id)], rand);
  state.globalOrder = [...state.currentOrder];
  state.activeChampionId = state.currentOrder[0];
  refreshVision(state);
  beginTurn(state, state.activeChampionId);
  return state;
}

export function traderStock(rand){
  return [
    {type:'heal', name:'Moonberry', cost:14, heal:10},
    {type:'token', faction: Math.floor(rand()*7), cost:22},
    {type:'equip', slot:'weapon', name:['Thorn Brand','Chrono Quill','Masque Knife'][Math.floor(rand()*3)], cost:34, bonus:{secondary:1}},
  ];
}

export function shuffle(arr, rand){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(rand()* (i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

export function getChampion(state,id){ return state.champions.find(c=>c.id===id); }
export function occupiedByChampion(state,key){ return state.champions.find(c=>c.alive && coordKey(c.pos)===key); }
export function occupiedByMob(state,key){ return state.mobs.find(m=>m.alive && coordKey(m.pos)===key); }
export function occupiedByTrader(state,key){ return state.traders.find(t=> coordKey(t.pos)===key); }

export function isBlockedForMovement(state,key,movingId){
  const tile = state.tiles[key];
  if(!tile || !TERRAIN[tile.terrain].passable) return true;
  if(tile.feature?.kind==='base') return true;
  const champ = occupiedByChampion(state,key);
  if(champ && champ.id!==movingId) return true;
  if(occupiedByMob(state,key)) return true;
  return false;
}

export function visibleKeysFor(state, champ){
  const sight = champ.sight + (champ.artifact==='lens'?1:0);
  return Object.keys(state.tiles).filter(k=> distance(champ.pos, parseKey(k)) <= sight);
}
export function refreshVision(state){
  for(const c of state.champions){
    if(!c.alive) continue;
    const vis = visibleKeysFor(state,c);
    c.visible = vis;
    c.explored = Array.from(new Set([...(c.explored||[]), ...vis]));
  }
}
export function getHumanView(state){
  const humans = state.champions.filter(c=> c.controller==='human' && c.alive);
  return {
    visible: new Set(humans.flatMap(c=> c.visible||[])),
    explored: new Set(humans.flatMap(c=> c.explored||[])),
  };
}

export function movementRange(state, champ){
  const start = coordKey(champ.pos);
  const costs = {[start]:0};
  const q=[start];
  while(q.length){
    const cur=q.shift(); const cc=costs[cur];
    for(const n of neighbors(parseKey(cur))){
      const key=coordKey(n);
      if(isBlockedForMovement(state,key,champ.id)) continue;
      const nc=cc+1;
      if(nc <= champ.moves && (costs[key]===undefined || nc < costs[key])){
        costs[key]=nc; q.push(key);
      }
    }
  }
  return costs;
}

export function addLog(state, text){ state.logs = [text, ...state.logs].slice(0,18); }

export function dailyMoves(state, champ){
  const artifactMove = champ.artifact==='spur'?1:0;
  const verdantMove = champ.faction===2 ? 1 : 0;
  return Math.max(1, Math.floor((champ.baseMove + artifactMove + verdantMove) * state.weather.dayLength));
}

export function artifactChoices(state){
  const pool=[...ARTIFACTS];
  const r = state._rng;
  const a = pool.splice(Math.floor(r()*pool.length),1)[0];
  const b = pool.splice(Math.floor(r()*pool.length),1)[0];
  return [a,b].map(x=> ({id:x.id, label:x.name, detail:x.detail, artifactId:x.id}));
}

export function beginTurn(state, champId){
  const ch = getChampion(state, champId);
  if(!ch || !ch.alive) return;
  ch.moves = dailyMoves(state, ch);
  ch.lastActionCombat=false;
  if(ch.artifact==='ledger') ch.gold += 2;
  if(ch.artifact==='bandage') ch.hp = Math.min(ch.maxHp, ch.hp+2);
  // Reverie
  if(ch.faction===1){
    const roll = Math.floor(state._rng()*5);
    if(roll===0) ch.gold+=4;
    else if(roll===1) ch.moves+=1;
    else if(roll===2) ch.hp=Math.min(ch.maxHp, ch.hp+4);
    else if(roll===4) ch.tokens[Math.floor(state._rng()*7)] +=1;
    addLog(state, `${ch.name} receives a Reverie dream.`);
  }
  // pending dig
  if(ch.pendingDig){
    ch.pendingDig=false;
    const roll = state._rng();
    if(roll < 0.075){
      ch.relics++; addLog(state, `${ch.name} digs up a relic!`);
      if(ch.controller==='human'){
        state.reward = { championId: ch.id, title:'A relic under the dust', body:'Divine shard, still warm.', guaranteed:['+1 relic', `+1 ${FACTIONS[ch.faction].name} potency`], choices:null };
      }
      // Archive racial
      if(ch.faction===3){ const rf=Math.floor(state._rng()*7); ch.tokens[rf]++; }
    } else if(roll < 0.33){
      const f=Math.floor(state._rng()*7); ch.tokens[f]++; addLog(state, `${ch.name} digs up a ${FACTIONS[f].name} token.`);
    } else {
      const gold = 7 + Math.floor(state._rng()*12) + Math.floor(state.day/7);
      ch.gold += gold; addLog(state, `${ch.name} digs up ${gold} gold.`);
    }
  }
  // artifact draft first turn
  if(!ch.offeredArtifact){
    if(ch.controller==='human'){
      state.reward = {
        championId: ch.id,
        title:'First illumination',
        body:'Two artifacts shine from the margin. Choose one permanent blessing.',
        guaranteed:[],
        choices: artifactChoices(state),
      };
    } else {
      const picks = artifactChoices(state);
      ch.artifact = picks[0].artifactId;
      ch.offeredArtifact = true;
      addLog(state, `${ch.name} accepts ${picks[0].label}.`);
    }
  }
  refreshVision(state);
}

export function isDigEligible(state, champ){
  const key = coordKey(champ.pos);
  const tile = state.tiles[key];
  return TERRAIN[tile.terrain].passable && !tile.feature && !occupiedByMob(state,key) && !champ.lastActionCombat;
}

export function interactOnArrival(state, champ){
  const tile = state.tiles[coordKey(champ.pos)];
  if(tile.feature?.kind==='tree' && tile.feature.ripe !== false){
    // fruit check by day
    if(!tile.feature.nextFruitDay || state.day >= tile.feature.nextFruitDay){
      const heal = champ.faction===2 ? 34 : 18;
      champ.hp = Math.min(champ.maxHp, champ.hp + heal);
      tile.feature.nextFruitDay = state.day + 4;
      tile.feature.ripe = false;
      addLog(state, `${champ.name} eats manuscript fruit (+${heal} HP).`);
    }
  }
  if(tile.feature?.kind==='knot' && !tile.feature.mined){
    const amt = tile.feature.amount || 2;
    champ.knot += amt;
    tile.feature.mined = true;
    addLog(state, `${champ.name} mines ${amt} God's Knot.`);
    // remove visual
    tile.feature = null;
  }
}

export function moveChampion(state, champ, targetKey, cost){
  champ.pos = parseKey(targetKey);
  champ.moves = Math.max(0, champ.moves - cost);
  champ.lastActionCombat = false;
  interactOnArrival(state, champ);
  refreshVision(state);
}

export function checkVictory(state){
  const living = state.champions.filter(c=>c.alive);
  if(state.objectives.relicRace){
    const w = living.find(c=> c.relics >= state.objectives.relicTarget);
    if(w){ state.winnerId=w.id; state.victoryReason=`${w.name} gathered ${w.relics} relics.`; return true; }
  }
  if(state.objectives.lastStanding && living.length===1){
    state.winnerId=living[0].id; state.victoryReason=`${living[0].name} is the last champion standing.`; return true;
  }
  if(living.length===0){ state.winnerId='none'; state.victoryReason='The Interregnum consumes all.'; return true; }
  return false;
}

export function advanceTurn(state){
  if(checkVictory(state)) return;
  const livingOrder = state.currentOrder.filter(id=> getChampion(state,id)?.alive);
  const idx = livingOrder.indexOf(state.activeChampionId);
  if(idx >=0 && idx+1 < livingOrder.length){
    state.activeChampionId = livingOrder[idx+1];
  } else {
    // world turn
    runWorldTurn(state);
    state.day += 1;
    state.weather = weatherForDay(state.day);
    addLog(state, `— Day ${state.day}: ${state.weather.name}. ${state.weather.text}`);
    state.currentOrder = state.globalOrder.filter(id=> getChampion(state,id)?.alive);
    state.activeChampionId = state.currentOrder[0] || null;
  }
  if(state.activeChampionId) beginTurn(state, state.activeChampionId);
}

export function finishTurn(state){
  const champ = getChampion(state, state.activeChampionId);
  if(champ && champ.alive){
    const tile = state.tiles[coordKey(champ.pos)];
    if(tile?.feature?.kind==='knot' && !tile.feature.mined){
      interactOnArrival(state, champ);
    } else if(isDigEligible(state, champ)){
      champ.pendingDig = true;
      addLog(state, `${champ.name} spends the night digging in blank parchment.`);
    }
  }
  advanceTurn(state);
}

function runWorldTurn(state){
  // mob harass
  for(const mob of state.mobs.filter(m=>m.alive)){
    const adj = state.champions.find(c=> c.alive && c.faction!==2 && distance(c.pos, mob.pos)===1);
    if(adj && Math.random()<0.55){
      const dmg = 4 + Math.floor(Math.random()*5);
      adj.hp -= dmg;
      addLog(state, `${mob.name} harasses ${adj.name} for ${dmg} damage.`);
      if(adj.hp<=0){ adj.alive=false; state.notice=`${adj.name} was erased by marginalia.`; }
    } else if(mob.aggressive && Math.random()<0.45){
      // wander
      const opts = neighbors(mob.pos).map(coordKey).filter(k=> state.tiles[k] && TERRAIN[state.tiles[k].terrain].passable && !occupiedByChampion(state,k) && !occupiedByMob(state,k));
      if(opts.length){ mob.pos = parseKey(opts[Math.floor(Math.random()*opts.length)]); }
    }
  }
  // regrow trees
  for(const t of Object.values(state.tiles)){
    if(t.feature?.kind==='tree' && t.feature.nextFruitDay && state.day >= t.feature.nextFruitDay){
      t.feature.ripe = true;
    }
  }
  // traders move
  for(const tr of state.traders){
    for(let s=0;s<tr.movesPerDay;s++){
      const target = state.tiles[tr.targetBaseKey] || tr.pos;
      const dx = Math.sign(target.q - tr.pos.q);
      const dy = Math.sign(target.r - tr.pos.r);
      let nx = tr.pos.q + dx, ny = tr.pos.r + dy;
      const nk = `${nx},${ny}`;
      if(state.tiles[nk] && TERRAIN[state.tiles[nk].terrain].passable && !occupiedByChampion(state,nk)){
        tr.pos = {q:nx,r:ny};
      }
      if(nk === tr.targetBaseKey){
        // pick new base
        const bases = Object.entries(state.tiles).filter(([k,v])=> v.feature?.kind==='base').map(([k])=>k);
        tr.targetBaseKey = bases[Math.floor(Math.random()*bases.length)] || nk;
        break;
      }
    }
  }
}
