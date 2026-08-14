/**
 * movementCosts.test.js — Effective per-entity terrain costs
 * (src/game/rules/movementCosts.js): base ladder, faction and mob overrides,
 * passability-unified blocking.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  terrainCost,
  terrainCostOverrides,
  isTerrainBlocked,
} from '../../../../src/game/rules/movementCosts.js';
import { terrainDisplayName, terrainOverride } from '../../../../src/game/rules/terrainOverrides.js';
import { TERRAIN } from '../../../../src/game/rules/terrainTypes.js';
import '../../../../src/game/rules/archetypeData/index.js'; // registers mob + biome archetypes

test('base ladder: open ground cheap, wood/marsh dear, rivers very dear, blocked ∞', () => {
  assert.equal(terrainCost(null, 'plains'), 10);
  assert.equal(terrainCost(null, 'beach'), 10);
  assert.equal(terrainCost(null, 'desert'), 10);
  assert.equal(terrainCost(null, 'forest'), 12);
  assert.equal(terrainCost(null, 'hill'), 12);
  assert.equal(terrainCost(null, 'plateau'), 15);
  assert.equal(terrainCost(null, 'marsh'), 15);
  assert.equal(terrainCost(null, 'denseForest'), 20);
  assert.equal(terrainCost(null, 'river'), 30);
  assert.equal(terrainCost(null, 'mountain'), Infinity);
  assert.equal(terrainCost(null, 'water'), Infinity);
  assert.equal(terrainCost(null, 'ice'), Infinity);
});

test('every finite base cost divides the 60 AP pool', () => {
  for (const [name, def] of Object.entries(TERRAIN)) {
    if (Number.isFinite(def.movementCost)) {
      assert.equal(60 % def.movementCost, 0, `${name} cost ${def.movementCost} must divide 60`);
    }
  }
});

test('champion: faction terrainCosts override the base ladder', () => {
  const verdant = { controller: 'human', faction: 2 };
  assert.equal(terrainCost(verdant, 'forest'), 4, 'Verdant forest ⅓ cost');
  assert.equal(terrainCost(verdant, 'denseForest'), 6);
  assert.equal(terrainCost(verdant, 'plains'), 10, 'unaffected terrain stays base');

  const archive = { controller: 'human', faction: 3 };
  assert.equal(terrainCost(archive, 'river'), 15, 'Archive river ½ cost');

  const crucible = { controller: 'human', faction: 0 };
  assert.equal(terrainCost(crucible, 'hill'), 6);
  assert.equal(terrainCost(crucible, 'plateau'), 6);

  const hearth = { controller: 'human', faction: 4 };
  assert.equal(terrainCost(hearth, 'plains'), 6);
  assert.equal(terrainCost(hearth, 'desert'), 6);

  const masque = { controller: 'human', faction: 5 };
  assert.equal(terrainCost(masque, 'desert'), 6);

  const hollow = { controller: 'human', faction: 6 };
  assert.equal(terrainCost(hollow, 'denseForest'), 10);

  const reverie = { controller: 'human', faction: 1 };
  assert.equal(terrainCost(reverie, 'marsh'), 6);
});

test('mob: archetype terrainCosts override the base ladder (waterbound goose)', () => {
  const goose = { type: 'mob', archetypeId: 'mob_goose' };
  assert.equal(terrainCost(goose, 'river'), 4, 'goose swims rivers cheaply');
  assert.equal(terrainCost(goose, 'water'), 4, 'goose swims open water');
  assert.equal(terrainCost(goose, 'plains'), 10, 'land at base cost');
  assert.equal(isTerrainBlocked(goose, 'water'), false);

  const tapir = { type: 'mob', archetypeId: 'mob_tapir' };
  assert.equal(terrainCost(tapir, 'river'), 10);
  assert.equal(terrainCost(tapir, 'water'), 20, 'amphibious wades slowly');
  assert.equal(terrainCost(tapir, 'marsh'), 10);

  const snail = { type: 'mob', archetypeId: 'mob_snail_knight' };
  assert.equal(terrainCost(snail, 'marsh'), 6);
  assert.equal(terrainCost(snail, 'river'), 15);

  const paca = { type: 'mob', archetypeId: 'mob_infernalpaca' };
  assert.equal(terrainCost(paca, 'river'), 30, 'no override → base ladder');
  assert.equal(isTerrainBlocked(paca, 'water'), true);
});

test('trader: no overrides — base ladder only', () => {
  const trader = { id: 'tr-0' };
  assert.equal(terrainCostOverrides(trader), null);
  assert.equal(terrainCost(trader, 'plains'), 10);
  assert.equal(terrainCost(trader, 'river'), 30);
  assert.equal(isTerrainBlocked(trader, 'water'), true);
});

test('isTerrainBlocked: passability is unified into cost', () => {
  assert.equal(isTerrainBlocked(null, 'mountain'), true);
  assert.equal(isTerrainBlocked(null, 'water'), true);
  assert.equal(isTerrainBlocked(null, 'plains'), false);
  assert.equal(isTerrainBlocked({ controller: 'human', faction: 2 }, 'water'), true, 'no champion can enter water');
});

test('supernatural biome terrain override: uniform cost + display name', () => {
  const verdant = { controller: 'human', faction: 2 }; // Verdant: forest 4 / denseForest 6
  // Protogrowth (forest) — uniform 12, ignoring Verdant's forest discount.
  assert.equal(terrainCost(verdant, 'forest', 'biome_unfinished_lands'), 12);
  // Without the biome, the faction discount still applies.
  assert.equal(terrainCost(verdant, 'forest'), 4);
  // Titanflesh (plains) — uniform 10.
  assert.equal(terrainCost(null, 'plains', 'biome_brass_grave'), 10);
  // Impassable terrain stays impassable (Forespring water, Sky Stalagmite mountain).
  assert.equal(terrainCost(null, 'water', 'biome_unfinished_lands'), Infinity);
  assert.equal(terrainCost(null, 'mountain', 'biome_brass_grave'), Infinity);

  assert.equal(terrainDisplayName('biome_unfinished_lands', 'mountain'), 'Sky Stalagmite');
  assert.equal(terrainDisplayName('biome_brass_grave', 'plains'), 'Titanflesh');
  assert.equal(terrainDisplayName(null, 'plains'), 'Plains');
  assert.equal(terrainOverride('biome_unfinished_lands', 'hill').name, 'Half-Hewn Rise');
});
