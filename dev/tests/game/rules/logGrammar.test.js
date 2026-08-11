/**
 * logGrammar.test.js — Structured log entry grammar
 * (src/game/rules/logGrammar.js). Protects the user-visible log text contract.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOG_CATEGORY, label, createLogEntry } from '../../../../src/game/rules/logGrammar.js';

test('LOG_CATEGORY: frozen enum with the six categories', () => {
  assert.deepEqual(LOG_CATEGORY, {
    COMBAT: 'combat',
    HEAL: 'heal',
    ECONOMY: 'economy',
    DEATH: 'death',
    SYSTEM: 'system',
    MARKER: 'marker',
  });
  assert.ok(Object.isFrozen(LOG_CATEGORY));
  assert.throws(() => { LOG_CATEGORY.COMBAT = 'x'; }, TypeError);
});

test('label: includes color only when provided', () => {
  assert.deepEqual(label('Gold'), { text: 'Gold' });
  assert.deepEqual(label('Gold', 'var(--gold)'), { text: 'Gold', color: 'var(--gold)' });
});

test('createLogEntry: assembles plainText from non-empty grammar fields', () => {
  const entry = createLogEntry({
    category: LOG_CATEGORY.ECONOMY,
    subject: { text: 'Sir Digs', color: 'var(--f0-pale)' },
    verb: 'dug up',
    object: { text: 'a relic', color: 'var(--gold)' },
    detail: null,
  });
  assert.equal(entry.plainText, 'Sir Digs dug up a relic');
  assert.equal(entry.category, 'economy');
  assert.deepEqual(entry.grammar, {
    subject: { text: 'Sir Digs', color: 'var(--f0-pale)' },
    verb: 'dug up',
    object: { text: 'a relic', color: 'var(--gold)' },
    detail: null,
  });
  assert.equal(entry.isDeath, false);
  assert.equal(entry.isDayMarker, false);
});

test('createLogEntry: segments mirror grammar order and spacing', () => {
  const entry = createLogEntry({
    category: LOG_CATEGORY.HEAL,
    subject: { text: 'Champ', color: 'var(--f2-pale)' },
    verb: 'eats',
    object: { text: 'fruit' },
    detail: { text: '+3 HP', color: 'var(--verdigris)' },
  });
  // createLogEntry always emits the color key for object/detail segments
  // (undefined when the caller omitted it) — the renderer reads .color directly.
  assert.deepEqual(entry.segments, [
    { text: 'Champ', color: 'var(--f2-pale)' },
    { text: ' eats ' },
    { text: 'fruit', color: undefined },
    { text: ' ' },
    { text: '+3 HP', color: 'var(--verdigris)' },
  ]);
});

test('createLogEntry: empty verb/object/detail drop out of plainText', () => {
  const entry = createLogEntry({
    category: LOG_CATEGORY.SYSTEM,
    subject: { text: 'The page wakes.' },
    verb: '',
    object: null,
    detail: null,
  });
  assert.equal(entry.plainText, 'The page wakes.');
});

test('createLogEntry: death and marker categories set their flags', () => {
  const death = createLogEntry({
    category: LOG_CATEGORY.DEATH,
    subject: { text: 'X' },
    verb: 'has fallen',
    object: null,
    detail: null,
  });
  assert.equal(death.isDeath, true);
  assert.equal(death.isDayMarker, false);

  const marker = createLogEntry({
    category: LOG_CATEGORY.MARKER,
    subject: { text: 'Day 2: Overgrowth' },
    verb: '',
    object: null,
    detail: null,
  });
  assert.equal(marker.isDayMarker, true);
  assert.equal(marker.isDeath, false);
});
