# Future Work

Forward-looking tracker for specific features still to be implemented.
Completed work lives in git history; deferred-by-decision content, design
guidance, and maintenance follow-ups live in `dev/docs/deferredNotes.md`.

Some items may be based on out-of-date design ideas — confirm with the user
before implementing specific features or making changes based on this document.

---

## Near-term features

### Equipment — combat integration & sources

The two-slot equip model (weapon / armor), trader + faction-base purchase
flow, knot-cost "powerful" tier, and non-stacking replace-with-refund are in
(`src/game/rules/equipment.js`, `src/game/state/trading.js`). Remaining:

- Wire an item's `bonus` into combat scoring (currently display-only).
- More sources beyond traders: dungeon rewards, digs, bases.
- Durability, and trading items back.
- Upgrading equipment at God's Knots (the purchase tier exists; upgrading doesn't).

### Dungeons

Consecutive-turn dungeon: entering a dungeon hex hides the champion for 3
turns; each turn inside, combat starts immediately at the beginning of the
champion's turn instead of world-map movement. After the final battle, a large
reward. Fleeing uses the normal rules but ejects the champion and loses all
progress.

Needs: dungeon feature + placement rules, an "in-dungeon" champion state
(hidden from the map, no movement), escalating battle generation, reward hook
(`src/game/state/featureRewards.js` pattern).

### UI polish

- Setup screen v5 layout redesign (currently token-level inheritance only).
- Reward/dispatch reveal animations beyond the current veiled pattern.

### Responsive / mobile audit

The baseline responsive pass is in; remaining verification work:

- Landscape-short (e.g. 640×360) and tablet-portrait layouts mid-play.
- Rotation during an active modal/combat.
- Touch pointer/gesture audit (drag-to-pan vs tap).

---

## Bot AI

- **Global strategy / directionality** — bots radius-limit their targeting
  but have no global strategy. A simple bias toward unexplored tiles /
  nearest God's Knot / enemy prevents circle-wandering. Design task as much
  as performance.
- **Large-map-appropriate exploration** — on the big maps, local exploration
  should bias toward resource gradients and away from recently visited areas;
  victory conditions may need rethinking.

---

## Large-map persistence

Save seed + list of dirty tiles with their deltas; everything else regenerates
(only the diff from procedural generation). Scale constraints and
"what-not-to-do" guidance: `dev/docs/deferredNotes.md` §1.

---

## Geometry content

- **Mob animation runtime** — deferred; the declarative clip spec and
  per-render-pass hook are worked out in `dev/docs/mobGeometryAndAnimation.md`
  §4–5.
