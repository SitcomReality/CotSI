Combat Flow Rewrite + Damage Dazzle (Consolidated Plan)
Goal
Replace the ad-hoc combat sequence with the proper combat round flow from AGENTS.md, and make damage calculation a spectacle. All FX live inside the combat modal (the 3D map sits behind a blurred backdrop during combat). Reveals are automatic once both secret picks are in — the Commit button is removed.
Target round flow (per AGENTS.md)

    Initiative — combatants ordered by position in G.globalOrder: earlier = combat.first, later = combat.second. The initiator stays combat.attacker (reward eligibility only, not pick order).
    First exchange — first secretly picks, second secretly picks, both revealed simultaneously after a short delay.
    Second exchange — second picks first, first picks second (reversed, for hot-seat fairness), revealed simultaneously.
    Score calculation & animation — all four revealed colours accumulate into the round score; animations highlight every contributing element.
    Round end & turn-order shift — a damaged champion moves immediately in front of the damager in G.globalOrder (already implemented in moveDamagedBeforeDamager, src/game/combat/combatDamage.js:5 — keep).
    Next round — first/second re-derived from the updated G.globalOrder, so a damaged champion now acts first.

Locked design decisions

    Initiative: index in G.globalOrder. Mobs are not in globalOrder, so a mob is always second against a champion (champion takes first).
    Hidden picks: the engine records picks per exchange; the view model never exposes the opponent's unrevealed pick — slots render ??? until the reveal. Your own pick is visible to you immediately.
    Bluffing bots: bots/mobs pick blind — they can no longer counter-pick the opponent's current-exchange pick (they may use already-revealed picks from earlier exchanges). Current botCombatPick reads the opponent's live picks; that goes away.
    No-repeat rule kept: a champion can't pick the same faction twice in one round (existing guard, preserved).
    Scoring math unchanged: scorePickPair (weather-adjusted potency + Paley multiplier via scorePower), applyFinalBonuses (Crucible reduction, weather.score, margin artifact, Hollow bonus), damage = score difference.
    Flee unchanged (closes combat, no penalty) — out of scope.
    Fix by replacement: bot combat is currently dead code (continueCombatFlow waits for phase === 'picking', which never occurs — bots/mobs never pick). The new flow driver handles bot/mob picks properly.

PHASE 1 — Engine rewrite (src/game/combat/, stateless rules)
combatState.js — new state shape + initiative
JavaScript

createCombatState(state, attacker, defender) => {
  attacker, defender,            // kept for rewards/eligibility
  first, second,                 // entity refs, from deriveOrder()
  round: 1,
  phase: 'pick1',                // pick1 → reveal1 → pick2 → reveal2 → roundEnd
  exchanges: [ {picks:{first:null,second:null}}, {picks:{first:null,second:null}} ],
  roundScores: { attacker: 0, defender: 0 },
  lastReveal: null,              // per-exchange breakdown payload for FX (see PHASE 1 scoring)
  combatLog: [],
  awaitingSide: 'first',         // 'first' | 'second' | null
}
deriveOrder(state, attacker, defender)  // globalOrder index; mob ⇒ champion first
sideOf(combat, entity) / entityFor(combat, side)

    Review note (§3): Mobs have no controller property (undefined), so undefined !== 'human' → true → auto-pick. This is correct behavior. deriveOrder should also handle the edge case of mob-vs-mob combat (both absent from globalOrder) with a deterministic fallback — e.g., attacker-first.

combatPicks.js

    recordPick(combat, side, factionIdx) — writes into the current exchange's hidden slot (validates against getAvailablePicks + no-repeat).
    advancePhase(combat) — walks pick1 → reveal1 → pick2 → reveal2 → roundEnd; sets awaitingSide per the exchange's pick order (['first','second'] for exchange 1, ['second','first'] for exchange 2).
    bothPicksIn(combat) — true when the current exchange is filled.
    Rewrite botCombatPick(entity, revealedHistory, available) — blind pick: prefer the available faction that beats the opponent's most-potent faction, tie-break by own potency. Never reads current-exchange opponent picks.
    Keep getAvailablePicks(entity) as-is.

    Review note (§1): The current dead-code branch if (_combatUI.phase === 'picking') is confirmed never-true. The new advancePhase uses explicit phases (pick1, reveal1, etc.) and isPickingPhase (a startsWith('pick') check) for guards.

combatScoring.js

    Keep scorePickPair and applyFinalBonuses untouched.
    processReveal(state, combat) scores the current exchange and writes a rich lastReveal for the FX layer: per side { factionIdx, basePotency, weatherMod, multiplier, beats, score } plus running totals — everything the animation needs to highlight "every contributing element."

    Review note (§5): processReveal no longer needs combat.phase === 'reveal1' ? 0 : 1 to index into roundPicks. With the new exchanges array, you always process the current exchange (the one where both picks are now filled).
    Review note (§8): The new lastReveal shape adds granularity (potency number, weather mod, multiplier badge) for the FX layer. Ensure combatVM.js transforms all of these for the renderer.

combatDamage.js

    Keep resolveRoundDamage and moveDamagedBeforeDamager as-is.
    nextCombatRound(state, combat) — now takes state and re-derives first/second from G.globalOrder (the round-end reorder may have swapped them); resets exchanges/scores, phase back to pick1.
    Keep finalizeCombat as-is.

    Review note (§2): nextCombatRound now accepts state (to re-derive first/second from G.globalOrder). The call site in runCombatFlow must pass G (available from getGameState()). The old handleRoundEnd called it with just (_combatUI) — update this.

combat-index.js — update barrel exports.


PHASE 2 — Flow orchestration (src/ui/combat/)
combatLifecycle.js — replace continueCombatFlow with an async sequencer
async runCombatFlow(), built on a small wait(ms) helper; chained timeouts are the project convention, async/await keeps a multi-beat sequence readable:

    pick* phases: render prompt for awaitingSide; if that side's entity is not controller === 'human' (bots and mobs — mobs have no controller, treat as bot), auto-pick after a ~450 ms "pondering" beat. Loop until bothPicksIn, then auto-advance to reveal.
    reveal* phases: run the FX reveal sequence (PHASE 4) → processReveal → render → ~900 ms hold → advance.
    roundEnd: applyFinalBonuses → damage FX sequence (PHASE 4) → resolveRoundDamage → on death, existing victory/defeat + reward-modal paths (unchanged); else ~1200 ms hold → nextCombatRound(G, combat) → loop.
    Remove the dead phase === 'picking' branch.

    Review note (§10 — Cancellation / re-entry safety): The sequencer must check getCombatUI() at each yield point and abort if null (Flee calls closeCombat() which clears _combatUI). Also add a guard at the top of startCombat: if (getCombatUI()) return; to prevent re-entry.

combatInteractions.js

    pickCombatPower records a hidden pick for awaitingSide (guard: that side's entity is human), then continues the flow.
    Delete the commitCombat action (reveal is automatic).
    makeBotPick rewritten to call the new blind botCombatPick.

    Review note (§3): The current makeBotPick guards entity.controller !== 'bot' — mobs fail this and stall. The new logic treats any non-human (controller !== 'human') as auto-pick, which correctly includes mobs.

PHASE 3 — View model, renderer, markup
src/ui/viewModels/combatVM.js

    Hidden-slot model: opponent slots → { hidden: true } until their exchange's reveal; own picks shown immediately.
    awaitingPrompt: e.g. "Vesna — choose in secret" / "Opponent is choosing…".
    first/second badges + attacker marker per combatant.
    Per-exchange score contributions for the animated count-up.
    New PHASE_LABELS matching the new phases.

    Review note (§4): In a hot-seat scenario, both players see both combatant cards. The hidden-slot mechanic works as follows: during exchange 1's pick phase, both sides see their own pick after selecting, but neither sees the opponent's pick until the simultaneous reveal. The reveal is automatic once both picks are in.
    Review note (§9): Thread first/second through the VM while keeping attacker for the attacker marker badge. Each combatant card should show both their initiative role (first/second) and whether they're the attacker. Use sideOf / entityFor helpers for translation.

src/ui/combat/combatRenderer.js

    Render the order badge into #combatOrder (currently a static placeholder): e.g. Vesna acts first · Kargan second, with a pulse when it flips.
    Hidden slots (??? with a face-down style), active combatant card highlight (whose pick is awaited), FX anchor hooks (data-side, data-f already exist).
    Keep the h() + replaceChildren full-re-render pattern.

    Review note (§9): The naming convention change from attacker/defender to first/second spans ~4 files (VM, renderer, lifecycle, interactions). Ensure all spots are updated.

index.html (combat modal, :178-211)

    Remove the Commit button (#commitCombat).
    Keep #combatOrder element (now wired).
    Add a <div class="fx-layer"> inside .modal-card (position:absolute, pointer-events:none) as the mount point for floating damage/score text.

PHASE 4 — FX module + CSS
New src/ui/combat/combatFx.js (DOM-only, class-toggle + timeout/rAF, per project conventions)

    wait(ms) — promise timer.
    revealSlot(slotEl, factionIdx) — face-down → face-up flip, faction-color glow.
    clashPulse(reveal) — winning token halo (--fN-glow / --gold-hi peak), loser dims to ink-soft; drives "every contributing element" highlights from the lastReveal breakdown (potency number, weather mod, multiplier badge).
    countUp(el, from, to, ms) — rAF score-counter tick.
    floatText(anchorEl, text, kind) — floating damage/score numbers in .fx-layer (kind: damage vermilion / score ink / gold for the single gold-budget accent).
    shakeCard(side) + flashCard(side) — damaged combatant: vermilion edge flash + decaying translateX shake.
    drainHp(side) — triggers the transitioned HP-bar width change.

CSS — extend styles/pages/combat.css
First @keyframes in the project, all tokens from styles/abstracts/tokens/motion.css:

    slotFlipIn (rotateY 90°→0 + scale pop, ≤ --dur-slow, --ease-out)
    clashPulse (box-shadow halo in the faction's --fN-glow, peak flash --gold-hi)
    scoreTick (scale pop on .cs-big)
    damageFloat (rise + fade, ~900 ms — the sanctioned >300 ms moment, like the existing 1200–1500 ms reveals)
    cardShake, hpFlash (vermilion, --st-hostile)
    Face-down slot style (dashed border already exists; add backface/flip classes)
    Add transition: width var(--dur-slow) var(--ease-out) to .hpfill (styles/components/stats.css:14) so damage drains visibly.
    One @media (prefers-reduced-motion: reduce) block collapsing the keyframes to near-instant (first in project; ~5 lines).

    Review note (§7): The .hpfill transition should also target background-color if the HP bar changes color at low HP thresholds via a style property (not just a class toggle). Verify during implementation.

Styleguide guardrails: modal chrome stays vellum/ink; color bursts are small and faction-keyed; gold accents ≤ budget (score peak + victory floater); no neon/glassmorphism; reuse --st-reveal, --st-hostile, --gold-hi, --fN-glow, --dur-*, --ease-out.



PHASE 5 — Cleanup

    Delete dead code: the 'picking' branch, revealQueue, allPicks, highlightTokens() no-op (combatRenderer.js:134), commit button + wiring, stale PHASE_LABELS.
    Update src/ui/combat/combatui-index.js barrel.
    Update AGENTS.md file tree (combatFx.js added) and the combat-flow section if any described behavior changed (it shouldn't — we're implementing it).
    Call sites hexInteraction.js:36 / turnController.js:56 unchanged (startCombat(attacker, defender) signature kept; startCombat fetches G internally for deriveOrder).

    Review note (§11): combatui-index.js currently exports startCombat, closeCombat, setGameState, setCallbacks, openRewardModal, openTrader, openArtifactChoiceModal, initCombatModal. No new exports needed, but combatFx.js will be a new import in combatLifecycle.js.

PHASE 6 — Manual test script (user runs the game)

    Champ vs mob: prompts alternate correctly; opponent slots stay ???; both exchanges auto-reveal with flip + clash pulse; scores count up; damage floater + HP drain + card shake on the loser; victory → reward modal.
    Champ vs champ (two humans hot-seat or vs bot): order badge shows first/second; after a damaging round, the damaged champion's badge flips to "acts first" next round; header turn order updates the following world day.
    Bot turn combat (bot attacks): no stall — bot picks auto-drive after the pondering beat (this is the currently-broken path).
    Defeat path: lose a combat → modal closes, defeat toast, no reward modal.
    Flee: still closes combat immediately.
    No-repeat: second exchange can't re-pick your first-exchange faction.

Non-goals

    Sound (no audio infra exists).
    Map-layer FX (modal covers the map).
    Flee penalties, scoring-formula changes, the pre-existing --duration-fast token typo in artifact-choice.css (unrelated; can fix separately if wanted).