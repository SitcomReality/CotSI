import { FACTIONS, potencyWithPrimary, ARTIFACTS } from '../../game/rules/factionData.js';
import { dailyActionPoints } from '../../game/state/championMovement.js';
import { CHAMPION_MAX_HP } from '../../params/game/championParams.js';

export function championVM(state, champ) {
  if (!champ) return null;
  const fac = FACTIONS[champ.faction];
  const pots = potencyWithPrimary(champ);
  const maxActionPoints = dailyActionPoints(state, champ);
  return {
    id: champ.id,
    factionColor: fac.uiColor || fac.color, /* luminous UI variant — reads on dusk chrome */
    factionGlyphId: fac.glyphId,
    name: fac.name,
    hp: champ.hp,
    maxHp: champ.maxHp,
    hpPct: Math.min(CHAMPION_MAX_HP, Math.max(0, Math.round((champ.hp / champ.maxHp) * 100))),
    actionPoints: champ.actionPoints,
    maxActionPoints,
    gold: champ.gold,
    relics: champ.relics,
    knot: champ.knot,
    weapon: champ.weapon?.name ?? '—',
    armor: champ.armor?.name ?? '—',
    artifactLabel: champ.artifact
      ? (ARTIFACTS.find(a => a.id === champ.artifact)?.name || champ.artifact)
      : '— none —',
    pots,               // array of 7 numbers
    totalPot: pots.reduce((a, b) => a + b, 0),
  };
}