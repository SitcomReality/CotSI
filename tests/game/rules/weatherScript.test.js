/**
 * weatherScript.test.js — 7-day divine weather cycle
 * (src/game/rules/weatherScript.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WEATHER_SCRIPT, weatherForDay } from '../../../src/game/rules/weatherScript.js';

test('WEATHER_SCRIPT: exactly 7 entries, one per day', () => {
  assert.equal(WEATHER_SCRIPT.length, 7);
});

test('WEATHER_SCRIPT: every entry has the full effect shape', () => {
  for (const w of WEATHER_SCRIPT) {
    assert.equal(typeof w.name, 'string');
    assert.ok(w.name.length > 0);
    assert.equal(typeof w.text, 'string');
    assert.equal(typeof w.dayLength, 'number');
    assert.equal(w.potency.length, 7);
    assert.equal(w.score.length, 7);
    assert.ok(w.potency.every((v) => Number.isInteger(v)), 'potency values are integers');
    assert.ok(w.score.every((v) => Number.isInteger(v)), 'score values are integers');
    assert.equal(typeof w.tint, 'string');
    assert.ok(w.tint.startsWith('#'), 'tint is a hex color');
  }
});

test('WEATHER_SCRIPT: text renders the formatted effects', () => {
  // Day 1 (Rainbow Aftermath): potency [-1,0,2,0,2,0,-1], score [0,0,1,0,1,0,0], dayLength 1.0
  const w = WEATHER_SCRIPT[0];
  assert.match(w.text, /CRU-1 potency/);
  assert.match(w.text, /VER\+2 potency/);
  assert.match(w.text, /HRT\+2 potency/);
  assert.match(w.text, /HOL-1 potency/);
  assert.match(w.text, /VER\+1 score/);
  assert.match(w.text, /HRT\+1 score/);
  assert.ok(!w.text.includes('% moves'), 'dayLength 1.0 adds no moves line');
});

test('WEATHER_SCRIPT: moves line appears only when dayLength ≠ 1.0', () => {
  // Leyline Ebb (day 3): dayLength 0.8
  assert.match(WEATHER_SCRIPT[2].text, /80% moves/);
  // Dream Fog (day 7): dayLength 1.4
  assert.match(WEATHER_SCRIPT[6].text, /140% moves/);
});

test('weatherForDay: loops through the 7-day script', () => {
  assert.equal(weatherForDay(1), WEATHER_SCRIPT[0]);
  assert.equal(weatherForDay(7), WEATHER_SCRIPT[6]);
  assert.equal(weatherForDay(8), WEATHER_SCRIPT[0]);
  assert.equal(weatherForDay(14), WEATHER_SCRIPT[6]);
  assert.equal(weatherForDay(21), WEATHER_SCRIPT[6]);
  assert.equal(weatherForDay(22), WEATHER_SCRIPT[0]);
});

test('weatherForDay: day 0 wraps to the last day (day - 1 = -1 index)', () => {
  // JS (-1 % 7) === -1, so day 0 indexes WEATHER_SCRIPT[-1] → undefined.
  assert.equal(weatherForDay(0), undefined);
});
