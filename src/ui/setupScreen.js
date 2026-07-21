import { FACTIONS, beats } from '../game/rules/factionData.js';
import { h } from './domBuilder.js';
import { svgIcon } from './svgIcon.js';
import { registerAction } from '../shared/actionBus.js';
import { toast } from './hud.js';
import { listArchetypes, getArchetype } from '../game/rules/archetypes.js';
import '../game/rules/archetypeData.js'; // side-effect: populate archetype registry
import { paleySVG } from './paleySVG.js';

let gameMode = 7; // 7 or 3
let roster = [];
let heptagramCenter = { x: 0, y: 0 };

// Precomputed balanced triples for 3P mode: index = (a*7 + b) → c
// A triple (a,b,c) is balanced when each has exactly 1 win / 1 loss
// against the other two.
const BALANCED_3P = (() => {
  const map = {};
  for (let a = 0; a < 7; a++) {
    for (let b = 0; b < 7; b++) {
      if (b === a) continue;
      const key = a < b ? a * 7 + b : b * 7 + a;
      if (map[key] !== undefined) continue;
      const valid = [];
      for (let c = 0; c < 7; c++) {
        if (c === a || c === b) continue;
        // Count wins for each member against the other two
        const winsA = (beats(a, b) ? 1 : 0) + (beats(a, c) ? 1 : 0);
        const winsB = (beats(b, a) ? 1 : 0) + (beats(b, c) ? 1 : 0);
        const winsC = (beats(c, a) ? 1 : 0) + (beats(c, b) ? 1 : 0);
        if (winsA === 1 && winsB === 1 && winsC === 1) {
          valid.push(c);
        }
      }
      map[key] = valid;
    }
  }
  return map;
})();

/** Trait icon map — each faction's trait gets a representative icon */
const TRAIT_ICONS = {
  0: 'i-armor',       // CRU: Scarshield → shield
  1: 'i-potency',     // REV: Another's Dream → star/potency
  2: 'i-move',        // VER: Gaia's Wail → move
  3: 'i-relic',       // ARC: Everknown → relic
  4: 'i-gold',        // HRT: Compersion → gold
  5: 'd-seal',        // MSK: Silent Ovation → seal/mask
  6: 'i-heal',        // HOL: Vaunted Nothing → heal (HP scaling)
};

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

/**
 * Build the heptagram SVG and overlay faction badges.
 */
function buildHeptagram() {
  const mount = document.getElementById('setupHeptagramSVG');
  if (!mount) return;

  // Render the base heptagram SVG (lines + node circles)
  mount.innerHTML = paleySVG(-1, 700, 580);

  // Calculate node positions (matching paleySVG math)
  const svg = mount.querySelector('svg');
  if (svg) {
    // Read the viewBox to get dimensions
    const vb = (svg.getAttribute('viewBox') || '0 0 700 580').split(' ').map(Number);
    const cx = vb[2] / 2; // 350
    const cy = vb[3] / 2 + 4; // 294
    // Must match paleySVG's R calculation: Math.min(w, h) * 0.32
    const R = Math.min(vb[2], vb[3]) * 0.32;
    heptagramCenter = { x: cx, y: cy };

    // Position interactive badges over each node
    const nodesEl = document.getElementById('setupNodes');
    if (!nodesEl) return;

    const positions = FACTIONS.map((f, i) => {
      const ang = -Math.PI / 2 + i * 2 * Math.PI / 7;
      const nx = cx + Math.cos(ang) * R;
      const ny = cy + Math.sin(ang) * R;
      return { x: nx, y: ny, i, f };
    });

    // Inject SVG circle hover handlers
    svg.querySelectorAll('.rt-heptagram-node').forEach(circle => {
      const idx = parseInt(circle.getAttribute('data-index'), 10);
      circle.addEventListener('mouseenter', () => setCrossHighlight(idx));
      circle.addEventListener('mouseleave', () => setCrossHighlight(-1));
    });

    drawNodes(nodesEl, positions);
  }
}

/**
 * Import crossHighlight dynamically (shared from heptagramWidget).
 * Inline to avoid circular deps — setupScreen is loaded before the game.
 */
let _crossHighlightFn = null;

function setCrossHighlight(idx) {
  if (!_crossHighlightFn) {
    import('./heptagramWidget.js').then(m => {
      _crossHighlightFn = m.setCrossHighlight;
      _crossHighlightFn(idx);
    });
    return;
  }
  _crossHighlightFn(idx);
}

/**
 * Draw/redraw the faction badge nodes overlaid on the heptagram.
 */
function drawNodes(container, positions) {
  container.replaceChildren();

  positions.forEach((pos, idx) => {
    const r = roster[idx];
    const isEnabled = r.enabled || gameMode === 7;
    const isSelected = r.enabled;
    const classes = ['setup-node', 'paley-item', 'paley-item--f' + idx];
    if (isSelected) classes.push('on');
    if (!isEnabled && gameMode === 3) classes.push('locked');

    // Build the trait description line with icon
    const traitDesc = TRAIT_DESCS[idx];
    const traitEl = h('div', { class: 'setup-node-trait' },
      svgIcon(traitDesc.icon, 11),
      ' ',
      traitDesc.text
    );

    const node = h('div', {
      class: classes.join(' '),
      dataAction: gameMode === 3 && !isEnabled ? null : 'toggleFaction',
      dataIdx: idx,
      style: { '--faction-color': r.color, '--faction-base': r.base },
      mouseenter: () => setCrossHighlight(idx),
      mouseleave: () => setCrossHighlight(-1),
    },
      // Controller toggle (small, at top-right of node)
      h('button', {
        class: 'setup-node-ctrl',
        dataAction: 'toggleController',
        dataIdx: idx,
        title: r.human ? 'Switch to Bot' : 'Switch to Human',
      }, r.human ? 'H' : 'B'),

      // Faction glyph
      h('div', { class: 'setup-node-glyph' }, svgIcon(r.glyphId, 22)),

      // Faction name
      h('div', { class: 'setup-node-name' }, r.name),

      // Trait icon + description
      traitEl,

      // Lock overlay (for 3P mode disabled factions)
      gameMode === 3 && !isEnabled
        ? h('div', { class: 'setup-node-lock' },
            svgIcon('i-cancel', 16)
          )
        : null
    );

    // Position the node at the heptagram coordinates
    node.style.position = 'absolute';
    node.style.left = (pos.x - 75) + 'px';
    node.style.top = (pos.y - 48) + 'px';
    container.appendChild(node);
  });
}

/**
 * Refresh the setup UI after roster or mode changes.
 */
function refreshSetup() {
  const nodesEl = document.getElementById('setupNodes');
  if (!nodesEl) return;

  // Recalculate positions
  const mount = document.getElementById('setupHeptagramSVG');
  const svg = mount?.querySelector('svg');
  if (!svg) return;
  const vb = (svg.getAttribute('viewBox') || '0 0 700 580').split(' ').map(Number);
  const cx = vb[2] / 2;
  const cy = vb[3] / 2 + 4;
  // Must match paleySVG's R calculation: Math.min(w, h) * 0.32
  const R = Math.min(vb[2], vb[3]) * 0.32;

  const positions = FACTIONS.map((f, i) => {
    const ang = -Math.PI / 2 + i * 2 * Math.PI / 7;
    return { x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R, i, f };
  });

  drawNodes(nodesEl, positions);
}

/**
 * Get the third faction for a balanced 3P triple.
 * Returns the faction ID, or -1 if not determined yet / invalid.
 */
function getBalancedThird(a, b) {
  const key = a < b ? a * 7 + b : b * 7 + a;
  const valid = BALANCED_3P[key];
  if (!valid || valid.length === 0) return -1;
  // Return the first valid third (there should be exactly 1)
  return valid[0];
}

// ─── Trait descriptions with icons ───

const TRAIT_DESCS = [
  { icon: 'i-armor',   text: 'Reduce enemy score' },
  { icon: 'i-potency', text: 'Random dawn boon' },
  { icon: 'i-move',    text: '+1 move, pacify mobs' },
  { icon: 'i-relic',   text: 'Relic → random potency' },
  { icon: 'i-gold',    text: 'Trade -20% cost' },
  { icon: 'd-seal',    text: 'Combat bonus each week' },
  { icon: 'i-heal',    text: 'HP scaling bonus' },
];

// ─── Delegated actions ───

registerAction('toggleFaction', (el) => {
  const idx = parseInt(el.dataset.idx, 10);
  if (isNaN(idx)) return;

  // In 3-player mode, enforce RPS balance
  if (gameMode === 3) {
    const currentEnabled = roster.filter(r => r.enabled).map(r => r.id);

    if (roster[idx].enabled) {
      // Cannot deselect if only 3 are selected and we're in 3P mode
      if (currentEnabled.length <= 3) {
        toast('In 3 Champion mode, select 3 factions and begin.', true);
        return;
      }
      roster[idx].enabled = false;
    } else {
      // Adding: if we already have 2, the third is forced
      if (currentEnabled.length >= 2) {
        toast('Select 2 factions; the third is chosen for balance.', true);
        return;
      }
      roster[idx].enabled = true;

      // If we now have exactly 2, auto-select the balanced third
      const nowEnabled = roster.filter(r => r.enabled).map(r => r.id);
      if (nowEnabled.length === 2) {
        const third = getBalancedThird(nowEnabled[0], nowEnabled[1]);
        if (third >= 0) {
          roster[third].enabled = true;
        }
      }
    }
  } else {
    // 7-player mode: simple toggle
    roster[idx].enabled = !roster[idx].enabled;
  }

  refreshSetup();
});

registerAction('toggleController', (el) => {
  const idx = parseInt(el.dataset.idx, 10);
  if (isNaN(idx)) return;
  roster[idx].human = !roster[idx].human;
  refreshSetup();
});

registerAction('selectSize', (el) => {
  document.querySelectorAll('.size-pill').forEach(x => x.classList.remove('active'));
  el.classList.add('active');
});

registerAction('setGameMode', (el) => {
  const mode = parseInt(el.dataset.mode, 10);
  if (mode !== 7 && mode !== 3) return;
  gameMode = mode;

  // Update toggle button state
  document.querySelectorAll('.setup-mode-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');

  // Reset roster for new mode
  roster.forEach((r, i) => {
    r.enabled = (mode === 7);
    r.human = (i === 0); // only first faction is human by default
  });

  refreshSetup();
});

registerAction('beginGame', () => {
  const chosen = roster.filter(r => r.enabled);
  if (chosen.length < (gameMode === 3 ? 3 : 2)) {
    toast(gameMode === 3 ? 'Select 3 champions for balanced play.' : 'Choose at least 2 champions', true);
    return;
  }

  if (gameMode === 3 && chosen.length !== 3) {
    toast('In 3 Champion mode, exactly 3 factions must be selected.', true);
    return;
  }

  // In 3P mode, verify balance
  if (gameMode === 3 && chosen.length === 3) {
    const ids = chosen.map(c => c.id);
    const [a, b, c] = ids;
    const winsA = (beats(a, b) ? 1 : 0) + (beats(a, c) ? 1 : 0);
    const winsB = (beats(b, a) ? 1 : 0) + (beats(b, c) ? 1 : 0);
    const winsC = (beats(c, a) ? 1 : 0) + (beats(c, b) ? 1 : 0);
    if (winsA !== 1 || winsB !== 1 || winsC !== 1) {
      toast('Selected factions do not form a balanced RPS triple.', true);
      return;
    }
  }

  const sizeEl = document.querySelector('.size-pill.active');
  const radius = sizeEl ? parseInt(sizeEl.dataset.r, 10) : 9;
  const relicTarget = parseInt(document.getElementById('relicTarget')?.value || '25', 10);
  const lastStanding = document.getElementById('optLast')?.checked ?? true;

  const biomeSelect = document.getElementById('biomeSelect');
  const biome = biomeSelect ? biomeSelect.value : 'biome_default';

  const hv = parseFloat(document.getElementById('hvSlider')?.value || '1.0');
  const wt = parseFloat(document.getElementById('wtSlider')?.value || '1.0');
  const mt = parseFloat(document.getElementById('mtSlider')?.value || '1.0');
  const mapSettings = { heightVariation: hv, wateriness: wt, mountainousness: mt };

  if (window.__beginGame) {
    window.__beginGame({
      seed: document.getElementById('seedInput')?.value || 'glut-' + Math.floor(Math.random() * 999),
      radius,
      champions: chosen.map(c => ({
        faction: c.id,
        controller: c.human ? 'human' : 'bot',
      })),
      objectives: { relicRace: true, relicTarget, lastStanding },
      biome,
      mapSettings,
    });
  }
});
