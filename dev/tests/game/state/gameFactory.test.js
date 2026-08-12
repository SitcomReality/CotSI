/**
 * gameFactory.test.js — Whole-world assembly smoke + invariants
 * (src/game/state/gameFactory.js). Previously zero coverage; this exercises
 * the full createGame pipeline: terrain gen, base placement, champion/mob/
 * trader creation, turn order, vision, spatial index, and first-turn setup.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../../../../src/game/state/gameFactory.js';
import { FACTIONS } from '../../../../src/game/rules/factionData.js';
import { WEATHER_SCRIPT } from '../../../../src/game/rules/weatherScript.js';
import { DEFAULT_POTENCY, OWN_FACTION_POTENCY } from '../../../../src/params/game/factionParams.js';
import { MIN_MOB_COUNT, MOB_COUNT_RADIUS_MULTIPLIER, NUM_TRADERS } from '../../../../src/params/game/spawnParams.js';
import { CHAMPION_BASE_AP, SPUR_AP_BONUS } from '../../../../src/params/game/championParams.js';
import { coordKey, distance } from '../../../../src/engine/rules/hexGrid.js';

const SEVEN_BOTS = Array.from({ length: 7 }, (_, faction) => ({ faction, controller: 'bot' }));
const OBJECTIVES = { relicRace: true, relicTarget: 7, lastStanding: true };

test('createGame: assembles a complete world for 7 bots', () => {
  const state = createGame({ seed: 'assembly-test', radius: 4, champions: SEVEN_BOTS, objectives: OBJECTIVES });

  // Day 1 with the first weather day.
  assert.equal(state.day, 1);
  assert.equal(state.weather.name, WEATHER_SCRIPT[0].name);

  // Champions: all 7 factions, alive, correctly statted, on real distinct tiles.
  assert.equal(state.champions.length, 7);
  for (const ch of state.champions) {
    assert.equal(ch.alive, true);
    assert.equal(ch.potencies.length, 7);
    assert.equal(ch.potencies[ch.faction], OWN_FACTION_POTENCY);
    assert.equal(ch.potencies[(ch.faction + 1) % 7], DEFAULT_POTENCY);
    assert.equal(ch.baseActionPoints, CHAMPION_BASE_AP);
    assert.ok(state.tiles[coordKey(ch.pos)], `champion ${ch.id} stands on a real tile`);
  }
  const positions = new Set(state.champions.map((c) => coordKey(c.pos)));
  assert.equal(positions.size, 7, 'champion start hexes are distinct');

  // Bases: exactly one per faction, all registered in _baseKeys.
  const bases = Object.entries(state.tiles).filter(([, t]) => t.feature?.kind === 'base');
  assert.equal(bases.length, 7);
  assert.equal(state._baseKeys.size, 7);

  // Mobs + traders at the parameterized counts.
  const expectedMobs = Math.max(MIN_MOB_COUNT, 4 * MOB_COUNT_RADIUS_MULTIPLIER);
  assert.equal(state.mobs.length, expectedMobs);
  assert.equal(state.traders.length, NUM_TRADERS);

  // Spatial index covers every entity.
  assert.equal(state.spatialIndex.size, 7 + state.mobs.length + state.traders.length);

  // Order, herald, and active turn.
  assert.deepEqual(state.currentOrder, state.globalOrder);
  assert.equal(state.currentOrder.length, 7);
  assert.equal(state.activeChampionId, state.currentOrder[0]);
  assert.equal(state.herald.day, 1);
  assert.equal(state.herald.order.length, 7);
  assert.deepEqual(state.herald.deathOrder, []);

  // The active champion's first turn has begun (AP granted, vision refreshed).
  const active = state.champions.find((c) => c.id === state.activeChampionId);
  assert.ok(active.actionPoints >= CHAMPION_BASE_AP && active.actionPoints <= CHAMPION_BASE_AP + SPUR_AP_BONUS,
    `active champion has daily action points (got ${active.actionPoints})`);
  assert.ok(active.visible.length > 0, 'vision refreshed');
  assert.ok(active.explored.length > 0);
});

test('createGame: same seed reproduces the same world', () => {
  const a = createGame({ seed: 'repeat', radius: 4, champions: SEVEN_BOTS, objectives: OBJECTIVES });
  const b = createGame({ seed: 'repeat', radius: 4, champions: SEVEN_BOTS, objectives: OBJECTIVES });

  assert.deepEqual(a.currentOrder, b.currentOrder);
  assert.deepEqual(
    a.champions.map((c) => coordKey(c.pos)),
    b.champions.map((c) => coordKey(c.pos))
  );
  assert.deepEqual(a.mobs.map((m) => coordKey(m.pos)), b.mobs.map((m) => coordKey(m.pos)));
  assert.deepEqual(a.traders.map((t) => coordKey(t.pos)), b.traders.map((t) => coordKey(t.pos)));
});

test('createGame: a human champion gets an Augur\'s Dispatch at first turn', () => {
  const state = createGame({
    seed: 'human-turn',
    radius: 3,
    champions: [{ faction: 0, controller: 'human' }],
    objectives: { relicRace: false, lastStanding: true },
  });

  assert.equal(state.champions.length, 1);
  assert.equal(state.activeChampionId, state.currentOrder[0]);
  assert.equal(state.dispatch.championId, state.activeChampionId);
  assert.equal(state.dispatch.report.factionName, FACTIONS[0].name);
  assert.equal(state.dispatch.report.name, `${FACTIONS[0].name} Champion`);
  assert.deepEqual(state.dispatch.report.ledger, []);
});

test('createGame: single-biome mode builds a valid world', () => {
  const state = createGame({
    seed: 'single-biome',
    radius: 4,
    champions: SEVEN_BOTS,
    objectives: OBJECTIVES,
    biome: 'biome_default',
  });

  assert.equal(state.biome, 'biome_default');
  assert.equal(state.champions.length, 7);
  // Entity counts are capped by how much empty passable land the tiny map has
  // left after base/start placement — assert within limits, not exact.
  const maxMobs = Math.max(MIN_MOB_COUNT, 4 * MOB_COUNT_RADIUS_MULTIPLIER);
  assert.ok(state.mobs.length <= maxMobs);
  assert.ok(state.traders.length <= NUM_TRADERS);
  assert.ok(state.biomePalettes.size > 0, 'single-biome palette fallback populated');
  assert.equal(state.activeChampionId, state.currentOrder[0]);
});

test('createGame: partial 2-champion game places both factions apart', () => {
  const state = createGame({
    seed: 'partial',
    radius: 3,
    champions: [
      { faction: 0, controller: 'bot' },
      { faction: 3, controller: 'bot' },
    ],
    objectives: OBJECTIVES,
  });

  assert.equal(state.champions.length, 2);
  assert.deepEqual(state.champions.map((c) => c.faction).sort(), [0, 3]);
  const [posA, posB] = state.champions.map((c) => c.pos);
  assert.ok(distance(posA, posB) > 0, 'champions start apart');
  assert.equal(state.currentOrder.length, 2);
});
