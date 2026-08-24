/**
 * scores.test.js — Canopy score modules (src/game/music/scores/).
 *
 * Verifies the stable public API every `.score.js` export must expose (see
 * the music system doc) and that both placeholder songs carry the reactive
 * context presets the game steers with.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as neonAsphalt from '../../../../src/game/music/scores/neonAsphalt.score.js';
import * as maroonedSunset from '../../../../src/game/music/scores/maroonedSunset.score.js';

const REQUIRED_EXPORTS = [
  'startScore',
  'stopScore',
  'setGameMusicState',
  'musicEvent',
  'disposeScore',
];

const CONTEXT_IDS = ['explore', 'unease', 'combat'];

for (const [name, mod] of [['neonAsphalt', neonAsphalt], ['maroonedSunset', maroonedSunset]]) {
  test(`${name}: exports the stable score API`, () => {
    for (const key of REQUIRED_EXPORTS) {
      assert.equal(typeof mod[key], 'function', `missing export: ${key}`);
    }
  });

  test(`${name}: embeds a v4 song with reactive contexts and layers`, () => {
    const score = mod.score;
    assert.ok(score, 'score data missing');
    assert.equal(score.version, 4);
    for (const id of CONTEXT_IDS) {
      assert.ok(
        score.contexts.some((c) => c.id === id),
        `context preset '${id}' missing`,
      );
    }
    assert.ok(score.layers.length >= 2, 'expected at least two layers');
    for (const layer of score.layers) {
      assert.ok(['motif', 'melody', 'harmony', 'chords', 'bass', 'percussion', 'drums'].includes(layer.role));
      assert.ok(Array.isArray(layer.steps) && layer.steps.length === 16);
    }
    assert.match(score.name, /\S/);
  });
}
