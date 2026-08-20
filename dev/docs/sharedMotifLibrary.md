# Shared Motif Library — Deferred Follow-ups

Reminder tracker for the work owed toward the shared motif library (commit
`b340dda` put the mechanism in). The mechanism shipped, but the *migration* is
barely started — this is planning material for **2–3 future update plans**. The
individual items are small but touch distinct systems (descriptor data, the
editor, and terrain authoring), so they are grouped into phases at the bottom.

---

## Goal (what the library is *for*)

The point of the shared motif library is to make shared motif geometry the
**only** authoring site for terrain decor. At the end state:

- **Every** terrain decor object's geometry derives from the library — no
  `decor` descriptor defines its own unique geometry inline. A decor's `motifs`
  table lists only shared refs; descriptor-local `parts` disappear from terrain
  decor entirely.
- **One motif per motif file** — each file in `data/motifs/` represents exactly
  **one** discrete decor object. For trees that means one file per species
  (`roundTree.js`, `conifer.js`, `deadTree.js`, `palmTree.js`, …), never a
  shared `trees.js` barrel. A motif object here is a specific species of flora
  (the gnarled tree, currently id `painforest` — being renamed to
  `gnarledTree`), a log, a titan spire, a cactus.
- **`debris` is the sole exception** — it is the catch-all file for all the
  *small single-part* detritus objects (mounds of dirt, rocks, moss, spars).
  Anything composed of **two or more parts** must live in its own motif file,
  never in `debris`. (A log is multi-part, therefore *not* debris.)
- Per-use presentation of a shared object stays on the **referencing decor**,
  not in the motif: `weight`, `biomeWeight`, and `size`/`placement` overrides
  all live in that decor's ref. The motif only carries the shared geometry and
  its `size`/`placement` defaults.

See `dev/docs/decorComposition.md` for how motifs, alternatives, and weighted
slots compose.

## What is in (shipped)

Shared, author-once motif geometry lives in:
`src/render/hexmap3d/worldObjects/descriptors/data/motifs/`

- `trees.js` — `PAINFOREST_MOTIF` (a transient grouping; per the
  one-motif-per-file rule this belongs in its own species-named file, not a
  `trees.js` barrel — see item 4)
- `debris.js` — `LOG_MOTIF`
- `index.js` — `ALL_MOTIFS`, `motifById`

A decor `motifs` entry can be:

- **Shared ref** — `{ motif: '<libraryId>', weight?, biomeWeight?, size?, placement? }`
  (no `id`, no `parts`), resolving geometry from the library.
- **Inline** (unchanged) — `{ id, parts, ... }`.

Resolution happens at `normalizeDescriptor` (`descriptorNormalize.js`):
`sharedPartsFor(id)` materializes the library parts and inherits the library
`size`/`placement` defaults. `tileRecords`/`meshAssembly`/geometry editor are
untouched. `denormalizeDescriptor` (`descriptorDenormalize.js`) collapses an
untouched ref back to reference form (dedupes defaults, and the `weight`/
`biomeWeight`/`size`/`placement` override keys are recomputed to reference form
per key) while turning an edited ref into a local override (no data loss).

Converted to schemaVersion 7: `decor/forest.js`, `decor/deepWood.js`. Weights
and biomeWeights preserved exactly. Validation (`descriptorValidation.js`)
accepts refs and rejects unknown library ids. Tests:
`dev/tests/render/descriptorMotifShared.test.js` (8 tests). AGENTS.md notes
that shared motif geometry lives in `data/motifs/`, not editor objects.

## ⚠️ schemaVersion 7 ≠ migrated

Do not read "converted to schemaVersion 7" as "this decor now uses the shared
library." schemaVersion 7 only *enables* motif refs; it is a format, not a
migration. Today:

- Only **two** decor files are at v7 (`forest.js`, `deepWood.js`), and both
  retain the bulk of their geometry inline. `forest.js` shares its
  `painforest` and `log` refs but still defines `round`, `conifer`, and `dead` — three
  multi-part trees — as hundreds of local lines. `deepWood.js` shares
  `painforest` but still defines `tall`, `taigawood`, `drywood`, `deadwood`,
  and `violetwood` inline.
- **Every other decor is untouched.** `decor/desert.js`, for example, is not
  converted at all — still schemaVersion 6 and entirely inline (`cactus`,
  `rock`, `shrub`, `cold-mound`, `salt-crust`, `dead-cactus`).

So only *one terrain tree* (`painforest`) and *one debris piece* (`log`) live
as shared motifs today, and are referenced from the two v7 decors. Everything
else in every decor file is still object-local geometry to be migrated.

(Also note one present deviation from the Goal: `debris.js` currently holds
`LOG_MOTIF`, which is multi-part. A log is a discrete 2+-part object, so per the
granularity rule it should live in its own motif file eventually, not in the
single-part `debris` catch-all — see item 4.)

## Current migration status (what is still inline)

Every motif `id` below is still defined inline in its decor file — a discrete
decor object that must become a shared motif (its own file when it has 2+
parts, otherwise folded into `debris`). `refs` column = shared motifs already
referenced by that decor.

| Decor file | schema | refs today | inline objects still to convert |
| --- | --- | --- | --- |
| `forest.js` | 7 | `painforest`, `log` | `round`, `conifer`, `dead` |
| `deepWood.js` | 7 | `painforest` | `tall`, `taigawood`, `drywood`, `deadwood`, `violetwood` |
| `desert.js` | 6 | — | `cactus`, `rock`, `shrub`, `cold-mound`, `salt-crust`, `dead-cactus` |
| `plains.js` | 6 | — | `tuft`, `boulder`, `flower`, `stalk`, `mound`, `clod`, `shard` |
| `beach.js` | 6 | — | `tuft`, `driftwood`, `stone`, `shell`, `glass`, `bone`, `wrack` |
| `marsh.js` | 6 | — | `cattail`, `mud`, `tussock`, `pad`, `crust`, `bone`, `orb`, `shard` |
| `hill.js` | 5 | — | `mound` |
| `plateau.js` | 6 | — | `boulder`, `tuft`, `rock`, `rubble`, `crystal`, `spar`, `reed` |
| `titanflesh.js` | 5 | — | `titan-spire`, `titan-tooth`, `titan-boil`, `titan-nodule`, `titan-tendril` |
| `titanblood.js` | 5 | — | `blood-pool` |
| `yetlands.js` | 6 | — | `yet-fragment-pillar`, `yet-fragment-cube`, `yet-fragment-shard`, `yet-fragment-cone`, `yet-fragment-orb` |
| `forespring.js` | 5 | — | `spring-pool`, `ghost-spark` |

(`mountain.js` is excluded: it is `kind: 'mountain'`, one hex-pyramid terrain
form per tile, not a `kind: 'decor'` object with a motif table — out of scope
for the library.)

Several of the inline objects recur across decors under the same name but are
currently **separate, duplicated definitions** (`tuft` in plains/beach/plateau;
`boulder` in plains/plateau; `mound` in hill/plains; `rock` in desert/plateau;
`bone` in beach/marsh; `shard` in plains/marsh). Under the end state, each
becomes **one** shared motif referenced by every decor that uses it, with each
decor keeping its own per-terrain `weight`/`biomeWeight`/`biomeColor`/`size`
on the ref.

## Deferred follow-ups

### 1. First-class editor motif authoring

Today a shared library motif can only be opened/edited by editing a decor that
inlines it. There is no "edit the library motif itself" workflow yet.

- The geometry-editor Save flow (`dev/tools/geometryEditor/emitDescriptor.js`)
  and `descriptorExportName` machinery are decor-scoped. A library motif needs
  an equivalent authoring path that writes back to `data/motifs/<id>.js`
  rather than a decor file.
- Editor "Show all" / canonical view semantics need a library-aware definition
  (cf. `dev/docs/decorComposition.md`).
- Gate: the shared directory is entered by decor ref; standalone library
  editing must not accidentally rewrite every terrain that references the
  shared geometry.

### 2. Per-biome alternatives bias

The shared-ref work covers per-biome `weight` / `size` / `placement`, but the
"this alternative preferred in that biome" bias for **alternatives** nodes is
not implemented. This is the `alternatives` machinery from
`dev/docs/decorComposition.md` §3.2 — applies to signature/body shape
swaps within a motif (e.g. a tree that favors its gnarled variant in one
biome), separate from motif-slot-level weighting.

### 3. Folding `terrainOverrides.decor` whole-decor swaps into the library

Terrain-level biome decor overrides that currently swap the **entire decor**
(whole-decor swaps) should be folded into the shared motif library so a decor
substitution is expressed as refs/weights on the motif table instead of a
parallel decor definition. This is a data-model consolidation, not new
geometry.

### 4. Refactor remaining terrain decor to use motifs exclusively

This is the large data-mass half of the work — covering every inline motif in
the status table above, the broad sweep of the effort. It means:

- Author each discrete decor object already listed inline as a new shared
  motif in `data/motifs/` (one per object: the multi-part trees, the cactus,
  the titan structures, the yet fragments, the pool/spring, etc.).
- Collapse cross-decor duplicates (the recurring `tuft`/`boulder`/`rock`/
  `mound`/`bone`/`shard` table above) into one shared motif per object, then
  reference it from every decor that uses it.
- Apply the single-part granularity rule: 2+-part motifs get their own file;
  single-part small detritus objects cascade into the `debris` catch-all.
- Split the current `LOG_MOTIF` out of `debris.js` (a log is multi-part), so
  `debris` becomes the single-part-only catch-all it is meant to be.
- Split `trees.js` apart: give each tree species its own motif file
  (`roundTree.js`, `conifer.js`, `deadTree.js`, `palmTree.js`, and one for the
  gnarled tree) instead of grouping them into a shared `trees.js`.
- Rename the `painforest` motif to `gnarledTree`: new id `gnarledTree`, new
  file `data/motifs/gnarledTree.js`, constant `GNARLED_TREE_MOTIF`, and the
  `{ motif: 'painforest' }` refs in `forest.js` and `deepWood.js` become
  `{ motif: 'gnarledTree' }`. The name encodes the tree species, not the
  terrain it was first authored for.
- When the last inline `parts` is gone from a decor, that decor is now fully
  library-driven — the end state.

## Suggested phase split (2–3 update plans)

- **Plan A — authoring & consolidation**: items 1 and 3 (editor library
  authoring + folding whole-decor swaps). These both "make the library the
  source of truth" system changes and belong together.
- **Plan B — bias**: item 2 (per-biome alternatives bias) on top of the
  library refs from Plan A.
- **Plan C — breadth**: item 4 (migrate remaining decor to motifs), the large
  data-mass pass, safest to run last once the authoring and bias semantics are
  stable. This is where the library actually approaches the Goal above.

## Cross-references

- `dev/docs/decorComposition.md` — motifs, alternatives, weighted slots design.
- `dev/docs/descriptorAuthoring.md` — descriptor schema and motif authoring.
- `dev/docs/sourceTree.md` — `src/` file inventory.
- `src/render/hexmap3d/worldObjects/descriptors/data/motifs/` — the library.
- `dev/tests/render/descriptorMotifShared.test.js` — round-trip pin for refs.