# Feature Backlog (post-redesign)

The authoritative feature design (classes, tiers, rewards, signatures) is
`dev/featureDesign.md` — this file only tracks what is NOT yet built.

All reward-bearing kinds from the redesign are implemented (Aug 2026) via
`src/game/state/featureRewards.js`; amounts are in `economyParams.js`
(`FEATURE_*`). What remains:

## Deferred mechanics (no build date)

- **Utility side of the utility-choice features.** Fool's-Fire, Half-Drawn
  Obelisk, Ouroboros Loop, Errata Slip, and Listener Lichen currently offer a
  movement or potency buff as their "utility" side. The originally brainstormed
  utilities — teleport (Fool's-Fire, Half-Drawn Obelisk), turn-return
  (Ouroboros Loop), terrain change (Errata Slip), tile reveal (Listener
  Lichen, Palimpsest Slab) — are not built yet and can replace that side later.
- **Edenfall rewards.** Eden Mushroom and Eden Shroomlet still have no reward
  class assigned.
- **Visuals.** Treasure chest is a simple rectangle; spent (unripe) non-fruit
  features do not yet visually distinguish themselves; feature offsets and
  decor spread are still to be refined.

## Cut (Aug 2026)

- `vine`, `largeTree` — defined but never spawned.
- Red-Letter Bramble, Brass Lung Vent — obstacles; the game has no negative
  tiles by design (featureDesign.md §2).
