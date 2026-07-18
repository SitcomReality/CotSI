# Combat Flow Rewrite + Damage Dazzle

## Goal

Replace the ad-hoc combat sequence with the proper combat round flow from `AGENTS.md`,
and make damage calculation a spectacle. All FX live **inside the combat modal**
(the 3D map sits behind a blurred backdrop during combat). Reveals are **automatic**
once both secret picks are in â the Commit button is removed.

### Target round flow (per AGENTS.md)

1. **Initiative** â combatants ordered by position in `G.globalOrder`:
   earlier = `combat.first`, later = `combat.second`. The initiator stays
   `combat.attacker` (reward eligibility only, not pick order).
2. **First exchange** â `first` secretly picks, `second` secretly picks,
   both revealed simultaneously after a short delay.
3. **Second exchange** â `second` picks first, `first` picks second (reversed,
   for hot-seat fairness), revealed simultaneously.
4. **Score calculation & animation** â all four revealed colours accumulate into
   the round score; animations highlight every contributing element.
5. **Round end & turn-order shift** â a damaged champion moves immediately in
   front of the damager in `G.globalOrder` (already implemented in
   `moveDamagedBeforeDamager`, `src/game/combat/combatDamage.js:5` â keep).
6. **Next round** â `first`/`second` **re-derived** from the updated
   `G.globalOrder`, so a damaged champion now acts first.

## Locked design decisions

- **Initiative**: index in `G.globalOrder`. Mobs are not in `globalOrder`, so a
  mob is always `second` against a champion (champion takes `first`).
- **Hidden picks**: the engine records picks per exchange; the view model never
  exposes the opponent's unrevealed pick â slots render `???` until the reveal.
  Your own pick is visible to you immediately.
- **Bluffing bots**: bots/mobs pick **blind** â they can no longer counter-pick
  the opponent's current-exchange pick (they may use already-revealed picks from
  earlier exchanges). Current `botCombatPick` reads the opponent's live picks;
  that goes away.
- **No-repeat rule kept**: a champion can't pick the same faction twice in one
  round (existing guard, preserved).
- **Scoring math unchanged**: `scorePickPair` (weather-adjusted potency +
  Paley multiplier via `scorePower`), `applyFinalBonuses` (Crucible reduction,
  `weather.score`, margin artifact, Hollow bonus), damage = score difference.
- **Flee unchanged** (closes combat, no penalty) â out of scope.
- **Fix by replacement**: bot combat is currently dead code (`continueCombatFlow`
  waits for `phase === 'picking'`, which never occurs â bots/mobs never pick).
  The new flow driver handles bot/mob picks properly.

## Step 1 â Engine rewrite (`src/game/combat/`, stateless rules)

**`combatState.js`** â new state shape + initiative:

```js
createCombatState(state, attacker, defender) => {
  attacker, defender,            // kept for rewards/eligibility
  first, second,                 // entity refs, from deriveOrder()
  round: 1,
  phase: 'pick1',                // pick1 â reveal1 â pick2 â reveal2 â roundEnd
  exchanges: [ {picks:{first:null,second:null}}, {picks:{first:null,second:null}} ],
  roundScores: { attacker: 0, defender: 0 },
  lastReveal: null,              // per-exchange breakdown payload for FX (see step 1 scoring)
  combatLog: [],
  awaitingSide: 'first',         // 'first' | 'second' | null
}
deriveOrder(state, attacker, defender)  // globalOrder index; mob â champion first
sideOf(combat, entity) / entityFor(combat, side)
```

**`combatPicks.js`**
- `recordPick(combat, side, factionIdx)` â writes into the current exchange's
  hidden slot (validates against `getAvailablePicks` + no-repeat).
- `advancePhase(combat)` â walks `pick1 â reveal1 â pick2 â reveal2 â roundEnd`;
  sets `awaitingSide` per the exchange's pick order (`['first','second']` for
  exchange 1, `['second','first']` for exchange 2).
- `bothPicksIn(combat)` â true when the current exchange is filled.
- Rewrite `botCombatPick(entity, revealedHistory, available)` â blind pick:
  prefer the available faction that beats the opponent's most-potent faction,
  tie-break by own potency. Never reads current-exchange opponent picks.
- Keep `getAvailablePicks(entity)` as-is.

**`combatScoring.js`**
- Keep `scorePickPair` and `applyFinalBonuses` untouched.
- `processReveal(state, combat)` scores the current exchange and writes a rich
  `lastReveal` for the FX layer: per side `{ factionIdx, basePotency,
  weatherMod, multiplier, beats, score }` plus running totals â everything the
  animation needs to highlight "every contributing element".

**`combatDamage.js`**
- Keep `resolveRoundDamage` and `moveDamagedBeforeDamager` as-is.
- `nextCombatRound(state, combat)` â now takes `state` and re-derives
  `first`/`second` from `G.globalOrder` (the round-end reorder may have swapped
  them); resets exchanges/scores, phase back to `pick1`.
- Keep `finalizeCombat` as-is.

**`combat-index.js`** â update barrel exports.

## Step 2 â Flow orchestration (`src/ui/combat/`)

**`combatLifecycle.js`** â replace `continueCombatFlow` with an async sequencer
(`async runCombatFlow()`, built on a small `wait(ms)` helper; chained timeouts
are the project convention, async/await keeps a multi-beat sequence readable):

- `pick*` phases: render prompt for `awaitingSide`; if that side's entity is not
  `controller === 'human'` (bots **and mobs** â mobs have no `controller`, treat
  as bot), auto-pick after a ~450 ms "pondering" beat. Loop until
  `bothPicksIn`, then auto-advance to reveal.
- `reveal*` phases: run the FX reveal sequence (step 4) â `processReveal` â
  render â ~900 ms hold â advance.
- `roundEnd`: `applyFinalBonuses` â damage FX sequence (step 4) â
  `resolveRoundDamage` â on death, existing victory/defeat + reward-modal paths
  (unchanged); else ~1200 ms hold â `nextCombatRound(G, combat)` â loop.
- Remove the dead `phase === 'picking'` branch.

**`combatInteractions.js`**
- `pickCombatPower` records a hidden pick for `awaitingSide` (guard: that side's
  entity is human), then continues the flow.
- Delete the `commitCombat` action (reveal is automatic).
- `makeBotPick` rewritten to call the new blind `botCombatPick`.

## Step 3 â View model, renderer, markup

**`src/ui/viewModels/combatVM.js`**
- Hidden-slot model: opponent slots â `{ hidden: true }` until their exchange's
  reveal; own picks shown immediately.
- `awaitingPrompt`: e.g. `"Vesna â choose in secret"` / `"Opponent is choosingâ¦"`.
- `first`/`second` badges + attacker marker per combatant.
- Per-exchange score contributions for the animated count-up.
- New `PHASE_LABELS` matching the new phases.

**`src/ui/combat/combatRenderer.js`**
- Render the order badge into `#combatOrder` (currently a static placeholder):
  e.g. `Vesna acts first Â· Kargan second`, with a pulse when it flips.
- Hidden slots (`???` with a face-down style), active combatant card highlight
  (whose pick is awaited), FX anchor hooks (`data-side`, `data-f` already exist).
- Keep the `h()` + `replaceChildren` full-re-render pattern.

**`index.html` (combat modal, :178-211)**
- Remove the Commit button (`#commitCombat`).
- Keep `#combatOrder` element (now wired).
- Add a `<div class="fx-layer">` inside `.modal-card` (position:absolute,
  pointer-events:none) as the mount point for floating damage/score text.

## Step 4 â FX module + CSS

**New `src/ui/combat/combatFx.js`** (DOM-only, class-toggle + timeout/rAF, per
project conventions):
- `wait(ms)` â promise timer.
- `revealSlot(slotEl, factionIdx)` â face-down â face-up flip, faction-color glow.
- `clashPulse(reveal)` â winning token halo (`--fN-glow` / `--gold-hi` peak),
  loser dims to ink-soft; drives "every contributing element" highlights from
  the `lastReveal` breakdown (potency number, weather mod, multiplier badge).
- `countUp(el, from, to, ms)` â rAF score-counter tick.
- `floatText(anchorEl, text, kind)` â floating damage/score numbers in
  `.fx-layer` (`kind`: `damage` vermilion / `score` ink / `gold` for the single
  gold-budget accent).
- `shakeCard(side)` + `flashCard(side)` â damaged combatant: vermilion edge
  flash + decaying translateX shake.
- `drainHp(side)` â triggers the transitioned HP-bar width change.

**CSS** â extend `styles/pages/combat.css` (combat is one screen; a separate file
isn't warranted). First `@keyframes` in the project, all tokens from
`styles/abstracts/tokens/motion.css`:
- `slotFlipIn` (rotateY 90Â°â0 + scale pop, â¤ `--dur-slow`, `--ease-out`)
- `clashPulse` (box-shadow halo in the faction's `--fN-glow`, peak flash `--gold-hi`)
- `scoreTick` (scale pop on `.cs-big`)
- `damageFloat` (rise + fade, ~900 ms â the sanctioned >300 ms moment, like the
  existing 1200â1500 ms reveals)
- `cardShake`, `hpFlash` (vermilion, `--st-hostile`)
- Face-down slot style (dashed border already exists; add backface/flip classes)
- Add `transition: width var(--dur-slow) var(--ease-out)` to `.hpfill`
  (`styles/components/stats.css:14`) so damage drains visibly.
- One `@media (prefers-reduced-motion: reduce)` block collapsing the keyframes
  to near-instant (first in project; ~5 lines).

**Styleguide guardrails**: modal chrome stays vellum/ink; color bursts are small
and faction-keyed; gold accents â¤ budget (score peak + victory floater);
no neon/glassmorphism; reuse `--st-reveal`, `--st-hostile`, `--gold-hi`,
`--fN-glow`, `--dur-*`, `--ease-out`.

## Step 5 â Cleanup

- Delete dead code: the `'picking'` branch, `revealQueue`, `allPicks`,
  `highlightTokens()` no-op (`combatRenderer.js:134`), commit button + wiring,
  stale `PHASE_LABELS`.
- Update `src/ui/combat/combatui-index.js` barrel.
- Update `AGENTS.md` file tree (`combatFx.js` added) and the combat-flow section
  if any described behavior changed (it shouldn't â we're implementing it).
- Call sites `hexInteraction.js:36` / `turnController.js:56` unchanged
  (`startCombat(attacker, defender)` signature kept; `startCombat` fetches `G`
  internally for `deriveOrder`).

## Step 6 â Manual test script (user runs the game)

1. **Champ vs mob**: prompts alternate correctly; opponent slots stay `???`;
   both exchanges auto-reveal with flip + clash pulse; scores count up; damage
   floater + HP drain + card shake on the loser; victory â reward modal.
2. **Champ vs champ** (two humans hot-seat or vs bot): order badge shows
   first/second; after a damaging round, the damaged champion's badge flips to
   "acts first" next round; header turn order updates the following world day.
3. **Bot turn combat** (bot attacks): no stall â bot picks auto-drive after the
   pondering beat (this is the currently-broken path).
4. **Defeat path**: lose a combat â modal closes, defeat toast, no reward modal.
5. **Flee**: still closes combat immediately.
6. **No-repeat**: second exchange can't re-pick your first-exchange faction.

## Non-goals

- Sound (no audio infra exists).
- Map-layer FX (modal covers the map).
- Flee penalties, scoring-formula changes, the pre-existing `--duration-fast`
  token typo in `artifact-choice.css` (unrelated; can fix separately if wanted).
