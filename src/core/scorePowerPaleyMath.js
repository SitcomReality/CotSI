import { beats } from './factions.js';
export { beats };
export function scorePower(power, potency, opponentPowers){
  const wins = opponentPowers.filter(op=> beats(power, op)).length;
  if(wins===2) return potency*2;
  if(wins===1) return Math.floor(potency*1.5);
  return potency;
}