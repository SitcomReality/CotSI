# Shared Motif Library — Deferred Follow-ups

Reminder tracker for the work owed toward the shared motif library (commit
`b340dda` put the mechanism in). The mechanism shipped, and items 1, 2, and 3
(editor authoring, per-biome alternatives bias, and folding the whole-decor
swaps) are now done. The remaining *migration* (item 4) is the large data-mass
pass — this is planning material for **future update plans**. The individual
items are small but touch distinct systems (descriptor data, the editor, and
terrain authoring), so they are grouped into phases at the bottom.

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
- `titanSpire.js`, `titanTooth.js`, `titanBoil.js`, `titanNodule.js`,
  `titanTendril.js` — the Titanstain land structures (item 3)
- `bloodPool.js` — Titanstain's water pool
- `yetFragmentPillar.js` … `yetFragmentOrb.js` — the Unfinished Lands fragments
- `springPool.js`, `ghostSpark.js` — the Forespring pools/sparks
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

All decor files are schemaVersion 7. Validation (`descriptorValidation.js`)
accepts refs and rejects unknown library ids. Tests:
`dev/tests/render/descriptorMotifShared.test.js`. AGENTS.md notes
that shared motif geometry lives in `data/motifs/`, not editor objects.

## ⚠️ schemaVersion 7 ≠ migrated

Do not read "converted to schemaVersion 7" as "this decor now uses the shared
library." schemaVersion 7 only *enables* motif refs; it is a format, not a
migration. Today:

- The supernatural biomes' decor is fully folded into the library (item 3):
  every base decorator references the supernatural motifs (gated by
  `biomeWeight`), and `water`/`ice`/`river` reference the pools/springs with a
  bare motif on natural biomes. Those refs resolve — but the land decorators
  still retain their native geometry inline.
- Every decor file is now schemaVersion 7, but `forest.js`/`deepWood.js`
  still define their multi-part trees inline (`round`, `conifer`, `dead`,
  `tall`, `taigawood`, `drywood`, `deadwood`, `violetwood`), and
  `desert.js`/`plains.js`/`beach.js`/`marsh.js`/`plateau.js` still inline
  cactus/shrub/tuft/boulder/etc. That's the item-4 breadth sweep.

So only *two* terrain trees (`painforest`, `log`) plus the supernatural
library objects are shared motifs today; every other native decor object is
still object-local geometry to be migrated (item 4).

(Also note one present deviation from the Goal: `debris.js` currently holds
`LOG_MOTIF`, which is multi-part. A log is a discrete 2+-part object, so per the
granularity rule it should live in its own motif file eventually, not in the
single-part `debris` catch-all — see item 4.)

## Current migration status (what is still inline)

Every motif `id` below is still defined inline in its decor file — a discrete
decor object that must become a shared motif (its own file when it has 2+
parts, otherwise folded into `debris`). `refs` column = shared motifs already
referenced by that decor.

| Decor file | schema | motifs today | inline objects still to convert |
| --- | --- | --- | --- |
| `forest.js` | 7 | native + `painforest`, `log` + titan/yet supernaturals | `round`, `conifer`, `dead` |
| `deepWood.js` | 7 | native + `painforest` + titan/yet supernaturals | `tall`, `taigawood`, `drywood`, `deadwood`, `violetwood` |
| `desert.js` | 7 | native + titan/yet supernaturals | — |
| `plains.js` | 7 | native + titan/yet supernaturals | — |
| `beach.js` | 7 | native + titan/yet supernaturals | — |
| `marsh.js` | 7 | native + titan/yet supernaturals | — |
| `hill.js` | 7 | `mound` + titan/yet supernaturals | — |
| `plateau.js` | 7 | native + titan/yet supernaturals | — |
| `water.js` | 7 | `bare` + `bloodPool`/`springPool`/`ghostSpark` | — |
| `ice.js` | 7 | `bare` + `bloodPool`/`springPool`/`ghostSpark` | — |
| `river.js` | 7 | `bare` + `bloodPool`/`springPool`/`ghostSpark` | — |

The former `titanflesh.js`/`titanblood.js`/`yetlands.js`/`forespring.js` whole
decor files are gone: the fold (item 3) moved their geometry into shared
motifs (`titanSpire`, `titanTooth`, `titanBoil`, `titanNodule`, `titanTendril`,
`bloodPool`, `yetFragmentPillar`…, `springPool`/`ghostSpark`) and their
per-biome presentation onto each base decorator's motif table, gated to the
biome via present-0 `biomeWeight`. The `+ titan/yet supernaturals` note marks
those folded refs.

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

### 1. First-class editor motif authoring — DONE

A library motif can now be opened/edited directly in the geometry editor (the
`S.motifEditing` flag + `motifDescriptor` synthetic-decor wrapper) and saved
back to `data/motifs/<id>.js` via its own `/save/motif` route (see
`dev/tools/geometryEditor/README.md`). The editor never rewrites referencing
decorators; only the active motif file is (re)authored.

### 2. Per-biome alternatives bias — DONE

The "this alternative preferred in that biome" bias for **alternatives** nodes
is implemented. Each option carries an optional `biomeWeight` sparse map
(absent key ≡ 1, present 0 ≡ excluded) — the exact mirror of the motif-slot
`biomeWeight` — applied at draw time in `resolveAlternatives`
(`src/render/.../motifDraw.js`): each option's effective weight is
`weight × biomeWeight[biomeId]` before the shared weighted draw. Populated by
`normalizePart` / stripped by `denormalizePart` (only empty maps strip; a
present-0 entry is a meaningful exclusion), validated against the registered
biome list (`descriptorValidation.js`/`validateParts.js`), and authored in the
editor via a per-option biome grid mirroring the motif grid
(`partInspector/alternatives/optionBiomeGrid.js`). Canonical (Show-all) and
per-node preview pins ignore the bias, same as motif `biomeWeight`. Mechanism
only — no existing decor data was re-authored to add biases (that's Plan C).

### 3. Folding `terrainOverrides.decor` whole-decor swaps into the library — DONE

The whole-decor biome swaps are folded in. The supernatural land and water
presentations now live as shared-library motif references on each base
decorator's motif table, gated to their biome via present-0 `biomeWeight`
entries (the only way a ref appears under exactly one biome). The four whole
decor files were deleted and the `decor:` keys (plus the `biomeDecorOverrides`
collection/thunk plumbing) removed end-to-end. Base `water`/`ice`/`river`
decors render bare on natural biomes via a genuine bare motif — deliberately
NOT an empty table, because `effectiveMotifTable`'s all-excluded fallback
would otherwise surface the pools there.

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

- **Plan A — authoring & consolidation**: items 1 and 3 — DONE (editor library
  authoring + folding whole-decor swaps).
- **Plan B — bias**: item 2 (per-biome alternatives bias) — DONE (option
  `biomeWeight` skews the choice point's draw per biome).
- **Plan C — breadth**: item 4 (migrate remaining decor to motifs) — NOT yet
  started; the large data-mass pass, safest once authoring/bias semantics are
  stable. This is where the library actually approaches the Goal above.

## Cross-references

- `dev/docs/decorComposition.md` — motifs, alternatives, weighted slots design.
- `dev/docs/descriptorAuthoring.md` — descriptor schema and motif authoring.
- `dev/docs/sourceTree.md` — `src/` file inventory.
- `src/render/hexmap3d/worldObjects/descriptors/data/motifs/` — the library.
- `dev/tests/render/descriptorMotifShared.test.js` — round-trip pin for refs.