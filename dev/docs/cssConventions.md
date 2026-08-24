CSS Conventions

The living rulebook for authoring styles. For full design-system rationale see dev/docs/aestheticConventions.md; for architecture decisions see dev/docs/systemArchitecture.md.
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
│   ├── tokenSheet.css         # Dev-reference sheet — imported last in codex.css,
│   │                          #   NOT part of the game UI (see its header)
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
│   ├── loadingOverlay.css     # Full-screen loading veil
│   ├── modalShell.css         # Shared modal chrome
│   ├── setupScreen.css, setupControls.css, dispatchModal.css, rewardModal.css,
│   │   confirmModal.css, deathModal.css, heraldModal.css, optionsModal.css,
│   │   tradeModal.css
│   ├── headerPanel.css, logPanel.css, mainLog.css, minimap.css
│   ├── heptagramWidget.css, tooltip.css, mapControls.css, fog.css, tile.css,
│   │   bot-indicator.css, weatherDisplay.css
│   ├── turnChrome.css           # Turn-tint identity layer (consumes --turn-*)
│   ├── facet.css                # .chamfer low-poly corner cuts
│   ├── championDetail.css
│   ├── potencies.css, swatch.css, panel.css
│   ├── note.css, forms.css, textTreatment.css
│   ├── hud.css, paleyCrossHighlight.css
│   ├── devTools.css, devToolsContent.css
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

Four groups, ordered by rate of change, plus one dev-only appendix. Later wins:
Group	Order	Purpose
1. Abstracts	1st	Tokens + reset
2. Layout	2nd	Page skeleton
3. Components	3rd	One file per UI piece
4. UI overrides	4th	Accessibility, responsive overrides
5. tokenSheet.css	last	Dev-reference token sheet (flagged in codex.css as not part of game UI; candidates for its own entry point)

Use bare @import "path" (no url()). All imports live in codex.css or barrel files.
Naming Conventions

    File names: lowerCamelCase.css (one legacy kebab-case exception: bot-indicator.css). When a JS module has a companion stylesheet they share the same base name (e.g. combatModal.js ↔ combatModal.css). Visual‑only files are named for the concern (panel.css).

    Banned file names: utilities, common, helpers, misc, overrides, styles. Do not create these.

    Class names: BEM — block__element--modifier (.header-panel__champion, .pip__val, .paley-item--f0). Block names are kebab-case (.combat-modal, .left-hp-row).

    Modifiers: BEM -- modifier on the block (.paley-item--f0, .header-panel__champion--dead) or a second state class (.active, .selected, .disabled, .btn.primary). Avoid new is-* / has-* prefixes — the existing ones (.is-mobile, .is-human) are legacy.

    No ID selectors for styling. IDs (#game, #mapMount, #setup, #combatModal) belong to the HTML skeleton / modal roots only; style their contents via classes. Accepted exception: the turn-tint frame layer (`turnChrome.css`) styles the header root and modal roots' frames (#gameHeader, #combatModal .modal-card) because those ARE the frames being tinted.

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

    Renaming? Update @import paths in codex.css and any barrel files. If class names change, update JS className strings. Run python3 dev/scripts/check_imports.py.

    When in doubt: Match the file name to the JS module or visual concern. Use kebab‑case classes. Reference spacing tokens. No new pages/ directory – full‑screen views are components.

For visual design rules (two-layer system, ink outlines, color architecture, typography,
state glow conventions, gold budget), see `dev/docs/aestheticConventions.md`.

Shared Chrome Utilities (v5)

    --turn-* tokens: --turn-color / --turn-glow / --turn-base set on <html> by src/ui/turnTint.js on every refreshAll. All player-affiliated chrome reads them; Herald's Prognosis and the death announcement never do (modal--neutral).

    .chamfer (facet.css): 45° corner cut for key cards. Uses filter: drop-shadow because clip-path swallows box-shadows. Never apply to large continuously-animated surfaces (combat arena).

    .glint (modalShell.css): 2px iridescent bar at the top of an important frame.

    .modal-footer (modalShell.css): sticky accept bar inside scrollable modal cards. Every modal's primary action must live in one — a modal that can soft-lock the game is a release blocker.

    Modal overflow pattern: .modal scrolls (overflow-y: auto + safe-area padding); cards cap at calc(100dvh - 2*var(--s4)) with overflow-y: auto; .modal > * uses margin: auto (flex-centering overflow bug).

    Luminous faction variants: --f-*-ui / --f-*-ui-glow (and FACTIONS[].uiColor/uiGlow) are the chrome-layer hues. The world's muted base/accent/glow values are fixed — never reuse ui variants on the world layer.