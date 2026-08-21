# Decor Motif Tracks — Handoff

Active three-track plan born from a terrain-decor review: the decor system's
variation features (alternatives, per-option `biomeWeight`, per-motif weight
skews, motif library) are richer than the catalog actually uses. The plan is to
consolidate the motif catalog, then actually *use* those features, then tune
density. **Track 1 is committed; Track 2 (authoring + a broad per-biome-weight
pass) is committed here; Track 3 is the density brief below.**

Scope note: tracks are deliberately separate. Do not fold Track 2 (authoring)
or Track 3 (density) changes into Track 1 work or vice-versa — each lands and
verifies on its own.

---

## Track 1 (DONE) — Consolidate the catalog

Reduced the shared motif library from **54 → 24 motifs** and rewired every decor
table (`data/decor/*.js`) to the consolidated set. Files touched live under
`src/render/hexmap3d/worldObjects/descriptors/`.

### Resulting catalog (24 → 22 after Track 2's supernatural trim)

`roundTree` `conifer` `deadTree` `tallTree` `gnarledTree` `log` — `stone` `pile`
`shard` `tuft` — `flower` `crystal` `shrub` — `cactus` `cattail` `mound` `bone`
— `pool` — `titanBoil` `titanSpire` — `yetFragmentCube` `yetFragmentShard`.

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
  their own file (previously debris parts), still single-part placeholders.
- **`pool` unifies the pools** (seed 114) — replaces `bloodPool` / `springPool`
  / `ghostSpark` with one motif whose options carry the old identities:
  `pool-blood` (unfinished_lands:0 → shows on Titanblood), `pool-spring` and
  `pool-spark` (titanstain:0 → show on Forespring).
- **Supernatural deduped + trimmed to 2 per biome.** The titan and yet motifs
  live **once** in `data/decor/supernatural.js` (`SUPERNATURAL_MOTIFS`), spread
  into each land decor instead of pasted per-file; each entry gates itself to one
  supernatural biome via present-0 `biomeWeight`. Track 1 removed `titanTendril`,
  `titanTooth`, `yetFragmentCone`, `yetFragmentPillar`; **Track 2** trimmed the
  set to 2 per biome (user decision): Titanstain keeps `titanSpire` +
  `titanBoil`, Unfinished Lands keeps `yetFragmentCube` + `yetFragmentShard`
  (dropped `titanNodule`, `yetFragmentOrb`).
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

### Verification (green at Track 1 commit, and re-run green after Track 2's trim)

- Regenerated golden snapshot: `dev/scripts/regenerate_descriptor_snapshot.sh`
  → `40 descriptor(s)` (regenerated after Track 2's supernatural trim; the
  motif shape changes are inside `data/motifs/`, the 40 count is stable).
- `node --test` → **772 pass / 0 fail** (includes the render descriptor
  round-trip, motif/alternatives validation, and "every library motif wraps into
  a synthetic, valid decor").
- `check_imports.py`, `check_analysis_imports.py`,
  `check_geometry_editor_imports.py` all pass (one pre-existing informational
  boundary note: `ui/mapTooltip.js → game/rules/terrainOverrides.js`).

One test was edited in Track 1 to stay correct:
`dev/tests/render/descriptorData.test.js` — the "woods decor … dispersed ring +
shrink" bound used a hardcoded `1.15` canopy-headroom factor that the new
large-scale motifs (titanBoil scaleX 1.4, log 1.3) exceed at the biome-less
snapshot tile. Added a `maxLeafScaleX(parts)` helper (walks groups +
alternatives for max `transform.scaleX`) and changed the bound to
`maxMotifSize * maxScaleX * 1.15 * DISPERSED_SCALE + 1e-9`. This covers the
alternatives-based supernatural motifs too, since they carry large `scaleX`
leaves.

### Also updated (docs/comments swept for removed ids)

`AGENTS.md`, `dev/docs/sourceTree.md`, `dev/docs/descriptorAuthoring.md`,
`dev/docs/context/biomesAndTerrain.md`, `dev/docs/context/sceneConventions.md`,
plus the supernatural motif file headers
(`data/motifs/{titanBoil,titanSpire,yetFragmentCube,yetFragmentShard}.js`)
that still pointed at the deleted `data/motifs/debris.js`, and
`data/motifs/log.js` (dropped the now-false "sole multi-part exception" claim).

---

## Track 2 (DONE) — Authoring & actual feature use

Catalog is right; the geometry and the use of the variation features is not.
The point of Track 2 is to make motifs read correctly and to *exercise*
alternatives / per-option `biomeWeight` / grouping per motif.

### Progress — named authoring asks + a broad per-biome-weight pass DONE

Each remaining motif now uses the alternatives / per-biome-weight feature set
rather than a single static shape:

- **Supernatural (2 per biome, seeds 105–108)** — `titanSpire` (single/pair/
  thicket), `titanBoil` (single/pair/pustules), `yetFragmentCube`
  (single/pair/column), `yetFragmentShard` (single/pair/burst).
- **`cactus`** — tapered ribbed trunk + domed cap + `bloom` accent, and an
  out-then-up elbow arm choice (none / one / two; ids `-one-`/`-two-` scoped so
  the same arm shape can appear in both configs without id collision).
- **`deadTree`** — the moss `tuft` clump was pulled out of the crown and made a
  per-biome choice point (`deadTree-tuft`, seed 109): excluded in `sere_wastes`
  (present option carries `biome_sere_wastes: 0`) and always present in
  `painforest` (none option carries `biome_painforest: 0`).
- **`flower`** — a green stalk topped by a wide, flat head tinting strongly via
  `bloom` (`flower-bloom`, bloom influence 0.75).
- **`crystal`** — a formation choice point (`crystal-formation`, seed 115):
  single shard / pair / outcrop cluster.
- **`shrub`** — short stems plus a per-biome foliage style (`shrub-foliage`,
  seed 116): lush green cluster (never `sere_wastes`) or sparse dry scrub
  (never `painforest`).

Authoring pattern to reuse: a local builder function per shape returns a root
part with `shape`/`params`/`transform`/`stretch`/`color`/`biomeColor`, and the
exported motif is a single `{ id, parts: [{ id, seed, default, alternatives:
[{ id, weight, biomeWeight?, parts }] }] }`. Option/leaf ids are prefix-scoped
to the motif (`<motif>-<option>-<local>`) so part ids stay globally unique —
reusing the same builder across two options REQUIRES a distinct prefix, or
`validateParts` rejects the duplicate ids (the cactus authoring caught this).

#### Broad per-biome-weight pass (DONE)

The Sere-Wastes/Painforest tuft + shrub template was extended across the other
motifs that already had an `alternatives` choice point whose options should read
differently per biome, plus one new choice point. **Snapshot-neutral for the
per-biome bias** (the golden-snapshot tiles carry no `biomeId`, so option
`biomeWeight` is ×1 there), except the `log` restructure which legitimately
rewrote the snapshot. All authored to run through `biomeColor`/`biomeScale`
for tint/size; the splits are regional *shape/part* choices:

- **`roundTree` fruit (seed 103)** — cold & arid trees go bare; fertile biomes
  fruit readily. Bare 45% (default) → 67% tundra/frigid_silence, 62% sere/
  scorch/dustbleed; berries+blossom 55% (default) → 82% edenfall, 79% painforest.
- **`gnarledTree` branch-split (seed 102)** — the wind-shaven `swept` crown
  dominates dry/open country (63% scorch/sere_wastes, 54% dustbleed); the lush
  `spread`/`twotier` crowns dominate painforest/edenfall.
- **`tuft` (seed 113)** — lush `grass` in the wet, mild biomes (71% edenfall/
  painforest); dry `tussock` scrub in arid (75% sere_wastes).
- **`crystal` formation (seed 115)** — outcrop clusters favor edenfall/dustbleed
  (36% vs 25% elsewhere).
- **`pile` (seed 111)** — the salt `crust` material dominates arid flats
  (29% sere_wastes/dustbleed vs 20% default); `moundPlains` already favors the
  cold biomes.
- **`log` (new `log-overgrowth`, seed 117)** — the moss + two shelf fungi are
  now a per-biome choice: bare logs in the dry, open biomes (bare 68%
  sere_wastes, 63% scorch/dustbleed) vs mossy, fungus-capped logs in the wet,
  mild biomes (present 74% edenfall/painforest/mourning_marsh).

Applied the same discipline as the named asks: option/leaf ids stay prefix-scoped
and globally unique; only registered biome ids are used; part transforms stay
within the allowed root/nested field sets.

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

- **Authoring** (Track 2): edit the motif in `data/motifs/<id>.js` (hand-authored
  — or via the geometry editor's motif mode → Save → `/save/motif`) → regenerate
  the snapshot (`dev/scripts/regenerate_descriptor_snapshot.sh`) → `node --test`
  → the three import checkers (`check_imports.py`,
  `check_analysis_imports.py`, `check_geometry_editor_imports.py`).
- **Visual** (the user, all tracks): load the game and screenshot the affected
  biomes — desert, marsh, beach, plains, forest, deepWood, plateau, titanstain,
  unfinished lands (the supernatural trim plus the re-authored
  cactus/deadTree/flower/crystal/shrub) — confirming no broken/empty hexes and
  each biome still reads as itself. For the broad per-biome-weight pass, put two
  **contrasting** biomes side by side to confirm the split reads: e.g. an
  edenfall/painforest forest (fruitful, mossy logs, lush tufts) against a
  sere_wastes/scorch or tundra one (bare trees — no fruit, bare logs, dry
  tussock, wind-swept gnarled crowns). The AI dev can't run the game; rely on
  the user for the visual pass.

## Open questions for the user

- Confirm you're OK with the woods fold being a **re-point + biomeColor**
  approach (above) rather than per-wood tint alternatives.
- Whether Track 3 density targets are defined (e.g. a target per-hex count for
  beaches/deserts) or should be found by eye.
