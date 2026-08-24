# Future Work

Forward-looking tracker for specific features still to be implemented.
Completed work lives in git history; deferred-by-decision decisions are
recorded in the "Scale / generation guardrails" section below.

Some items may be based on out-of-date design ideas — confirm with the user
before implementing specific features or making changes based on this document.

---

## Features to be implemented

### Balance: features, items, factions

Rewards are functional but un-tuned — amounts, tier scaling, and the shared
`FEATURE_REGROW_DAYS` cadence need a design/balance pass. Edenfall mushrooms
heal on starting values (`FEATURE_EDEN_MUSHROOM_HEAL` /
`FEATURE_EDEN_SHROOMLET_HEAL` in `src/params/game/economyParams.js`).
Per-feature reward intent is tracked in `dev/docs/featureDesign.md` §5
(amounts in §3a).
The abilities/stats and sources of equipment items need to be designed and
balanced. An equipment-durability layer already exists
(`src/game/rules/equipment.js`, with Forge repairs via
`src/game/state/features/forgeSystem.js`); only the abilities/stats remain
undesigned.
Dungeon Battle + reward balance — deliberately un-tuned: battles use existing
mob archetypes scaled by `DUNGEON_BATTLE_SCALE`
(`src/params/game/dungeonParams.js`) and the completion reward
(`DUNGEON_COMPLETION_*`) is a placeholder bundle. Mob power is still being
rebalanced, so dungeon fights and rewards get a design/balance pass at the
same time — not before.

### Onboarding / tutorial

Nothing built yet; the open question is scope, not whether. Candidate pieces
(unconfirmed design):

- First-run tips: a few modal/tooltip nudges that teach the core loop
  (move → fight → trade → dig) without a full tutorial.
- A help entry point — per-panel "?" buttons or a single overlay — plus a
  key-terms glossary.
- A "Reset tutorial/tips" toggle, tied into Options/settings below.

### Online Multiplayer

Later-phase feature — nothing built, and the game has no client/server split
today:

- Database connection & game state preservation.
- Game creation, lobbies, room codes etc.
- Client connection and syncing game state with server.

### Audio

Nothing built (the game is silent today). Needed:

- SFX system (UI, combat, feature interactions).
- Music (ambient tracks).

### Specialer FX (particles, glows, damage numbers)

An ambient/impact FX pass on top of the static descriptors. The effect flags
already exist as "future" entries in `graphicsSettings.effects`; water
sparkles (`src/render/hexmap3d/terrain/waterSparkles.js`) are the precedent
to build on. Ideas from design:

- Filled Blessed Font glows when charged.
- God's Knots emit rainbow sparkles and dissipate in a puff of sparkles when collected.
- Ripe peridexion fruit sparkles; treasure-chest collect splashes a coin
  flourish; damage numbers float over hits.

### Graphics refinement pass

A later review-and-refine pass over visuals across the board: feature and
decor geometry (including the Forge's placeholder anvil descriptor), motifs,
icons, creatures, and other object graphics. Most of it is tuned in the
geometry editor; descriptor data files regenerate on Save.
- The map visual for dungeon entrances is the editable `dungeon` descriptor
  (`src/render/hexmap3d/worldObjects/descriptors/data/features/dungeon.js`).

### UI polish

- Setup screen v5 layout redesign — the Remnant-Cosmos pass covered the
  in-game chrome and modals; the setup screen still runs on token-level
  inheritance only.
- Reward/dispatch reveal animations beyond the current veiled pattern
  (dispatch cards already do a staggered veil; the reward modal has none).

#### Responsive / mobile audit

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
- Bot AI for dungeons (currently human-only).

---

## Large-map persistence

Implemented: saves are seed + dirty-tile deltas (`game/state/persistence/saveDocument.js`,
localStorage slot `cotsi-save-v1` via `runtime/gameSaveSlot.js`; UI in
`runtime/saveLoadActions.js`) — everything else regenerates from the seed.
Scale guardrails: "Scale / generation guardrails" above.

---

## Geometry content

- **Mob animation runtime** — deferred; the declarative clip spec and
  per-render-pass hook are worked out in `dev/docs/mobGeometryAndAnimation.md`
  §4–5.

### Decor composition follow-ups

The v6 decor composition system (motifs, alternatives, repeatPenalty,
biomeWeight, editor motif panel + strip) is in; decor geometry now lives in a
shared motif library (`data/motifs/`). Planned follow-ups:

- **Motif catalog plan** — the catalog was consolidated (54 → 24 at commit
  `a7f0c1e`; 22 motifs today) and the
  completed three-track plan (consolidation / authoring / density) was tracked in
  `dev/docs/decorMotifTracks.md` which was removed after commit hash
  `738763f3869f004b94ef78c91104defbad9e1bac`.
- **optionalGroups → alternatives-with-`none` sunset** — one weighted
  resolver now powers motifs, alternatives, and (later) optionalGroups. A later
  schema rev should re-express optionalGroups as an alternatives node whose
  first option is the `none` and retire the field (it stays in the pipeline
  for feature-kind use; no new work goes into it).
- **Per-motif `footprint`** for the scatter solver — the real fix for the
  density gap: single-part component decors (beach/plains/marsh/
  plateau) land at 32–44% of the v5 part-count mean because matching it
  would need 15–20+ slots per tile, which the current separation solver
  can't pack. A per-motif visual-mass footprint would let cluster counts
  rise safely.

---

## Scale / generation guardrails

Deferred-by-decision guidance (originally from the retired deferredNotes.md):

- **No worker threads for chunk generation** — single-threaded JS with
  clock-scheduled chunk generation is sufficient up to R=200. Revisit only if
  profiling shows otherwise.
- **No LOD unless profiling shows it's needed** — InstancedMesh + frustum
  culling handles R=100 comfortably.
- **NO ACTUAL INFINITY** — build systems with the perspective of "how would
  this need to work if the map were infinite?", not to actually have infinite
  maps. Players eventually finding each other and fighting is core to design.
