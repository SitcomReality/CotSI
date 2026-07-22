/**
 * artifactDraft.js — Artifact draft pool selection and first-turn draft logic.
 */
import { ARTIFACTS } from '../rules/factionData.js';
import { G } from './liveGame.js';
import { addLog } from './gameLog.js';

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
    addLog(state, `${ch.name} accepts ${picks[0].label}.`);
  }
}
