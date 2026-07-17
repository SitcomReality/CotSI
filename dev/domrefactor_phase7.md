The current state is clear enough. Let me identify what I know and what's ambiguous so we can produce the unambiguous steps you asked for.

What's Clear (Unambiguous Steps)
Step 1: Create getCombatVM() view model

New file src/ui/viewModels/combatVM.js
Takes the combatUI state object and returns { attacker: { name, color, hp, maxHp, hpPct, pots: [{val, factionIdx, glyph, color, locked, pickable}] }, defender: {...} }
Pure function, no side effects
Step 2: Rewrite renderCombat() to use h() + view model

Clear #leftCombat and #rightCombat via replaceChildren()
Build each with h() calls instead of innerHTML template string
Delete combatantCard() function entirely
Replace updatePickSlots() with same h()-based approach for #sA1, #sA2, #sB1, #sB2
Step 3: Add data-action="pickCombatPower" to potency tokens

Each .ctok gets data-action="pickCombatPower" and data-f (faction index)
Step 4: Register pickCombatPower in the action bus

Handler: call recordCombatPick(ui, parseInt(el.dataset.f)) → advanceCombatPhase(ui) → renderCombat() → chain bot picks if needed
Step 5: Remove wireCombatPotencyHover() and onCombatPotencyHover() global

Replace hover behavior with CSS .ctok:hover { transform: scale(1.15); border-color: gold; }
Keep the Paley cross-highlight via mouseenter/mouseleave listeners (not inline styles)
Step 6: Update CSS

Add .ctok styles (border, border-radius, padding, transition, cursor)
.ctok.pickable:hover — transform scale, gold border
.ctok.used — opacity 0.4, pointer-events none
Step 7: Remove window.commitCombat global

Replace button's onclick="commitCombat()" with data-action="commitCombat"
Register commitCombat action on the bus
Same for the Flee button: data-action="closeCombat" instead of inline onclick
Step 8: Remove window.closeReward global

Already partially handled by closeReward in actionBus, but the window.closeReward fallback in combatInteractions.js should be cleaned up
What's Still Ambiguous (Needs Clarification)
Power-picking click handler doesn't exist yet. The generated .ctok tokens have no data-action attribute and no click handler anywhere. The plan says "the click handling already uses delegated data-action" but it doesn't — bots pick via makeBotPick(), humans... seem to have no way to pick powers? This is either a bug or the picking mechanism is wired somewhere I haven't found. Clarify: how does a human player currently pick a power?

Paley cross-highlight hover. The plan says "keep the Paley highlight by using a CSS class toggle via mouseenter." But this requires a listener on every .ctok. If we're moving to h()-built elements, we can attach these in the builder or use a delegated event on the combatant containers. Clarify: delegated mouseenter/mouseleave on the parent, or per-element listeners during render?

The Flee button. document.getElementById('combatModal').style.display='none' is inline — that's just closeCombat(). Easy replacement. But does fleeing have game-logic consequences (penalty, log message), or is it purely cosmetic?

combatInteractions.js after refactor. If pickCombatPower and commitCombat move to the action bus, and makeBotPick is the only remaining function, does the file still exist? Or does makeBotPick get absorbed into combatLifecycle.js (which is its only caller)?