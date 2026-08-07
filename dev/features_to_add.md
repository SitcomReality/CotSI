Group 1: Unique mechanics, strong theme, fills a real gap
Palimpsest Slab — Reveal. Perfectly on-theme (palimpsest = overwritten page), uses a simple read/unread state machine. Gives Untouched and Unfinished Lands a feature with genuine exploration utility. Low wiring cost: one reveal-radius call into the existing fog-of-war system, one cooldown timer copied from moonberry-tree regrowth.

Volvelle — Buff (sight+attack). An astrolabe that "computes you" — extremely thematic for Brass Grave (brass instruments, buried computation). Fills that biome's void with something scarce, valuable, and weird. Moderate wiring cost (apply temporary stats to champion), but the pattern is reusable across all buff features that follow.

Fool's-Fire — Teleport. Will-o'-wisp that displaces you to a random adjacent hex. Novel mechanic the game currently lacks, perfect for Mourning Marsh's treacherous character. Low wiring cost: pick a random neighbor from the existing hex adjacency function, move the champ. Reuses the turn-action movement path.

Placeholder Cypress — Decorative block. Wireframe checker-tree. Gives Unfinished Lands its own filler flora so it stops looking like an empty knot field. Uses existing tree geometry, just different material. Very low cost.

Vegetable Lamb of Tartary — Harvest (knots + heal). Medieval bestiary reference — perfect for the codex theme. One-shot harvest like a knot but with a minor heal attached. Low wiring cost: copy the knot mining logic, add a small heal.

Scoria Rose — Renewable knot. Renewable resource using fruit-tree's ripe/unripe state machine. Gives Brass Grave a recurring economic feature. Very low wiring cost.

Waxbloom — Heal + small reveal. Cold flame that warms and lights the way. Perfect for Frigid Silence — fills that biome with something hopeful and useful. Uses fruit-tree regrowth + small reveal radius.

Errata Slip — Terrain change. Thematically perfect for Unfinished Lands (editor's correction pinned to reality). High wiring cost — terrain rerolls are invasive. Gate behind very-rare and implement last. Worth doing for the "wow" factor.

Red-Letter Bramble — ~~Damage hazard~~ — **cut (Aug 2026):** no obstacles in the game; purely negative tiles were removed.

Group 2: Strong but not as cool, or modest overlap
Gilded Initial — Beautiful theme (illuminated capital letter), buff mechanic. Fits Untouched and Unfinished Lands. Moderate wiring (buff system), but the visual would be iconic. Worth doing after the buff pipeline exists.

Peridexion Tree — Bestiary reference, heal+buff. The shadow-of-the-peridexion defense buff is a nice twist. Overlaps somewhat with fruit trees mechanically but the added buff makes it distinct.

Listener Lichen — Ear-shaped lichen that reveals tiles. Good for Frigid Silence and Sere Wastes. Similar to Palimpsest Slab mechanically — could share a regrowth/reveal code path.

Saint's Rib — Enormous bone arc granting defense. Very cool visual, low mechanical cost. Now Scorch's signature feature.

Drowned Copyist — One-shot harvest+buff. Perfect theme for Mourning Marsh. A more elaborate knot: you get knots + a temporary defense buff, then it's inert but still blocks digging.

Censer Saint — Buff with cost (take damage, gain attack). The "censer of prayers" theme fits Brass Grave beautifully. Risk-reward choice.

Screamroot — Harvest with cost (gain knots, take damage, get marked on map). Adds strategic risk/reward. Works across Untouched, Painforest, Mourning Marsh.

Null Lily — Debuff removal (cure). Novel mechanic the game doesn't have. Very thematic for Unfinished Lands (correction mark that undoes something). Low wiring: a "remove negative status" effect, then withers and regrows.

Half-Drawn Obelisk — Teleport variant for Unfinished Lands. Similar to Fool's-Fire but rolls a random distance to any passable hex within a radius. Fits the "unfinished sketch" theme.

Witness-Stone / Choir Stone — Both are reveal/buff standing stones with cooldowns. Serviceable but redundant with each other and with Palimpsest Slab. Pick one.

Cinderbloom — Overlaps heavily with Scoria Rose (Brass Grave fiery plant) but they could be more or less common or exclusive to certain biomes, with their slight mechanical distinction (renewable resource vs. one-shot buff) making the biomes more thematic.

Brass Lung Vent — ~~Debuff hazard~~ — **cut (Aug 2026):** no obstacles in the game; purely negative tiles were removed.

Ouroboros Loop — Returns you to where you started your turn. Fun concept but niche — the tactical use case is narrow. Very thematic for Sere Wastes. Could save for later.

---------

Cleared out (Aug 2026): the dead kinds `vine` and `largeTree` (defined but never spawned) and the obstacle features (Red-Letter Bramble, Brass Lung Vent) were **deleted** — see `dev/featureDesign.md` §2 for the locked decisions.