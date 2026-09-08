/**
 * scoreTiming.test.js — Regression guard for note-collision and tempo
 * automation fixes in the generated score modules.
 *
 * The scores splice their reactive-dynamics core from the Canopy studio at
 * export time, so an older export can silently reintroduce same-voice,
 * same-time note collisions ("The time must be greater than or equal to the
 * last scheduled time"). These tests pin the fixed offsets by scanning the
 * generated source: the late-phrase snare roll must avoid the fill accent
 * (0.02) and the odd-step double (0.065 / 0.11), which share the same
 * synth voice at exactly those times.
 *
 * The tempo-ramp tests pin the fix for the browser freeze: a scheduled
 * callback must pass its `time` and use a single linear ramp, never an untimed
 * `transport.bpm.rampTo` (see dev/docs/musicSystem.md "Tempo automation").
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SCORES = [
  '../../../../src/game/music/scores/neonAsphalt.score.js',
  '../../../../src/game/music/scores/maroonedSunset.score.js',
];

const COLLIDING_OFFSETS = new Set(['0.02', '0.065', '0.11']);

for (const rel of SCORES) {
  const name = rel.split('/').pop();
  const source = readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

  test(`${name}: snare roll offsets never collide with fixed accent offsets`, () => {
    const match = source.match(/\[([^\]]+)\]\.forEach\(\(offset, index\)/);
    assert.ok(match, 'snare roll array not found');
    const roll = match[1].split(',').map((s) => s.trim());
    assert.equal(roll.length, 4);
    for (const offset of roll) {
      assert.ok(
        !COLLIDING_OFFSETS.has(offset),
        `${name}: roll offset ${offset} collides with a fixed snare accent`,
      );
    }
    // Roll entries must also be pairwise distinct.
    assert.equal(new Set(roll).size, 4);
  });

  test(`${name}: melody fill notes are offset after their base note`, () => {
    assert.match(source, /offset: baseOffset \+ 0\.04/);
  });

  test(`${name}: fill kick skips when the straight downbeat kick fired`, () => {
    assert.match(source, /fillPush && step % 2 === 0 && !\(hit && isDownbeat\)/);
  });

  test(`${name}: playback orders events per voice by time before triggering`, () => {
    // Authoring order is not time order (variation hat after straight hat
    // with a smaller offset; snare accents fall back to the hat voice), and
    // Tone requires strictly increasing start times per voice in call order.
    assert.match(source, /timed\.sort\(\(a, b\) => a\.ord - b\.ord \|\| \(a\.ev\.offset \|\| 0\) - \(b\.ev\.offset \|\| 0\)\)/);
    assert.match(source, /voiceOrder\.set\(target, voiceOrder\.size\)/);
  });

  test(`${name}: tempo automation is timed, linear, and skips no-op ramps`, () => {
    // `transport.bpm.rampTo(target, 0.5)` inside a scheduled callback is
    // Tone's documented anti-pattern: the missing time resolves to now(), and
    // the bpm (exponential) ramp expands into ~6 near-flat linear segments in
    // TickParam. That combination can push Tone's tick timeline into a runaway
    // loop that freezes the page (see dev/docs/musicSystem.md).
    assert.doesNotMatch(source, /transport\.bpm\.rampTo\(/);
    assert.match(source, /transport\.bpm\.linearRampTo\([^)]*,\s*time\)/);
    assert.match(source, /Math\.abs\([^)]*transport\.bpm\.getValueAtTime\(time\)\)\s*>\s*0\.05/);
  });

  test(`${name}: stopScore clears accumulated tempo automation`, () => {
    assert.match(source, /transport\.bpm\.cancelScheduledValues\(0\)/);
  });

  test(`${name}: scheduled volume ramps pass the callback time`, () => {
    assert.doesNotMatch(source, /\.volume\.rampTo\([^)]*0\.8\)/);
  });
}
