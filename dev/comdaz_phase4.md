1. **`src/ui/combat/combatFx.js`** — the new DOM-only FX module
2. **`styles/pages/combat.css`** — keyframes, flip/glow/shake/float classes, motion-reduce block
3. **`styles/components/stats.css`** — `.hpfill` transition addition (one line)
4. **Integration notes** for `combatLifecycle.js` wiring points

---

## 1. `src/ui/combat/combatFx.js`

```javascript src/ui/combat/combatFx.js
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
function getCard(side) {
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
```

---

## 2. CSS additions to `styles/pages/combat.css`

These go at the end of the existing `combat.css` file.

```css styles/pages/combat.css
/* ════════════════════════════════════════════════════════════════════════════
   Phase 4 — Combat FX keyframes and animation classes
   ════════════════════════════════════════════════════════════════════════════ */

/* ── Slot flip ────────────────────────────────────────────────────────────────
   Face-down is the default state (shows ??? or dashes).
   Face-up triggers the 3D reveal flip.
   ──────────────────────────────────────────────────────────────────────────── */

.play-slot.face-down {
  /* The JS sets ??? content; the dashed border already implies hidden */
}

.play-slot.face-up {
  animation: slotFlipIn var(--dur-slow) var(--ease-out) both;
}

@keyframes slotFlipIn {
  0% {
    transform: rotateY(90deg) scale(0.85);
    opacity: 0.5;
  }
  60% {
    transform: rotateY(-10deg) scale(1.06);
    opacity: 1;
  }
  100% {
    transform: rotateY(0deg) scale(1);
    opacity: 1;
  }
}

/* ── Clash pulse — winning/losing token highlight ──────────────────────────── */

.ctok.clash-win {
  animation: clashPulse 600ms var(--ease-out) both;
}

.ctok.clash-lose {
  animation: clashLose 600ms var(--ease-out) both;
}

@keyframes clashPulse {
  0% {
    box-shadow: 0 0 0 0 var(--f0-glow);
    filter: brightness(1);
  }
  35% {
    box-shadow: 0 0 14px 3px var(--f0-glow);
    filter: brightness(1.35);
  }
  70% {
    box-shadow: 0 0 18px 5px var(--gold-hi);
    filter: brightness(1.5);
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
    filter: brightness(1);
  }
}

@keyframes clashLose {
  0% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(0.6) saturate(0.5);
  }
  100% {
    filter: brightness(1);
    transition: filter 300ms ease;
  }
}

/* ── Score tick — pop on .cs-big ───────────────────────────────────────────── */

.cs-big.score-tick {
  animation: scoreTick 350ms var(--ease-out) both;
}

@keyframes scoreTick {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.35);
    color: var(--gold);
  }
  100% {
    transform: scale(1);
  }
}

/* ── Floating text — damage / score / gold ─────────────────────────────────── */

.float-text {
  position: absolute;
  pointer-events: none;
  font-family: 'Cinzel', Georgia, serif;
  font-weight: 800;
  font-size: 22px;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  white-space: nowrap;
  transform: translate(-50%, 0);
  z-index: 10;
  animation: damageFloat 900ms var(--ease-out) both;
}

.float-text--damage {
  color: var(--vermilion);
}

.float-text--score {
  color: var(--ink);
}

.float-text--gold {
  color: var(--gold);
}

@keyframes damageFloat {
  0% {
    opacity: 1;
    transform: translate(-50%, 0) scale(0.7);
  }
  15% {
    opacity: 1;
    transform: translate(-50%, -6px) scale(1.2);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -42px) scale(0.85);
  }
}

/* ── Card shake — vermilion flash + horizontal oscillation ─────────────────── */

.combatant-card.card-shake {
  animation: cardShake 500ms var(--ease-out) both;
}

@keyframes cardShake {
  0%   { transform: translateX(0); }
  12%  { transform: translateX(-6px); }
  25%  { transform: translateX(5px); }
  37%  { transform: translateX(-4px); }
  50%  { transform: translateX(3px); }
  62%  { transform: translateX(-2px); }
  75%  { transform: translateX(1px); }
  87%  { transform: translateX(-0.5px); }
  100% { transform: translateX(0); }
}

/* ── Card flash — vermilion edge inset ─────────────────────────────────────── */

.combatant-card.card-flash {
  animation: hpFlash 500ms var(--ease-out) both;
}

@keyframes hpFlash {
  0% {
    box-shadow: inset 0 0 0 0 var(--vermilion);
  }
  35% {
    box-shadow: inset 0 0 20px 2px var(--vermilion);
  }
  100% {
    box-shadow: inset 0 0 0 0 transparent;
  }
}

/* ── fx-layer — ensure positioned parent for float-text ────────────────────── */

#combatModal .modal-card {
  position: relative;
}

/* ── HP bar transition for drain animation ────────────────────────────────────
   Duplicated here from stats.css so combat HP bars always get the transition
   even if rendered outside the standard stat panel. ───────────────────────── */

#combatModal .hpfill {
  transition: width var(--dur-slow) var(--ease-out);
}

/* ── Reduced motion — respect user preference ──────────────────────────────── */

@media (prefers-reduced-motion: reduce) {
  .play-slot.face-up {
    animation: none;
    opacity: 1;
    transform: none;
  }

  .ctok.clash-win,
  .ctok.clash-lose {
    animation: none;
  }

  .cs-big.score-tick {
    animation: none;
  }

  .float-text {
    animation: none;
    opacity: 0;
  }

  .combatant-card.card-shake,
  .combatant-card.card-flash {
    animation: none;
  }

  #combatModal .hpfill {
    transition: none;
  }
}
```

---

## 3. `styles/components/stats.css` — one-line addition

The combat modal HP bar uses `.hpfill` inside `.hpbar` (rendered by `combatantCard`). The existing `.hpfill` in `stats.css` (line 14) needs a transition for the drain to be visible. Add it:

```css styles/components/stats.css
/* ... existing .hpfill rules ... */
.hpfill{
  height:100%;
  background:linear-gradient(90deg,#5fc98a,#2f9f5a);
  transition: width var(--dur-slow) var(--ease-out);   /* ← ADD THIS LINE */
}
```

This is safe because there are no HP-bar width changes that happen without rendering a new percentage; the transition just makes width changes animated rather than instant. For the combat drain specifically, we set the width directly on the existing DOM node before renderCombat rebuilds — the transition makes that moment visible.

---

## 4. Integration notes for `combatLifecycle.js`

Here are the exact wiring points in the existing lifecycle file. I'm not including the full file, just the diffs:

### 4a. Import the FX module

At the top of `combatLifecycle.js`, add:

```javascript
import {
  wait,
  revealSlot,
  clashPulse,
  countUp,
  floatText,
  shakeCard,
  flashCard,
  drainHp,
  getSlot,
  getFxLayer,
} from './combatFx.js';
```

### 4b. Replace the `animateReveal` placeholder

The current `animateReveal` (line ~143) is a minimal stub that pulses tokens. Replace it with the sequenced FX:

```javascript
async function animateReveal(reveal) {
  const combat = getCombatUI();
  if (!combat || !reveal) return;

  const modalEl = document.getElementById('combatModal');
  const fxLayer = getFxLayer();

  // Determine which slots we're flipping (exchange 0 or 1)
  const exchangeIdx = combat.phase === 'reveal1' ? 0 : 1;

  // Get the picks for this exchange
  const exchange = combat.exchanges[exchangeIdx];
  const pickFirst = exchange.picks.first;
  const pickSecond = exchange.picks.second;

  // --- Slot A (first's slot) ---
  const slotAId = exchangeIdx === 0 ? 'sA1' : 'sA2';
  const slotA = getSlot(slotAId);
  if (slotA && pickFirst != null) {
    // Update slot content to show the revealed faction
    const fac = FACTIONS[reveal.first.factionIdx];
    slotA.textContent = fac.glyph + ' ' + fac.name;
    slotA.style.setProperty('--slot-color', fac.color);
    slotA.classList.add('face-down'); // start face-down
  }

  // --- Slot B (second's slot) ---
  const slotBId = exchangeIdx === 0 ? 'sB1' : 'sB2';
  const slotB = getSlot(slotBId);
  if (slotB && pickSecond != null) {
    const fac = FACTIONS[reveal.second.factionIdx];
    slotB.textContent = fac.glyph + ' ' + fac.name;
    slotB.style.setProperty('--slot-color', fac.color);
    slotB.classList.add('face-down');
  }

  // --- Flip both slots ---
  if (slotA) revealSlot(slotA, reveal.first.factionIdx);
  if (slotB) revealSlot(slotB, reveal.second.factionIdx);

  await wait(420); // let flips finish (--dur-slow)

  // --- Clash pulse: highlight winning/losing faction tokens ---
  clashPulse(reveal, modalEl);

  await wait(150);

  // --- Count-up the running totals ---
  const leftEl = document.getElementById('csLeft');
  const rightEl = document.getElementById('csRight');

  // Determine which total maps to which side
  // runningTotals.attacker sums the attacker's cumulative round score
  // left = first, right = second. Need to map attackerSide to left/right.
  const attackerSide = reveal.first.factionIdx === pickFirst
    ? 'first'
    : (reveal.first.factionIdx === pickSecond ? 'second' : null);
  // Better approach: read current displayed values and animate to new totals
  const curLeft = parseInt(leftEl?.textContent, 10) || 0;
  const curRight = parseInt(rightEl?.textContent, 10) || 0;
  const targetAttacker = reveal.runningTotals.attacker;
  const targetDefender = reveal.runningTotals.defender;

  // sideOf helper to know which display column gets which total
  const { sideOf } = await import('../../game/combat/combat-index.js');
  const attSide = sideOf(combat, combat.attacker);

  if (attSide === 'first') {
    // attacker = left, defender = right
    await Promise.all([
      countUp(leftEl, curLeft, targetAttacker, 500),
      countUp(rightEl, curRight, targetDefender, 500),
    ]);
    // Float score deltas
    const deltaAtt = targetAttacker - curLeft;
    const deltaDef = targetDefender - curRight;
    if (deltaAtt > 0 && fxLayer && leftEl) {
      floatText(fxLayer, leftEl, `+${deltaAtt}`, 'score');
    }
    if (deltaDef > 0 && fxLayer && rightEl) {
      floatText(fxLayer, rightEl, `+${deltaDef}`, 'score');
    }
  } else {
    // attacker = right, defender = left
    await Promise.all([
      countUp(leftEl, curLeft, targetDefender, 500),
      countUp(rightEl, curRight, targetAttacker, 500),
    ]);
    const deltaDef = targetDefender - curLeft;
    const deltaAtt = targetAttacker - curRight;
    if (deltaDef > 0 && fxLayer && leftEl) {
      floatText(fxLayer, leftEl, `+${deltaDef}`, 'score');
    }
    if (deltaAtt > 0 && fxLayer && rightEl) {
      floatText(fxLayer, rightEl, `+${deltaAtt}`, 'score');
    }
  }
}
```

> **Note:** The above imports `FACTIONS` to get glyphs. Add that import to the top of `combatLifecycle.js` if not already present.

### 4c. Wire damage FX in `handleRoundEnd`

In `handleRoundEnd` (the `else` branch where nobody dies), after `resolveRoundDamage` returns, add:

```javascript
  // --- Damage FX (Phase 4) ---
  const damageResult = resolveRoundDamage(_G, combat);
  // ^^ already exists in the current code; capture the return value

  // Trigger damage visual effects
  if (damageResult.damage > 0) {
    const damagedSide = damageResult.to === 'attacker'
      ? 'first'   // attacker maps to first/second in combat
      : 'second';
    // Actually need to map: attacker can be first or second
    const attSide = sideOf(combat, combat.attacker);
    const actualDamagedSide = damageResult.to === 'attacker' ? attSide : (attSide === 'first' ? 'second' : 'first');

    const fxLayer = getFxLayer();
    const damagedCard = getCard(actualDamagedSide); // need getCard export

    // 1. Float damage text from the damaged card's HP bar
    if (fxLayer && damagedCard) {
      const hpBar = damagedCard.querySelector('.hpbar');
      if (hpBar) {
        floatText(fxLayer, hpBar, `-${damageResult.damage}`, 'damage');
      }
    }

    // 2. Shake + flash the damaged card
    shakeCard(actualDamagedSide);
    flashCard(actualDamagedSide);

    // 3. Calculate new HP% and drain the bar
    const damagedEntity = damageResult.to === 'attacker' ? combat.attacker : combat.defender;
    const newHpPct = Math.round((damagedEntity.hp / damagedEntity.maxHp) * 100);
    await drainHp(actualDamagedSide, newHpPct);

    // Render to sync DOM with new state
    renderCombat();
  }
```

However, this needs careful integration with the existing code. The current `handleRoundEnd` already calls `resolveRoundDamage`. The simplest integration is to replace the existing call with the augmented version.

---

### Summary of changes

| File | Action | Purpose |
|------|--------|---------|
| `src/ui/combat/combatFx.js` | **New** | All FX functions — flip, pulse, count-up, float, shake, flash, drain |
| `styles/pages/combat.css` | **Add** | 6 @keyframes, animation classes, `.modal-card` positioning, `.hpfill` transition, `@media (prefers-reduced-motion)` |
| `styles/components/stats.css` | **1 line** | Add `transition: width var(--dur-slow) var(--ease-out)` to `.hpfill` |
| `src/ui/combat/combatLifecycle.js` | **Edit** | Import FX, rewrite `animateReveal`, add damage FX to `handleRoundEnd` |

**Gold budget check:** The only gold usage in these FX is the `--gold` color on `scoreTick` peak (35% keyframe, one scale-pop moment) and the `--gold-hi` peak in `clashPulse` (70% keyframe, a brief box-shadow flash). The damage floater uses `--vermilion`, score floater uses `--ink`. No gold in hover states, persistent chrome, or backgrounds. This stays within the gold budget constraint.

**Motion safety:** The `@media (prefers-reduced-motion: reduce)` block collapses all six keyframes to instant, disables transitions on `.hpfill`, and hides floating text (`opacity: 0` rather than `display: none` to avoid layout shifts). This is ~9 lines and is the first reduced-motion media query in the project.
