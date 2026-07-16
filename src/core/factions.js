
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
  { id:0, name:'Crucible', short:'CRU', color:'#b22f24', glow:'#f07a6a', pale:'#f0b2a2', glyph:'⚔', trait:'Scarshield', desc:'–week enemy final score' },
  { id:1, name:'Reverie', short:'REV', color:'#6d4bb6', glow:'#b79aff', pale:'#c6b3f2', glyph:'☾', trait:"Another's Dream", desc:'Dawn random boon' },
  { id:2, name:'Verdant', short:'VER', color:'#2f7e44', glow:'#6de98a', pale:'#b5deb3', glyph:'❦', trait:"Gaia's Wail", desc:'+1 move, mobs pacified, fruit++' },
  { id:3, name:'Archive', short:'ARC', color:'#2f5f9f', glow:'#7cb8ff', pale:'#a9c4ed', glyph:'⟐', trait:'Everknown', desc:'Relic → +random token' },
  { id:4, name:'Hearth',  short:'HRT', color:'#b88728', glow:'#ffd86b', pale:'#efd38b', glyph:'♥', trait:'Compersion', desc:'Trade -20%' },
  { id:5, name:'Masque',  short:'MSK', color:'#9b3f79', glow:'#ff8edb', pale:'#e4aacd', glyph:'🎭', trait:'Silent Ovation', desc:'Combat turn +week random' },
  { id:6, name:'Hollow',  short:'HOL', color:'#3f4658', glow:'#8a9cff', pale:'#c3c5bd', glyph:'∅', trait:'Vaunted Nothing', desc:'+⌈week/3⌉ per missing HP' },
];

export const beats = (a,b)=> ((b - a + 7) % 7 === 1) || ((b - a + 7) % 7 === 2) || ((b - a + 7) % 7 === 4);

export const BEATS_MATRIX = FACTIONS.map((_,a)=> FACTIONS.map((__,b)=> beats(a,b)));

export function potencyWithPrimary(champ){
  // Backward-compatible: support both 'potencies' (new) and 'tokens' (old)
  const raw = champ.potencies ?? champ.tokens;
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
  { id:'spur', name:"Pilgrim's Spur", detail:'+1 movement each day.' },
  { id:'lens', name:'Inkglass Lens', detail:'+1 sight radius.' },
  { id:'ledger', name:"Beggar-Saint's Ledger", detail:'+2 gold at start of turn.' },
  { id:'bandage', name:'Patient Bandage', detail:'Heal 2 HP at start of turn.' },
  { id:'margin', name:'Dueling Margin', detail:'+2 final combat score.' },
  { id:'tongs', name:'Blessed Tongs', detail:'Replace equipment → 2× God\'s Knot refund.' },
  { id:'echo', name:'Echo Coin', detail:'25% chance primary token on any token gain.' },
];
