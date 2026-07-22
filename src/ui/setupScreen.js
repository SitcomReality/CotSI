import { FACTIONS } from '../game/rules/factionData.js';
import { listArchetypes, getArchetype } from '../game/rules/archetypes.js';
import '../game/rules/archetypeData/index.js'; // side-effect: populate archetype registry
import { buildHeptagram } from './setupHeptagram.js';
import './setupActions.js'; // side-effect: register action handlers

// ─── Shared mutable state ───

/** @type {number} Current game mode: 3 or 7 players */
export let gameMode = 7;

/** @type {Array} Faction roster with enabled/human flags */
export let roster = [];

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
    const biomeKeys = listArchetypes('biome');
    biomeKeys.forEach(key => {
      const def = getArchetype(key);
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = def.name;
      if (key === 'biome_default') opt.selected = true;
      biomeSelect.appendChild(opt);
    });
  }

  // ---- Wire advanced slider displays ----
  function wireSlider(sliderId, displayId) {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(displayId);
    if (slider && display) {
      const update = () => { display.textContent = slider.value; };
      slider.addEventListener('input', update);
      update();
    }
  }
  wireSlider('hvSlider', 'hvVal');
  wireSlider('wtSlider', 'wtVal');
  wireSlider('mtSlider', 'mtVal');

  // ---- Build roster ----
  roster = FACTIONS.map((f, i) => ({
    ...f,
    enabled: true,
    human: i === 0,
  }));

  // ---- Build heptagram ----
  buildHeptagram();
}
