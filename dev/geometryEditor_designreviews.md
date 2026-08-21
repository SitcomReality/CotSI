Your plan is aimed at the right problems — collapse-by-default, hint trimming, and the Color/Tint merge are all genuine wins. But there's a tension you should name upfront: **Phases 1–3 remove clutter, Phases 4–6 add roughly ten new controls back.** If you ship the plan as-is, you'll end up with a longer, flatter section list than you started with, just with shorter hints. The fixes below are what make the additions land on a calmer surface instead of re-cluttering it.

## Why it currently feels like a clustermess

Looking at the screenshots, four things are doing the damage:

1. **Uniform visual weight.** Every section header, label, and row uses the same size, color, and rhythm. Nothing anchors the eye, so "finding" a control means *reading* every header. That's the cognitive cost you're describing.
2. **Default-value noise.** The biome grids (Biome Scale's 12 rows of `1`, the alternatives 12×3 weight matrix) are ~90% information-free. Authored overrides are buried in a wall of identical inputs.
3. **Always-on micro-affordances.** 4 icon buttons × 27 tree rows = ~108 identical glyphs competing with the part names.
4. **Flat information architecture.** 9–13 sibling sections with no higher-level grouping, and object parameters split across two panels (portrait camera right, cluster/size left).

## The four structural moves

**1. Group sections and color-code the groups (not the fields).**
Wrap the flat section list in 3–4 labeled super-groups, each with a small icon, a 2px left accent bar, and a desaturated accent hue applied *only* to the group label, the section triangles, and focus rings. Field labels stay neutral. Suggested groups:

- Part: **Transform** (position, rotation, scale, bounds) · **Appearance** (color & tint, biome scale) · **Variation** (stretch)
- Object: **Spawning** (cluster, placement, emphasis, size, scale, optionalGroups) · **Looks** (material/emissive, variation) · **Authoring** (motifs, variants, biome pins)

Four or five hues max, similar saturation/lightness (e.g. cyan `#6fb3ff`, violet `#c792ea`, green `#7fd1a8`, amber `#e0b066`). This gives sections a recognizable silhouette so you stop reading headers.

**2. Collapsed sections must not be blind — add summaries + a non-default dot.**
Phase 1 makes everything collapsed, but then you can't tell which sections contain authored data without opening each one. Render a muted one-line summary after each collapsed title, plus an accent dot when any value ≠ default:

```
▸ TRANSFORM
  ▸ POSITION         Y 0 · lift 0 · local (0.12, 0, 0.02)
  ▸ ROTATION       ● axis −Z · 63° · lean 0
▸ APPEARANCE
  ▸ COLOR & TINT   ● wood · 0.5 · #A08C5A
```

This single change is what makes Phase 1 a win instead of a trade. The dot pattern also scales to your new controls: emissive set, repeatPenalty ≠ 0, liftRange active — all visible at a glance while collapsed.

**3. Overrides-only biome grids.**
The biggest declutter available, and your data model already supports it (the hint literally says "absent = 1 everywhere"). Replace the fixed 12-row lists with only the non-default entries plus an add-picker:

```
BIOME SCALE                          2 overrides
  Sere Wastes      [0.60]  ✕
  The Tundra       [0.80]  ✕
  + add biome override…
```

For the alternatives weight matrix, list only overridden cells as rows/chips ("Sere Wastes → fork ×2, gnarl excluded"), with a "show full matrix" toggle for the rare case you want it. This turns 36 inputs into 0–4 rows and makes the *actual* authored bias pop out. Apply the same logic to Biome Scale and, if feasible, per-biome motif shares.

**4. Hover-reveal tree row actions + a context menu.**
Hide the duplicate/up/down/delete buttons until row hover or keyboard focus (keep them visible on the selected row). Move RESTRUCTURE / MOVE INTO / TRANSFORM into a right-click context menu on rows. That removes both the glyph grid *and* the duplicated action panel at the bottom of the right column.

## Folding Phases 4–6 in without adding clutter

- **4b Base scale:** don't create a new "Scale" section — add the row inside **SIZE** ("Size & scale"). One fewer top-level section.
- **4a Material/emissive:** fine as its own section, in the Looks group. Color input + intensity on one row.
- **4c/4d/4e ranges:** use a single compound `min – max` control per row (two joined inputs, one label), exactly like your existing stretch-y row. Don't give min and max separate labeled rows.
- **4f repeatPenalty + 4g per-motif size:** keep the motif list scannable — don't widen rows. Put repeatPenalty under a small "Motif tuning" subheader, and give each motif row a small ⚙ affordance that expands an inline sub-row for the size override.
- **5 liftRange:** model it as a mode toggle on the existing Lift row — `Lift: [fixed | range]` — revealing min/max/seed when "range" is chosen. This mirrors your stretch `fixed/custom` pattern, so it's consistent and costs zero extra vertical space in the common case.
- **6 optionalGroups:** render the section only when non-empty, plus a ghost "+ add optional group" row so it stays discoverable. Count badge on the header.

## Smaller wins worth doing in the same pass

- **Sticky selection header.** Make `deadTree-root-a · cylinder` `position: sticky` at the top of the left panel so deep scrolling never loses context.
- **Hide empty sections.** BOUNDS' "no rendered geometry" should not render at all; show bounds rows only when geometry exists.
- **Hint popovers.** For the hints you're keeping, the 3-line ones (portrait camera, biome scale) become an `?` icon with a tooltip/popover. Explanation available, zero permanent cost.
- **Unify object editing.** Move PORTRAIT CAMERA into the left panel's object fields. Then the mental model is clean: *right panel = what exists (identity + tree + motifs), left panel = how it's configured.*
- **Power scrubbing.** If not already present: drag-on-label to scrub numerics (Shift for fine), double-click label to reset to default. Transform-heavy tools live or die by this.

## A paste-able visual cheat-sheet

Since visual design is the part you want help with, here are concrete tokens that will produce the hierarchy above on your dark purple theme:

- Type: base 12px/1.4 · field labels 12px `#b8b3c7` · inputs 12px tabular-nums · section headers 11px/600 uppercase, letter-spacing .06em, colored with group accent · panel titles 12px uppercase .08em `#e8e4f0` · hints 11px `#8a8499`
- Spacing (8pt grid): row height 28px · row gap 2px · section padding 10/12 · section gap 8px · group gap 16px
- Inputs: bg `#241f33`, border `#3a3350`, radius 4, height 24; focus border = group accent
- Accents used *only* for group labels, section markers, focus rings, and non-default dots — never on field labels or values, or it becomes a rainbow mess
- Tree selection: keep the amber outline, add a ~6% amber background tint so selection reads in peripheral vision

## Build order

Do Phase 1 **together with** summaries + dots (move 2) — shipping collapse alone makes things worse. Then overrides-only grids (move 3), then hover actions (move 4), then accent grouping (move 1). After that, Phases 4–6 slot into a surface that can absorb them. As a acceptance test: after each phase, run a 5-second test — can you locate "emissive" or "repeat penalty" in a screenshot in under five seconds without reading every header? If not, the hierarchy isn't doing its job yet.

The engineering side of your plan (schema round-trips, per-phase commits) is sound; these changes are almost all render-layer and CSS, so they compose cleanly with your phased approach.



**The mess is not “too many fields.”** It is that every field, hint, default, and rare override is drawn with the same visual weight, so the eye cannot skip. Collapsing everything (Phase 1) and adding more controls (Phases 4–6) will make that *worse* unless you add a **scan layer** and a **few repeating control patterns**. The implementation plan is sound as a schema/wiring plan; it is not yet a UX plan.

Below is a system you can apply on top of those phases, plus concrete layout for the new controls.

---

## 1. What the screenshots are actually doing to you

From the three shots, the cognitive load comes from six repeating failures—not from “ugly colors.”

**1. No exception highlighting.**  
Biome scale is eleven rows of `1`. The alternatives matrix is 11×3 cells of `1`. Stretch is mostly `fixed`. Those grids are *empty of information* but occupy half the panel. The brain has to inspect every cell to learn “nothing special here.”

**2. Hints compete with controls.**  
Position, rotation, color, biome tint, biome scale, variation, portrait camera, alternatives, ID rules—all use multi-line paragraphs *in the same column as the inputs*. Labels, values, and documentation are one texture.

**3. Section headers do not summarize.**  
`▾ POSITION` tells you a category, not the state. To know if this cylinder is lifted, rotated, or default, you must open and read five numbers. After Phase 1 (all closed) that gets *worse*: a wall of identical `▸ SHAPE / ▸ POSITION / ▸ ROTATION / …` with no glance value.

**4. The same concept has five names.**  
Part `scaleX/Y/Z`, object `descriptor.scale`, `size.min/max`, `size.byMountainType`, `biomeScale`, `variation.stretch*`. Adding 4b/4c/4d without renaming will feel like duplicate sections.

**5. Two inspectors, three titles, one selection.**  
Selecting `deadTree-root-a` shows the name in the left header, the yellow row in the tree, *and* a second “deadTree-root-a · cylinder” card with Restructure. Portrait camera is a large permanent block for a rare task. The right panel is identity + camera + tree + verbs mixed at one hierarchy level.

**6. Compound data is exploded into stacked rows.**  
`localPos X/Y/Z`, `scaleX/Y/Z`, min/max pairs, stretch mode+range all live as separate inspector rows. That is why a single part already feels like a form from 2009 tax software.

None of this needs a visual redesign of the 3D view. It needs **hierarchy, sparsity, and a small pattern library**.

---

## 2. Design rules (use these as a checklist)

1. **Scan by exception.** Defaults are quiet or omitted. Authored values are loud. Empty biome tables do not render as tables.
2. **Collapsed ≠ empty.** Every closed section shows a one-line summary of *current* values (or `default`).
3. **Hints are not body copy.** If a control’s label is clear, no hint. If it isn’t, a `?` tooltip or a single muted line. Never a paragraph between rows.
4. **One row, one tuple.** XYZ, min–max, color+influence live on one line.
5. **Name by job, not by schema key.** The user is choosing “how big instances spawn,” not “whether this is `scale` or `size`.”
6. **Advanced / dormant stays at the bottom** and never opens itself (optionalGroups, emissive on a crate, mountain buckets on a chest).

If a change violates (1) or (2), don’t ship it.

---

## 3. Visual language (cheap, high leverage)

You already have a dark purple inspector. Don’t invent a new palette. Change **type, weight, and quietness**:

| Role | Treatment |
|---|---|
| Panel title (`FIELDS`, `OBJECT`) | Small, tracked uppercase, dim — chrome, not content |
| Selected-node title | One line, brightest text in the panel. That’s the “where am I.” |
| Section header | Medium weight, slightly brighter than labels; chevron + **summary on the right** |
| Labels | Dimmer than values; never wrap to two lines (shorten names instead) |
| Values | Brightest element in the row. Default values *dimmer* than authored |
| Authored / non-default | Tiny accent mark on the header and on the row (dot, or left hairline) |
| Hints | 11–12px, 60% opacity, *or* tooltip only |
| Destructive / structure verbs | Separate strip, not mixed into value rows |

**Spacing:** more gap *between* sections than *inside* them. Right now section rules, hints, and rows all share similar padding, so groups don’t clump.

**Dirty state is the missing visual distinction.**  
If `biomeScale.Tundra !== 1`, that row (and the section header) get a small accent. If everything is default, the collapsed header reads `Biome scale  ·  default` in muted text and the section looks skippable. That single idea will do more than any new layout.

**Do not color-code every section** (rainbow headers become new noise). At most three families:

- **Transform** — position / rotation / scale / lift
- **Look** — color & tint / emissive / color jitter
- **Spawn / variation** — size, cluster, stretch, motifs, optional groups

A 3px left hairline on the section, family color, is enough.

---

## 4. The scan layer (do this with Phase 1, not after)

Phase 1 as written (`open: false` everywhere) reduces first-open overwhelm and *increases* hunt time. Pair it with **header summaries**. Persist `openSections` as you already do.

Pattern:

```
▸ Shape              cylinder  ·  r 0.055→0.012  h 0.14
▸ Position           Y 0  lift 0  local 0.12, 0, 0.02
▸ Rotation           −Z  63°   lean 0
▸ Scale              1, 1, 1
▸ Color & tint       ■  wood  50%
▸ Biome scale        default
▸ Stretch            Y 0.85–1.2    X,Z fixed
```

Rules for summaries:

- Same order every time, abbreviated, no sentences.
- `default` when the whole section is schema-default (not “all ones” written out).
- If any field is authored, show only the authored bits (`Tundra 0.6`, not eleven biomes).
- Number format: 2–3 significant figures, no `1.444444444`.
- Clicking the header toggles; clicking a summary value can later jump-focus that control (optional).

This is how Blender, Unity, and Godot stay dense but parseable: the closed accordion still *talks*.

**Smarter default-open (optional, after summaries exist):**  
On part select, open the last section that user edited *for this kind of node* (shape for primitives, color for leaves, etc.). Do not auto-open everything related to the node.

---

## 5. Hints: Phase 2 should go further

Your kill-list is correct. Keep going:

**Delete from the panel (move to tooltip on the label):**

- Position’s Y / Lift / localPos paragraph  
- Rotation’s localAxis/localAngle paragraph  
- Tilt paragraph  
- Biome-scale paragraph  
- Stretch paragraph  
- Portrait-camera paragraph  
- “New objects need a real id…”  
- Alternatives choice-point paragraph  
- Color jitter paragraph  

**Keep as one muted line, and only when the empty/special state is visible:**

- Empty-keyframe lerp note (only on that branch)
- Color & tint one-liner you already proposed (only if it still fits on one line; otherwise tooltip)
- “one look → duplicate variant” (only when there is exactly one variant)

**Copy rule:** if the hint restates the label (`Influence` + “how much tint”), delete it. If it states a non-obvious unit or a gotcha (`Untouched & Painforest skip swatch tints`), keep it as tooltip.

Implementation: `title` on the label, or a `?` that opens a popover. Do not inject a `div.hint` into the layout unless the section is in an empty/error state.

The dead `#biome-tint-hint` removal is good; don’t replace it with another always-visible paragraph in the merged section.

---

## 6. Control patterns (reuse these for every new field)

If every new control is “a label and a numberInput,” Phase 4 will recreate the clustermess. Standardize four row types.

### A. Tuple row (XYZ / min–max)

```
Local pos     [ 0.12 ]  [ 0.00 ]  [ 0.02 ]
              x          y          z
```

Same for scale, size, densityRange, stretch ranges, mountain buckets. One row, three (or two) fields, micro-labels under or as suffixes. The current stacked `localPos X / Y / Z` is why Position feels long.

### B. Mode then details (progressive disclosure)

```
Lift          ( Fixed  |  Range )
              [  0   ]                 ← fixed
              [ 0.0 ]–[ 0.4 ]  seed [ 7 ]   ← range
```

Use this for:

- Lift vs `liftRange` (Phase 5) — **do not show both at once**
- Stretch per axis: `fixed | follow | custom` already exists; when `fixed`/`follow`, hide min/max
- Emissive: color first; intensity only if color is non-black / enabled
- Per-motif size override: checkbox or `override` chip; min/max only when on

This is the single best way to add Phase 5 without doubling Position.

### C. Sparse override maps (biomes, mountain types, per-motif)

Never render a full matrix of defaults.

**Biome scale / biome weights:**

```
Biome scale                          [ + override ]
  Tundra          0.6          ×
  Painforest      0.8          ×
```

- Absent = 1 = not listed.
- “+ override” picks a biome from a dropdown (only biomes not already listed).
- Summary when collapsed: `Tundra 0.6 · Painforest 0.8` or `default`.

**Alternatives biome grid (screenshot 1):** same idea. If every cell is 1, show one line: `Per-biome weights  ·  default` and a button `Customize by biome`. The 11×N spreadsheet is the worst “no visual distinction” moment in the UI. You said no work there in this pass; still, don’t copy that pattern for mountain buckets or motif weights.

**`size.byMountainType`:** three rows *only if* you must always expose them; better as sparse overrides (`peak`, `slope`, `normal`) with the same `+ override` picker. Most objects are not mountain decor—don’t show three extra min/max pairs on a chest.

### D. Optional field with clear

```
Repeat penalty    [ 0.35 ]     ×     0–1, blank = default
```

Clear deletes the key (you already want this for motif size and liftRange). Blank/default should *look* blank, not like a precise `1.000`.

**Numeric chrome:** the `−  value  +` stepper is fine. Keep it. Don’t add sliders next to every number (sliders are for bounded, visual quantities like Influence, Scrub, maybe chance). Influence as a slider *plus* a compact number is good; `segments: 5` does not need a slider.

---

## 7. Information architecture of the two columns

Keep the split; make the jobs exclusive.

| Left `FIELDS` | Right `OBJECT · PARTS · MOTIFS` |
|---|---|
| Properties of **current selection** (object, part, or alternatives node) | Identity, hierarchy, structure verbs |
| Changes values in the descriptor | Changes graph shape (add, group, reorder, retarget) |

**Right panel order (top → bottom):**

1. Identity strip: thumbnail, name, id, kind badge (`DECOR` / `ITEM` / …). ID hint as tooltip on the id field.
2. **Parts tree** (this is the primary object on the right—give it the space Portrait Camera is stealing).
3. **Selection actions** (Restructure / Move into / Copy transform) as a *compact bar attached to the tree selection*, not a second titled card that repeats the node name. One selected row + a small verb dock is enough.
4. Portrait camera — **collapsed by default**, summary `pitch 51  yaw 30  pad 1.25  raise 0.12`. It is a publishing tool, not an authoring tool.

**Left panel order for a part** (after merge):

1. ID (always visible, not a section)
2. Shape  
3. Transform — *one section* with internal subheads Position / Rotation / Scale, **or** three sections but consecutive and in that order  
4. Color & tint  
5. Biome scale (sparse)  
6. Stretch  
7. Bounds (only if the node has no geometry—keep the empty-state line)

**Left panel order for an object** (this is how you absorb Phase 4 without a junk drawer):

1. Identity is on the right; don’t duplicate Name/ID on the left if the object is selected as a whole. Use left for *behavior*.
2. **Spawn** — Scale (4b), Size min/max, Placement, Cluster (+ densityRange/jitter when moisture)
3. **Look** — Material/Emissive (4a), Variation color jitter
4. **Variation / library** — Variant, Motifs (+ repeatPenalty, per-motif size), Emphasis
5. **Specialized** — Mountain size buckets (only if kind/rule needs it), Optional groups (bottom, collapsed)

Kind-filter aggressively: items don’t see emissive if you said so; chests don’t see `byMountainType`; optionalGroups only on tile-driven. Empty sections should not render at all (not even collapsed). That’s stronger than “start collapsed.”

---

## 8. Phase-by-phase UX notes (on *your* plan)

### Phase 1 — collapsed defaults
Do it, **plus header summaries**. Without summaries this phase is a net UX loss.  
Also collapse Portrait Camera by default (right panel), independent of the section registry.

### Phase 2 — hints
Do the deletions. Then migrate survivors to tooltips. The merged Color & tint one-liner is the only inline hint I’d still allow, and only if it stays one line.

### Phase 3 — Color & tint
Good merge. Layout:

```
Color & tint                              ■ wood 50%     ← collapsed summary

  Color          [■■■]     (or faction token + swatch for entities)
  Tint source    [ wood ▼ ]
  Influence      ════●═══  0.50
```

- If source is `none` / skipped biomes, mute Influence.
- Empty-keyframe: replace the color row with the short lerp note; don’t also show the material one-liner.

Drop the `'biome'` section key from the registry so you don’t keep a ghost section.

### Phase 4 — missing object controls
Ship the fields, but **not each as its own top-level section**. Section count is already the problem.

| Field | Where it lives | How it looks |
|---|---|---|
| 4a emissive + intensity | Object section **Material** (Look group). Hide on items. Intensity revealed when emissive is set | Color row + slider 0–n |
| 4b `descriptor.scale` | First row of **Spawn size**, not a new “Scale” section | Label **Instance scale** (see naming below), `min 0.01` |
| 4c stretchX/Y/Z object ranges | Existing Variation section | Three mode-less min–max tuples (object-level is always a range). Header summary `X 0.9–1.1 · Y 1–1.2` |
| 4d `size.byMountainType` | Inside **Size**, not a sibling section. Render only for mountain-capable kinds | Sparse overrides, or 3 compact min–max rows under a subhead “By mountain” |
| 4e densityRange + jitter | Moisture branch of Cluster only (you already said this) | One min–max row + jitter. Do not show on `uniform` |
| 4f repeatPenalty | Motif section header row, not a new section | `Repeat penalty [  ]` next to the motif list title, tooltip “without-replacement bias, 0–1” |
| 4g per-motif size | On the motif row, collapsed | Motif name + weight + a small `size` chip; expand to min/max. Clear both → delete key. Don’t add placement yet |

**4b naming (important):**  
Call object `descriptor.scale` **Instance scale**.  
Call `size.min/max` **Spawn size**.  
Call part `scaleX/Y/Z` **Part scale**.  
Call biome map **Biome size**.  
Call stretch **Stretch range**.  

If you label 4b “Scale” you now have two Scale sections (object vs part) and a Size section that is also scale.

### Phase 5 — liftRange
Do not place a second group “beside Lift” as three always-visible fields. Use pattern B: Fixed | Range. Range writes `liftRange` and should clear fixed Lift (or ignore it—pick one source of truth and reflect it in the UI so two values can’t fight). Seed as a compact int; most authors will leave it. Root-leaf only, base pose only—as you specified.

### Phase 6 — optionalGroups
Treat as **scaffolding**, visually:

- Section title **Optional groups**, last in the object panel, collapsed, no auto-open.
- List of `{id, chance}` with reorder, add, remove.
- `parts`: one muted line per group, `N parts` + “inline editing later”—do **not** fake a part tree or a freeform JSON textarea that can corrupt the descriptor.
- Chance as slider 0–1 or percentage; percentage is easier to talk about (`40%`) but schema is 0–1—either is fine if the stored value is correct.

If there is no data, show an empty state with one sentence: *“Groups that randomly omit a set of parts.”* That’s a legitimate empty-state hint.

---

## 9. Specific pain in the screenshots (fix while you’re in there)

**Alternatives left panel (shot 1).**  
The biome matrix of all `1`s is pure noise. Even without “work there,” collapsing it behind `Customize by biome` would make that view usable. Weights on the three options (`0.4 / 0.35 / 0.25`) are the actual content—those rows are fine. The ID/Default/Seed block can lose two of its three paragraphs.

**Part fields (shot 2).**  
- Bounds section that only says “no rendered geometry” should not be a section; one muted line under Shape, or hide.  
- Rotation quick-angle chips (`+90° −90° +45° −45°`) are good; they are one of the few visually distinct controls. Keep.  
- Stretch Y wrapping to an extra row of min/max/lock is because the mode dropdown and the tuple aren’t on a defined grid. Put `mode` in a narrow column, range in the remaining width, always the same x-position across X/Y/Z so the three axes compare vertically.

**Chest object (shot 3).**  
This is close to correct density. Don’t “fill it up” to match the tree. Variant / Cluster / Size / Placement / Emphasis / Variation is a good object-level set—**insert the new fields into these, don’t append four new accordions.** The overlapping Objects flyout covering the inspector is a z-index/clip bug; the picker should be a proper popover that doesn’t fight the panel.

**Parts tree.**  
27 near-identical `deadTree-* · cylinder` rows: the only scan cues are indent, teal italics for groups, and yellow selection. Add:

- A very small type icon (cylinder/sphere/group/alternatives) instead of repeating `· cylinder` in every label (put the type in a dim second column or icon).
- Count on groups: `deadTree-fork-a · group  (2)`.
- Optional: mute parts whose values are all default; you’re often hunting the one that was customized.

**Preview chrome.**  
Biome / Motif / State / Occupied / Show all / Strip / Floor / Outline / Scrub is a second inspector. It’s allowed to be dense (viewport tools always are). Don’t copy its checkbox-chip style into FIELDS; those are *modes*, not *data*.

---

## 10. What not to do

- Don’t add a search box to the inspector until summaries + sparse maps exist. Search is a bandage for unscanable lists.
- Don’t tab-ify Color vs Transform vs etc. Tabs hide sibling state; accordions *with summaries* are right for this density.
- Don’t make every new schema field a section. Sections are for *tasks*, not keys.
- Don’t start optionalGroups or mountain buckets open.
- Don’t show 0–1 floats at 12 decimal places (the `1.444444444444444` in the debug HUD should not become a model for inputs).
- Don’t add placement-per-motif or inline `optionalGroups.parts` in this pass. Your deferrals are correct.

---

## 11. Suggested commit-sized UX extras (on top of your commits)

Worth baking into the same phases so you don’t restyle twice:

1. **Phase 1+:** section header summaries + dirty mark.  
2. **Phase 2+:** hints → tooltips; kill remaining inline paragraphs.  
3. **Phase 3:** Color & tint as one compact stack (swatch, source, influence).  
4. **Before/during Phase 4:** object-level **grouping** (Spawn / Look / Variation / Specialized) and the **Instance scale / Spawn size / Part scale** names. Sparse biome-scale list (stop rendering eleven `1`s) — this is the highest-impact change in the whole editor and it’s not even in the plan.  
5. **Phase 5:** Fixed | Range toggle, not extra rows.  
6. **Anytime:** Portrait camera collapsed; Restructure card merged into the tree selection; Bounds empty-state demoted.

If you only do three things, do these: **(a)** header summaries, **(b)** hide default biome/override grids, **(c)** put new object fields into existing groups with tuple rows.

---

The plan’s schema work can stay as written. The UX work is a thin layer: **quiet defaults, loud exceptions, one-line closed sections, tuples instead of stacked rows, tooltips instead of essays.** That’s what will make the extra parameters you need feel like they belong instead of like more clutter.