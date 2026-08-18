
// Champions of the Supernal Interregnum — Factions
// Paley tournament: i beats i+1, i+2, i+4 mod 7
//0 beats 1, 2, 4
//1 beats 2, 3, 5
//2 beats 3, 4, 6
//3 beats 4, 5, 0
//4 beats 5, 6, 1
//5 beats 6, 0, 2
//6 beats 0, 1, 3

export const FACTIONS = [
  { id:0, name:'Crucible', short:'CRU', glyphId:'g-crucible', textGlyph:'[CRU]', base:'#6e2e22', color:'#b84530', glow:'#e87a6a', uiColor:'#e0604a', uiGlow:'#ff9d8a', trait:'Scarshield', desc:'–week enemy final score', terrainCosts:{ hill:6, plateau:6 } },
  { id:1, name:'Reverie', short:'REV', glyphId:'g-reverie',  textGlyph:'[REV]', base:'#5a3a5a', color:'#8a5aaa', glow:'#b388f0', uiColor:'#b06ae0', uiGlow:'#d4a0ff', trait:"Another's Dream", desc:'Dawn random boon', terrainCosts:{ marsh:6 } },
  { id:2, name:'Verdant', short:'VER', glyphId:'g-verdant',  textGlyph:'[VER]', base:'#3a5a3a', color:'#5a8a4a', glow:'#88d888', uiColor:'#6ad06a', uiGlow:'#a8f0a8', trait:"Gaia's Wail", desc:'Cheap forest moves, mobs pacified, Blessed Font heal++', terrainCosts:{ forest:4, deepWood:6 } },
  { id:3, name:'Archive', short:'ARC', glyphId:'g-archive',  textGlyph:'[ARC]', base:'#3a4a5a', color:'#5a7a9a', glow:'#8ab8f0', uiColor:'#5aa8e0', uiGlow:'#9cc8ff', trait:'Everknown', desc:'Relic → +random potency', terrainCosts:{ river:15 } },
  { id:4, name:'Hearth',  short:'HRT', glyphId:'g-hearth',   textGlyph:'[HRT]', base:'#5a4a22', color:'#9a8a3a', glow:'#efc86b', uiColor:'#d8b048', uiGlow:'#ffe08a', trait:'Compersion', desc:'Trade -20%', terrainCosts:{ plains:6, desert:6 } },
  { id:5, name:'Masque',  short:'MSK', glyphId:'g-masque',   textGlyph:'[MSK]', base:'#5a3a4a', color:'#8a5a7a', glow:'#e488c0', uiColor:'#d060a8', uiGlow:'#f0a8d8', trait:'Silent Ovation', desc:'Combat turn +week random', terrainCosts:{ desert:6 } },
  { id:6, name:'Hollow',  short:'HOL', glyphId:'g-hollow',   textGlyph:'[HOL]', base:'#3a3a44', color:'#5a5a7a', glow:'#a0a8c0', uiColor:'#8080b0', uiGlow:'#b8b8e0', trait:'Vaunted Nothing', desc:'+⌈week/3⌉ per missing HP', terrainCosts:{ deepWood:10 } },
];

export const beats = (a,b)=> ((b - a + 7) % 7 === 1) || ((b - a + 7) % 7 === 2) || ((b - a + 7) % 7 === 4);

export const BEATS_MATRIX = FACTIONS.map((_,a)=> FACTIONS.map((__,b)=> beats(a,b)));

// 48 canonical Paley Hamiltonian cycles (24 CW + 24 CCW), each [7]
// CW:  cycle[i] beats cycle[(i+1)%7]  — clockwise neighbor is a faction you beat
// CCW: cycle[(i+1)%7] beats cycle[i]  — clockwise neighbor beats you
// Apply a random rotation (0-6) for 336 equally likely spawn arrangements.
export const PALEY_CYCLES = [
  [0, 1, 2, 3, 4, 5, 6],
  [0, 1, 2, 4, 5, 6, 3],
  [0, 1, 2, 4, 6, 3, 5],
  [0, 1, 2, 6, 3, 4, 5],
  [0, 1, 3, 4, 5, 2, 6],
  [0, 1, 3, 5, 2, 4, 6],
  [0, 1, 5, 2, 3, 4, 6],
  [0, 1, 5, 2, 4, 6, 3],
  [0, 2, 3, 4, 1, 5, 6],
  [0, 2, 3, 4, 6, 1, 5],
  [0, 2, 4, 1, 3, 5, 6],
  [0, 2, 4, 1, 5, 6, 3],
  [0, 2, 4, 5, 6, 1, 3],
  [0, 2, 4, 6, 1, 3, 5],
  [0, 2, 6, 1, 3, 4, 5],
  [0, 2, 6, 3, 4, 1, 5],
  [0, 4, 1, 2, 3, 5, 6],
  [0, 4, 1, 2, 6, 3, 5],
  [0, 4, 1, 3, 5, 2, 6],
  [0, 4, 1, 5, 2, 6, 3],
  [0, 4, 5, 2, 6, 1, 3],
  [0, 4, 5, 6, 1, 2, 3],
  [0, 4, 6, 1, 2, 3, 5],
  [0, 4, 6, 1, 5, 2, 3],
  [0, 3, 1, 6, 2, 5, 4],
  [0, 3, 1, 6, 5, 4, 2],
  [0, 3, 2, 1, 6, 5, 4],
  [0, 3, 2, 5, 1, 6, 4],
  [0, 3, 6, 2, 5, 1, 4],
  [0, 3, 6, 4, 2, 5, 1],
  [0, 3, 6, 5, 1, 4, 2],
  [0, 3, 6, 5, 4, 2, 1],
  [0, 5, 1, 4, 3, 6, 2],
  [0, 5, 1, 6, 4, 3, 2],
  [0, 5, 3, 1, 6, 4, 2],
  [0, 5, 3, 2, 1, 6, 4],
  [0, 5, 3, 6, 2, 1, 4],
  [0, 5, 3, 6, 4, 2, 1],
  [0, 5, 4, 3, 1, 6, 2],
  [0, 5, 4, 3, 6, 2, 1],
  [0, 6, 2, 5, 3, 1, 4],
  [0, 6, 2, 5, 4, 3, 1],
  [0, 6, 4, 2, 5, 3, 1],
  [0, 6, 4, 3, 2, 5, 1],
  [0, 6, 5, 1, 4, 3, 2],
  [0, 6, 5, 3, 1, 4, 2],
  [0, 6, 5, 3, 2, 1, 4],
  [0, 6, 5, 4, 3, 2, 1],
];

export function potencyWithPrimary(champ){
  const raw = champ.potencies;
  if (!raw) return Array(7).fill(0).map((_, i) => i === champ.faction ? 5 : 0);
  const t = raw.slice();
  // Pad to length 7 if array is shorter
  while (t.length < 7) t.push(0);
  const primary = champ.faction;
  let weakest = Infinity;
  for(let i=0;i<7;i++) if(i!==primary) weakest = Math.min(weakest, t[i]);
  if(!isFinite(weakest)) weakest = 0;
  t[primary] += weakest;
  return t;
}

export const ARTIFACTS = [
  { id:'spur', name:"Pilgrim's Spur", type:'artifact',
    effects:[{ icon:'i-move', label:'+10 AP each day' }],
    detail:'+10 action points each day.' },
  { id:'lens', name:'Inkglass Lens', type:'artifact',
    effects:[{ icon:'i-glance', label:'+1 sight radius' }],
    detail:'+1 sight radius.' },
  { id:'ledger', name:"Beggar-Saint's Ledger", type:'artifact',
    effects:[{ icon:'i-gold', label:'+2 gold at start of turn' }],
    detail:'+2 gold at start of turn.' },
  { id:'bandage', name:'Patient Bandage', type:'artifact',
    effects:[{ icon:'i-heal', label:'Heal 2 HP at start of turn' }],
    detail:'Heal 2 HP at start of turn.' },
  { id:'margin', name:'Dueling Margin', type:'artifact',
    effects:[{ icon:'i-score', label:'+2 final combat score' }],
    detail:'+2 final combat score.' },
  { id:'tongs', name:'Blessed Tongs', type:'artifact',
    effects:[{ icon:'i-trade', label:'2× God\'s Knot refund on equipment swap' }],
    detail:'Replace equipment \u2192 2\u00d7 God\'s Knot refund.' },
  { id:'echo', name:'Echo Coin', type:'artifact',
    effects:[{ icon:'i-potency', label:'25% chance for primary potency on gain' }],
    detail:'25% chance primary potency on any potency gain.' },
];
