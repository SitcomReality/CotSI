/**
 * musicDirector.js — Runtime orchestration for the procedural music system.
 *
 * The `.score.js` modules (src/game/music/scores/) are self-contained
 * Canopy exports: each owns its synth graph, 16-step sequencer, and reactive
 * dynamics on top of the vendored Tone.js. They expose a stable API:
 * startScore / stopScore / setGameMusicState / musicEvent / disposeScore.
 *
 * This module decides *when* those functions run: game start, combat
 * transitions, victory, mute, and track switching. Only one score plays at a
 * time (the scores hold module-level state — one instance per page).
 */
import { isMuted, onMuteChange } from '../../shared/muteState.js';

/** Available tracks. Keys are stable ids used by setMusicTrack. */
const SCORE_MODULES = {
  neonAsphalt: () => import('../../game/music/scores/neonAsphalt.score.js'),
  maroonedSunset: () => import('../../game/music/scores/maroonedSunset.score.js'),
};

export const DEFAULT_TRACK_ID = 'maroonedSunset';

let activeTrackId = DEFAULT_TRACK_ID;
let scoreModule = null;      // lazily imported score module
let startRequested = false;  // music should be playing (game session live)
let starting = null;         // in-flight startScore promise
let lastVictoryWinnerId = null;

// Lazy Tone handle — imported only when audio actually needs controlling,
// keeping the ~1MB library off the setup-screen critical path.
let tonePromise = null;
function getTone() {
  if (!tonePromise) tonePromise = import('../../vendor/tone/index.js');
  return tonePromise;
}

async function ensureScore() {
  if (!scoreModule) scoreModule = await SCORE_MODULES[activeTrackId]();
  return scoreModule;
}

/** Apply the shared global mute to whatever audio pipeline Tone drives. */
async function applyMute() {
  const muted = isMuted();
  const { Destination } = await getTone();
  Destination.mute = muted;
}

/**
 * Start music playback. Call once the user has gestured (game begin) —
 * browsers block AudioContext until then. Idempotent.
 */
export function startMusic() {
  startRequested = true;
  if (starting) return starting;
  starting = (async () => {
    const score = await ensureScore();
    await score.startScore();
    await applyMute();
  })();
  return starting;
}

/** Stop playback and reset to the top of the loop; graph stays warm. */
export function stopMusic() {
  startRequested = false;
  starting = null;
  scoreModule?.stopScore();
}

/** Free all Web Audio nodes for the active score (permanent teardown). */
export function disposeMusic() {
  stopMusic();
  scoreModule?.disposeScore();
  scoreModule = null;
}

/**
 * Switch track. Disposes the old score first (one instance per page).
 * Restarts automatically if music was already playing.
 * @param {string} trackId - key of SCORE_MODULES
 */
export async function setMusicTrack(trackId) {
  if (!SCORE_MODULES[trackId] || trackId === activeTrackId) return;
  const wasPlaying = startRequested;
  disposeMusic();
  activeTrackId = trackId;
  lastVictoryWinnerId = null;
  if (wasPlaying) await startMusic();
}

export function getActiveTrackId() {
  return activeTrackId;
}

/**
 * Combat transition hook — steer context at the next bar boundary.
 * @param {boolean} inCombat
 */
export function musicCombat(inCombat) {
  scoreModule?.setGameMusicState({ threat: inCombat ? 1 : 0, inCombat });
}

/**
 * One-shot musical flourish when a champion wins the game. Fires once per
 * winner id so repeated refreshAll passes don't stack events.
 * @param {string|number} winnerId
 */
export function musicVictory(winnerId) {
  if (winnerId == null || winnerId === lastVictoryWinnerId) return;
  lastVictoryWinnerId = winnerId;
  scoreModule?.musicEvent('victory');
}

// Global mute button drives every audio consumer through this subscription.
onMuteChange(() => { applyMute(); });
