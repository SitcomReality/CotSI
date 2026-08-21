# Geometry Editor — Incremental Improvement Plan (Meta-Plan)

This is the **master plan** for improving the expanding `#inspector` /
`#fields-panel` (and adjacent UI) in the geometry editor. It exists so the work
is split into small, independently-planned, independently-committed phases.

Each phase below gets its **own** `plan` file, its own implementation, and its
own commit(s), in **order**. Recommended reading first:
`dev/geometryEditor_designreviews.md` (two external UX reviews that shaped this
structure).

---

## The core insight (why we phase this way)

The reviewers' central warning:

> Collapsing everything (Phase A) and adding more controls (Phases 4–5) will
> make the mess *worse* unless you add a **scan layer** and a **few repeating
> control patterns**.

In other words:

- «Collapse by default» alone increases hunt time. It must ship *together with*
  header summaries + non-default dots.
- The new controls only land on a calmer surface if the **pattern library**
  (tuple rows, mode-then-details, sparse override maps) exists first.
- Sections are for **tasks**, not schema keys — every new field goes *into* an
  existing group, not a new accordion.

So the phases are ordered to build the foundation before adding anything.

---

## Phase A — Scan layer (collapsed defaults + header summaries + dots)

Ship FIRST. Without this, collapse is a UX regression.

> UX rationale: design reviews §4 (scan layer), §3 (visual language for
> summaries and dirty-state marks), §10 (what not to do — search box).

**In scope**
- All `.inspector-sections` start collapsed (both `sectionShell.js` files:
  `ui/partInspector/sectionShell.js`, `ui/objectInspector/sectionShell.js`).
- **One-line header summaries** for each collapsed section (the closed
  accordion still "talks"):
  ```
  ▸ POSITION        Y 0 · lift 0 · local (0.12, 0, 0.02)
  ▸ COLOR & TINT    ■ wood · 50%
  ▸ BIOME SCALE     default
  ```
- **Non-default dots / emphasis**: a header (and row) shows an accent mark when
  any value ≠ schema default; fully-default sections read `· default` in muted
  text.
- Persist `openSections` across re-renders as today.
- Demote hidden/empty sections: BOUNDS' "no rendered geometry" should not
  render as a section; Portrait Camera collapses by default (right panel).
- Number format: 2–3 significant figures; no `1.4444444`.

**Acceptance** — in a fresh screenshot, a part with one customized value shows
it without opening any section; a fully-default part shows mostly
`· default`.

**Defer** — nothing else yet.

---

## Phase 1 — Sparse override grids

Stop rendering the fixed 11-row tables of `1`s / 11×N matrices. The data model
already supports it ("absent ≡ 1").

> UX rationale: design reviews §6 (control pattern C — sparse override maps),
> §9 (alternatives biome matrix noise), §3 (visual language for quiet defaults).

**In scope**
- **Biome scale** (`partInspector/leafSections/biomeScale.js`): only non-default
  entries + a `+ override` picker (choose a biome not yet listed). Summary when
  closed: `Tundra 0.6 · Painforest 0.8` or `default`.
- **Alternatives per-biome matrix** (`partInspector/alternatives/
  optionBiomeGrid.js`): collapse behind a one-line `Per-biome weights ·
  default` + `Customize by biome` button; show only overridden cells/rows.
- **Motif per-biome grid** (`objectInspector/motifSection/biomeGrid.js`): same
  overrides-only treatment as feasible.

**Acceptance** — a default decor shows a single `default` line, not a wall of
`1`s.

**Defer** — don't copy the full-matrix pattern to new controls later.

---

## Phase 2 — Hint treatment + Color & tint merge

> UX rationale: design reviews §5 (hints — delete list, tooltip migration,
> copy rule), §3 (Color & tint merge layout), §2 (design rule 3 — hints are
> not body copy).

**2a · Hints**
- Delete the truly superfluous ones exactly as the design reviews list.
- Move kept inline paragraphs → `title`/tooltip (label `?`), **not** a
  `div.hint` in the layout (unless a section is in an empty/error state).
- Kill the dead `#biome-tint-hint` span.
- Copy rule: if a hint restates the label, delete; if it states a non-obvious
  unit/gotcha, keep as tooltip.

**2b · Merge** — Color + Biome-tint into one **"Color & tint"** section
`section('color', …)`:
- one lit swatch + (entity: faction token select + custom swatch);
- tint source select + influence slider (muted when source `none`/skipped);
- empty-keyframe: replace with the short lerp-note only, don't also show the
  material one-liner.
- Drop the now-orphaned `'biome'` section key from the registry.

**Acceptance** — merged section reads as one compact stack; no inline hint
paragraphs in the merged view except the one short lerp note on the empty branch.

---

## Phase 3 — Grouping + control patterns + naming

> UX rationale: design reviews §1 (grouping + color-coding), §6 (control
> patterns A–D), §2 (design rules 4–5 — one row one tuple, name by job not
> schema key), §7 (information architecture).

Before Phase 4 adds fields, build the **pattern library** and the section
grouping so new fields slot into a calm surface.

**Grouping (super-groups / accent)**
- Wrap the flat section list in 3–4 labeled super-groups (Transform / Look /
  Spawn / Variation), 2px left accent bar, desaturated accent hue on group
  label + section triangles + focus rings only (never on field labels).
- Object fields grouped: **Spawn** (Instance scale, Spawn size, Placement,
  Cluster) · **Look** (Material/emissive, color jitter) · **Variation/library**
  (Variants, Motifs, Emphasis) · **Specialized** (mountain buckets,
  optionalGroups at bottom).

**Control patterns** (must be reused by Phases 4–5)
- **Tuple row** — XYZ / min–max on ONE line (two joined inputs, one label), e.g.
  `localPos [0.12][0.00][0.02]`, `size [min]–[max]`.
- **Mode-then-details** — Fixed | Range / fixed | follow | custom; details
  revealed only when selected.
- **Sparse override map** — overrides-only + picker (from Phase 1).
- **Optional field with clear** — blank/default looks blank, clears the key.
- **Naming (crucial)** — disambiguate the "scale" family:
  `Instance scale` (`descriptor.scale`), `Spawn size` (`size.min/max`),
  `Part scale` (`scaleX/Y/Z`), `Biome size` (biomeScale map), `Stretch range`
  (`variation.stretch*`).

**Acceptance** — after this phase, Phase A's scans still hold, and the pattern
library is wired so Phases 4–5 fields don't each become a new section.

---

## Phase 4 — Object-level missing controls

> UX rationale: design reviews §8 (phase-by-phase UX notes for Phase 4),
> §6 (control patterns A–D for new fields), §2 (design rule 6 — advanced
> stays at bottom).

Add the fields the audit found, **into** the Phase 3 groups & patterns:

| Field | Where it lives | How |
|---|---|---|
| `descriptor.material.emissive` + intensity | **Material** (Look group) | color row + slider; intensity revealed when set; hide on items |
| `descriptor.scale` | First row of **Spawn size** | label **Instance scale**, min 0.01 |
| `descriptor.variation.stretchX/Y/Z` | existing **Variation** section | three mode-less min–max tuples; summary `X 0.9–1.1 · …` |
| `size.byMountainType` | inside **Size**, only mountain-capable kinds | sparse overrides (peak/slope/normal) or 3 compact rows |
| `cluster.densityRange` + `cluster.jitter` | **Cluster** moisture branch only | one min–max row + jitter; never on `uniform` |
| `repeatPenalty` | **Motif** section header row, not a section | `Repeat penalty [ ]` + tooltip "without-replacement 0–1" |
| per-motif `size` override | on the motif row, collapsed | name + weight + `size` chip → expand to min/max; clearing both deletes key |

**Acceptance** — new fields add ≤2 top-level sections total; each is discoverable
in <5 s without reading every header.

**Defer** — per-motif `placement` override.

---

## Phase 5 — liftRange + optionalGroups

> UX rationale: design reviews §8 (phase-by-phase UX notes for Phase 5),
> §6 (control pattern B — mode-then-details for liftRange), §7
> (optionalGroups as scaffolding).

- **liftRange** (`partInspector/transform/position.js`): pattern B — reuse the
  existing Lift row with a `Fixed | Range` mode. Fixed keeps `lift`; Range writes
  `liftRange {min,max,seed}` and clears/ignores fixed `lift` (one source of
  truth, reflected in UI). Root-leaf + base pose only.
- **optionalGroups** (`objectInspector/`): a section titled **Optional groups**,
  last in the object panel, collapsed, no auto-open. `{[id, chance]}` list with
  reorder/add/remove; chance as 0–1 slider/provided. `parts`: one muted line
  "N parts — inline editing later". Empty-state sentence: *"Groups that randomly
  omit a set of parts."*

**Defer** — inline `optionalGroups.parts` editing (needs a nested part-tree).

---

## Phase 6 (optional) — Right-panel tree & chrome

> UX rationale: design reviews §7 (information architecture),
> §9 (specific pain in screenshots — tree row actions, type icons,
> portrait camera, z-index), §1 (grouping).

Separate from the fields-panel work; keep optional until the above lands.
- Hover-reveal tree row actions (dup/down/del) + context menu for restructure/
  move/copy-transform.
- Type icons (cylinder/sphere/group/alternatives) instead of `· cylinder` in
  each label; group child count.
- Portrait camera collapsed + demoted; selection-actions bar attached to the
  selection, not a second titled card.
- Fix the overlapping Objects flyout over the inspector (z-index/clip).

---

## Noble line / non-goals (from review — don't ship)

- Don't add a search box until summaries + sparse maps exist.
- Don't tab-ify; keep accordions-with-summaries.
- Don't make every schema field a section.
- Don't start optionalGroups or mountain buckets open.
- Don't show floats at 12 dp.
- Don't add placement-per-motif or inline `optionalGroups.parts` in this pass.
- Don't add sliders for every number — sliders are for bounded/visual (Influence,
  Scrub, chance), not for `segments: 5`.

---

## Commit/discipline rules

- One commit per completed phase (or a few small commits within a phase).
- After each phase, the "5-second acceptance test": can you locate *emissive*
  or *repeat penalty* in a screenshot in under 5s without reading every header?
- Run `python3 dev/scripts/check_geometry_editor_imports.py` and
  `dev/tests/run.sh` after each phase with geometry-editor changes.

## Current status

- [x] Explore + audit (missing-controls findings in Phase 4 list incl.
      `renderFieldSections` gaps).
- [x] Phase A — Scan layer
- [x] Phase 1 — Sparse override grids
- [x] Phase 2 — Hints + Color & tint merge
- [x] Phase 3 — Grouping + patterns + naming
- [ ] Phase 4 — Object-level missing controls
- [ ] Phase 5 — liftRange + optionalGroups
- [ ] Phase 6 — optional right-panel chrome