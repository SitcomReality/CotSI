# Shared Motif Library — Deferred Follow-ups

Reminder tracker for the work still owed after the shared motif library landed
(`b340dda`). This is planning material for **2–3 future update plans** — the
individual items are small but touch distinct systems (descriptor data, the
editor, and terrain authoring), so they are grouped into phases at the bottom.

---

## What is in (shipped)

Shared, author-once motif geometry now lives in:
`src/render/hexmap3d/worldObjects/descriptors/data/motifs/`

- `trees.js` — `PAINFOREST_MOTIF`
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

Converted to schemaVersion 7: `decor/forest.js` (painforest + log now shared),
`decor/deepWood.js` (painforest now shared). Weights and biomeWeights preserved
exactly. Validation (`descriptorValidation.js`) accepts refs and rejects
unknown library ids. Tests: `dev/tests/render/descriptorMotifShared.test.js`
(8 tests). AGENTS.md notes that shared motif geometry lives in `data/motifs/`,
not editor objects.

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

### 4. Refactor existing terrain decor to use motifs exclusively

The two converted decors (`forest.js`, `deepWood.js`) are the start, not the
end. Remaining terrain decor should be refactored to reference shared motif
geometry exclusively — far fewer inline/duplicated geometry blocks, one
authoring site per object. This is the bulk-data half of the work and is why
the whole effort needs 2–3 plans rather than one.

## Suggested phase split (2–3 update plans)

- **Plan A — authoring & consolidation**: items 1 and 3 (editor library
  authoring + folding whole-decor swaps). These are both "make the library the
  source of truth" system changes and belong together.
- **Plan B — bias**: item 2 (per-biome alternatives bias) on top of the
  library refs from Plan A.
- **Plan C — breadth**: item 4 (migrate remaining terrain decor to motifs),
  the large data-mass pass, and the safest to run last once the authoring and
  bias semantics are stable.

## Cross-references

- `dev/docs/decorComposition.md` — motifs, alternatives, weighted slots design.
- `dev/docs/descriptorAuthoring.md` — descriptor schema and motif authoring.
- `dev/docs/sourceTree.md` — `src/` file inventory.
- `dev/tests/render/descriptorMotifShared.test.js` — round-trip pin for refs.