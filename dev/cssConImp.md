# CSS Migration Plan — Incremental Step-by-Step

*Derived from `dev/cssconventions.md` — read that for full rationale.*

---

## Overall Intent

Reorganise `styles/` to match the JS codebase's conventions:

- **One file per responsibility** — no dumping ground files.
- **Cascade-order mirroring rate of change** — tokens first, then layout, then components, then UI overrides. Import order *is* cascade priority.
- **Qualified, camelCase file names** — `combatModal.css` not `combat.css`; `setupScreen.css` not `pages/setup.css`.
- **Subdirectories for complex components** (like `left-champion-card/`) — kept, with camelCase subfiles.
- **Barrel files** (zero-selector `@import` aggregators) for multi-part concerns: `button.css`, `card.css`, `championPanel.css`.
- **No banned names** (`utils`, `helpers`, `misc`, `common`, `overrides`, `utilities` — `ui/utilities.css` must die).

The migration is **file-name and organisational only** — CSS class names are *not* changed (except where a renamed file demands auditing of legacy selectors, e.g., `dispatchModal.css` → `.dispatch-modal` prefix). Risk is minimised by phasing and manual verification.

---

## Target Directory Structure (After Migration)

```
styles/
├── codex.css
├── abstracts/
│   ├── reset.css
│   ├── variables.css
│   ├── tokenSheet.css          ← moved from pages/token-sheet.css
│   └── tokens/                 ← unchanged
├── layout/
│   ├── gameGrid.css            ← renamed from game-grid.css
│   └── panelLayout.css         ← **new**: shared panel sizing/overflow
├── components/
│   ├── button.css              ← barrel (renamed from buttons.css)
│   ├── buttonCore.css          ← renamed from buttons-core.css
│   ├── buttonLegacy.css        ← renamed from buttons-legacy.css
│   ├── card.css                ← barrel (unchanged)
│   ├── cardVariants.css        ← renamed from card-variants.css
│   ├── modalShell.css          ← **new**: .modal chrome from pages/combat.css
│   ├── combatModal.css         ← **new**: merged pages/combat.css + components/combat.css
│   ├── setupScreen.css         ← renamed from pages/setup.css
│   ├── dispatchModal.css       ← renamed + audit class names (.dispatch → .dispatch-modal)
│   ├── rewardModal.css         ← **new**: extracted from pages/combat.css
│   ├── championPanel.css       ← renamed (barrel, from left-champion-card.css)
│   ├── headerPanel.css         ← renamed from header.css
│   ├── rightPanel.css          ← **new**: extracted from champion-detail.css
│   ├── logPanel.css            ← renamed from log-bar.css
│   ├── heptagramWidget.css     ← renamed from heptagram.css
│   ├── tooltip.css             ← merged from ui/overlays.css + ui/tooltip-content.css
│   ├── mapControls.css         ← unchanged
│   ├── fog.css                 ← unchanged
│   ├── tile.css                ← unchanged
│   ├── championDetail.css      ← renamed from champion-detail.css
│   ├── artifactChoice.css      ← unchanged
│   ├── potencies.css           ← unchanged
│   ├── stats.css               ← unchanged
│   ├── swatch.css              ← unchanged
│   ├── manuscriptPanel.css     ← renamed from panel.css
│   ├── note.css                ← unchanged
│   ├── forms.css               ← unchanged
│   ├── hud.css                 ← merged with toast/victory from ui/overlays.css
│   └── paleyCrossHighlight.css ← renamed from paley-cross-highlight.css
├── ui/
│   ├── a11y.css                ← **new**: .sr-only from ui/utilities.css (+focus-visible)
│   └── responsive.css          ← unchanged
├── left-champion-card/         ← remains, files renamed to camelCase
│   ├── container.css
│   ├── header.css
│   ├── hpRow.css               ← renamed from hp-row.css
│   ├── resources.css
│   ├── equipment.css
│   ├── potency.css
│   └── actions.css
└── (no more pages/ directory)
```

---

## Phased Implementation

### Phase 1 — Extract Shared Modal Chrome

**Goal:** Create `modalShell.css` and `combatModal.css` from the current `pages/combat.css` + `components/combat.css`.

1. **Create `components/modalShell.css`**
   - Extract `.modal`, `.modal-header-row`, `.modal-round-label` (and any other shared chrome) from `pages/combat.css`.
   - `modalShell.css` becomes the single source for modal backdrops and skeleton classes.

2. **Create `components/combatModal.css`**
   - Merge the **remaining** content of `pages/combat.css` (combat-specific arena, picks, rewards, FX keyframes) with all of `components/combat.css`.
   - Resolve any duplicate selectors (e.g., `.combat-modal`, `.play-slot`, `.ctok`) — keep the more complete / token-compliant version.
   - Delete `pages/combat.css` and `components/combat.css`.

3. **Create `components/rewardModal.css`** — extract reward-specific styles from `pages/combat.css` (standalone reward modals).

4. **Create `components/rightPanel.css`** — extract styles from `components/champion-detail.css` that belong to the right panel (champion detail view). *Optional this early; can be deferred to Phase 3 if desired.*

> **Dependency:** Steps 1–3 must be done together because they split one source file. **Manual smoke test after Phase 1:** open all modals (combat, dispatch, reward) and verify they still render correctly.

---

### Phase 2 — Renames (No Content Changes)

**Goal:** File renames only — do not modify CSS content (except where noted). Follow this order:

| # | Old file | New file | Notes |
|---|----------|----------|-------|
| 1 | `pages/setup.css` | `components/setupScreen.css` | |
| 2 | `components/dispatch.css` | `components/dispatchModal.css` | **Audit class names** — search for `.dispatch` selectors: rename to `.dispatch-modal` prefix inside the file. |
| 3 | `components/heptagram.css` | `components/heptagramWidget.css` | |
| 4 | `components/header.css` | `components/headerPanel.css` | |
| 5 | `components/log-bar.css` | `components/logPanel.css` | |
| 6 | `components/champion-detail.css` | `components/championDetail.css` | |
| 7 | `components/panel.css` | `components/manuscriptPanel.css` | Class names `.panel`, `.manuscript-panel` unchanged — file name only. |
| 8 | `components/buttons.css` | `components/button.css` | Barrel – update its `@import` references to point to new subfile names. |
| 9 | `components/buttons-core.css` | `components/buttonCore.css` | |
| 10 | `components/buttons-legacy.css` | `components/buttonLegacy.css` | |
| 11 | `components/card-variants.css` | `components/cardVariants.css` | |
| 12 | `components/left-champion-card.css` | `components/championPanel.css` | Barrel – update its `@import` to reflect subfile renames (step 15). |
| 13 | `components/left-champion-card/hp-row.css` | `components/left-champion-card/hpRow.css` | (one of the subfiles) |
| 14 | `layout/game-grid.css` | `layout/gameGrid.css` | |
| 15 | `pages/token-sheet.css` | `abstracts/tokenSheet.css` | |
| 16 | `components/paley-cross-highlight.css` | `components/paleyCrossHighlight.css` | Casing consistency (kebab → camel). |

Also rename the barrel file `components/left-champion-card.css` (step 12) and update its `@import` to use `hpRow.css` instead of `hp-row.css`.

> **After Phase 2**, run `python3 dev/check_imports.py` to catch any JS references to old class names in string literals (e.g., `'btn primary'` won't break, but if JS references a file path or constructs a class name that matched the old file, it might). Also update `codex.css` with new file names — but **keep the same import order as today**; we'll reorder in Phase 4.

---

### Phase 3 — Merges and Dismantling

**Goal:** Eliminate the four messy files: `ui/overlays.css`, `ui/tooltip-content.css`, `ui/utilities.css`, and migrate their content.

1. **Dismantle `ui/overlays.css`**
   - Merge `#toast` and `.victory-*` rules into existing `components/hud.css`.
   - Extract `#hexTooltip3d` rule into `components/tooltip.css`.
   - Delete `ui/overlays.css`.

2. **Merge `ui/tooltip-content.css` into `components/tooltip.css`**
   - Combine `.hex-tooltip__*` classes with the `#hexTooltip3d` rule from step 1.
   - Delete `ui/tooltip-content.css`.

3. **Dismantle `ui/utilities.css`**
   - Move `.u-hidden` → `ui/a11y.css`.
   - Audit `.mini` and `.hint` usage across the codebase. If used in one component, inline. If in multiple, create `components/textTreatment.css`. Delete `ui/utilities.css`.

> **Manual verification after Phase 3:** Check toasts, victory screen, hex tooltip, and hidden elements.

---

### Phase 4 — Infrastructure

**Goal:** Create `layout/panelLayout.css` and reorder `codex.css` to match the cascade groups.

1. **Create `layout/panelLayout.css`** with shared panel sizing, max-height, overflow — no visual styling (that's `manuscriptPanel.css`'s job).
2. **Rewrite `codex.css`** to match the import order specified in §3 of `cssconventions.md`:
   - Group 1: Abstracts
   - Group 2: Layout
   - Group 3: Components (with the specified ordering)
   - Group 4: UI overrides
   - **Cascade risk:** See §3.1 — test visually after reordering. If something breaks, tighten selector specificity (or move the file to a later slot) — do not revert to the old ordering.
3. **Delete the empty `pages/` directory.**

---

### Phase 5 — Verification

1. **Update `index.html`** if any class names changed during the migration (unlikely, but check).
2. **Run `python3 dev/check_imports.py`** — ensure no JS imports broke (file renames won't break JS module imports, but JS string references to CSS class names might).
3. **Manual smoke test:**
   - Setup screen
   - Combat modal (all phases: picks, reveal, scoring, end)
   - Dispatch modal
   - Reward modal (standalone)
   - Left champion panel
   - Header bar
   - Right panel (champion detail)
   - Log panel
   - Hex tooltip hover
   - Victory screen
   - Toasts
   - Map controls

---

## Migration Checklist (Concise)

| # | Action | Files affected | Phase |
|---|--------|----------------|-------|
| 1 | Create `modalShell.css` (extract from `pages/combat.css`) | `pages/combat.css` → new | 1 |
| 2 | Create `combatModal.css` (merge remaining `pages/combat.css` + `components/combat.css`) | `pages/combat.css`, `components/combat.css` | 1 |
| 3 | Create `rewardModal.css` (extract from `pages/combat.css`) | `pages/combat.css` | 1 |
| 4 | Create `rightPanel.css` (extract from `champion-detail.css`) | `components/champion-detail.css` | 1 (deferrable) |
| 5 | Rename 16 files per table in Phase 2 | Various | 2 |
| 6 | Audit class names in `dispatchModal.css` (`.dispatch` → `.dispatch-modal`) | `dispatchModal.css` | 2 |
| 7 | Rename `hp-row.css` → `hpRow.css` and update barrel `championPanel.css` | `left-champion-card/hp-row.css`, `championPanel.css` | 2 |
| 8 | Dismantle `ui/overlays.css` → `hud.css`, `tooltip.css` | `overlays.css`, `hud.css`, `tooltip.css` | 3 |
| 9 | Merge `ui/tooltip-content.css` → `tooltip.css` | `tooltip-content.css`, `tooltip.css` | 3 |
| 10 | Dismantle `ui/utilities.css` → `a11y.css`, audit `.mini`/`.hint` | `utilities.css`, `a11y.css`, possible new file | 3 |
| 11 | Create `layout/panelLayout.css` | new | 4 |
| 12 | Reorder `codex.css` to match §3 groups | `codex.css` | 4 |
| 13 | Delete `pages/` directory | `pages/` | 4 |
| 14 | Update `index.html` if needed | `index.html` | 5 |
| 15 | Run `check_imports.py` | dev tool | 5 |
| 16 | Manual smoke test | visual | 5 |

---

## Tips

- **Work in small batches** — do Phase 1 + smoke test, then Phase 2, etc. Don't merge everything at once.
- **Use `git mv`** for renames so Git tracks them as moves, not deletes+creates.
- **For `codex.css` reordering:** first comment out all imports, then add them back group by group. Check rendering after each group.
- **Class name auditing** (step 6): `grep -rn '\.dispatch' styles/` will find all selectors. Change the root class from `.dispatch` to `.dispatch-modal` and adjust descendant selectors accordingly.
- **`hud.css` currently nearly empty** — after merge it will grow significantly. That's fine.
- **`paley-cross-highlight.css` → `paleyCrossHighlight.css`** — note that the original uses kebab-case (`paley-cross-highlight.css`), not camelCase. The migration renames it to camelCase for consistency, but you could also leave it as-is if you prefer kebab for CSS files. Discuss with the user if uncertain.


| **tokenSheet.css import** | ⚠️ Consider removing from `codex.css` |
| **paleyCrossHighlight rename** | ⚠️ Resolve uncertainty in favour of camelCase |
| **rightPanel.css deferral** | ⚠️ Make mandatory in Phase 1 |
| **Dispatch class audit** | ⚠️ Add JS grep check |
| **Class name migration plan** | ⚠️ Add explicit target version for alignment |