# CSS Conventions — Champions of the Supernal Interregnum

This file defines the CSS architecture, naming conventions, and migration plan. It is the CSS counterpart to `dev/conventions.md`. Read it before creating, renaming, or reorganising any stylesheet.

---

## 1. Principles

Same as JS (`dev/conventions.md` §1), adapted for CSS:

- **Organise by rate of change.** Tokens (rare) → layout (infrequent) → components (moderate) → UI overrides (frequent). Later imports in `codex.css` win in cascade — this is *intentional*: tokens define defaults, components build on them, and UI overrides fine-tune without touching tokens.
- **One file per responsibility.** No `components.css` holding 15 unrelated selectors.
- **Clarity over brevity.** `combatModal.css` not `combat.css`; `championPanel.css` not `left.css`.
- **Replaceability.** Redesign a modal → swap one file. Redesign the screen skeleton → swap one layout file.
- **No banned words.** `utilities.css`, `common.css`, `helpers.css`, `misc.css`, `styles.css`, `overrides.css` are forbidden. Use specific, qualified names that describe what is *in* the file. If you find yourself reaching for a banned name, the file is doing too much.
- **Qualified file names.** Always include the full logical component/screen name. Use `lowerCamelCase.css` to match JS convention.
- **When a JS module has a dedicated CSS file, they share the same name.** `combatModal.js` ↔ `combatModal.css`. When a CSS file serves multiple JS modules (e.g., shared button styles), the name describes the *visual concern*, not a code module. Example: `manuscriptPanel.css` (the visual pattern) not `panel.js` (no such JS module exists).

### 1.1 Cascade Layer Intent

The four groups in `codex.css` (§3) map to cascade priority:

| Group | Import order | Cascade weight | Purpose |
|-------|-------------|----------------|---------|
| 1. Abstracts | First | Lowest (overridable) | Design tokens, reset — no visual output on their own |
| 2. Layout | Second | Low | Page skeleton (grid areas, map container, panel sizing) |
| 3. Components | Third | Normal | One file per UI piece; most foundational first |
| 4. UI overrides | Last | Highest | Accessibility, responsive overrides; fine-tuning |

When two selectors have equal specificity, later wins. This means:
- Components can override layout defaults by using equal-specificity selectors.
- UI overrides (a11y, responsive) should *never* be higher-specificity — they win by position alone.
- If you need a UI override to be overridden by a component, you have a specificity or ordering bug — fix the architecture, not the source order.

---

## 2. Directory Structure

```
styles/
├── codex.css                          # Only @import rules, organised by rate-of-change
├── abstracts/
│   ├── reset.css                      # Box-sizing, margin-zero, focus outlines
│   ├── variables.css                  # @import all tokens → :root custom properties
│   └── tokens/
│       ├── chrome.css                 # Vellum, parchment, ink, edge, rule
│       ├── factions.css               # Fixed faction hex triplets
│       ├── motion.css                 # Duration and easing tokens
│       ├── pigments.css               # Jewel pigment palette (board/miniature layer)
│       ├── shadow.css                 # --shadow-card, --shadow-stack, --shadow-seal
│       ├── shapes.css                 # Border-radius, edge width
│       ├── spacing.css                # --s1 through --s9 (4px base scale)
│       ├── states.css                 # Semantic state colours (vermilion, malachite, etc.)
│       └── typography.css             # Font stacks, sizes, line-heights, tabular nums
├── layout/
│   ├── gameGrid.css                   # Body grid: header, map, right panel, log
│   └── panelLayout.css                # Shared panel sizing, max-height, scroll constraints
├── components/
│   ├── button.css                     # Barrel: @import buttonCore.css, buttonLegacy.css
│   ├── buttonCore.css                 # Current button design system (.btn variants)
│   ├── buttonLegacy.css               # Pre-design-system button styles (debt; migrate piecemeal)
│   ├── card.css                       # Barrel: @import cardVariants.css
│   ├── cardVariants.css               # Card variant overrides (.setup-card, .modal-card, etc.)
│   ├── championPanel.css              # Barrel: @import left-champion-card/* via @import
│   ├── left-champion-card/            # Subdirectory for the multi-part champion card
│   │   ├── container.css
│   │   ├── header.css
│   │   ├── hpRow.css
│   │   ├── resources.css
│   │   ├── equipment.css
│   │   ├── potency.css
│   │   └── actions.css
│   ├── combatModal.css                # Combat modal: arena grid, potency grid, pick slots,
│   │                                  #   reward panel, log area, victory display, FX keyframes
│   ├── dispatchModal.css              # Augur's Dispatch modal
│   ├── rewardModal.css                # Standalone reward modal (extracted from combat pages)
│   ├── modalShell.css                 # Shared .modal backdrop + chrome skeleton
│   ├── heptagramWidget.css            # Interactive Paley heptagram
│   ├── headerPanel.css                # Top header bar
│   ├── rightPanel.css                 # Right-side info panel
│   ├── logPanel.css                   # Bottom log bar
│   ├── setupScreen.css                # Full-screen faction roster
│   ├── artifactChoice.css             # Artifact choice UI
│   ├── potencies.css                  # Potency display (shared; already at correct name)
│   ├── stats.css                      # Stat bars (HP, etc.)
│   ├── swatch.css                     # Colour swatch chips
│   ├── manuscriptPanel.css            # .manuscript-panel / .panel visual styling (vellum, border, shadow)
│   ├── note.css                       # Note/callout patterns
│   ├── forms.css                      # Form element styling
│   ├── hud.css                        # HUD: toasts, victory banner (already exists; merged into)
│   ├── tooltip.css                    # Map hex tooltip (merged from ui/overlays.css + ui/tooltip-content.css)
│   ├── mapControls.css                # Zoom/camera control buttons
│   ├── fog.css                        # Fog-of-war overlay
│   ├── tile.css                       # Hex tile styling
│   ├── championDetail.css             # Champion detail view
│   └── paleyCrossHighlight.css        # Paley cross-highlight indicator
├── ui/
│   ├── a11y.css                       # .sr-only, focus-visible helpers
│   └── responsive.css                 # Media query overrides (imported last)
```

### Changes from Current State

| Current file | Proposed file | Disposition |
|--------------|---------------|-------------|
| `pages/combat.css` | — | **Dismantled:** `.modal` chrome → `modalShell.css`; remaining content + `components/combat.css` → `combatModal.css` |
| `components/combat.css` | → `components/combatModal.css` | **Merged into** `combatModal.css` with remaining `pages/combat.css` content |
| `pages/setup.css` | `components/setupScreen.css` | **Rename** (no content change) |
| `pages/token-sheet.css` | `abstracts/tokenSheet.css` | **Move** (dev reference, not a component) |
| `ui/utilities.css` | — | **Dismantled:** `.u-hidden` → `ui/a11y.css`; `.mini`, `.hint` → audit usage per component; then **delete** |
| `ui/overlays.css` | — | **Dismantled:** toast + victory → existing `components/hud.css`; hex tooltip → `components/tooltip.css` |
| `ui/tooltip-content.css` | — | **Merged into** `components/tooltip.css`, then **delete** |
| `layout/game-grid.css` | `layout/gameGrid.css` | **Rename** (camelCase consistency) |
| `components/header.css` | `components/headerPanel.css` | **Rename** (qualified, matches `headerPanel.js`) |
| `components/dispatch.css` | `components/dispatchModal.css` | **Rename** (qualified, matches `dispatchModal.js`) |
| `components/heptagram.css` | `components/heptagramWidget.css` | **Rename** (matches `heptagramWidget.js`) |
| `components/log-bar.css` | `components/logPanel.css` | **Rename** (matches `logPanel.js`) |
| `components/champion-detail.css` | `components/championDetail.css` | **Rename** (camelCase consistency) |
| `components/panel.css` | `components/manuscriptPanel.css` | **Rename** (qualified name matching the visual class `.manuscript-panel`) |
| `components/buttons.css` | `components/button.css` | **Rename** (singular, convention consistency) |
| `components/buttons-core.css` | `components/buttonCore.css` | **Rename** (singular, camelCase consistency) |
| `components/buttons-legacy.css` | `components/buttonLegacy.css` | **Rename** (singular, camelCase consistency) |
| `components/card-variants.css` | `components/cardVariants.css` | **Rename** (camelCase consistency) |
| `components/left-champion-card.css` | `components/championPanel.css` | **Rename** (barrel name matches `championPanel.js`) |
| `components/left-champion-card/hp-row.css` | `components/left-champion-card/hpRow.css` | **Rename** (camelCase consistency) |
| `components/hud.css` | (same) | Already exists — content will be **merged into** from `ui/overlays.css` |
| `components/potencies.css` | (same) | Already at correct name; no change needed |

---

## 3. Import Order in `codex.css`

```css
/* ════════════════════════════════════════════════════════════════════════════
   1. ABSTRACTS — design tokens and reset (zero visual output alone)
      Imported first so everything downstream can reference custom properties.
   ════════════════════════════════════════════════════════════════════════════ */
@import "./abstracts/variables.css";
@import "./abstracts/reset.css";

/* ════════════════════════════════════════════════════════════════════════════
   2. LAYOUT — page skeleton: grid areas, panel positioning, map container
      These define the boxes; components fill them.
   ════════════════════════════════════════════════════════════════════════════ */
@import "./layout/gameGrid.css";
@import "./layout/panelLayout.css";

/* ════════════════════════════════════════════════════════════════════════════
   3. COMPONENTS — one file per named UI piece; most foundational first
      Order:
        - Shared visual patterns (button, card, modalShell) first
        - Full-screen setups (setupScreen) next
        - Modal-heavy pieces (combat, dispatch, reward) next
        - Panel content (championPanel, headerPanel, rightPanel, logPanel) next
        - Widgets and overlays (heptagram, tooltip, mapControls, fog, tile) next
        - Detail views and shared pieces (championDetail, artifactChoice,
          potencies, stats, swatch, manuscriptPanel, note, forms) next
        - HUD and decorative elements (hud, paleyCrossHighlight) last
   ════════════════════════════════════════════════════════════════════════════ */
@import "./components/button.css";
@import "./components/card.css";
@import "./components/modalShell.css";
@import "./components/setupScreen.css";
@import "./components/combatModal.css";
@import "./components/dispatchModal.css";
@import "./components/rewardModal.css";
@import "./components/championPanel.css";
@import "./components/headerPanel.css";
@import "./components/rightPanel.css";
@import "./components/logPanel.css";
@import "./components/heptagramWidget.css";
@import "./components/tooltip.css";
@import "./components/mapControls.css";
@import "./components/fog.css";
@import "./components/tile.css";
@import "./components/championDetail.css";
@import "./components/artifactChoice.css";
@import "./components/potencies.css";
@import "./components/stats.css";
@import "./components/swatch.css";
@import "./components/manuscriptPanel.css";
@import "./components/note.css";
@import "./components/forms.css";
@import "./components/hud.css";
@import "./components/paleyCrossHighlight.css";

/* ════════════════════════════════════════════════════════════════════════════
   4. UI OVERRIDES — accessibility and responsive (imported last so they win
      by cascade position without needing higher specificity)
   ════════════════════════════════════════════════════════════════════════════ */
@import "./ui/a11y.css";
@import "./ui/responsive.css";
```

### 3.1 ⚠️ Reordering Caution

The current `codex.css` has a notably different order — abstracts are interleaved with components, layout is after components, and `ui/utilities.css` precedes several component files. **Reordering the import list changes the cascade order for any selectors of equal specificity.** After reordering, visually verify that nothing has shifted. If you encounter regressions, the fix is to adjust selector specificity or move the imported file to the correct group — not to re-introduce a wrong ordering.

### 3.2 @import Syntax

Use bare `@import "..."` (no `url()` wrapper). The `url()` form found in the current `buttons.css` is legacy. New imports omit it.

---

## 4. Subdirectories for Complex Components

When a component has many distinct visual sub-parts (like the left champion card with its container, header, HP row, resources, equipment, potency, and actions), a subdirectory is allowed:

```
components/left-champion-card/
├── container.css
├── header.css
├── hpRow.css
├── resources.css
├── equipment.css
├── potency.css
└── actions.css
```

The parent `components/championPanel.css` is a barrel that `@import`s each sub-file. This pattern mirrors `ui/combat/` on the JS side and keeps individual files scoped to one responsibility.

**Rule:** a subdirectory is justified when the component would otherwise be a single file exceeding ~200 lines. If it is under that threshold, keep it in a single file.

**CamelCase subfiles:** All subdirectory files use `lowerCamelCase.css` (e.g., `hpRow.css`, not `hp-row.css`). This matches the JS convention and keeps file-name tooling (glob, import resolution) predictable.

---

## 5. Barrel Files

A barrel CSS file does nothing but `@import` other CSS files. It contains zero selectors. This pattern is used for:

- Buttons (`button.css` → `buttonCore.css` + `buttonLegacy.css`)
- Cards (`card.css` → `cardVariants.css`)
- Champion panel (`championPanel.css` → `left-champion-card/*.css`)

This lets consumers import one name while keeping underlying files small and replaceable.

**Barrel naming:** The barrel file takes the *logical concern* name (`button.css`, `card.css`, `championPanel.css`), not a synthetic grouping. If you find yourself creating a `common.css` barrel, you are likely doing something wrong — the files it collects should probably be organised differently.

---

## 6. Spacing Scale (Existing — Do Not Replace)

The current spacing scale is mature and well-adopted:

```css
:root {
  --s1: 4px;   --s2: 8px;   --s3: 12px;
  --s4: 16px;  --s5: 24px;  --s6: 32px;
  --s7: 48px;  --s8: 64px;  --s9: 96px;
}
```

All margin, padding, and gap values should reference these tokens rather than arbitrary pixel values. There is no "gold unit" in the spacing system; gold is a colour budget rule (see styleguide §3), not a measurement unit.

**When you need a value not in the scale:** Reconsider the layout first. If you genuinely do (e.g., a 14px gap that is not `--s3` (12px) or `--s4` (16px)), add a new `--s` token to `spacing.css` after discussion — do not hard-code the value.

---

## 7. Class Naming Conventions

The project does not enforce a strict BEM methodology, but it does follow consistent patterns:

| Pattern | Example | Used for |
|---------|---------|----------|
| `.block-name` (kebab-case) | `.manuscript-panel`, `.modal-card`, `.left-hp-row`, `.victory-name` | Visual component classes, especially from the pre-convention codebase |
| `.block-name__element` (BEM-like) | (not yet used) | Allowed but not required; prefer when the element is clearly owned by a block |
| `.blockName` (camelCase) | used only in JS (`className` props in `h()`) | JS-side class application, not CSS-side naming |
| `[data-action]` | `data-action="endTurn"` | Interaction hooks (see `actionBus.js`) — never style on data attributes |
| `#id` | `#game`, `#mapMount` | Reserved for HTML skeleton and framework mounts only. Do not add new ID selectors for styling. |

**Convention for new components:**
- Use a short, qualified kebab-case class name that matches the CSS file's concern (e.g., `.combat-modal` lives in `combatModal.css`).
- Modifier state: use a second class (`.btn.primary`, `.toast--bad`) or a kebab-case modifier suffix.
- Avoid `is-*` / `has-*` prefixes — use `.active`, `.selected`, `.disabled` consistently instead.

**Future rule:** When renaming an existing component, migrate its selectors to match the CSS file name. For example, `dispatchModal.css` should use a `.dispatch-modal` root class, not bare `.dispatch`.

---

## 8. The `h()` DOM Builder and CSS Interaction

The project uses `h(tag, props, ...children)` from `src/ui/domBuilder.js` for dynamic DOM construction. Key CSS-relevant details:

- `dataAction: 'foo'` in props becomes `data-action="foo"`. Do not style on `[data-action]` — use classes.
- `style: { '--champ-hp-pct': 75 }` sets inline custom properties. This is the **only acceptable use of inline styles** — for dynamic values that cannot be expressed in CSS alone.
- `class: 'btn primary'` sets `className`. Static classes belong in the CSS file, not in JS logic.

If you find yourself computing a CSS class name in JS (e.g., `` `btn ${isPrimary ? 'primary' : 'ghost'}` ``), that is fine — the CSS file defines the classes; JS only selects which combination to apply.

---

## 9. Naming Quick Reference

| JS module | CSS file | Notes |
|-----------|----------|-------|
| `combatModal.js` | `combatModal.css` | Merges current `pages/combat.css` + `components/combat.css` |
| `setupScreen.js` | `setupScreen.css` | Renamed from `pages/setup.css` |
| `dispatchModal.js` | `dispatchModal.css` | Renamed from `components/dispatch.css` |
| `rewardModal.js` | `rewardModal.css` | Styles extracted from `pages/combat.css` |
| `modalShell.js` | `modalShell.css` | `.modal` class extracted from `pages/combat.css` |
| `heptagramWidget.js` | `heptagramWidget.css` | Renamed from `components/heptagram.css` |
| `headerPanel.js` | `headerPanel.css` | Renamed from `components/header.css` |
| `championPanel.js` | `championPanel.css` | Renamed from `components/left-champion-card.css` (barrel) |
| `rightPanel.js` | `rightPanel.css` | New; styles extracted from `components/champion-detail.css` |
| `logPanel.js` | `logPanel.css` | Renamed from `components/log-bar.css` |
| `hud.js` | `hud.css` | Toast + victory merged into existing file from `ui/overlays.css` |
| `mapTooltip.js` | `tooltip.css` | Hex tooltip; merged from `ui/overlays.css` + `ui/tooltip-content.css` |
| *No JS module* | `button.css` (barrel), `buttonCore.css`, `buttonLegacy.css` | Visual concern: button design system |
| *No JS module* | `card.css` (barrel), `cardVariants.css` | Visual concern: card patterns |
| *No JS module* | `manuscriptPanel.css` | Visual concern: `.manuscript-panel` / `.panel` shared look |
| *No JS module* | `potencies.css`, `stats.css`, `swatch.css`, `note.css`, `forms.css` | Shared visual patterns |
| *No specific JS module* | `fog.css`, `tile.css`, `mapControls.css`, `paleyCrossHighlight.css` | Decorative / overlay pieces |

---

## 10. Migration Path

### Phase 1: Extract Shared Modal Chrome

1. **Create `components/modalShell.css`.** Extract `.modal`, `.modal-header-row`, `.modal-round-label` from `pages/combat.css`. These define the shared modal backdrop and chrome skeleton — every modal reuses them.
2. **Create `components/combatModal.css`.** Merge the remaining content of `pages/combat.css` with `components/combat.css`. Resolve any selector conflicts (e.g., duplicate `.combat-modal`, `.play-slot`, `.ctok` definitions — keep the version that is more complete or token-compliant). Keep FX keyframes colocated with their component file.

### Phase 2: Renames (No Content Changes)

3. **Rename `pages/setup.css` → `components/setupScreen.css`.**
4. **Rename `components/dispatch.css` → `components/dispatchModal.css`.** *Audit:* search for `.dispatch` class selectors and rename them to `.dispatch-modal` (or equivalent). Do not leave legacy class names in a file named `dispatchModal.css`.
5. **Rename `components/heptagram.css` → `components/heptagramWidget.css`.**
6. **Rename `components/header.css` → `components/headerPanel.css`.**
7. **Rename `components/log-bar.css` → `components/logPanel.css`.**
8. **Rename `components/champion-detail.css` → `components/championDetail.css`.**
9. **Rename `components/panel.css` → `components/manuscriptPanel.css`.** Leave the class names (`.manuscript-panel`, `.panel`) unchanged for now — the file name describes the *visual concern*, not the class name. Future pass may rename `.panel` → `.manuscript-panel` for consistency.
10. **Rename `components/buttons.css` → `components/button.css`.**
11. **Rename `components/buttons-core.css` → `components/buttonCore.css`.**
12. **Rename `components/buttons-legacy.css` → `components/buttonLegacy.css`.**
13. **Rename `components/card-variants.css` → `components/cardVariants.css`.**
14. **Rename `components/left-champion-card.css` → `components/championPanel.css`.**
15. **Rename `components/left-champion-card/hp-row.css` → `components/left-champion-card/hpRow.css`.**
16. **Rename `layout/game-grid.css` → `layout/gameGrid.css`.**
17. **Move `pages/token-sheet.css` → `abstracts/tokenSheet.css`.** (It is a dev reference document, not a game UI component.)

### Phase 3: Merges and Dismantling

18. **Dismantle `ui/overlays.css`:**
    - Merge the `#toast` and `.victory-*` rules into **existing** `components/hud.css`.
    - Extract the `#hexTooltip3d` rule into `components/tooltip.css`.
    - Delete `ui/overlays.css`.
19. **Merge `ui/tooltip-content.css` into `components/tooltip.css`.** (Combine the `.hex-tooltip__*` classes with the `#hexTooltip3d` rule from step 18.) Delete `ui/tooltip-content.css`.
20. **Dismantle `ui/utilities.css`:**
    - Move `.u-hidden` → `ui/a11y.css`.
    - Audit `.mini` and `.hint` usage across the codebase. If used in one component, inline them there. If in multiple components, create a small `components/textTreatment.css`. Delete `ui/utilities.css`.

### Phase 4: Infrastructure

21. **Create `layout/panelLayout.css`.** This file handles shared panel sizing, max-height constraints, overflow behaviour — not visual styling. (The visual vellum look of `.manuscript-panel` lives in `components/manuscriptPanel.css`.) The two files are distinct concerns.
22. **Update `codex.css`** to match the import list and grouping in §3. **Be aware:** reordering may cause cascade regressions — see §3.1.
23. **Delete the empty `pages/` directory.**

### Phase 5: Verification

24. **Update `index.html`** if any class names or file paths changed during the migration (the project uses `codex.css` as the sole entry point, but class name changes in renamed files may affect JS `className` strings).
25. **Run `python3 dev/check_imports.py`** to verify no JS import broke (renames may affect `ui/` files that reference old CSS class names in JS string literals).
26. **Manual smoke test.** Verify: setup screen, combat modal, dispatch modal, left champion panel, header bar, log bar, hex tooltip, victory screen, and toasts all render correctly. Pay special attention to any modal that previously depended on styles from `pages/combat.css` — they should now inherit from `modalShell.css` + their own component file.

### Migration Checklist

| Step | File | Action | Done? |
|------|------|--------|-------|
| 1 | `modalShell.css` | Create (extract from pages/combat.css) | ☐ |
| 2 | `combatModal.css` | Create (merge pages/combat.css + components/combat.css) | ☐ |
| 3 | `pages/setup.css` | → `components/setupScreen.css` | ☑ |
| 4 | `components/dispatch.css` | → `components/dispatchModal.css` (audit class names) | ☑ |
| 5 | `components/heptagram.css` | → `components/heptagramWidget.css` | ☑ |
| 6 | `components/header.css` | → `components/headerPanel.css` | ☑ |
| 7 | `components/log-bar.css` | → `components/logPanel.css` | ☑ |
| 8 | `components/champion-detail.css` | → `components/championDetail.css` | ☑ |
| 9 | `components/panel.css` | → `components/manuscriptPanel.css` | ☑ |
| 10 | `components/buttons.css` | → `components/button.css` | ☑ |
| 11 | `components/buttons-core.css` | → `components/buttonCore.css` | ☑ |
| 12 | `components/buttons-legacy.css` | → `components/buttonLegacy.css` | ☑ |
| 13 | `components/card-variants.css` | → `components/cardVariants.css` | ☑ |
| 14 | `components/left-champion-card.css` | → `components/championPanel.css` | ☑ |
| 15 | `components/left-champion-card/hp-row.css` | → `hpRow.css` | ☑ |
| 16 | `layout/game-grid.css` | → `layout/gameGrid.css` | ☑ |
| 17 | `pages/token-sheet.css` | → `abstracts/tokenSheet.css` | ☑ |
| 18 | `ui/overlays.css` | Dismantle (merge toast→hud.css, tooltip→tooltip.css) | ☐ |
| 19 | `ui/tooltip-content.css` | Merge into tooltip.css | ☐ |
| 20 | `ui/utilities.css` | Dismantle (`.u-hidden`→a11y.css, audit `.mini`/`.hint`) | ☐ |
| 21 | `layout/panelLayout.css` | Create (shared panel sizing, no visual) | ☐ |
| 22 | `codex.css` | Update import list and grouping | ☐ |
| 23 | `pages/` | Delete directory | ☐ |
| 24 | `index.html` | Update if class names changed | ☐ |
| 25 | `dev/check_imports.py` | Run import check | ☐ |
| 26 | Manual smoke test | Visual verification | ☐ |

---

## 11. Known Debt and Future Considerations

### 11.1 Pre-existing Cross-Layer Imports (CSS-specific)

These are CSS concerns that violate the rate-of-change principle but exist in the current codebase:

- **`components/hud.css`** is currently nearly empty (its content reads `/* (Intentionally empty — map button rules moved to dedicated component file) */`). Its actual functional content (toast, victory) lives in `ui/overlays.css`. The migration plan fixes this by merging into the already-existing file.
- **`components/header.css`** is imported before abstracts and reset in the current `codex.css` — a comment in that file even says "I don't know where to put this one." The migration reorders it into the components group.
- **`components/button.css`** (current name: `buttons.css`) uses `@import url(...)` rather than bare `@import`. A minor consistency debt.
- **`ui/tooltip-content.css`** is a single-purpose file that should be merged into the component file. The migration fixes this.
- **`pages/combat.css`** contains shared modal chrome (`.modal`, `.modal-header-row`, `.modal-round-label`) alongside combat-specific styles and FX keyframes. The migration extracts the shared pieces into `modalShell.css`.

### 11.2 Future Architecture Decisions

- **CSS layers (`@layer`):** If the codebase grows significantly, consider using `@layer abstracts, layout, components, ui` to make cascade intent explicit rather than relying on import order. This is *not* needed now but is worth evaluating if cascade bugs become frequent after the reordering.
- **Style linting:** No linter is configured. If CSS quality automation is desired, `stylelint` with a standard config (plus custom rules for token usage) would catch banned filenames, missing token references, and formatting inconsistencies.
- **`buttonLegacy.css`:** Contains legacy classes (`.btn-gold`, `.size-pill`, `.fctrl`, `.map-btn`, `.reward-btn`) that are not part of the `.btn` design system. These should be migrated into `buttonCore.css` or their respective component files over time. Do not add new styles to `buttonLegacy.css`.
- **`hud.css`:** After migration, `hud.css` will contain `#toast` (an ID selector) and `.victory-*` classes. Consider converting `#toast` to a class (`.toast`) in a future pass — ID selectors for component styles are an anti-pattern, but changing them now would add unnecessary risk to the migration.
- **`pages/token-sheet.css`:** After moving to `abstracts/tokenSheet.css`, it remains a dev-reference stylesheet used only for the token preview page. It does not belong in the game's critical rendering path. Consider whether `codex.css` should import it at all, or whether the preview page should use its own entry point.

### 11.3 Class Name Renames Not Yet Done

The migration deliberately avoids renaming **CSS class names** (only renaming files) to minimise risk. Future passes may align class names with file names:

| File | Current class(es) | Future ideal |
|------|-------------------|--------------|
| `tooltip.css` | `#hexTooltip3d` | `.hex-tooltip` (no ID selector) |
| `manuscriptPanel.css` | `.panel`, `.manuscript-panel` | `.manuscript-panel` only (deprecate `.panel`) |
| `championPanel.css` / `left-champion-card/` | `.left-*` prefixed | `.champion-panel` prefix |

---

## 12. Future-Proofing Rules

- **When adding a new JS component that needs styles, create a matching CSS file.** `fooBar.js` → `fooBar.css`, imported from `codex.css` in the components group.
- **When a CSS file exceeds ~200 lines, consider splitting** into a subdirectory with a barrel, following the `left-champion-card/` pattern.
- **Never add selectors to a file that does not match its name.** A stray `.combat-modal` fix does not belong in `button.css`. Either put it in the right file or create the right file.
- **New spacing values must use `--s1` through `--s9` tokens.** If you need a value not in the scale, add a new token to `spacing.css` — do not use arbitrary pixel values.
- **No new `pages/` directory.** Full-screen views are just components that happen to fill the viewport. `setupScreen.css` is already a component in spirit; the rename makes it official.
- **When renaming a CSS file, update all its `@import` references (`codex.css`, barrel files) and any JS references to class names if the file's exported classes changed.** Run `dev/check_imports.py` afterward.
- **Avoid adding new ID selectors for styling.** IDs (`#game`, `#mapMount`) are for the HTML skeleton only. Component styling uses classes.
- **Avoid adding new `@import url()` — use bare `@import "..."`.** The `url()` form is legacy and should not appear in new files.
- **Never use `ui/utilities.css` or any banned-name file.** Re-home its contents into the specific files that own those selectors.