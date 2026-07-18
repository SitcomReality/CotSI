## Step-by-step implementation plan

### 1. Start with a targeted search and identify stale assumptions

Run searches before editing so you know every place that still assumes `attacker/defender` instead of `first/second`.

Suggested searches:

```bash
rg "attacker|defender" src/ui
rg "vm\.attacker|vm\.defender" src/ui
rg "roundPicks\.attacker|roundPicks\.defender" src/ui
rg "commitCombat" .
rg "pickCombatPower|combatPick" src/ui
```

Important distinction:

- `first` / `second` now describe initiative order.
- `attacker` is still a meaningful combat marker badge, but should no longer be used as the primary side key.
- Do not blindly rename every `attacker` string. Keep attacker-related display logic where it means “this combatant initiated the combat.”

---

## 2. Update `index.html`

File:

```text
index.html
```

Combat modal section, around lines `178-211`.

### Required changes

#### Remove the Commit button

Delete the element with:

```html
id="commitCombat"
```

The combat lifecycle now auto-reveals after both picks are submitted, so the button is obsolete.

#### Keep `#combatOrder`

Leave the existing combat order element in place:

```html
<div id="combatOrder">...</div>
```

It will be populated by the renderer.

#### Add the FX layer

Inside `.modal-card`, add:

```html
<div class="fx-layer"></div>
```

It should be inside the combat modal card, not outside the modal.

Example structure:

```html
<div class="modal-card">
  <div class="fx-layer"></div>

  <!-- existing combat modal content -->
</div>
```

You will likely also need CSS later:

```css
.modal-card {
  position: relative;
}

.fx-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}
```

---

Complete to here 2026-07-18

---

## 3. Update combat CSS/supporting styles

Even though CSS was not listed as a main implementation file, the renderer changes need styling hooks.

Add or verify styles for:

### Hidden slot

Example class names:

```css
.combat-slot.is-hidden {
  opacity: 0.75;
  filter: grayscale(0.6);
}

.combat-slot.is-hidden .slot-value {
  font-family: monospace;
}
```

Displayed text should be something like:

```text
???
```

### Active combatant card

```css
.combatant-card.is-active {
  outline: 2px solid var(--accent);
  box-shadow: 0 0 0.75rem var(--accent-soft);
}
```

### Order pulse

```css
#combatOrder.order-pulse {
  animation: combat-order-pulse 500ms ease-out;
}

@keyframes combat-order-pulse {
  0% {
    transform: scale(1);
    filter: brightness(1);
  }

  45% {
    transform: scale(1.04);
    filter: brightness(1.35);
  }

  100% {
    transform: scale(1);
    filter: brightness(1);
  }
}
```

### FX layer

```css
.fx-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
  z-index: 5;
}
```

---

## 4. Refactor `combatVM.js` from `attacker/defender` to `first/second`

File:

```text
src/ui/viewModels/combatVM.js
```

### 4.1 Update `PHASE_LABELS`

Replace the old phase labels with the new phase names:

```js
const PHASE_LABELS = {
  pick1: 'Exchange 1 — choose in secret',
  reveal1: 'Exchange 1 — reveal',
  pick2: 'Exchange 2 — choose in secret',
  reveal2: 'Exchange 2 — reveal',
  roundEnd: 'Round complete'
};
```

Adjust exact wording to match your UI tone.

---

### 4.2 Change VM top-level combatants

The VM should expose:

```js
vm.first
vm.second
```

not:

```js
vm.attacker
vm.defender
```

Each combatant card VM should include enough information for rendering:

```js
{
  side: 'first',
  entity,
  name,
  roleLabel: 'first',
  isAttacker: true / false,
  isActive: true / false,
  slots: [...]
}
```

For the second combatant:

```js
{
  side: 'second',
  roleLabel: 'second',
  ...
}
```

---

### 4.3 Preserve attacker marker separately

Do not remove the attacker concept entirely.

Use the existing combat state/helper data to decide whether a side is the attacker.

For example, depending on your existing helper signatures:

```js
const attackerSide = sideOf(combat, combat.attacker);
```

or:

```js
const attackerSide = sideOf(combat, combat.attackerEntity);
```

or if the combat state already stores a side:

```js
const attackerSide = combat.attackerSide;
```

Then each combatant VM gets:

```js
isAttacker: side === attackerSide
```

The renderer can then show both:

- `first` / `second`
- `attacker` marker

Example visible badges:

```text
First
Attacker
```

or:

```text
Second
```

---

### 4.4 Add `humanSide` parameter

The VM needs to know which side is local/human-controlled so it can hide opponent picks until reveal.

Change your VM builder signature from something like:

```js
buildCombatVM(combat)
```

to:

```js
buildCombatVM(combat, { humanSide } = {})
```

Where:

```js
humanSide === 'first'
humanSide === 'second'
humanSide === null
```

Use `null` for mob-vs-mob or unknown/no local human side.

---

### 4.5 Implement hidden-slot logic

The rule:

- Own picks are visible immediately.
- Opponent picks are hidden until that exchange’s reveal.
- Reveal is automatic once both picks are in.

Define a helper:

```js
function isExchangeRevealed(phase, exchangeIndex) {
  if (exchangeIndex === 1) {
    return phase === 'reveal1' ||
      phase === 'pick2' ||
      phase === 'reveal2' ||
      phase === 'roundEnd';
  }

  if (exchangeIndex === 2) {
    return phase === 'reveal2' ||
      phase === 'roundEnd';
  }

  return false;
}
```

Then slot visibility can be decided like this:

```js
const isOwnSide = side === humanSide;
const revealed = isExchangeRevealed(combat.phase, exchangeIndex);
const hasPick = pick != null;

const hidden = hasPick && !isOwnSide && !revealed;
```

Slot VM shape can be:

```js
{
  exchange: 1,
  side: 'first',
  f: pick,
  hidden,
  label: hidden ? '???' : formatPick(pick),
  revealed
}
```

If no pick exists yet, use a neutral placeholder:

```js
{
  f: null,
  hidden: false,
  label: '—'
}
```

Important: if `humanSide` is `null`, there is no “own side,” so both sides’ picks should remain hidden until reveal.

---

### 4.6 Update round pick access

Anywhere the VM currently does this:

```js
roundPicks.attacker
roundPicks.defender
```

change to:

```js
roundPicks.first
roundPicks.second
```

Same for nested structures, exchange picks, reveal data, and totals.

---

### 4.7 Add `awaitingPrompt`

The VM should expose a text prompt.

Example logic:

```js
function buildAwaitingPrompt(combat, humanSide) {
  const phase = combat.phase;

  if (phase !== 'pick1' && phase !== 'pick2') {
    return '';
  }

  const awaitingSide = combat.awaitingSide;

  if (!awaitingSide) {
    return '';
  }

  if (awaitingSide === humanSide) {
    const entity = entityFor(combat, awaitingSide);
    return `${entity.name} — choose in secret`;
  }

  return 'Opponent is choosing…';
}
```

Expose:

```js
vm.awaitingPrompt
vm.awaitingSide
```

The renderer will use `awaitingSide` for active-card highlighting.

---

### 4.8 Add order text data

The VM should expose enough data for `#combatOrder`.

For example:

```js
vm.order = {
  firstName: vm.first.name,
  secondName: vm.second.name,
  text: `${vm.first.name} acts first · ${vm.second.name} second`,
  key: `${vm.first.id}:${vm.second.id}`
};
```

The renderer can use `vm.order.text`.

Use a stable `key` or text string to detect order flips.

---

### 4.9 Add per-exchange score contributions

If `lastReveal` already contains exchange-specific scoring data, thread it through the VM.

Example shape:

```js
vm.exchangeScores = {
  1: {
    firstDelta: 2,
    secondDelta: 0,
    firstRunningTotal: 2,
    secondRunningTotal: 0
  },
  2: {
    firstDelta: 1,
    secondDelta: 3,
    firstRunningTotal: 3,
    secondRunningTotal: 3
  }
};
```

Or as an array:

```js
vm.exchanges = [
  {
    index: 1,
    score: {
      firstDelta,
      secondDelta,
      firstRunningTotal,
      secondRunningTotal
    }
  },
  ...
];
```

Even if the renderer does not animate them yet, having them in the VM prepares the FX/count-up work.

---

## 5. Update `combatRenderer.js`

File:

```text
src/ui/combat/combatRenderer.js
```

---

### 5.1 Derive `humanSide`

Before building the VM, derive the local human side.

Use the combat state and helpers.

Example:

```js
function getHumanSide(combat) {
  const first = entityFor(combat, 'first');
  const second = entityFor(combat, 'second');

  if (first?.controller === 'human') return 'first';
  if (second?.controller === 'human') return 'second';

  return null;
}
```

If your game can have two human-controlled sides, decide how your local/hot-seat convention works. A simple approach is:

```js
if (first?.controller === 'human' && second?.controller === 'human') {
  return combat.awaitingSide ?? null;
}
```

But if your app has a better local-player identifier, use that instead.

Then call:

```js
const vm = buildCombatVM(combat, {
  humanSide: getHumanSide(combat)
});
```

---

### 5.2 Replace `vm.attacker` / `vm.defender`

Anywhere the renderer currently uses:

```js
vm.attacker
vm.defender
```

change to:

```js
vm.first
vm.second
```

Render the two combatant cards using those VMs.

---

### 5.3 Render `#combatOrder`

Find:

```js
const orderEl = document.querySelector('#combatOrder');
```

or add it if missing.

Set:

```js
orderEl.textContent = vm.order.text;
```

Example visible text:

```text
Vesna acts first · Kargan second
```

---

### 5.4 Add pulse when order flips

At module scope:

```js
let previousOrderKey = null;
```

During render:

```js
if (orderEl) {
  orderEl.textContent = vm.order.text;

  if (previousOrderKey && previousOrderKey !== vm.order.key) {
    orderEl.classList.remove('order-pulse');

    // Force reflow so repeated animation can restart.
    void orderEl.offsetWidth;

    orderEl.classList.add('order-pulse');
  }

  previousOrderKey = vm.order.key;
}
```

Optional cleanup:

```js
orderEl.addEventListener('animationend', () => {
  orderEl.classList.remove('order-pulse');
});
```

Be careful not to add duplicate listeners on every render. Either register once or use timeout/class replacement.

---

### 5.5 Remove Commit button logic

Delete renderer code that does any of the following:

```js
document.querySelector('#commitCombat')
commitBtn.disabled = ...
commitBtn.textContent = ...
```

The button no longer exists.

---

### 5.6 Render role badges

Each combatant card should show:

1. Initiative role:
   - `First`
   - `Second`

2. Attacker marker if applicable:
   - `Attacker`

Example:

```js
h('div', { className: 'combatant-badges' },
  h('span', { className: 'badge badge-order' }, combatant.roleLabel),
  combatant.isAttacker
    ? h('span', { className: 'badge badge-attacker' }, 'Attacker')
    : null
)
```

Make sure `roleLabel` comes from `first/second`, not attacker/defender.

---

### 5.7 Add `data-side` to combatant cards

Combatant card root element should include:

```js
dataSide: combatant.side
```

or however your `h()` helper maps dataset attributes.

Expected HTML:

```html
<div class="combatant-card" data-side="first">
```

and:

```html
<div class="combatant-card" data-side="second">
```

This gives the FX layer a stable anchor.

---

### 5.8 Add active-card highlight

If this side is the awaited picker:

```js
className: [
  'combatant-card',
  combatant.isActive ? 'is-active' : ''
].join(' ')
```

The active combatant is:

```js
combatant.side === vm.awaitingSide
```

or already computed by the VM as:

```js
combatant.isActive
```

---

### 5.9 Render hidden slots

When rendering a slot:

```js
const className = slot.hidden
  ? 'combat-slot is-hidden'
  : 'combat-slot';
```

Display:

```js
slot.hidden ? '???' : slot.label
```

Keep existing FX/data hooks:

```js
data-side
data-f
```

Potency tokens already have `data-f`; do not remove it.

---

### 5.10 Fix the action mismatch

Currently:

- Renderer uses: `pickCombatPower`
- Interactions register: `combatPick`

Pick one name and use it consistently.

Recommended minimal change:

In the renderer, change:

```js
dataAction: isClickable ? 'pickCombatPower' : undefined
```

to:

```js
dataAction: isClickable ? 'combatPick' : undefined
```

Then confirm the rendered token has:

```html
data-action="combatPick"
```

and the registered handler in `combatInteractions.js` still listens for:

```js
registerAction('combatPick', ...)
```

---

### 5.11 Preserve `h()` + `replaceChildren`

Keep the existing full re-render pattern.

Avoid introducing partial DOM mutation except for small things like order-pulse class toggling.

Main combat areas should still be updated using:

```js
container.replaceChildren(...)
```

---

## 6. Update `combatInteractions.js`

File:

```text
src/ui/combat/combatInteractions.js
```

---

### 6.1 Confirm registered action name

Make sure this exists:

```js
registerAction('combatPick', ...)
```

If you chose to keep `combatPick`, no rename is needed here except maybe comments.

---

### 6.2 Update stale side names

Search in this file for:

```js
attacker
defender
```

Replace only stale initiative-side usage with:

```js
first
second
```

Do not remove semantic attacker logic if it exists only for display/metadata.

---

### 6.3 Confirm `entityFor(combat, side)` works with `first/second`

The action handler should operate on side keys like:

```js
'first'
'second'
```

Not:

```js
'attacker'
'defender'
```

---

### 6.4 Ensure pick handler uses the current awaited side

The click handler should not trust arbitrary DOM side information if the state already knows who is picking.

Preferred:

```js
const side = combat.awaitingSide;
```

Then submit:

```js
pickCombatPower(combat, side, f);
```

or whatever your state API is.

If you do use `data-side`, validate it against `combat.awaitingSide`.

---

### 6.5 Confirm potency value parsing

The token should still provide:

```html
data-f="3"
```

The handler should parse it:

```js
const f = Number(target.dataset.f);
```

Validate:

```js
Number.isFinite(f)
```

before dispatching.

---

## 7. Review `combatLifecycle.js`

File:

```text
src/ui/combat/combatLifecycle.js
```

The assessment says this file mostly already uses `first/second`, but still perform a targeted review.

Search:

```bash
rg "attacker|defender|combatPick|pickCombatPower|commitCombat" src/ui/combat/combatLifecycle.js
```

Confirm:

- `openCombatModal`
- `closeCombat`
- `startCombat`

still work.

Confirm reveal flow:

- Does not wait for a commit button.
- Auto-proceeds after both picks are in.
- Uses current phases:
  - `pick1`
  - `reveal1`
  - `pick2`
  - `reveal2`
  - `roundEnd`

No commit-button references should remain.

---

## 8. Verify helper usage: `sideOf` / `entityFor`

Wherever side/entity translation is needed, use the helpers.

Expected side values:

```js
'first'
'second'
```

Examples:

```js
const firstEntity = entityFor(combat, 'first');
const secondEntity = entityFor(combat, 'second');

const side = sideOf(combat, entity);
```

Avoid manually reaching into old fields like:

```js
combat.attacker
combat.defender
```

unless you are specifically computing the attacker marker.

---

## 9. Sanity-check VM shape against renderer needs

Before running the UI, inspect the final VM manually with a `console.log(vm)` or breakpoint.

The VM should have something like:

```js
{
  phase: 'pick1',
  phaseLabel: 'Exchange 1 — choose in secret',
  awaitingSide: 'first',
  awaitingPrompt: 'Vesna — choose in secret',

  order: {
    text: 'Vesna acts first · Kargan second',
    key: 'vesna:kargan'
  },

  first: {
    side: 'first',
    name: 'Vesna',
    roleLabel: 'First',
    isAttacker: true,
    isActive: true,
    slots: [...]
  },

  second: {
    side: 'second',
    name: 'Kargan',
    roleLabel: 'Second',
    isAttacker: false,
    isActive: false,
    slots: [...]
  },

  exchanges: [...]
}
```

There should be no required renderer references to:

```js
vm.attacker
vm.defender
```

---

## 10. Manual test scenarios

### Scenario A: Human is first

1. Start combat where the human-controlled entity is `first`.
2. Confirm order text:

   ```text
   Vesna acts first · Kargan second
   ```

3. During `pick1`, confirm prompt:

   ```text
   Vesna — choose in secret
   ```

4. Pick a potency.
5. Confirm human slot shows the chosen value immediately.
6. Confirm opponent slot remains hidden as:

   ```text
   ???
   ```

   if the opponent has already picked but reveal has not happened.
7. Confirm reveal happens automatically once both picks are in.
8. Confirm both picks are visible during `reveal1`.
9. Confirm `pick2` repeats the same behavior.
10. Confirm no Commit button appears.

---

### Scenario B: Human is second

Repeat the above with the human-controlled entity as `second`.

Confirm:

- Human’s own `second` picks show immediately.
- Opponent `first` picks stay hidden until reveal.
- Prompt correctly names the human combatant when it is their turn.
- Active-card highlight appears on the `second` card when appropriate.

---

### Scenario C: Opponent choosing

When the awaited side is not the local human side, confirm prompt:

```text
Opponent is choosing…
```

The active combatant card should still highlight the side whose pick is awaited.

---

### Scenario D: Order flips

Trigger a new round or condition where initiative order changes.

Confirm:

1. `#combatOrder` text updates.
2. The order badge pulses once.
3. Combatant cards swap first/second badges correctly.
4. Attacker marker remains attached to the actual attacker, not merely to the first actor.

---

### Scenario E: Hidden reveal timing

Check each phase:

#### `pick1`

- Own exchange 1 pick visible after selection.
- Opponent exchange 1 pick hidden until reveal.

#### `reveal1`

- Both exchange 1 picks visible.

#### `pick2`

- Exchange 1 remains visible.
- Own exchange 2 pick visible after selection.
- Opponent exchange 2 pick hidden until reveal.

#### `reveal2`

- Both exchange 2 picks visible.

#### `roundEnd`

- All picks visible.

---

## 11. Final cleanup checklist

Before committing, run these searches again:

```bash
rg "vm\.attacker|vm\.defender" src/ui
rg "roundPicks\.attacker|roundPicks\.defender" src/ui
rg "commitCombat" .
rg "pickCombatPower" src/ui
```

Expected results:

- No `vm.attacker` / `vm.defender`.
- No `roundPicks.attacker` / `roundPicks.defender`.
- No `commitCombat`.
- No stale `pickCombatPower` if you standardized on `combatPick`.

Then search:

```bash
rg "attacker|defender" src/ui
```

Review remaining hits manually.

Acceptable remaining uses should be semantic, such as:

- attacker marker badge
- attacker-side calculation
- text label `"Attacker"`

Not acceptable:

- initiative-side keys
- VM shape
- round pick storage
- renderer combatant variables

---

## 12. Recommended implementation order

To minimize breakage, do the files in this order:

1. `index.html`
   - Remove Commit button.
   - Add `.fx-layer`.

2. CSS
   - Add hidden slot, active card, order pulse, FX layer styles.

3. `combatVM.js`
   - Introduce `first/second`.
   - Add `humanSide`.
   - Add hidden-slot logic.
   - Add `awaitingPrompt`.
   - Add order text.
   - Add per-exchange score data.

4. `combatRenderer.js`
   - Switch to `vm.first` / `vm.second`.
   - Render order badge.
   - Add order pulse.
   - Remove commit button code.
   - Render hidden slots.
   - Add `data-side`.
   - Add active highlight.
   - Fix `data-action="combatPick"`.

5. `combatInteractions.js`
   - Confirm action name.
   - Update stale side names.
   - Validate pick dispatch.

6. `combatLifecycle.js`
   - Confirm no stale commit/button assumptions.
   - Confirm phase flow.

7. Manual testing
   - Human first.
   - Human second.
   - Opponent choosing.
   - Order flip.
   - Reveal timing.

This order keeps the underlying VM contract stable before the renderer consumes it, and it avoids chasing UI bugs caused by partially updated naming.