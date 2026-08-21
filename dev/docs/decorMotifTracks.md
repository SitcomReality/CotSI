# Decor Motif Tracks — Handoff

Active three-track plan born from a terrain-decor review: the decor system's
variation features (alternatives, per-option `biomeWeight`, per-motif weight
skews, motif library) are richer than the catalog actually uses. The plan is to
consolidate the motif catalog, then actually *use* those features, then tune
density. **Track 1 is done and committed; this doc is the running state and the
Track 2 / 3 brief.**

Scope note: tracks are deliberately separate. Do not fold Track 2 (authoring)
or Track 3 (density) changes into Track 1 work or vice-versa — each lands and
verifies on its own.

---

## Track 1 (DONE) — Consolidate the catalog

Reduced the shared motif library from **54 → 24 motifs** and rewired every decor
table (`data/decor/*.js`) to the consolidated set. Files touched live under
`src/render/hexmap3d/worldObjects/descriptors/`.

### Resulting catalog (24)

`roundTree` `conifer` `deadTree` `tallTree` `gnarledTree` `log` — `stone` `pile`
`shard` `tuft` — `flower` `crystal` `shrub` — `cactus` `cattail` `mound` `bone`
— `pool` — `titanBoil` `titanSpire` `titanNodule` — `yetFragmentOrb`
`yetFragmentCube` `yetFragmentShard`.

Barrel: `data/motifs/index.js` (`ALL_MOTIFS` / `motifById`).

### What changed

- **Debris consolidated to 4 shape families** — `stone`, `pile`, `shard`,
  `tuft`. Each is one motif whose root is an **`alternatives`** node carrying
  all material variety (seeds 110–113), so one entry replaces the many debris
  files. Removed `boulder`, `rock`, `moundPlains`, and the old catch-all
  `debris.js` (its single-part role is now these alternatives roots).
  - `stone` (110): stone-lump .45 / rock-lump .25 / boulder-lump .15 /
    clod-block .08 (sere_wastes ×1.5) / rubble-block .07 / orb-pebble .05
    (edenfall ×1.2).
  - `pile` (111): pile-mud .3 / pile-wrack .2 / pile-crust .2 / pile-shell .15 /
    pile-pad .1 / pile-moundplains .05 (tundra ×2, frigid_silence ×2).
  - `shard` (112): shard-facet .7 / shard-glass .3.
  - `tuft` (113): tuft-grass .55 / tuft-tussock .45.
- **Distinct motifs extracted** — `flower`, `crystal`, `shrub` now each have
  their own file (previously debris parts). These are currently single-part
  placeholders — extending them is Track 2.
- **`pool` unifies the pools** (seed 114) — replaces `bloodPool` / `springPool`
  / `ghostSpark` with one motif whose options carry the old identities:
  `pool-blood` (unfinished_lands:0 → shows on Titanblood), `pool-spring` and
  `pool-spark` (titanstain:0 → show on Forespring).
- **Supernatural deduped** — the 3 titan motifs (`titanSpire`/`titanBoil`/
  `titanNodule`) and 3 yet motifs (`yetFragmentCube`/`yetFragmentShard`/
  `yetFragmentOrb`) now live **once** in `data/decor/supernatural.js`
  (`SUPERNATURAL_MOTIFS`), spread into each land decor instead of pasted
  per-file. Each entry gates itself to one supernatural biome via present-0
  `biomeWeight`. Removed `titanTendril`, `titanTooth`, `yetFragmentCone`,
  `yetFragmentPillar`.
- **Junk removed** — `deadCactus`, `boneStalk`, `spar`, `reed` deleted.
- **`driftwood` → `log`** everywhere.
- **`coldMound` / `saltCrust` → `pile`** (merged into existing pile entries).
- **4 woods folded** — `taigawood`/`drywood`/`deadwood`/`violetwood` deleted;
  their terrains re-point to the core trees (`tallTree`/`conifer`/`deadTree`/
  `gnarledTree`/`log`) via weight + biome skews.

### Deliberate deviation from the plan's wording

The plan said to add per-wood **tint alternatives**. Instead the woods were
folded by **re-pointing to the core trees and relying on the existing
`biomeColor` pipeline** (per-biome color swatches) for the regional look. That
is a smaller, safer change than authoring per-wood color alternatives. If
distinct silhouettes per wood are wanted, that is Track 2 (authoring) work, not
a correction to Track 1.

### Verification (all green at commit)

- Regenerated golden snapshot: `dev/scripts/regenerate_descriptor_snapshot.sh`
  → `40 descriptor(s) — unchanged` (idempotent; matches committed snap).
- `node --test` → **772 pass / 0 fail** (includes the render descriptor
  round-trip and motif/alternatives validation).
- `check_imports.py`, `check_analysis_imports.py`,
  `check_geometry_editor_imports.py` all pass (one pre-existing informational
  boundary note: `ui/mapTooltip.js → game/rules/terrainOverrides.js`).

One test was edited to stay correct:
`dev/tests/render/descriptorData.test.js` — the "woods decor … dispersed ring +
shrink" bound used a hardcoded `1.15` canopy-headroom factor that the new
large-scale motifs (titanBoil scaleX 1.4, log 1.3) exceed at the biome-less
snapshot tile. Added a `maxLeafScaleX(parts)` helper (walks groups +
alternatives for max `transform.scaleX`) and changed the bound to
`maxMotifSize * maxScaleX * 1.15 * DISPERSED_SCALE + 1e-9`.

### Also updated (docs/comments swept for removed ids)

`AGENTS.md`, `dev/docs/sourceTree.md`, `dev/docs/descriptorAuthoring.md`,
`dev/docs/context/biomesAndTerrain.md`, `dev/docs/context/sceneConventions.md`,
plus the six supernatural motif file headers
(`data/motifs/{titanBoil,titanSpire,titanNodule,yetFragmentOrb,yetFragmentCube,yetFragmentShard}.js`)
that still pointed at the deleted `data/motifs/debris.js`, and
`data/motifs/log.js` (dropped the now-false "sole multi-part exception" claim).

---

## Track 2 (TODO) — Authoring & actual feature use

Catalog is right; the geometry and the use of the variation features is not.
The motifs are mostly single static shapes; the point of Track 2 is to make
them read correctly and to *exercise* alternatives / per-option `biomeWeight` /
grouping per motif.

All motif geometry is authored in the **geometry editor**, not by hand:

- Edit the object in `dev/tools/geometryEditor.html`, press **Save** (needs
  `dev/tools/geometryEditor/saveServer.sh`, which also serves the game).
- Tree motifs save to `data/motifs/<id>.js` via the `/save/motif` route;
  referenced by a decor's `{ motif, weight, biomeWeight, … }` entry.
- Authoring rules & worked examples: `dev/docs/descriptorAuthoring.md`
  (shared-library references, `alternatives`, groups, tint `source`).

### Concrete asks (in priority order)

1. **Make `cactus` convincing** — `data/motifs/cactus.js`. Currently reads as
   "an arm + cylinder", not a cactus. The editor screenshot shows the arm
   tree (`cactus-arm-left/right`) as the only variable bit. Give it a proper
   tapered trunk, ribs, consistent arm placement, top cap, and a flower/pad
   accent; vary arms via alternatives.
2. **`deadTree` variability** — `data/motifs/deadTree.js`. Too detailed and too
   consistent. Now that per-biome **part weighting** is possible, e.g. disable
   the `tuft` clump in **Sere Wastes** and always show it in **Painforest**
   (via per-option `biomeWeight` on the tuft alternative/group). Split the
   custom parts into groups so the whole tree is more random per instance.
3. **Supernatural motif variety** — `titanBoil`/`titanSpire`/`titanNodule` and
   `yetFragmentCube`/`yetFragmentShard`/`yetFragmentOrb`. These are single
   shapes now and "not much of anything" — one motif per biome silhouette was
   enough **because** each can now carry alternatives / part-level variation.
   Give each 2–3 variants or part-level `biomeWeight` so a titan hex isn't 10
   identical spires. Keep it to the 3 titan + 3 yet set (no new motifs).
4. **`flower` as a proper stalk** — `data/motifs/flower.js`. The ask: a stalk
   (like `cattail`) topped with a wider/flatter bloom that uses a strong
   `bloom` tint `source`. Currently a single elevated spheroid (`flower-a`).
5. **`crystal` in clusters/formations** — `data/motifs/crystal.js`. Currently a
   single shard (`crystal-a`); add a cluster root / formation alternatives so it
   reads as a crystalline outcrop.
6. **`shrub` as distinct medium plant** — `data/motifs/shrub.js`. Larger than a
   flower, smaller than a tree, with alternatives/variation and biome-based
   distinctions (a scrubby sere-wastes shrub vs a lush painforest one).
7. **General per-biome alternative/part weighting** — apply the pattern above
   across motifs; the Sere-Wastes/Painforest tuft example is the template. The
   plumbing is already validated (`validateParts.js` accepts per-option
   `biomeWeight` on an alternatives node).

### Reminder for exactly-once part ids

Alternatives option ids share the global part-id namespace and must be unique.
Any new option id must not collide with an existing part/motif/optionalGroup id.

---

## Track 3 (TODO) — Density / visual clutter

Too many decor objects on some terrains; beaches and deserts can look busy when
they should read barer sometimes. Two levers, in order:

1. **Per-motif `footprint` for the scatter solver** — the real fix for the
   density gap, already tracked under "Decor composition follow-ups" in
   `dev/docs/futureWork.md`. Single-part component decors (beach/plains/marsh/
   plateau) currently land at ~32–44% of the v5 part-count mean because
   matching it needs 15–20+ slots per tile and the separation solver can't pack
   that. A per-motif visual-mass footprint would let cluster counts rise safely.
2. **Cluster-count / repeatPenalty tuning per biome** — the `cluster.min/max`,
   `repeatPenalty`, and `size` on each decor (`data/decor/*.js`). Beaches and
   deserts specifically should allow the sparse end more often (barer reads).

Final numbers need in-game eyeballing — the user tests visually and reports back
(see "How to verify" below). Do not guess density numbers.

---

## How to verify

- **Authoring** (Track 2): edit in the geometry editor → Save via
  `saveServer.sh` → regenerate the snapshot
  (`dev/scripts/regenerate_descriptor_snapshot.sh`, expect `unchanged` iff no
  descriptor data changed) → `node --test` → the three import checkers
  (`check_imports.py`, `check_analysis_imports.py`,
  `check_geometry_editor_imports.py`).
- **Visual** (the user, all tracks): load the game and screenshot the affected
  biomes — desert, marsh, beach, plains, deepWood, titanstain, unfinished lands
  — confirming no broken/empty hexes and each biome still reads as itself.
  The AI dev can't run the game; rely on the user for the visual pass.

## Open questions for the user

- Confirm you're OK with the woods fold being a **re-point + biomeColor**
  approach (above) rather than per-wood tint alternatives.
- Whether Track 3 density targets are defined (e.g. a target per-hex count for
  beaches/deserts) or should be found by eye.
- Whether the supernatural set should stay at 3 per biome (locked in Track 1)
  or you'd later accept a leaner 2-per-biome once variety is in.
