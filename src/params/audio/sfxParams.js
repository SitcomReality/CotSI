/**
 * sfxParams.js — Pure preset definitions for one-shot sound effects.
 *
 * Data only: each preset is a list of voices; each voice names a Tone engine
 * ('synth' | 'noise' | 'membrane'), its constructor options, volume (dB),
 * and a `notes` list of [note, offsetSeconds, duration] triggers relative to
 * "now". The runtime audio layer builds/caches these voices and fires them;
 * nothing here imports project code.
 */

export const SFX_PRESETS = {
  // Subtle tick for any [data-action] UI press.
  uiClick: {
    voices: [
      {
        engine: 'synth',
        options: { oscillator: { type: 'triangle' }, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.04 }, volume: -18 },
        notes: [['C6', 0, '32n']],
      },
    ],
  },

  // Turn committed — soft airy puff.
  turnWhoosh: {
    voices: [
      {
        engine: 'noise',
        options: { noise: { type: 'white' }, envelope: { attack: 0.01, decay: 0.22, sustain: 0, release: 0.1 }, volume: -24 },
        notes: [[null, 0, '8n']],
      },
    ],
  },

  // A round of combat landed damage — thud + snap.
  combatHit: {
    voices: [
      {
        engine: 'membrane',
        options: { pitchDecay: 0.03, octaves: 5, envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.15 }, volume: -10 },
        notes: [['A1', 0, '16n']],
      },
      {
        engine: 'noise',
        options: { noise: { type: 'pink' }, envelope: { attack: 0.001, decay: 0.09, sustain: 0, release: 0.05 }, volume: -16 },
        notes: [[null, 0.004, '16n']],
      },
    ],
  },

  // Combat won (spoils modal opening) — short rising figure.
  spoils: {
    voices: [
      {
        engine: 'synth',
        options: { oscillator: { type: 'triangle' }, envelope: { attack: 0.004, decay: 0.18, sustain: 0.05, release: 0.3 }, volume: -12 },
        notes: [['C5', 0, '16n'], ['E5', 0.08, '16n'], ['G5', 0.16, '8n']],
      },
    ],
  },

  // Dungeon conquered — brighter fanfare figure.
  dungeonConquered: {
    voices: [
      {
        engine: 'synth',
        options: { oscillator: { type: 'square' }, envelope: { attack: 0.004, decay: 0.16, sustain: 0.06, release: 0.35 }, volume: -16 },
        notes: [['C5', 0, '16n'], ['G5', 0.09, '16n'], ['C6', 0.18, '4n']],
      },
    ],
  },

  // Champion defeated — low descending fall.
  championDown: {
    voices: [
      {
        engine: 'synth',
        options: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 0.5 }, volume: -14 },
        notes: [['E3', 0, '8n'], ['B2', 0.18, '8n'], ['E2', 0.36, '2n']],
      },
    ],
  },

  // Reward gained outside combat (dig loot, artifact choice) — bell ping pair.
  reward: {
    voices: [
      {
        engine: 'synth',
        options: { oscillator: { type: 'sine' }, envelope: { attack: 0.002, decay: 0.3, sustain: 0.02, release: 0.6 }, volume: -13 },
        notes: [['A5', 0, '8n'], ['E6', 0.11, '4n']],
      },
    ],
  },
};
