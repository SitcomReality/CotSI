import { FACTIONS } from '../game/rules/factionData.js';
import { listArchetypes, getArchetype } from '../game/rules/archetypes.js';
import '../game/rules/archetypeData/index.js'; // side-effect: populate archetype registry
import { buildRoster } from './setupHeptagram.js';
import './setupActions.js'; // side-effect: register action handlers
import { DEFAULT_MAP_RADIUS, DEFAULT_RELIC_TARGET } from '../params/ui/setupParams.js';

// ─── Shared mutable state ───

/** @type {number} Current game mode: 3 or 7 players */
export let gameMode = 7;

/** @type {Array} Faction roster with enabled/human flags */
export let roster = [];

/** Update game mode from importing modules (ES module bindings are read-only). */
export function setGameMode(mode) {
  gameMode = mode;
}

// ─── Public API ───

/**
 * Initialize the setup screen: heptagram roster, mode toggle, controls.
 */
export function initSetup() {
  const container = document.getElementById('setup');
  if (!container) return;

  // ---- Biome dropdown ----
  const biomeSelect = document.getElementById('biomeSelect');
  if (biomeSelect) {
    // "Multi-biome" is the default selection — generates a world with varied biomes
    const multiOpt = document.createElement('option');
    multiOpt.value = 'multi_biome';
    multiOpt.textContent = 'Multi-biome (mixed world)';
    multiOpt.selected = true;
    biomeSelect.appendChild(multiOpt);

    const biomeKeys = listArchetypes('biome');
    biomeKeys.forEach(key => {
      const def = getArchetype(key);
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = def.name;
      biomeSelect.appendChild(opt);
    });
  }

  // ---- Build roster ----
  roster = FACTIONS.map((f, i) => ({
    ...f,
    enabled: true,
    human: i === 0,
  }));

  // ---- Build roster ----
  buildRoster();
}
