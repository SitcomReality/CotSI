/**
 * dispatchReport.js — Pure builder for the Augur's Dispatch report.
 * Given the state and a champion at the dawn of their turn, produces the
 * display-ready data for the dispatch modal: whose turn it is, which effects
 * apply today (weather, artifact, faction, terrain, equipment, and their
 * interactions), and the ledger of changes since their previous turn.
 * No DOM, no mutation — takes state as a parameter.
 */
import { FACTIONS, ARTIFACTS } from './factionData.js';
import { TERRAIN } from './terrainGeneration.js';
import { coordKey } from '../../engine/rules/hexGrid.js';

const signed = (n) => (n > 0 ? `+${n}` : `${n}`);

const weekOf = (day) => Math.floor((day - 1) / 7) + 1;

// ── Effect contributors ─────────────────────────────────────────────────────
// Each contributor(state, champ, effects) pushes { source, text, tone } lines
// (tone: 'boon' | 'burden' | 'neutral'). New sources (seasons, curses, camps,
// real equipment bonuses) plug in by adding a contributor and one line to
// CONTRIBUTORS — the modal renders whatever arrives.

function weatherEffects(state, champ, effects) {
  const w = state.weather;
  const fac = FACTIONS[champ.faction];
  const pot = w.potency[champ.faction] || 0;
  const score = w.score[champ.faction] || 0;
  if (pot !== 0) {
    effects.push({
      source: 'Weather',
      text: `${w.name}: ${fac.name} potency ${signed(pot)} in combat.`,
      tone: pot > 0 ? 'boon' : 'burden',
    });
  }
  if (score !== 0) {
    effects.push({
      source: 'Weather',
      text: `${w.name}: ${signed(score)} to your final combat score.`,
      tone: score > 0 ? 'boon' : 'burden',
    });
  }
}

function artifactEffects(state, champ, effects) {
  if (!champ.artifact) return;
  const art = ARTIFACTS.find((a) => a.id === champ.artifact);
  const name = art?.name || champ.artifact;
  switch (champ.artifact) {
    case 'lens':
      effects.push({ source: 'Artifact', text: `${name}: +1 sight radius.`, tone: 'boon' });
      break;
    case 'margin':
      effects.push({ source: 'Artifact', text: `${name}: +2 final combat score.`, tone: 'boon' });
      break;
    case 'tongs':
      effects.push({
        source: 'Artifact',
        text: `${name}: replacing equipment refunds double God's Knot.`,
        tone: 'neutral',
      });
      break;
    case 'echo':
      effects.push({
        source: 'Artifact',
        text: `${name}: potency gains may echo into your primary.`,
        tone: 'neutral',
      });
      break;
    // 'spur' is covered by the movement line; 'ledger'/'bandage' grant at
    // dawn and appear in the ledger section instead.
  }
}

function factionEffects(state, champ, effects) {
  const week = weekOf(state.day);
  switch (champ.faction) {
    case 0:
      effects.push({
        source: 'Faction',
        text: `Scarshield: enemies take -${week} to their final combat score.`,
        tone: 'boon',
      });
      break;
    case 1:
      effects.push({
        source: 'Faction',
        text: `Another's Dream: a dawn boon was dreamed (see Ledger).`,
        tone: 'neutral',
      });
      break;
    case 2:
      effects.push({
        source: 'Faction',
        text: `Gaia's Wail: mobs will not harass you; manuscript fruit heals double.`,
        tone: 'boon',
      });
      break;
    case 3:
      effects.push({
        source: 'Faction',
        text: `Everknown: each relic found also wakes a random potency.`,
        tone: 'boon',
      });
      break;
    case 4:
      effects.push({
        source: 'Faction',
        text: `Compersion: trade and base purchases cost less.`,
        tone: 'boon',
      });
      break;
    case 5:
      effects.push({
        source: 'Faction',
        text: `Silent Ovation: the crowd's favor shifts with each week of combat.`,
        tone: 'neutral',
      });
      break;
    case 6: {
      // Mirrors finalScoreBonus in game/state/combat/combatScoring.js
      const missing = champ.maxHp - champ.hp;
      const bonus = Math.ceil(missing / 10) * Math.ceil(week / 3);
      effects.push({
        source: 'Faction',
        text: `Vaunted Nothing: your wounds add ${signed(bonus)} to your final combat score.`,
        tone: bonus > 0 ? 'boon' : 'neutral',
      });
      break;
    }
  }
}

function terrainEffects(state, champ, effects) {
  const tile = state.tiles[coordKey(champ.pos)];
  if (!tile) return;
  const label = TERRAIN[tile.terrain]?.label || tile.terrain;
  let text = `Standing on ${label}.`;
  const f = tile.feature;
  if (f?.kind === 'base') {
    text +=
      f.faction === champ.faction
        ? ` Your faction's base — sanctuary is at hand.`
        : ` A ${FACTIONS[f.faction].name} base — potency may be bought here.`;
  } else if (f?.kind === 'tree') {
    text += f.ripe === false ? ' The fruit here is spent.' : ' Manuscript fruit hangs here.';
  } else if (f?.kind === 'knot' && !f.mined) {
    text += ` An unmined God's Knot glimmers.`;
  }
  effects.push({ source: 'Terrain', text, tone: 'neutral' });
}

function equipmentEffects(state, champ, effects) {
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  effects.push({
    source: 'Equipment',
    text: `${cap(champ.weapon)}; ${champ.armor}.`,
    tone: 'neutral',
  });
}

const CONTRIBUTORS = [weatherEffects, artifactEffects, factionEffects, terrainEffects, equipmentEffects];

// ── Movement breakdown ──────────────────────────────────────────────────────
// Parts mirror the inputs of dailyMoves (game/state/championMovement.js);
// the total is champ.moves as already computed by beginTurn.

function movementReport(state, champ) {
  const parts = [`${champ.baseMove} base`];
  if (champ.artifact === 'spur') parts.push(`+1 Pilgrim's Spur`);
  if (champ.faction === 2) parts.push(`+1 Gaia's Wail`);
  if (state.weather.dayLength !== 1) parts.push(`× ${state.weather.dayLength} ${state.weather.name}`);
  return { parts, total: champ.moves };
}

// ── Report ──────────────────────────────────────────────────────────────────

/**
 * Build the Augur's Dispatch report for a champion's turn start.
 *
 * @param {Object} state
 * @param {Object} champ
 * @param {Array<{text: string, sign: string}>} [ledgerEntries] — drained ledger
 * @returns {Object} display-ready report (see dispatchModal.js for consumption)
 */
export function buildDispatchReport(state, champ, ledgerEntries = []) {
  const fac = FACTIONS[champ.faction];
  const effects = [];
  for (const contribute of CONTRIBUTORS) contribute(state, champ, effects);
  return {
    championId: champ.id,
    name: champ.name,
    factionName: fac.name,
    glyph: fac.glyph,
    color: fac.color,
    day: state.day,
    week: weekOf(state.day),
    weather: { name: state.weather.name, text: state.weather.text, tint: state.weather.tint },
    movement: movementReport(state, champ),
    effects,
    ledger: ledgerEntries,
  };
}
