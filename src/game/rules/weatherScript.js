// Divine weather cycles — 7-day script, loops
// potency: per-faction potency buff, score: flat combat score buff, dayLength: movement multiplier
const F = ['CRU','REV','VER','ARC','HRT','MSK','HOL'];

function formatEffects(potency, score, dayLength) {
  const parts = [];
  for (let i = 0; i < 7; i++) {
    if (potency[i] > 0) parts.push(`${F[i]}+${potency[i]} potency`);
    if (potency[i] < 0) parts.push(`${F[i]}${potency[i]} potency`);
  }
  for (let i = 0; i < 7; i++) {
    if (score[i] > 0) parts.push(`${F[i]}+${score[i]} score`);
    if (score[i] < 0) parts.push(`${F[i]}${score[i]} score`);
  }
  if (dayLength !== 1.0) {
    parts.push(`${Math.round(dayLength * 100)}% moves`);
  }
  return parts.join(', ') || 'no effects';
}

export const WEATHER_SCRIPT = [
  { name:'Rainbow Aftermath', text:formatEffects([-1,0,2,0,2,0,-1],[0,0,1,0,1,0,0],1.0), dayLength:1.0, potency:[-1,0,2,0,2,0,-1], score:[0,0,1,0,1,0,0], tint:'#f5d76a' },
  { name:'Memory Storm', text:formatEffects([0,2,0,2,0,-1,-1],[0,1,0,1,0,0,0],1.0), dayLength:1.0, potency:[0,2,0,2,0,-1,-1], score:[0,1,0,1,0,0,0], tint:'#8ab8f0' },
  { name:'Leyline Ebb', text:formatEffects([0,0,-1,-1,-1,0,2],[0,0,-1,-1,-1,0,1],0.8), dayLength:0.8, potency:[0,0,-1,-1,-1,0,2], score:[0,0,-1,-1,-1,0,1], tint:'#8a9cff' },
  { name:'Ash Rain', text:formatEffects([2,0,-1,0,0,2,0],[1,0,-1,0,0,1,0],1.2), dayLength:1.2, potency:[2,0,-1,0,0,2,0], score:[1,0,-1,0,0,1,0], tint:'#e05a48' },
  { name:'Quiet Tide', text:formatEffects([0,-1,0,0,1,0,1],[0,0,0,0,1,0,1],1.0), dayLength:1.0, potency:[0,-1,0,0,1,0,1], score:[0,0,0,0,1,0,1], tint:'#d6c49a' },
  { name:'Overgrowth', text:formatEffects([0,0,2,0,0,-1,0],[0,0,1,0,0,-1,0],1.0), dayLength:1.0, potency:[0,0,2,0,0,-1,0], score:[0,0,1,0,0,-1,0], tint:'#6de98a' },
  { name:'Dream Fog', text:formatEffects([-1,2,0,1,0,0,0],[-1,1,0,0,0,0,0],1.4), dayLength:1.4, potency:[-1,2,0,1,0,0,0], score:[-1,1,0,0,0,0,0], tint:'#b79aff' },
];

export function weatherForDay(day){
  return WEATHER_SCRIPT[(day-1) % WEATHER_SCRIPT.length];
}
