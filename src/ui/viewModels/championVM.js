import { FACTIONS, potencyWithPrimary, ARTIFACTS } from '../../core/factions.js';
import { dailyMoves } from '../../game/championMovement.js';

export function championVM(state, champ) {
  if (!champ) return null;
  const fac = FACTIONS[champ.faction];
  const pots = potencyWithPrimary(champ);
  const maxMoves = dailyMoves(state, champ);
  return {
    id: champ.id,
    factionColor: fac.color,
    factionGlyph: fac.glyph,
    name: fac.name,
    hp: champ.hp,
    maxHp: champ.maxHp,
    hpPct: Math.round((champ.hp / champ.maxHp) * 100),
    moves: champ.moves,
    maxMoves,
    gold: champ.gold,
    relics: champ.relics,
    knot: champ.knot,
    weapon: champ.weapon,
    armor: champ.armor,
    artifactLabel: champ.artifact
      ? (ARTIFACTS.find(a => a.id === champ.artifact)?.name || champ.artifact)
      : '— none —',
    pots,               // array of 7 numbers
    totalPot: pots.reduce((a, b) => a + b, 0),
  };
}