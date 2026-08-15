# Factions — Context Reference

**Champions of the Supernal Interregnum** — the seven factions, their colors,
their themes, and the Paley tournament that powers combat. Written for
contributors (human or LLM) who have not seen the game or the codebase — e.g.
someone about to author faction geometry (`base`/`champion`/`mob` descriptors)
or faction UI via `dev/docs/descriptorAuthoring.md`.

Canonical source: `src/game/rules/factionData.js` (factions, colors, beats
table, Paley cycles), `src/game/rules/paleyScoring.js` + `src/params/game/combatParams.js`
(scoring), `src/render/hexmap3d/units/unitMeshes.js` (color-token resolution).

---

## 1. The seven powers and the Paley tournament

Combat is a **7-node Paley tournament**: each of the seven powers beats exactly
3 others and loses to exactly 3 (no ties). The relation is *i beats i+1, i+2,
i+4* (mod 7):

| Power beats | …powers |
|-------------|---------|
| 0 | 1, 2, 4 |
| 1 | 2, 3, 5 |
| 2 | 3, 4, 6 |
| 3 | 4, 5, 0 |
| 4 | 5, 6, 1 |
| 5 | 6, 0, 2 |
| 6 | 0, 1, 3 |

This tournament is **2-paradoxical**: for every pair of powers there exists a
third power that beats both (e.g. 6 beats both 0 and 1) — no pair is
undominated, which keeps every exchange tactically rich. Map spawn order is
drawn from the 48 canonical Paley Hamiltonian cycles × 7 rotations (336
equally likely arrangements), where a cycle is an ordering in which each power
beats the one after it.

In combat, each round has two exchanges; per exchange both combatants secretly
pick one of the 7 powers and reveal simultaneously. A revealed power scores
against every opponent power it beats: with 2 wins its potency is **×2**, with
1 win **×1.5**, with 0 wins **×1** (`PALEY_SCORE_MULTI_2_WINS = 2`,
`PALEY_SCORE_MULTI_1_WIN = 1.5`). The four revealed powers of a round
accumulate into the round score.

---

## 2. The factions

| # | Short | Name | Trait | Mechanic (desc) | Terrain costs |
|---|-------|------|-------|-----------------|---------------|
| 0 | CRU | **Crucible** | Scarshield | –week enemy final score | hill 6, plateau 6 |
| 1 | REV | **Reverie** | Another's Dream | Dawn random boon | marsh 6 |
| 2 | VER | **Verdant** | Gaia's Wail | Cheap forest moves, mobs pacified, Blessed Font heal++ | forest 4, denseForest 6 |
| 3 | ARC | **Archive** | Everknown | Relic → +random potency | river 15 |
| 4 | HRT | **Hearth** | Compersion | Trade −20% | plains 6, desert 6 |
| 5 | MSK | **Masque** | Silent Ovation | Combat turn +week random | desert 6 |
| 6 | HOL | **Hollow** | Vaunted Nothing | +⌈week/3⌉ per missing HP | denseForest 10 |

(Terrain costs are per-hex action-point costs; default costs are plains 10,
forest 12, denseForest 20, desert 10, marsh 15, hill 12, plateau 15, river 30.)

One-sentence themes (the flavor nouns are light summaries of name + trait;
mechanics are from the data above):

- **Crucible** — ember-red forge-culture of the Scarshield: it grinds down one
  enemy's final weekly combat score, and moves fast in hills and plateaus.
- **Reverie** — violet dreamers of Another's Dream: each dawn they wake to a
  random boon, and they glide through marshes.
- **Verdant** — the forest-green faction answering Gaia's Wail: forests are
  nearly free to move through, mobs are pacified, and Blessed Fonts heal more.
- **Archive** — slate-blue scholars of the Everknown: every relic found grants
  a random potency, and rivers cost them half price.
- **Hearth** — a golden trader-faction practicing Compersion: all trades cost
  20% less, and open plains/desert are cheap to cross.
- **Masque** — magenta performers of the Silent Ovation: they gain one extra
  random combat turn per week and cross deserts effortlessly.
- **Hollow** — pale-blue nihilists of Vaunted Nothing: they score more the more
  HP they are missing, and push through deep woods at half cost.

---

## 3. Faction colors

Each faction has five hex colors, used in different places:

| Faction | `base` | `color` | `glow` | `uiColor` | `uiGlow` |
|---------|--------|---------|--------|-----------|----------|
| Crucible | `#6e2e22` | `#b84530` | `#e87a6a` | `#e0604a` | `#ff9d8a` |
| Reverie | `#5a3a5a` | `#8a5aaa` | `#b388f0` | `#b06ae0` | `#d4a0ff` |
| Verdant | `#3a5a3a` | `#5a8a4a` | `#88d888` | `#6ad06a` | `#a8f0a8` |
| Archive | `#3a4a5a` | `#5a7a9a` | `#8ab8f0` | `#5aa8e0` | `#9cc8ff` |
| Hearth | `#5a4a22` | `#9a8a3a` | `#efc86b` | `#d8b048` | `#ffe08a` |
| Masque | `#5a3a4a` | `#8a5a7a` | `#e488c0` | `#d060a8` | `#f0a8d8` |
| Hollow | `#3a3a44` | `#5a5a7a` | `#a0a8c0` | `#8080b0` | `#b8b8e0` |

- `base` — the dark faction base color.
- `color` — the primary signature color (the vivid one).
- `glow` — bright glow/emissive accent.
- `uiColor` / `uiGlow` — the UI-facing pair (brighter variants).

**How they reach geometry:** entity-driven descriptors (`base`, `champion`,
`mob`) never take biome tints. A part's `color` is resolved per entity:

- a **string token** looks up the entity's palette: `factionBase` → the
  faction's `base`, `factionAccent` → its `color`, and `factionBody` → the
  `base` darkened by `MOB_COLOR_DARKEN` (×0.7, the mob body color);
- a **numeric literal** is used as-is;
- **no `color`** falls back to the entity's default `color`.

Champion miniatures are colored primarily via `factionBase`, with their
signature element in `factionAccent`; mobs use `factionBody` + `factionAccent`.

---

## 4. Where the data lives

- `FACTIONS` array + `beats()` + `PALEY_CYCLES` + `ARTIFACTS`:
  `src/game/rules/factionData.js`
- Combat scoring: `src/game/rules/paleyScoring.js`,
  `src/params/game/combatParams.js`
- Faction terrain-cost consumption: `src/game/rules/movementCosts.js`
- Faction color-token wiring for the map: `src/render/hexmap3d/units/unitMeshes.js`,
  `src/render/hexmap3d/worldObjects/baseMeshes.js`
- Faction archetype game data (start HP, potency, AI): `src/game/rules/archetypeData/index.js`
  and the `base`/`champion` descriptors in
  `src/render/hexmap3d/worldObjects/descriptors/data/bases/` and `.../champions/`
