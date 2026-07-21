
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
  { id:0, name:'Crucible', short:'CRU', glyphId:'g-crucible', textGlyph:'[CRU]', color:'#cc3628', glow:'#f07a6a', pale:'#e87a6a', trait:'Scarshield', desc:'–week enemy final score' },
  { id:1, name:'Reverie', short:'REV', glyphId:'g-reverie',  textGlyph:'[REV]', color:'#7d55cc', glow:'#b79aff', pale:'#b388f0', trait:"Another's Dream", desc:'Dawn random boon' },
  { id:2, name:'Verdant', short:'VER', glyphId:'g-verdant',  textGlyph:'[VER]', color:'#34a055', glow:'#6de98a', pale:'#88d888', trait:"Gaia's Wail", desc:'+1 move, mobs pacified, fruit++' },
  { id:3, name:'Archive', short:'ARC', glyphId:'g-archive',  textGlyph:'[ARC]', color:'#3a70c0', glow:'#7cb8ff', pale:'#8ab8f0', trait:'Everknown', desc:'Relic → +random potency' },
  { id:4, name:'Hearth',  short:'HRT', glyphId:'g-hearth',   textGlyph:'[HRT]', color:'#d49a24', glow:'#ffd86b', pale:'#efc86b', trait:'Compersion', desc:'Trade -20%' },
  { id:5, name:'Masque',  short:'MSK', glyphId:'g-masque',   textGlyph:'[MSK]', color:'#b04d88', glow:'#ff8edb', pale:'#e488c0', trait:'Silent Ovation', desc:'Combat turn +week random' },
  { id:6, name:'Hollow',  short:'HOL', glyphId:'g-hollow',   textGlyph:'[HOL]', color:'#4a5570', glow:'#8a9cff', pale:'#a0a8c0', trait:'Vaunted Nothing', desc:'+⌈week/3⌉ per missing HP' },
];

export const beats = (a,b)=> ((b - a + 7) % 7 === 1) || ((b - a + 7) % 7 === 2) || ((b - a + 7) % 7 === 4);

export const BEATS_MATRIX = FACTIONS.map((_,a)=> FACTIONS.map((__,b)=> beats(a,b)));

export function potencyWithPrimary(champ){
  const raw = champ.potencies;
  if (!raw) return Array(7).fill(0).map((_, i) => i === champ.faction ? 5 : 0);
  const t = raw.slice();
  const primary = champ.faction;
  let weakest = Infinity;
  for(let i=0;i<7;i++) if(i!==primary) weakest = Math.min(weakest, t[i] ?? 0);
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
