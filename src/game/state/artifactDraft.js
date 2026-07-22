/**
 * artifactDraft.js — Artifact draft pool selection and first-turn draft logic.
 */
import { ARTIFACTS } from '../rules/factionData.js';
import { G } from './liveGame.js';
import { addLogEntry } from './gameLog.js';
import { LOG_CATEGORY } from '../rules/logGrammar.js';
import { buildChampionFactionMap, championSegment } from '../rules/logHelpers.js';

export function artifactChoices(state) {
  const pool = [...ARTIFACTS];
  const r = state._rng;
  const a = pool.splice(Math.floor(r() * pool.length), 1)[0];
  const b = pool.splice(Math.floor(r() * pool.length), 1)[0];
  return [a, b].map(x => ({
    id: x.id,
    label: x.name,
    detail: x.detail,
    artifactId: x.id,
    type: x.type,
    effects: x.effects,
  }));
}

export function processFirstTurnDraft(state, ch) {
  if (ch.controller === 'human') {
    state.reward = {
      championId: ch.id,
      type: 'artifact',
      title: 'First illumination',
      body: 'Two artifacts shine from the margin. Choose one permanent blessing.',
      guaranteed: [],
      choices: artifactChoices(state),
    };
  } else {
    const picks = artifactChoices(state);
    ch.artifact = picks[0].artifactId;
    ch.offeredArtifact = true;
    const factionMap = buildChampionFactionMap(state.champions);
    addLogEntry(state, {
      category: LOG_CATEGORY.SYSTEM,
      subject: championSegment(ch.name, factionMap),
      verb: 'accepts',
      object: { text: picks[0].label, color: 'var(--gold)' },
      detail: null,
    });
  }
}
