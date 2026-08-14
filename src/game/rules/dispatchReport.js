/**
 * dispatchReport.js — Pure builder for the Augur's Dispatch report.
 * Given the state and a champion at the dawn of their turn, produces the
 * display-ready data for the dispatch modal: whose turn it is, which effects
 * apply today (weather, artifact, faction, terrain, equipment, and their
 * interactions), and the ledger of changes since their previous turn.
 * No DOM, no mutation — takes state as a parameter.
 */
import { FACTIONS, ARTIFACTS } from './factionData.js';
import { terrainDisplayName } from './terrainOverrides.js';
import { coordKey } from '../../engine/rules/hexGrid.js';
import { DAYS_PER_WEEK } from '../../params/game/worldParams.js';
import { HOLLOW_HP_GROUP_SIZE, HOLLOW_WEEK_BLOCK } from '../../params/game/combatParams.js';
import { SPUR_AP_BONUS } from '../../params/game/championParams.js';

const signed = (n) => (n > 0 ? `+${n}` : `${n}`);

const weekOf = (day) => Math.floor((day - 1) / DAYS_PER_WEEK) + 1;

// ── Effect contributors ─────────────────────────────────────────────────────
// Each contributor(state, champ, effects) pushes { source, text, tone, category } lines
// (tone: 'boon' | 'burden' | 'neutral', category: icon key for the modal).
// New sources (seasons, curses, camps, real equipment bonuses) plug in by
// adding a contributor and one line to CONTRIBUTORS — the modal renders
// whatever arrives.

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
      category: 'potency',
      value: pot,
    });
  }
  if (score !== 0) {
    effects.push({
      source: 'Weather',
      text: `${w.name}: ${signed(score)} to your final combat score.`,
      tone: score > 0 ? 'boon' : 'burden',
      category: 'score',
      value: score,
    });
  }
}

function artifactEffects(state, champ, effects) {
  if (!champ.artifact) return;
  const art = ARTIFACTS.find((a) => a.id === champ.artifact);
  const name = art?.name || champ.artifact;
  switch (champ.artifact) {
    case 'lens':
      effects.push({ source: 'Artifact', text: `${name}: +1 sight radius.`, tone: 'boon', category: 'artifact' });
      break;
    case 'margin':
      effects.push({ source: 'Artifact', text: `${name}: +2 final combat score.`, tone: 'boon', category: 'artifact' });
      break;
    case 'tongs':
      effects.push({
        source: 'Artifact',
        text: `${name}: replacing equipment refunds double God's Knot.`,
        tone: 'neutral',
        category: 'artifact',
      });
      break;
    case 'echo':
      effects.push({
        source: 'Artifact',
        text: `${name}: potency gains may echo into your primary.`,
        tone: 'neutral',
        category: 'artifact',
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
        category: 'faction',
      });
      break;
    case 1:
      effects.push({
        source: 'Faction',
        text: `Another's Dream: a dawn boon was dreamed (see Ledger).`,
        tone: 'neutral',
        category: 'faction',
      });
      break;
    case 2:
      effects.push({
        source: 'Faction',
        text: `Gaia's Wail: mobs will not harass you; the Blessed Font heals double.`,
        tone: 'boon',
        category: 'faction',
      });
      break;
    case 3:
      effects.push({
        source: 'Faction',
        text: `Everknown: each relic found also wakes a random potency.`,
        tone: 'boon',
        category: 'faction',
      });
      break;
    case 4:
      effects.push({
        source: 'Faction',
        text: `Compersion: trade and base purchases cost less.`,
        tone: 'boon',
        category: 'faction',
      });
      break;
    case 5:
      effects.push({
        source: 'Faction',
        text: `Silent Ovation: the crowd's favor shifts with each week of combat.`,
        tone: 'neutral',
        category: 'faction',
      });
      break;
    case 6: {
      // Mirrors finalScoreBonus in game/state/combat/combatScoring.js
      const missing = champ.maxHp - champ.hp;
      const bonus = Math.ceil(missing / HOLLOW_HP_GROUP_SIZE) * Math.ceil(week / HOLLOW_WEEK_BLOCK);
      effects.push({
        source: 'Faction',
        text: `Vaunted Nothing: your wounds add ${signed(bonus)} to your final combat score.`,
        tone: bonus > 0 ? 'boon' : 'neutral',
        category: 'faction',
      });
      break;
    }
  }
}

function terrainEffects(state, champ, effects) {
  const tile = state.tiles[coordKey(champ.pos)];
  if (!tile) return;
  const label = terrainDisplayName(tile.biomeId, tile.terrain);
  let text = `Standing on ${label}.`;
  const f = tile.feature;
  if (f?.kind === 'base') {
    text +=
      f.faction === champ.faction
        ? ` Your faction's base — sanctuary is at hand.`
        : ` A ${FACTIONS[f.faction].name} base — potency may be bought here.`;
  } else if (f?.kind === 'blessedFont') {
    text += f.ripe === false ? ' The font is dry.' : ' The Blessed Font brims.';
  } else if (f?.kind === 'bush') {
    text += ` Dense underbrush crowds the hex.`;
  } else if (f?.kind === 'knot' && !f.mined) {
    text += ` An unmined God's Knot glimmers.`;
  }
  effects.push({ source: 'Terrain', text, tone: 'neutral', category: 'terrain' });
}

function equipmentEffects(state, champ, effects) {
  const label = (it) => (it ? it.name : 'none');
  effects.push({
    source: 'Equipment',
    text: `${label(champ.weapon)}; ${label(champ.armor)}.`,
    tone: 'neutral',
    category: 'equipment',
  });
}

const CONTRIBUTORS = [weatherEffects, artifactEffects, factionEffects, terrainEffects, equipmentEffects];

// ── Movement breakdown ──────────────────────────────────────────────────────
// Parts mirror the inputs of dailyActionPoints (game/state/movement/championMovement.js);
// the total is champ.actionPoints as already computed by beginTurn.

function movementReport(state, champ) {
  const parts = [`${champ.baseActionPoints} base`];
  if (champ.artifact === 'spur') parts.push(`+${SPUR_AP_BONUS} Pilgrim's Spur`);
  if (state.weather.dayLength !== 1) parts.push(`× ${state.weather.dayLength} ${state.weather.name}`);
  return { parts, total: champ.actionPoints };
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
    glyphId: fac.glyphId,
    glyph: fac.textGlyph,
    color: fac.uiColor || fac.color, /* luminous UI variant — reads on dusk chrome */
    day: state.day,
    week: weekOf(state.day),
    movement: movementReport(state, champ),
    effects,
    ledger: ledgerEntries,
  };
}
