/**
 * actionBus.test.js — dispatch + injected click feedback
 * (src/shared/actionBus.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerAction, dispatchAction, initClickFeedback } from '../../../src/shared/actionBus.js';

test('dispatchAction invokes the handler and the injected click feedback', () => {
  const calls = [];
  registerAction('__sfxTestAction', (el) => calls.push(['handler', el]));
  initClickFeedback((el) => calls.push(['feedback', el]));

  dispatchAction('__sfxTestAction', 'fakeEl');

  assert.deepEqual(calls, [
    ['handler', 'fakeEl'],
    ['feedback', 'fakeEl'],
  ]);
  initClickFeedback(null); // don't leak into other tests
});
