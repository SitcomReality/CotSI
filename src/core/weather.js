// Divine weather cycles — 7-day script, loops
// potency: per-faction potency buff, score: flat combat score buff, dayLength: movement multiplier
export const WEATHER_SCRIPT = [
  { name:'Rainbow Aftermath', text:'Gold-leaf rainbows bless Verdant and Hearth powers.', dayLength:1.0, potency:[-1,0,2,0,2,0,-1], score:[0,0,1,0,1,0,0], tint:'#f5d76a' },
  { name:'Memory Storm', text:'Archive and Reverie inscriptions crawl the margins.', dayLength:1.0, potency:[0,2,0,2,0,-1,-1], score:[0,1,0,1,0,0,0], tint:'#a9c4ed' },
  { name:'Leyline Ebb', text:'Hollow currents lengthen shadows, draining the warm.', dayLength:0.8, potency:[0,0,-1,-1,-1,0,2], score:[0,0,-1,-1,-1,0,1], tint:'#8a9cff' },
  { name:'Ash Rain', text:'Crucible and Masque flourish under red-black drizzle.', dayLength:1.2, potency:[2,0,-1,0,0,2,0], score:[1,0,-1,0,0,1,0], tint:'#e05a48' },
  { name:'Quiet Tide', text:'Hearth candles and Hollow silences agree, uneasily.', dayLength:1.0, potency:[0,-1,0,0,1,0,1], score:[0,0,0,0,1,0,1], tint:'#d6c49a' },
  { name:'Overgrowth', text:'Verdant grief erupts through vellum in thorned script.', dayLength:1.0, potency:[0,0,2,0,0,-1,0], score:[0,0,1,0,0,-1,0], tint:'#6de98a' },
  { name:'Dream Fog', text:'Reverie doors open where roads were supposed to be.', dayLength:1.4, potency:[-1,2,0,1,0,0,0], score:[-1,1,0,0,0,0,0], tint:'#b79aff' },
];

export function weatherForDay(day){
  return WEATHER_SCRIPT[(day-1) % WEATHER_SCRIPT.length];
}
