
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
  { id:0, name:'Crucible', short:'CRU', glyphId:'g-crucible', textGlyph:'[CRU]', base:'#6e2e22', color:'#b84530', glow:'#e87a6a', trait:'Scarshield', desc:'–week enemy final score' },
  { id:1, name:'Reverie', short:'REV', glyphId:'g-reverie',  textGlyph:'[REV]', base:'#5a3a5a', color:'#8a5aaa', glow:'#b388f0', trait:"Another's Dream", desc:'Dawn random boon' },
  { id:2, name:'Verdant', short:'VER', glyphId:'g-verdant',  textGlyph:'[VER]', base:'#3a5a3a', color:'#5a8a4a', glow:'#88d888', trait:"Gaia's Wail", desc:'+1 move, mobs pacified, fruit++' },
  { id:3, name:'Archive', short:'ARC', glyphId:'g-archive',  textGlyph:'[ARC]', base:'#3a4a5a', color:'#5a7a9a', glow:'#8ab8f0', trait:'Everknown', desc:'Relic → +random potency' },
  { id:4, name:'Hearth',  short:'HRT', glyphId:'g-hearth',   textGlyph:'[HRT]', base:'#5a4a22', color:'#9a8a3a', glow:'#efc86b', trait:'Compersion', desc:'Trade -20%' },
  { id:5, name:'Masque',  short:'MSK', glyphId:'g-masque',   textGlyph:'[MSK]', base:'#5a3a4a', color:'#8a5a7a', glow:'#e488c0', trait:'Silent Ovation', desc:'Combat turn +week random' },
  { id:6, name:'Hollow',  short:'HOL', glyphId:'g-hollow',   textGlyph:'[HOL]', base:'#3a3a44', color:'#5a5a7a', glow:'#a0a8c0', trait:'Vaunted Nothing', desc:'+⌈week/3⌉ per missing HP' },
];

export const beats = (a,b)=> ((b - a + 7) % 7 === 1) || ((b - a + 7) % 7 === 2) || ((b - a + 7) % 7 === 4);

export const BEATS_MATRIX = FACTIONS.map((_,a)=> FACTIONS.map((__,b)=> beats(a,b)));

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
    effects:[{ icon:'i-move', label:'+1 movement each day' }],
    detail:'+1 movement each day.' },
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
