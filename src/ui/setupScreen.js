import { FACTIONS } from '../game/rules/factionData.js';
import { h } from './domBuilder.js';
import { svgIcon } from './svgIcon.js';
import { registerAction } from '../shared/actionBus.js';
import { toast } from './hud.js';
import { listArchetypes, getArchetype } from '../game/rules/archetypes.js';
import '../game/rules/archetypeData.js'; // side-effect: populate archetype registry

/**
 * Initialize the setup screen: faction roster, size pills, biome select,
 * advanced sliders, begin button.
 * Uses data-action delegation via actionBus.js for all interactions.
 */
export function initSetup() {
  const fl = document.getElementById('factionList');
  if (!fl) return; // not on setup page

  // ---- Populate biome dropdown ----
  const biomeSelect = document.getElementById('biomeSelect');
  if (biomeSelect) {
    const biomeKeys = listArchetypes('biome');
    biomeSelect.innerHTML = '';
    biomeKeys.forEach(key => {
      const def = getArchetype(key);
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = def.name;
      if (key === 'biome_default') opt.selected = true;
      biomeSelect.appendChild(opt);
    });
  }

  // ---- Wire advanced slider value displays ----
  function wireSlider(sliderId, displayId, formatter) {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(displayId);
    if (slider && display) {
      const update = () => { display.textContent = formatter ? formatter(slider.value) : slider.value; };
      slider.addEventListener('input', update);
      update();
    }
  }
  wireSlider('hvSlider', 'hvVal');
  wireSlider('wtSlider', 'wtVal');
  wireSlider('mtSlider', 'mtVal');

  // Toggle the advanced body visibility via checkbox
  const advToggle = document.getElementById('advToggle');
  const advBody = document.getElementById('advBody');
  if (advToggle && advBody) {
    advToggle.addEventListener('change', () => {
      advBody.style.display = advToggle.checked ? 'block' : 'none';
    });
    advBody.style.display = 'none'; // collapsed by default
  }

  // Build roster — no duplicate `controller` field; derived at begin time.
  const roster = FACTIONS.map((f, i) => ({
    ...f,
    enabled: i < 4,
    human: i === 0,
  }));

  function draw() {
    fl.replaceChildren();
    roster.forEach((r, idx) => {
      const btnLabel = r.human ? 'Human' : 'Bot';
      const el = h(
        'div',
        {
          class: 'fopt paley-item paley-item--f' + idx + (r.enabled ? ' on' : ''),
          dataAction: 'toggleFaction',
          dataIdx: idx,
          style: { '--faction-color': r.color },
        },
        h('div', { class: 'fdot' }),
        h('div', { class: 'faction-info' },
          h('div', { class: 'faction-name' }, svgIcon(r.glyphId, 16), ' ', r.name),
          h('div', { class: 'faction-trait' }, r.trait)
        ),
        h('button', { class: 'fctrl', dataAction: 'toggleController', dataIdx: idx }, btnLabel)
      );
      fl.appendChild(el);
    });
  }

  draw();

  // ---- Delegated actions ----

  registerAction('toggleFaction', (el) => {
    const idx = parseInt(el.dataset.idx, 10);
    roster[idx].enabled = !roster[idx].enabled;
    draw();
  });

  registerAction('toggleController', (el) => {
    const idx = parseInt(el.dataset.idx, 10);
    roster[idx].human = !roster[idx].human;
    draw();
  });

  registerAction('selectSize', (el) => {
    document.querySelectorAll('.size-pill').forEach((x) =>
      x.classList.remove('active')
    );
    el.classList.add('active');
  });

  registerAction('beginGame', () => {
    const chosen = roster.filter((r) => r.enabled);
    if (chosen.length < 2) {
      toast('Choose at least 2 champions', true);
      return;
    }
    const sizeEl = document.querySelector('.size-pill.active');
    const radius = sizeEl ? parseInt(sizeEl.dataset.r, 10) : 7;
    const relicTarget = parseInt(
      document.getElementById('relicTarget')?.value || '7',
      10
    );
    const lastStanding = document.getElementById('optLast')?.checked ?? true;

    // Read biome selection
    const biomeSelect = document.getElementById('biomeSelect');
    const biome = biomeSelect ? biomeSelect.value : 'biome_default';

    // Read advanced map settings
    const hv = parseFloat(document.getElementById('hvSlider')?.value || '1.0');
    const wt = parseFloat(document.getElementById('wtSlider')?.value || '1.0');
    const mt = parseFloat(document.getElementById('mtSlider')?.value || '1.0');
    const mapSettings = {
      heightVariation: hv,
      wateriness: wt,
      mountainousness: mt,
    };

    if (window.__beginGame) {
      window.__beginGame({
        seed:
          document.getElementById('seedInput')?.value ||
          'glut-' + Math.floor(Math.random() * 999),
        radius,
        // Derive controller from `human` — no duplicate field on roster.
        champions: chosen.map((c) => ({
          faction: c.id,
          controller: c.human ? 'human' : 'bot',
        })),
        objectives: { relicRace: true, relicTarget, lastStanding },
        biome,
        mapSettings,
      });
    }
  });
}
