/**
 * dispatchReport.test.js — Augur's Dispatch report builder
 * (src/game/rules/dispatchReport.js), the biggest previously-untested rules
 * file. The report is display-ready data for the dispatch modal: effect lines
 * (weather, artifact, faction, terrain, equipment), movement breakdown, and the
 * drained ledger. Pure — takes state + champion, returns a new object.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDispatchReport } from '../../../src/game/rules/dispatchReport.js';
import { coordKey } from '../../../src/engine/rules/hexGrid.js';

function makeChamp(overrides = {}) {
  return {
    id: 'c0',
    name: 'Test Champion',
    faction: 0,
    hp: 10,
    maxHp: 10,
    pos: { q: 0, r: 0 },
    baseMove: 3,
    moves: 3,
    artifact: null,
    weapon: 'ash staff',
    armor: 'worn linen',
    ...overrides,
  };
}

function makeState(overrides = {}) {
  return {
    day: 1,
    weather: {
      name: 'Rainbow Aftermath',
      text: '...',
      dayLength: 1.0,
      potency: Array(7).fill(0),
      score: Array(7).fill(0),
      tint: '#f5d76a',
    },
    tiles: { [coordKey({ q: 0, r: 0 })]: { terrain: 'plains', feature: null } },
    ...overrides,
  };
}

test('report shell: faction glyph fields, week, and empty ledger', () => {
  const report = buildDispatchReport(makeState(), makeChamp({ faction: 0 }));
  assert.equal(report.championId, 'c0');
  assert.equal(report.name, 'Test Champion');
  assert.equal(report.factionName, 'Crucible');
  assert.equal(report.glyphId, 'g-crucible');
  assert.equal(report.glyph, '[CRU]');
  assert.equal(report.color, '#b84530');
  assert.equal(report.day, 1);
  assert.equal(report.week, 1);
  assert.deepEqual(report.ledger, []);
});

test('week boundary: day 7 → week 1, day 8 → week 2', () => {
  assert.equal(buildDispatchReport(makeState({ day: 7 }), makeChamp()).week, 1);
  assert.equal(buildDispatchReport(makeState({ day: 8 }), makeChamp()).week, 2);
  assert.equal(buildDispatchReport(makeState({ day: 14 }), makeChamp()).week, 2);
  assert.equal(buildDispatchReport(makeState({ day: 15 }), makeChamp()).week, 3);
});

test('weather effects: potency and score lines with boon/burden tone', () => {
  // Contract per the file docstring: weather potency/score feed the modal's
  // stat grid (dispatchModal.js reads category 'potency'/'score' + value).
  const state = makeState({
    weather: {
      name: 'Rainbow Aftermath',
      dayLength: 1.0,
      potency: [-1, 0, 2, 0, 2, 0, -1],
      score: [0, 0, 1, 0, 1, 0, 0],
    },
  });
  // Faction 4 (Hearth): potency +2, score +1 → two boon lines.
  const hearth = buildDispatchReport(state, makeChamp({ faction: 4 })).effects.filter(
    (e) => e.source === 'Weather'
  );
  assert.deepEqual(hearth, [
    {
      source: 'Weather',
      text: 'Rainbow Aftermath: Hearth potency +2 in combat.',
      tone: 'boon',
      category: 'potency',
      value: 2,
    },
    {
      source: 'Weather',
      text: 'Rainbow Aftermath: +1 to your final combat score.',
      tone: 'boon',
      category: 'score',
      value: 1,
    },
  ]);
  // Faction 6 (Hollow): potency -1 → burden; score 0 → no score line.
  const hollow = buildDispatchReport(state, makeChamp({ faction: 6 })).effects.filter(
    (e) => e.source === 'Weather'
  );
  assert.deepEqual(hollow, [
    {
      source: 'Weather',
      text: 'Rainbow Aftermath: Hollow potency -1 in combat.',
      tone: 'burden',
      category: 'potency',
      value: -1,
    },
  ]);
});

test('artifact effects: one line per artifact, spur covered by movement', () => {
  const cases = [
    ['lens', 'Inkglass Lens: +1 sight radius.', 'boon'],
    ['margin', 'Dueling Margin: +2 final combat score.', 'boon'],
    ['tongs', "Blessed Tongs: replacing equipment refunds double God's Knot.", 'neutral'],
    ['echo', 'Echo Coin: potency gains may echo into your primary.', 'neutral'],
  ];
  for (const [artifact, text, tone] of cases) {
    const effects = buildDispatchReport(makeState(), makeChamp({ artifact })).effects.filter(
      (e) => e.source === 'Artifact'
    );
    assert.equal(effects.length, 1, `artifact ${artifact} yields one line`);
    assert.deepEqual(effects[0], { source: 'Artifact', text, tone, category: 'artifact' });
  }
  // Spur grants +1 movement — appears in the movement breakdown, not effects.
  const spur = buildDispatchReport(makeState(), makeChamp({ artifact: 'spur' })).effects.filter(
    (e) => e.source === 'Artifact'
  );
  assert.equal(spur.length, 0);
});

test('faction effects: every faction produces exactly one line', () => {
  for (let f = 0; f < 7; f++) {
    const effects = buildDispatchReport(makeState(), makeChamp({ faction: f })).effects.filter(
      (e) => e.source === 'Faction'
    );
    assert.equal(effects.length, 1, `faction ${f} yields one line`);
    assert.equal(effects[0].category, 'faction');
    assert.ok(typeof effects[0].text === 'string' && effects[0].text.length > 0);
  }
});

test('faction effects: Crucible scales its penalty with the week', () => {
  const week1 = buildDispatchReport(makeState(), makeChamp({ faction: 0 })).effects.find(
    (e) => e.source === 'Faction'
  );
  assert.equal(week1.text, 'Scarshield: enemies take -1 to their final combat score.');
  const week2 = buildDispatchReport(makeState({ day: 8 }), makeChamp({ faction: 0 })).effects.find(
    (e) => e.source === 'Faction'
  );
  assert.equal(week2.text, 'Scarshield: enemies take -2 to their final combat score.');
});

test('faction effects: Hollow bonus = ceil(missing/10) × ceil(week/3)', () => {
  // Missing 6 HP, week 1 → ceil(6/10) × ceil(1/3) = 1 × 1 = +1
  const wounded = buildDispatchReport(
    makeState(),
    makeChamp({ faction: 6, hp: 4, maxHp: 10 })
  ).effects.find((e) => e.source === 'Faction');
  assert.equal(wounded.text, 'Vaunted Nothing: your wounds add +1 to your final combat score.');
  assert.equal(wounded.tone, 'boon');

  // Full HP → 0 (signed() only prefixes '+'), neutral tone.
  const full = buildDispatchReport(makeState(), makeChamp({ faction: 6 })).effects.find(
    (e) => e.source === 'Faction'
  );
  assert.equal(full.text, 'Vaunted Nothing: your wounds add 0 to your final combat score.');
  assert.equal(full.tone, 'neutral');

  // Missing 6 HP, week 4 (day 22) → ceil(6/10) × ceil(4/3) = 1 × 2 = +2
  const week4 = buildDispatchReport(
    makeState({ day: 22 }),
    makeChamp({ faction: 6, hp: 4, maxHp: 10 })
  ).effects.find((e) => e.source === 'Faction');
  assert.equal(week4.text, 'Vaunted Nothing: your wounds add +2 to your final combat score.');
});

test('terrain effects: base, fruit tree, vegetation, and knot lines', () => {
  const at = (feature) =>
    makeState({
      tiles: {
        [coordKey({ q: 0, r: 0 })]: { terrain: 'plains', feature },
      },
    });

  const textFor = (state, champ) =>
    buildDispatchReport(state, champ).effects.find((e) => e.source === 'Terrain').text;

  assert.equal(
    textFor(at({ kind: 'base', faction: 0 }), makeChamp({ faction: 0 })),
    "Standing on Plains. Your faction's base — sanctuary is at hand."
  );
  assert.ok(textFor(at({ kind: 'base', faction: 3 }), makeChamp({ faction: 0 })).includes(
    'Archive base — potency may be bought here.'
  ));
  assert.equal(textFor(at({ kind: 'fruitTree', ripe: true }), makeChamp()), 'Standing on Plains. Moonberries hang here.');
  assert.equal(textFor(at({ kind: 'fruitTree', ripe: false }), makeChamp()), 'Standing on Plains. The berries here are spent.');
  assert.equal(textFor(at({ kind: 'tree' }), makeChamp()), 'Standing on Plains. A tree stands here.');
  assert.equal(textFor(at({ kind: 'largeTree' }), makeChamp()), 'Standing on Plains. A massive tree stands here.');
  assert.equal(textFor(at({ kind: 'bush' }), makeChamp()), 'Standing on Plains. Dense underbrush crowds the hex.');
  assert.equal(textFor(at({ kind: 'vine' }), makeChamp()), 'Standing on Plains. Thick vines carpet the ground.');
  assert.equal(textFor(at({ kind: 'knot', mined: false }), makeChamp()), "Standing on Plains. An unmined God's Knot glimmers.");
  // Mined knot → no glimmer suffix.
  assert.equal(textFor(at({ kind: 'knot', mined: true }), makeChamp()), 'Standing on Plains.');
  // No feature at all.
  assert.equal(textFor(makeState(), makeChamp()), 'Standing on Plains.');
});

test('equipment effects: capitalized weapon; armor verbatim', () => {
  const effects = buildDispatchReport(makeState(), makeChamp()).effects.find(
    (e) => e.source === 'Equipment'
  );
  assert.equal(effects.text, 'Ash staff; worn linen.');
});

test('movement breakdown: base, spur, verdant, and day-length parts', () => {
  const movement = (champ, state = makeState()) => buildDispatchReport(state, champ).movement;

  assert.deepEqual(movement(makeChamp()), { parts: ['3 base'], total: 3 });
  assert.deepEqual(movement(makeChamp({ artifact: 'spur', moves: 4 })), {
    parts: ['3 base', "+1 Pilgrim's Spur"],
    total: 4,
  });
  assert.deepEqual(movement(makeChamp({ faction: 2 })), {
    parts: ['3 base', "+1 Gaia's Wail"],
    total: 3,
  });
  assert.deepEqual(
    movement(
      makeChamp({ artifact: 'spur', faction: 2, moves: 5 }),
      makeState({
        weather: { name: 'Leyline Ebb', dayLength: 0.8, potency: Array(7).fill(0), score: Array(7).fill(0) },
      })
    ),
    { parts: ['3 base', "+1 Pilgrim's Spur", "+1 Gaia's Wail", '× 0.8 Leyline Ebb'], total: 5 }
  );
});

test('ledger entries pass through unchanged', () => {
  const ledger = [
    { text: "+2 gold — Beggar-Saint's Ledger", sign: 'gain', type: 'gold' },
    { text: '+1 move — Another\'s Dream', sign: 'gain', type: 'move' },
  ];
  const report = buildDispatchReport(makeState(), makeChamp(), ledger);
  assert.deepEqual(report.ledger, ledger);
});

test('effects always include terrain and equipment lines', () => {
  const sources = new Set(buildDispatchReport(makeState(), makeChamp()).effects.map((e) => e.source));
  assert.ok(sources.has('Terrain'));
  assert.ok(sources.has('Equipment'));
});
