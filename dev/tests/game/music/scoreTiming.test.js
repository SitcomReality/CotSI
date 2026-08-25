/**
 * scoreTiming.test.js — Regression guard for note-collision fixes in the
 * generated score modules.
 *
 * The scores splice their reactive-dynamics core from the Canopy studio at
 * export time, so an older export can silently reintroduce same-voice,
 * same-time note collisions ("The time must be greater than or equal to the
 * last scheduled time"). These tests pin the fixed offsets by scanning the
 * generated source: the late-phrase snare roll must avoid the fill accent
 * (0.02) and the odd-step double (0.065 / 0.11), which share the same
 * synth voice at exactly those times.
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
}
