// dev/tests/render/graphicsSettings.test.js
// Headless coverage for the graphicsSettings action wiring: dispatching the
// registered toggle actions through the actionBus flips the singleton flags,
// and queryGraphicsFlags exposes the live effects object to ui/.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { graphicsSettings } from '../../../src/render/overlays/graphicsSettings.js';
import { dispatchAction } from '../../../src/shared/actionBus.js';

test('toggleShadows flips the shadows flag', () => {
  const before = graphicsSettings.effects.shadows;
  dispatchAction('toggleShadows');
  assert.equal(graphicsSettings.effects.shadows, !before);
  dispatchAction('toggleShadows');
  assert.equal(graphicsSettings.effects.shadows, before);
});

test('toggleFogMist flips the fogMist flag', () => {
  const before = graphicsSettings.effects.fogMist;
  dispatchAction('toggleFogMist');
  assert.equal(graphicsSettings.effects.fogMist, !before);
  dispatchAction('toggleFogMist');
  assert.equal(graphicsSettings.effects.fogMist, before);
});

test('toggleSelectionRing flips the selectionRing flag', () => {
  const before = graphicsSettings.effects.selectionRing;
  dispatchAction('toggleSelectionRing');
  assert.equal(graphicsSettings.effects.selectionRing, !before);
  dispatchAction('toggleSelectionRing');
  assert.equal(graphicsSettings.effects.selectionRing, before);
});

test('queryGraphicsFlags returns the live effects object', () => {
  const flags = dispatchAction('queryGraphicsFlags');
  assert.equal(flags, graphicsSettings.effects);
});
