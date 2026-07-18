/**
 * Combat FX — DOM-only, class-toggle + timeout/rAF.
 * No framework dependencies. All visual effects live inside the combat modal.
 *
 * The combat modal DOM skeleton (index.html) has a <div class="fx-layer"> at
 * the top of .modal-card.  That layer is the parent for floating text.
 *
 * Token: .ctok (data-faction)
 * Slot:  .play-slot (id sA1/sA2/sB1/sB2)
 * Score: .cs-big (#csLeft, #csRight)
 * Card:  .combatant-card (data-side="first"|"second")
 * HP:    .hpfill inside .hpbar inside .combatant-card
 */

import { FACTIONS } from '../../core/factions.js';

// ─── Promise timer ──────────────────────────────────────────────────────────
export const wait = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Slot reveal — face-down → face-up flip ──────────────────────────────────
/**
 * Trigger the slot flip animation.  The slot should already have its content
 * updated (glyph + faction color custom property) before calling this.
 *
 * @param {HTMLElement} slotEl  — the .play-slot element
 * @param {number} factionIdx   — faction index for glow colour
 */
export function revealSlot(slotEl, factionIdx) {
  if (!slotEl) return;

  const fac = FACTIONS[factionIdx];
  const glow = fac ? `var(--f${factionIdx}-glow)` : 'var(--st-reveal)';

  // Apply faction colour as custom property for the glow
  slotEl.style.setProperty('--reveal-glow', glow);

  // Remove face-down class, add face-up to trigger @keyframes slotFlipIn
  slotEl.classList.remove('face-down');
  slotEl.classList.add('face-up');
}

// ─── Clash pulse — winning token halo, loser dim ──────────────────────────
/**
 * Highlight the winning faction token and dim the loser.
 * Also pulses the appropriate score number.
 *
 * @param {object} reveal  — combat.lastReveal (see processReveal output)
 * @param {HTMLElement} modalEl — the combat modal root (#combatModal)
 */
export function clashPulse(reveal, modalEl) {
  if (!reveal || !modalEl) return;

  const { first, second, runningTotals } = reveal;
  const fIdx = first.factionIdx;
  const sIdx = second.factionIdx;

  const fWins = first.score > second.score;
  const sWins = second.score > first.score;

  // Find all potency tokens in the modal
  const allTokens = modalEl.querySelectorAll('.ctok');

  for (const tok of allTokens) {
    const idx = Number(tok.dataset.faction);
    if (idx === fIdx) {
      tok.classList.add(fWins ? 'clash-win' : 'clash-lose');
    }
    if (idx === sIdx) {
      tok.classList.add(sWins ? 'clash-win' : 'clash-lose');
    }
  }

  // Pulse the score that increased
  // Determine which side (first/second) maps to left/right attacker/defender
  // We can't know from reveal alone — just pulse both sides that gained
  const scoreLeft = document.getElementById('csLeft');
  const scoreRight = document.getElementById('csRight');
  if (scoreLeft) scoreLeft.classList.add('score-tick');
  if (scoreRight) scoreRight.classList.add('score-tick');

  // Clean up after animation
  setTimeout(() => {
    for (const tok of allTokens) {
      tok.classList.remove('clash-win', 'clash-lose');
    }
    if (scoreLeft) scoreLeft.classList.remove('score-tick');
    if (scoreRight) scoreRight.classList.remove('score-tick');
  }, 800);
}

// ─── Count-up — rAF score ticker ──────────────────────────────────────────
/**
 * Animate a number counter from one value to another using rAF.
 *
 * @param {HTMLElement} el   — the .cs-big element
 * @param {number} from      — start value
 * @param {number} to        — end value
 * @param {number} [ms=500]  — duration in ms
 * @returns {Promise} resolves when the count-up finishes
 */
export function countUp(el, from, to, ms = 500) {
  return new Promise((resolve) => {
    if (!el) return resolve();
    const start = performance.now();
    const diff = to - from;

    function tick(now) {
      const elapsed = now - start;
      const fraction = Math.min(1, elapsed / ms);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - fraction, 3);
      const current = Math.round(from + diff * eased);
      el.textContent = String(current);

      if (fraction < 1) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(tick);
  });
}

// ─── Floating text — damage / score / gold ──────────────────────────────────
/**
 * Create a temporary floating text element over an anchor element.
 *
 * @param {HTMLElement} parentEl — the .fx-layer container
 * @param {HTMLElement} anchorEl — element to position near
 * @param {string} text          — text content (e.g. "-4")
 * @param {'damage'|'score'|'gold'} kind — determines color class
 * @returns {HTMLElement} the float element (auto-removes after animation)
 */
export function floatText(parentEl, anchorEl, text, kind = 'damage') {
  if (!parentEl || !anchorEl) return null;

  const rect = anchorEl.getBoundingClientRect();
  const parentRect = parentEl.getBoundingClientRect();

  const span = document.createElement('span');
  span.className = `float-text float-text--${kind}`;
  span.textContent = text;

  // Position relative to the fx-layer
  span.style.left = `${rect.left - parentRect.left + rect.width / 2}px`;
  span.style.top = `${rect.top - parentRect.top}px`;

  parentEl.appendChild(span);

  // Auto-remove after animation (~900 ms, uses CSS animation-duration)
  span.addEventListener('animationend', () => {
    if (span.parentNode) span.parentNode.removeChild(span);
  });

  // Fallback cleanup in case animationend doesn't fire
  setTimeout(() => {
    if (span.parentNode) span.parentNode.removeChild(span);
  }, 1000);

  return span;
}

// ─── Card shake — damaged combatant feedback ─────────────────────────────────
/**
 * Shake a combatant card with a decaying horizontal oscillation.
 *
 * @param {'first'|'second'} side — which card to shake
 */
export function shakeCard(side) {
  const card = getCard(side);
  if (!card) return;

  card.classList.remove('card-shake');
  void card.offsetWidth; // force reflow
  card.classList.add('card-shake');

  card.addEventListener('animationend', function onEnd() {
    card.classList.remove('card-shake');
    card.removeEventListener('animationend', onEnd);
  });
}

// ─── Card flash — vermilion edge ─────────────────────────────────────────────
/**
 * Brief vermilion edge flash on a combatant card.
 *
 * @param {'first'|'second'} side
 */
export function flashCard(side) {
  const card = getCard(side);
  if (!card) return;

  card.classList.remove('card-flash');
  void card.offsetWidth;
  card.classList.add('card-flash');

  card.addEventListener('animationend', function onEnd() {
    card.classList.remove('card-flash');
    card.removeEventListener('animationend', onEnd);
  });
}

// ─── HP drain — triggers the CSS transition on .hpfill ──────────────────────
/**
 * Animate the HP bar draining to a new width percentage.
 * Assumes .hpfill has `transition: width var(--dur-slow) var(--ease-out)`.
 *
 * @param {'first'|'second'} side
 * @param {number} newHpPct — new width percentage (0–100)
 * @returns {Promise} resolves when the transition completes (~420 ms)
 */
export function drainHp(side, newHpPct) {
  return new Promise((resolve) => {
    const card = getCard(side);
    if (!card) return resolve();

    const hpFill = card.querySelector('.hpfill');
    if (!hpFill) return resolve();

    // Clamp
    const pct = Math.min(100, Math.max(0, Math.round(newHpPct)));
    hpFill.style.width = `${pct}%`;

    setTimeout(resolve, 420); // --dur-slow
  });
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Get a combatant card element by side.
 * @param {'first'|'second'} side
 * @returns {HTMLElement|null}
 */
export function getCard(side) {
  const containerId = side === 'first' ? 'leftCombat' : 'rightCombat';
  const container = document.getElementById(containerId);
  if (!container) return null;
  return container.querySelector('.combatant-card');
}

/**
 * Get a play-slot element by slot ID.
 * @param {string} slotId — 'sA1', 'sA2', 'sB1', 'sB2'
 * @returns {HTMLElement|null}
 */
export function getSlot(slotId) {
  return document.getElementById(slotId);
}

/**
 * Get the fx-layer parent for floating text.
 * @returns {HTMLElement|null}
 */
export function getFxLayer() {
  return document.querySelector('#combatModal .fx-layer');
}