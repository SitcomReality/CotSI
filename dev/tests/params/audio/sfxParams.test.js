/**
 * sfxParams.test.js — SFX preset definitions (src/params/audio/sfxParams.js).
 * Pure data contract: the sfxDirector builds Tone voices from these.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SFX_PRESETS } from '../../../../src/params/audio/sfxParams.js';

const ENGINES = new Set(['synth', 'noise', 'membrane']);

test('every preset is a non-empty voice list with valid engines', () => {
  const names = Object.keys(SFX_PRESETS);
  assert.ok(names.length >= 5, 'expected a starter set of presets');
  for (const [name, preset] of Object.entries(SFX_PRESETS)) {
    assert.match(name, /^[a-z][a-zA-Z]+$/, `preset name '${name}' not camelCase`);
    assert.ok(Array.isArray(preset.voices) && preset.voices.length > 0, `${name}: no voices`);
    for (const voice of preset.voices) {
      assert.ok(ENGINES.has(voice.engine), `${name}: unknown engine '${voice.engine}'`);
      assert.equal(typeof voice.options, 'object');
      assert.ok(Array.isArray(voice.notes) && voice.notes.length > 0, `${name}: no notes`);
      // NoiseSynth takes no pitch — its notes carry null in the note slot.
      for (const entry of voice.notes) {
        assert.equal(entry.length, 3, `${name}: notes are [note, offset, duration]`);
        if (voice.engine === 'noise') assert.equal(entry[0], null);
        else assert.match(String(entry[0]), /^[A-G]#?\d$/);
        assert.equal(typeof entry[1], 'number');
      }
    }
  }
});

test('the wired game events all have presets', () => {
  for (const name of ['uiClick', 'turnWhoosh', 'combatHit', 'spoils', 'dungeonConquered', 'championDown', 'reward']) {
    assert.ok(SFX_PRESETS[name], `missing preset for wired event '${name}'`);
  }
});
