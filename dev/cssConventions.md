CSS Conventions

The living rulebook for authoring styles. For full design-system rationale see dev/aestheticConventions.md; for architecture decisions see dev/srcConventions.md.
Principles

    Order by rate of change. Tokens → layout → components → UI overrides. Later @imports win in the cascade.

    One file, one responsibility. No catch‑all files (common.css, utilities.css, …).

    Clarity over brevity. combatModal.css, not modal.css.

    Replaceability. Redesign a modal → swap one file.

Directory Structure (current)

styles/
├── codex.css                  # Sole entry point – only @import rules
├── abstracts/
│   ├── reset.css
│   ├── variables.css          # @imports all token files below
│   └── tokens/
│       ├── chrome.css, factions.css, motion.css, pigments.css
│       ├── shadow.css, shapes.css, spacing.css, states.css, typography.css
├── layout/
│   ├── gameGrid.css           # Body grid: header, map, right panel, log
│   └── panelLayout.css        # Panel sizing, max-height, scroll constraints
├── components/                # One file per UI piece
│   ├── button.css             # Barrel → buttonCore + buttonLegacy
│   ├── card.css               # Barrel → cardBase + cardVariants
│   ├── championPanel.css      # Barrel → left-champion-card/*.css
│   ├── modalShell.css         # Shared modal chrome
│   ├── setupScreen.css, dispatchModal.css, rewardModal.css
│   ├── headerPanel.css, rightPanel.css, logPanel.css
│   ├── heptagramWidget.css, tooltip.css, mapControls.css, fog.css, tile.css
│   ├── championDetail.css, artifactChoice.css
│   ├── potencies.css, stats.css, swatch.css, manuscriptPanel.css
│   ├── note.css, forms.css, textTreatment.css
│   ├── hud.css, paleyCrossHighlight.css
│   ├── left-champion-card/    # Subdir: container, header, hpRow, resources,
│   │                         #   equipment, potency, actions (all camelCase)
│   ├── combatModal.css        # Barrel → combatModal/*.css
│   ├── combatModal/           # Subdir: arena, combatantCard, vsCell, potencyGrid,
│   │                         #   playSlots, logAndButtons, victory, fxLayer,
│   │                         #   hpBar, reducedMotion (all camelCase)
└── ui/
    ├── a11y.css               # .sr-only, focus-visible helpers
    └── responsive.css         # Media query overrides (imported last)

Import Order in codex.css

Four groups, ordered by rate of change. Later wins:
Group	Order	Purpose
1. Abstracts	1st	Tokens + reset
2. Layout	2nd	Page skeleton
3. Components	3rd	One file per UI piece
4. UI overrides	4th	Accessibility, responsive overrides

Use bare @import "path" (no url()). All imports live in codex.css or barrel files.
Naming Conventions

    File names: lowerCamelCase.css. When a JS module has a companion stylesheet they share the same base name (e.g. combatModal.js ↔ combatModal.css). Visual‑only files are named for the concern (manuscriptPanel.css).

    Banned file names: utilities, common, helpers, misc, overrides, styles. Do not create these.

    Class names: kebab-case (.combat-modal, .left-hp-row).

    Modifiers: use a second class (.btn.primary, .toast--bad, .active, .selected, .disabled). Avoid is-* / has-* prefixes.

    No ID selectors for styling. IDs (#game, #mapMount) belong to the HTML skeleton only.

Spacing Scale (fixed)

--s1: 4px;   --s2: 8px;   --s3: 12px;
--s4: 16px;  --s5: 24px;  --s6: 32px;
--s7: 48px;  --s8: 64px;  --s9: 96px;

All margin, padding, gap values must reference these tokens. If you need a value not in the scale, add a new --s token to spacing.css – never hard‑code pixels.
Barrel Files & Subdirectories

A barrel is a file that only contains @import rules – zero selectors.
When a single component file would exceed ~200 lines, split it into a subdirectory with a barrel:

components/championPanel.css          ← barrel
components/left-champion-card/
  container.css, header.css, hpRow.css, …

components/combatModal.css            ← barrel
components/combatModal/
  arena.css, combatantCard.css, vsCell.css, …

Sub‑files use lowerCamelCase.css.
Inline Styles

Only for dynamic custom properties that CSS cannot express alone. Always use the h() builder:

    style: { '--champ-hp-pct': 75 }

Never inline static layout or colour values.
The h() DOM Builder – CSS‑relevant props
Prop	Becomes	Rule
dataAction: 'foo'	data-action="foo"	Do not style on [data-action] – use classes
class: 'btn primary'	className	Static classes defined in CSS; JS selects which combination
style: { '--var': val }	inline style	Only for dynamic custom properties
Quick Rules for Adding CSS

    New component? Create fooBar.css in components/, @import it in codex.css under the components group.

    New visual pattern? Create a file named for the concern (e.g. textTreatment.css for .hint, .mini).

    New spacing value? Add a token to spacing.css – do not hard‑code.

    Subdirectory? Only when the file exceeds ~200 lines; mirror the left-champion-card/ or combatModal/ pattern.

    Renaming? Update @import paths in codex.css and any barrel files. If class names change, update JS className strings. Run python3 dev/check_imports.py.

    When in doubt: Match the file name to the JS module or visual concern. Use kebab‑case classes. Reference spacing tokens. No new pages/ directory – full‑screen views are components.

Visual Design Constraints (from dev/aestheticConventions.md v4 — "The Dark Carnival / Shadow-Puppet Theater")

    Two‑layer rule (rethemed):

        Proscenium (panels, text, buttons) — deep dark velvety blacks and charcoals.
            Thin, precise ink creases. The dark theater frame around a puppet show.

        Puppet layer (map, units, faction glyphs) — vivid, saturated color inside
            bold black ink outlines. Comic-book pop. Gouache brightness.

    Ink outline convention (replaces CSS outline):

        Every Puppet-layer element has a permanent `--ink-weight` dark stroke (3px)
        as part of its structural rendering. This is NOT a CSS `outline` — it's a
        `border` with matching `border-radius`, an SVG `stroke`, or a 3D toon outline.

    State as glow + icon (replaces outline):

        State (ally/hostile/neutral/selected) is conveyed through `box-shadow`
        backlight glow + optional icon changes. CSS `outline` is BANNED for
        interaction states. Ally = verdigris glow, Hostile = cinnabar glow,
        Neutral = no glow (cool gray), Selected = gold glow + pulse animation.

    Faction two-color system:

        Each faction has a muted **base** (the body fill) and a distinct **accent**
        (the glyph/trim). Both live in a warm, earthy tone band. Vivid full-spectrum
        colors belong to the pigment palette, not to factions.

    Gold budget: Gold is intentionally rare. Only the primary CTA, selection halo,
        and current-turn indicator dot may use gold. Do not add gold elsewhere
        without consulting dev/aestheticConventions.md §13.6.

    Shadows: Use hard cartoon offset shadows (--shadow-card, --shadow-stack).