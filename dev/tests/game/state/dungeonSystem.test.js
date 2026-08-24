/**
 * dungeonSystem.test.js — In-dungeon champion state, battles, and placement
 * (src/game/state/features/dungeonSystem.js, src/game/state/features/dungeonPlacement.js).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isInDungeon,
  canEnterDungeon,
  dungeonEntryBlockReason,
  enterDungeon,
  createDungeonBattle,
  resolveDungeonBattleWin,
  fleeDungeon,
} from '../../../../src/game/state/features/dungeonSystem.js';
import { placeDungeons } from '../../../../src/game/state/features/dungeonPlacement.js';
import { dungeonCountForRadius } from '../../../../src/game/rules/dungeonRules.js';
import { createGame } from '../../../../src/game/state/gameFactory.js';
import { makeChampion, makeState, makeTile } from '../../helpers/stateFixture.js';
import { coordKey, distance, hexesWithinRadius } from '../../../../src/engine/rules/hexGrid.js';
import { TERRAIN } from '../../../../src/game/rules/terrainTypes.js';
import { FACTION_COUNT } from '../../../../src/params/game/factionParams.js';
import { DUNGEON_BATTLE_SCALE, DUNGEON_COMPLETION_GOLD, DUNGEON_COMPLETION_RELIC, DUNGEON_COMPLETION_KNOTS, DUNGEON_COMPLETION_BONUS_KNOTS } from '../../../../src/params/game/dungeonParams.js';
import { applyFeatureChoice } from '../../../../src/game/state/features/featureRewards.js';

const HERE = coordKey({ q: 0, r: 0 });

function dungeonState(champOverrides = {}, stateOverrides = {}) {
  const champ = makeChampion({ id: 'cA', controller: 'human', pos: { q: 0, r: 0 }, dungeon: null, dungeonMemory: {}, ...champOverrides });
  const tile = makeTile('plains', { feature: { kind: 'dungeon' } });
  const state = makeState({
    champions: [champ],
    tiles: { [HERE]: tile },
    ...stateOverrides,
  });
  state.spatialIndex.set(HERE, { type: 'champion', entity: champ });
  return { champ, state, tile };
}

// ── Entry ─────────────────────────────────────────────────────────────────────

test('enterDungeon: human champion descends, is hidden (spatial removal), run day 1', () => {
  const { champ, state, tile } = dungeonState();
  assert.equal(enterDungeon(state, champ), true);
  assert.deepEqual(champ.dungeon, { key: HERE, day: 1 });
  assert.equal(state.spatialIndex.get(HERE), undefined, 'champion removed from spatial index');
  assert.equal(tile.feature.kind, 'dungeon', 'dungeon feature persists');
  assert.ok(state.logs.some((l) => l.grammar?.verb === 'descends into'));
});

test('enterDungeon: bot champions never enter (human-only dungeons)', () => {
  const { champ, state } = dungeonState({ controller: 'bot' });
  assert.equal(enterDungeon(state, champ), false);
  assert.equal(champ.dungeon, null);
});

test('enterDungeon: flee cooldown blocks re-entry until the second day after', () => {
  const { champ, state } = dungeonState();
  enterDungeon(state, champ); // descend first
  fleeDungeon(state, champ);  // then flee on day 1
  assert.deepEqual(champ.dungeonMemory[HERE], { fleeDay: 1 });

  // Day 1 and 2: sealed.
  assert.equal(canEnterDungeon(state, champ, HERE), false);
  assert.equal(dungeonEntryBlockReason(state, champ, HERE), 'cooldown');
  state.day = 2;
  assert.equal(enterDungeon(state, champ), false, 'day 2 still sealed');
  assert.equal(champ.dungeon, null);

  // Day 3: re-entry allowed — the champion can descend again.
  state.day = 3;
  assert.equal(canEnterDungeon(state, champ, HERE), true);
  assert.equal(enterDungeon(state, champ), true);
  assert.deepEqual(champ.dungeon, { key: HERE, day: 1 });
});

test('enterDungeon: a completed dungeon stays sealed forever', () => {
  const { champ, state } = dungeonState();
  champ.dungeonMemory[HERE] = { completed: true };
  assert.equal(dungeonEntryBlockReason(state, champ, HERE), 'completed');
  assert.equal(enterDungeon(state, champ), false);
  assert.equal(champ.dungeon, null);
});

// ── Battle generation ─────────────────────────────────────────────────────────

test('createDungeonBattle: ephemeral mob tagged dungeonBattle, escalating with day', () => {
  const { champ, state } = dungeonState();

  champ.dungeon = { key: HERE, day: 1 };
  const day1 = createDungeonBattle(state, champ);
  champ.dungeon = { key: HERE, day: 3 };
  const day3 = createDungeonBattle(state, champ);

  assert.equal(day1.dungeonBattle, true);
  assert.equal(day3.dungeonBattle, true);
  assert.equal(day1.alive, true);
  assert.equal(day1.potencies.length, FACTION_COUNT);
  assert.deepEqual(day1.pos, { q: 0, r: 0 }, 'battle takes place on the dungeon hex');

  // Same seeded roll → same archetype; only the day scaling differs.
  assert.equal(day1.archetypeId, day3.archetypeId);
  assert.equal(day3.maxHp, Math.round(day1.maxHp * (DUNGEON_BATTLE_SCALE[3].hpMult / DUNGEON_BATTLE_SCALE[1].hpMult)));
  assert.ok(day3.hp >= day1.hp, 'day 3 mob is stronger than day 1');
  const own1 = day1.potencies[day1.faction];
  const own3 = day3.potencies[day3.faction];
  assert.equal(own3 - own1, DUNGEON_BATTLE_SCALE[3].potencyBonus, 'potency escalates with the day');
});

// ── Win resolution ────────────────────────────────────────────────────────────

test('resolveDungeonBattleWin: day 1/2 wins advance the run without rewards', () => {
  const { champ, state } = dungeonState();
  enterDungeon(state, champ);

  const result = resolveDungeonBattleWin(state, champ);
  assert.deepEqual(result, { completed: false });
  assert.equal(champ.dungeon.day, 2);
  assert.equal(champ.gold, 0, 'no completion reward mid-run');

  resolveDungeonBattleWin(state, champ);
  assert.equal(champ.dungeon.day, 3);
});

test('resolveDungeonBattleWin: day 3 win completes — rewards, unhide, full turn', () => {
  const { champ, state } = dungeonState();
  enterDungeon(state, champ);
  champ.dungeon.day = 3;

  const beforeGold = champ.gold;
  const beforeRelics = champ.relics;
  const beforeKnot = champ.knot;

  const result = resolveDungeonBattleWin(state, champ);

  assert.equal(result.completed, true);
  assert.deepEqual(result.rewards, {
    gold: DUNGEON_COMPLETION_GOLD,
    relic: DUNGEON_COMPLETION_RELIC,
    knots: DUNGEON_COMPLETION_KNOTS,
  });
  assert.equal(champ.dungeon, null, 'run cleared');
  assert.deepEqual(champ.dungeonMemory[HERE], { completed: true });
  assert.equal(champ.gold, beforeGold + DUNGEON_COMPLETION_GOLD);
  assert.equal(champ.relics, beforeRelics + DUNGEON_COMPLETION_RELIC);
  assert.equal(champ.knot, beforeKnot + DUNGEON_COMPLETION_KNOTS);
  // (AP/lastActionCombat restore for the full turn is granted by the runtime —
  //  combatRoundEnd — not by the state layer.)
  assert.deepEqual(state.spatialIndex.get(HERE), { type: 'champion', entity: champ }, 'champion unhidden');
});

test('resolveDungeonBattleWin: human completion offers a bonus item/knot choice', () => {
  const { champ, state } = dungeonState();
  enterDungeon(state, champ);
  champ.dungeon.day = 3;

  resolveDungeonBattleWin(state, champ);

  assert.equal(state.reward?.type, 'feature');
  assert.equal(state.reward.tileKey, HERE);
  assert.deepEqual(state.reward.guaranteed, []);
  const kinds = state.reward.choices.map((c) => c.grant.kind);
  assert.deepEqual(kinds.sort(), ['equipment', 'equipment', 'knots']);
  // Applying the knots choice grants the bonus.
  const beforeKnot = champ.knot;
  applyFeatureChoice(
    state,
    champ,
    state.reward.choices.find((c) => c.grant.kind === 'knots'),
    HERE
  );
  assert.equal(champ.knot, beforeKnot + DUNGEON_COMPLETION_BONUS_KNOTS);
});

// ── Flee ──────────────────────────────────────────────────────────────────────

test('fleeDungeon: resets all progress, starts cooldown, unhides the champion', () => {
  const { champ, state } = dungeonState();
  enterDungeon(state, champ);
  champ.dungeon.day = 3; // mid-run progress

  fleeDungeon(state, champ);

  assert.equal(champ.dungeon, null, 'progress reset');
  assert.deepEqual(champ.dungeonMemory[HERE], { fleeDay: 1 });
  assert.deepEqual(state.spatialIndex.get(HERE), { type: 'champion', entity: champ }, 'champion unhidden');
  assert.ok(state.logs.some((l) => l.grammar?.verb === 'fled'));
});

test('isInDungeon: reflects active run state', () => {
  const { champ, state } = dungeonState();
  assert.equal(isInDungeon(champ), false);
  enterDungeon(state, champ);
  assert.equal(isInDungeon(champ), true);
  fleeDungeon(state, champ);
  assert.equal(isInDungeon(champ), false);
});

// ── Placement + integration ───────────────────────────────────────────────────

test('placeDungeons: places the formula count on passable, unclaimed, featureless tiles', () => {
  // A radius-16 hex disc: large enough that min spacing is always satisfiable.
  const tiles = {};
  const used = new Set(['0,0', '1,0']);
  for (const c of hexesWithinRadius(16)) {
    const key = coordKey({ q: c.q, r: c.r });
    tiles[key] = { q: c.q, r: c.r, terrain: 'plains', feature: null };
  }
  const rand = () => 0.5;
  const keys = placeDungeons({ tiles, rand, used, radius: 22 });

  assert.equal(keys.length, dungeonCountForRadius(22));
  assert.equal(keys.length, 2);
  for (const key of keys) {
    const tile = tiles[key];
    assert.ok(TERRAIN[tile.terrain].passable, 'dungeon on passable terrain');
    assert.equal(tile.feature.kind, 'dungeon');
    assert.ok(used.has(key), 'dungeon hex claimed');
  }
  // Dungeons are spread out: at least the min spacing for radius 22
  // (max(floor, radius × fraction) = 11).
  const [a, b] = keys.map((k) => ({ q: tiles[k].q, r: tiles[k].r }));
  assert.ok(distance(a, b) >= 11, 'dungeons respect the min spacing');
});

test('createGame: places one dungeon at radius 4, off spawns, on real passable tiles', () => {
  const SEVEN_BOTS = Array.from({ length: 7 }, (_, faction) => ({ faction, controller: 'bot' }));
  const state = createGame({ seed: 'dungeon-int-test', radius: 4, champions: SEVEN_BOTS });

  assert.equal(state._dungeonKeys.size, dungeonCountForRadius(4));
  for (const key of state._dungeonKeys) {
    const tile = state.tiles[key];
    assert.equal(tile.feature.kind, 'dungeon');
    assert.ok(TERRAIN[tile.terrain].passable, 'dungeon on passable terrain');
    assert.equal(state.mobs.some((m) => coordKey(m.pos) === key), false, 'no mob on the dungeon');
    assert.equal(state.traders.some((t) => coordKey(t.pos) === key), false, 'no trader on the dungeon');
    for (const ch of state.champions) {
      assert.ok(distance(ch.pos, { q: tile.q, r: tile.r }) >= 1, 'no champion spawns on the dungeon');
    }
  }
});
