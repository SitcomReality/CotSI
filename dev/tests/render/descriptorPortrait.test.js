/**
 * descriptorPortrait.test.js — Item kind, portrait framing, and the icon atlas
 * catalog (the pure, THREE-free halves of the icon system).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  OBJECT_KINDS,
  ITEM_SLOTS,
  PORTRAIT_DEFAULTS,
  normalizeDescriptor,
  denormalizeDescriptor,
  validateDescriptor,
} from '../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import {
  listPortraitEntries,
  portraitKeyFor,
} from '../../../src/render/hexmap3d/portrait/portraitCatalog.js';

// ── Schema: item kind + slot ────────────────────────────────────────────────

test('item kind is part of OBJECT_KINDS and requires a valid slot', () => {
  assert.ok(OBJECT_KINDS.includes('item'));
  const valid = {
    id: 'testItem',
    kind: 'item',
    slot: 'weapon',
    displayName: 'Test Item',
    parts: [{ id: 'p', shape: 'cube' }],
  };
  assert.deepEqual(validateDescriptor(valid), []);

  const noSlot = { ...valid, slot: undefined };
  assert.ok(validateDescriptor(noSlot).some((e) => e.includes('descriptor.slot')));

  const badSlot = { ...valid, slot: 'consumable' };
  assert.ok(validateDescriptor(badSlot).some((e) => e.includes('descriptor.slot')));
});

test('slot is rejected on non-item kinds', () => {
  const feature = {
    id: 'f',
    kind: 'feature',
    slot: 'weapon',
    displayName: 'F',
    parts: [{ id: 'p', shape: 'cube' }],
  };
  assert.ok(validateDescriptor(feature).some((e) => e.includes('descriptor.slot')));
});

test('item descriptors normalize and denormalize cleanly', () => {
  const raw = {
    id: 'testItem',
    kind: 'item',
    slot: 'armor',
    displayName: 'Test Armor',
    parts: [{ id: 'body', shape: 'cube', color: 0x8a5a2b }],
  };
  const normalized = normalizeDescriptor(raw);
  assert.equal(normalized.slot, 'armor');
  assert.equal(normalized.portrait, undefined); // absent = auto-frame fallback

  const minimal = denormalizeDescriptor(normalized);
  assert.equal(minimal.slot, 'armor');
  assert.equal(minimal.portrait, undefined);
  assert.deepEqual(normalizeDescriptor(minimal), normalized);
});

// ── Schema: portrait framing ────────────────────────────────────────────────

test('portrait framing fills defaults and round-trips through denormalize', () => {
  const raw = {
    id: 'framed',
    kind: 'feature',
    displayName: 'Framed',
    parts: [{ id: 'p', shape: 'cube' }],
    portrait: { pad: 2 },
  };
  const normalized = normalizeDescriptor(raw);
  assert.deepEqual(normalized.portrait, { ...PORTRAIT_DEFAULTS, pad: 2 });

  const minimal = denormalizeDescriptor(normalized);
  // Only the non-default field survives.
  assert.deepEqual(minimal.portrait, { pad: 2 });
  assert.deepEqual(normalizeDescriptor(minimal), normalized);
});

test('invalid portrait fields are rejected', () => {
  const base = { id: 'b', kind: 'feature', displayName: 'B', parts: [{ id: 'p', shape: 'cube' }] };
  assert.ok(validateDescriptor({ ...base, portrait: { pad: -1 } }).some((e) => e.includes('portrait')));
  assert.ok(validateDescriptor({ ...base, portrait: { bogus: 1 } }).some((e) => e.includes('portrait')));
  assert.ok(validateDescriptor({ ...base, portrait: 'flat' }).some((e) => e.includes('portrait')));
});

// ── Atlas catalog ────────────────────────────────────────────────────────────

test('atlas catalog enumerates items, trader, bases, champions, and mobs', () => {
  const entries = listPortraitEntries();
  const keys = new Set(entries.map((e) => e.key));

  // Every item descriptor (kind 'item') has an `item:<id>` entry.
  const items = entries.filter((e) => e.key.startsWith('item:'));
  assert.ok(items.length >= 7, 'at least the seven equipment items are catalogued');

  assert.ok(keys.has('trader'));

  const bases = entries.filter((e) => e.key.startsWith('base:'));
  const champions = entries.filter((e) => e.key.startsWith('champion:'));
  const mobs = entries.filter((e) => e.key.startsWith('mob:'));
  assert.equal(bases.length, 7);
  assert.equal(champions.length, 7);
  assert.ok(mobs.length >= 7, 'every faction has at least one mob archetype');
  assert.equal(mobs.length % 7, 0, 'mobs are enumerated per faction');
});

test('portraitKeyFor spells every key in one place', () => {
  assert.equal(portraitKeyFor('item', { id: 'thornBrand' }), 'item:thornBrand');
  assert.equal(portraitKeyFor('trader'), 'trader');
  assert.equal(portraitKeyFor('base', { faction: 'CRU' }), 'base:CRU');
  assert.equal(portraitKeyFor('champion', { faction: 'REV' }), 'champion:REV');
  assert.equal(portraitKeyFor('mob', { faction: 'HOL', archetype: 'infernalpaca' }), 'mob:HOL:infernalpaca');
});
