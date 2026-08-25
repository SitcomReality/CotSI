/**
 * sfxDirector.js — Runtime playback for one-shot sound effects.
 *
 * Shares the vendored Tone instance and Tone.Destination with the music
 * system, so the global mute switch silences both. Presets live in
 * src/params/audio/sfxParams.js (pure data); this module builds each named
 * voice lazily on first use and retriggers it thereafter.
 */
import { isMuted } from '../../shared/muteState.js';
import { SFX_PRESETS } from '../../params/audio/sfxParams.js';

// Lazy Tone handle — same module URL the scores use, so one shared context.
let tonePromise = null;
function getTone() {
  if (!tonePromise) tonePromise = import('../../vendor/tone/index.js');
  return tonePromise;
}

let audioUnlocked = false;
const voices = new Map(); // `${name}#${index}` -> playable voice

async function buildVoice(Tone, preset) {
  const { engine, options, notes } = preset;
  if (engine === 'noise') {
    return { kind: 'noise', synth: new Tone.NoiseSynth(options), notes };
  }
  if (engine === 'membrane') {
    return { kind: 'note', synth: new Tone.MembraneSynth(options), notes };
  }
  return { kind: 'note', synth: new Tone.PolySynth(Tone.Synth).set(options), notes };
}

/** Unlock AudioContext (first user gesture) — idempotent, fire-and-forget. */
export function unlockSfx() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  getTone().then((Tone) => Tone.start()).catch(() => { audioUnlocked = false; });
}

/**
 * Fire a named one-shot SFX. Unknown names warn once; muted state skips
 * scheduling entirely (Destination.mute would silence it anyway).
 * @param {string} name - key of SFX_PRESETS
 */
export function playSfx(name) {
  const preset = SFX_PRESETS[name];
  if (!preset) {
    console.warn(`[sfxDirector] unknown sfx '${name}'`);
    return;
  }
  if (isMuted()) return;

  getTone().then(async (Tone) => {
    if (!audioUnlocked) {
      await Tone.start();
      audioUnlocked = true;
    }
    const now = Tone.now();
    for (let i = 0; i < preset.voices.length; i++) {
      const key = `${name}#${i}`;
      let voice = voices.get(key);
      if (!voice) {
        voice = await buildVoice(Tone, preset.voices[i]);
        voice.synth.toDestination();
        voices.set(key, voice);
      }
      for (const [note, offset, duration] of voice.notes) {
        const at = now + (offset || 0);
        if (voice.kind === 'noise') voice.synth.triggerAttackRelease(duration, at);
        else voice.synth.triggerAttackRelease(note, duration, at);
      }
    }
  }).catch((err) => console.warn('[sfxDirector] playback failed:', err));
}
