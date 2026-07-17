Core Problems Identified in Your Code:

    Duplicated & Direct Listener Bugs: In gameuibindings.js, #endTurnBtn and #inspectBtn are assigned listeners directly, and then assigned again in a document-wide delegated click listener. Keybindings (c, r, +) duplicate camera manipulation code instead of sharing function hooks.
    Imperative Hover & Style Hacks: In modal.js, mouse dynamic effects (onmouseenter, onmouseleave) manually override inline .style.borderColor and .style.background—logic that strictly belongs in CSS dynamic states (:hover, :active).
    Template String & DOM Mutation Churn: In setupui.js, calling draw() clears .innerHTML = '' and re-generates nodes and events on every interaction, causing memory leaks, loss of focus state, and DOM thrashing.
    Logic Bleed inside Renderers: In leftPanel.js, complex game calculations (max moves, weather scalings, potency matrix indices) happen inside string-interpolation templates.
    DOM as Source of Truth: setupui.js pulls configuration variables out of DOM nodes (document.getElementById('seedInput')?.value) right when "Begin" is pressed, instead of tracking a UI state object.

Recommended System Architecture

To make your UI clean, robust, and impossible to break during simple updates, refactor toward a Decoupled Declarative UI System.

Here are the 4 core pillars to introduce:

text

┌──────────────────────────────────────────────────────────┐
│                      UI STATE STORE                      │
│      (Single source of truth for all menu/game UI)       │
└───────────────────────────┬──────────────────────────────┘
                            │ (State Updates)
                            ▼
┌──────────────────────────────────────────────────────────┐
│                   DECLARATIVE RENDERERS                  │
│       (Pure functions: UI = render(State, Presenter))    │
└───────────────────────────┬──────────────────────────────┘
                            │ (Emits DOM / Updates CSS Vars)
                            ▼
┌──────────────────────────────────────────────────────────┐
│                   ACTION DELEGATION BUS                  │
│   (Single listener reads data-action & dispatches logic) │
└──────────────────────────────────────────────────────────┘

1. Centralized Event Delegation (data-action)

Instead of finding elements by ID and attaching separate listeners everywhere (or duplicating keybindings), capture all UI interactions through a single Data Action Bus.
How it works:

Markup uses standard data-action attributes and payloads:

HTML

<button data-action="end-turn">End Turn</button>
<button data-action="select-size" data-radius="7">Medium</button>
<div class="artifact-card" data-action="pick-artifact" data-index="2">...</div>

Rewritten Event System (uiEvents.js replacing gameuibindings.js):

JavaScript

// uiEvents.js
import { currentChamp } from '../game/gameOrchestrator.js';
import { onEndTurn } from '../game/turnController.js';
import { toast } from './hud.js';
import { getSceneContext, zoomCamera, resetCamera } from '../render/hexmap3d/hexmap3d-index.js';

// 1. Unified Action Handlers (Single Source of Truth for Logic)
export const UI_ACTIONS = {
  'end-turn': () => onEndTurn(),
  
  'inspect': () => {
    toast('Click a highlighted hex to move. Adjacent foes to duel. End turn on empty parchment to dig.');
  },

  'center-champion': () => {
    const ch = currentChamp();
    if (!ch) return;
    const ctx = getSceneContext();
    const state = ctx.getCameraState();
    state.targetX = Math.sqrt(3) * 1.0 * (ch.pos.q + ch.pos.r / 2);
    state.targetZ = 1.5 * 1.0 * ch.pos.r;
    ctx.applyCamera();
  },

  'zoom-in': () => modifyZoom(0.8),
  'zoom-out': () => modifyZoom(1.25),
  'zoom-reset': () => {
    const ctx = getSceneContext();
    resetCamera(ctx.getCameraState());
    ctx.applyCamera();
  }
};

function modifyZoom(factor) {
  const ctx = getSceneContext();
  zoomCamera(ctx.getCameraState(), factor);
  ctx.applyCamera();
}

// 2. Single Event Listener Setup
export function initGlobalListeners() {
  // Catch all clicks via delegation
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    if (UI_ACTIONS[action]) {
      UI_ACTIONS[action](target.dataset, target, e);
    }
  });

  // Hotkeys now map directly to the SAME action handlers
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

    const keyMap = {
      'c': 'center-champion',
      'C': 'center-champion',
      'r': 'zoom-reset',
      'R': 'zoom-reset',
      '+': 'zoom-in',
      '=': 'zoom-in',
      '-': 'zoom-out',
      '_': 'zoom-out',
      ' ': 'end-turn'
    };

    const action = keyMap[e.key];
    if (action && UI_ACTIONS[action]) {
      e.preventDefault();
      UI_ACTIONS[action]();
    }
  });
}

2. Dynamic CSS Variables & Hover Classes (Fixing modal.js)

Delete JavaScript inline style overrides (el.style.background = ..., .onmouseenter, .onmouseleave). Hand hover states to CSS and dynamic variables to container elements using style="--var: value".
Modern Replacement for modal.js:

JavaScript

// modal.js
import { UI_ACTIONS } from './uiEvents.js';

export function showModal(id) {
  document.getElementById(id)?.classList.add('is-visible');
}

export function hideModal(id) {
  document.getElementById(id)?.classList.remove('is-visible');
}

export function openArtifactChoiceModal(reward, onChoice) {
  const modalEl = document.getElementById('rewardModal');
  if (!modalEl) return;

  modalEl.querySelector('.modal-title').textContent = reward.title;
  
  const choicesHtml = reward.choices.map((c, i) => `
    <button class="artifact-choice-card" data-action="choose-artifact" data-idx="${i}">
      <span class="card-title">${c.label}</span>
      <span class="card-detail">${c.detail}</span>
    </button>
  `).join('');

  modalEl.querySelector('.modal-body').innerHTML = `
    <p>${reward.body}</p>
    <div class="choices-grid">${choicesHtml}</div>
  `;

  // Register temporary action handler cleanly
  UI_ACTIONS['choose-artifact'] = (dataset) => {
    const choice = reward.choices[+dataset.idx];
    hideModal('rewardModal');
    delete UI_ACTIONS['choose-artifact']; // cleanup
    if (onChoice) onChoice(choice);
  };

  showModal('rewardModal');
}

Matching Clean CSS (No JS Hover Logic needed!):

CSS

/* Modals rely on CSS visibility classes */
.modal {
  display: none;
}
.modal.is-visible {
  display: flex;
}

/* Artifact Choice Cards handled entirely in CSS */
.artifact-choice-card {
  background: rgba(255, 247, 223, 0.67);
  border: 2px solid #d0a86a;
  border-radius: 10px;
  padding: 12px;
  margin: 8px 0;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  text-align: left;
  width: 100%;
}

.artifact-choice-card:hover {
  border-color: #b88728;
  background: #fff4cf;
}

.artifact-choice-card .card-title {
  display: block;
  font-weight: 800;
  color: #9a5a12;
  font-size: 15px;
}

3. Separation of Presenter Logic and Template Generation

Refactor views like leftPanel.js into two stages:

    Presenter Logic: Compute state data (view models) cleanly outside strings.
    Pure Functional Template: Outputs pure HTML string mapped strictly to structural CSS classes and CSS Custom Variables.

Refactored leftPanel.js:

JavaScript

// leftPanel.js
import { FACTIONS, potencyWithPrimary, ARTIFACTS } from '../../core/factions.js';

// 1. Data Preparation Logic (Pure Functions)
function getChampionViewModel(state, champ) {
  if (!champ) return null;

  const fac = FACTIONS[champ.faction];
  const pots = potencyWithPrimary(champ);
  const baseMax = champ.baseMove + (champ.artifact === 'spur' ? 1 : 0) + (champ.faction === 2 ? 1 : 0);
  
  return {
    factionColor: fac.color,
    factionName: fac.name,
    factionId: champ.faction,
    moves: `${champ.moves}/${Math.max(1, Math.floor(baseMax * (state.weather?.dayLength || 1)))}`,
    hpPct: Math.min(100, Math.max(0, Math.round((champ.hp / champ.maxHp) * 100))),
    hpText: `${champ.hp}/${champ.maxHp}`,
    relics: champ.relics,
    gold: champ.gold,
    knot: champ.knot,
    weapon: champ.weapon,
    armor: champ.armor,
    artifactLabel: champ.artifact 
      ? (ARTIFACTS.find(a => a.id === champ.artifact)?.name || champ.artifact) 
      : '— none —',
    potencies: FACTIONS.map((f, i) => ({
      color: f.color,
      value: pots[i],
      pct: Math.min(100, pots[i] * 6),
      isPrimary: i === champ.faction
    }))
  };
}

// 2. Pure UI Template Render
export function renderLeftPanel(state, champ) {
  const vm = getChampionViewModel(state, champ);

  if (!vm) {
    return `
      <div class="panel left-champion-card">
        <div class="mini-empty">No active champion</div>
      </div>`;
  }

  return `
  <div class="panel left-champion-card" style="--faction-color: ${vm.factionColor}">
    <header class="left-champ-header">
      <span class="left-faction-dot"></span>
      <span class="left-champ-name">${vm.factionName}</span>
      <span class="left-champ-moves">
        <svg class="icon"><use href="assets/icons/sprite.svg#i-move"/></svg>
        ${vm.moves}
      </span>
    </header>

    <div class="left-hp-row">
      <span class="left-hp-label">HP</span>
      <div class="left-hp-track">
        <div class="left-hp-fill" style="width: ${vm.hpPct}%"></div>
      </div>
      <span class="left-hp-value">${vm.hpText}</span>
    </div>

    <div class="left-resources-row">
      <span class="left-res-item"><svg class="icon"><use href="assets/icons/sprite.svg#i-collect"/></svg>${vm.relics} Relics</span>
      <span class="left-res-item"><svg class="icon"><use href="assets/icons/sprite.svg#i-trade"/></svg>${vm.gold} Gold</span>
      <span class="left-res-item"><svg class="icon"><use href="assets/icons/sprite.svg#d-knot"/></svg>${vm.knot} Knots</span>
    </div>

    <div class="left-equip-row">
      <span class="left-equip-item"><svg class="icon"><use href="assets/icons/sprite.svg#i-attack"/></svg>${vm.weapon}</span>
      <span class="left-equip-item"><svg class="icon"><use href="assets/icons/sprite.svg#i-flee"/></svg>${vm.armor}</span>
      <span class="left-equip-artifact">Artifact: ${vm.artifactLabel}</span>
    </div>

    <details class="left-potency-details">
      <summary class="left-potency-summary">Potency <span class="arrow">▶</span></summary>
      <div class="left-potency-bars">
        ${vm.potencies.map(p => `
          <div class="left-potency-row">
            <span class="left-potency-dot" style="--dot-color: ${p.color}"></span>
            <div class="left-potency-track">
              <div class="left-potency-fill" style="width: ${p.pct}%; background: ${p.color}"></div>
            </div>
            <span class="left-potency-num ${p.isPrimary ? 'is-primary' : ''}">${p.value}</span>
          </div>
        `).join('')}
      </div>
    </details>

    <footer class="left-actions-row">
      <button class="btn" data-action="inspect">Inspect</button>
      <button class="btn btn-gold" data-action="end-turn">End Turn</button>
    </footer>
  </div>`;
}

4. Refactoring Strategy Checklist

To transition your game systematically without causing game-breaking regressions:

    Step 1: CSS Clean-up
    Move all inline dynamic styles (borders, colors, widths, display toggles) into reusable CSS utility classes or reliance on root container variable cascading (like --faction-color).
    Step 2: Implement the data-action Bus
    Initialize the global delegation listener inside uiEvents.js. Replace scattered element event handlers (.onclick, .addEventListener('click', ...)) with simple data-action="my-action" markup attributes.
    Step 3: Extract Pure ViewModel Computation
    In files like leftPanel.js, pull calculations out of HTML strings into pure transformer functions (getChampionViewModel).
    Step 4: Standardize Dynamic Elements as Functional Components
    Ensure views take (state, props) and return formatted markup strings, avoiding mixing string creation with immediate element attachment and DOM queries.
