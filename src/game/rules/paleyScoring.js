import { beats } from './factionData.js';
import { PALEY_SCORE_MULTI_2_WINS, PALEY_SCORE_MULTI_1_WIN } from '../../params/game/combatParams.js';
export { beats };
export function scorePower(power, potency, opponentPowers){
  const wins = opponentPowers.filter(op=> beats(power, op)).length;
  if(wins===2) return potency*PALEY_SCORE_MULTI_2_WINS;
  if(wins===1) return Math.floor(potency*PALEY_SCORE_MULTI_1_WIN);
  return potency;
}