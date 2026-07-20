import { FACTIONS, potencyWithPrimary, ARTIFACTS } from '../../game/rules/factionData.js';
import { dailyMoves } from '../../game/state/championMovement.js';

export function championVM(state, champ) {
  if (!champ) return null;
  const fac = FACTIONS[champ.faction];
  const pots = potencyWithPrimary(champ);
  const maxMoves = dailyMoves(state, champ);
  return {
    id: champ.id,
    factionColor: fac.color,
    factionGlyphId: fac.glyphId,
    name: fac.name,
    hp: champ.hp,
    maxHp: champ.maxHp,
    hpPct: Math.min(100, Math.max(0, Math.round((champ.hp / champ.maxHp) * 100))),
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