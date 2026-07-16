## Step 5 -- Rewrite the left panel (current champion card)

**Files modified:**
- `src/render/panelComponents.js` -- rewrite `renderLeftPanel` function
- `styles/components/panels.css` -- add new panel variant classes

**New left panel structure (from top to bottom):**

```
+- Champion Card (vellum panel, --shadow-stack) --------+
| [Faction dot] Crucible          Moves 2/5              |
| HP ?????????? 85/100           [buff tags if any]      |
|                                                        |
| +- Resources row (compact icon wells) --------------+  |
| |  ? 12 Relics    ? 8 Gold    ? 3 Knots           |  |
| +----------------------------------------------------+  |
|                                                        |
| +- Equipment row (icon wells, monoline icons) -------+ |
| |  ? Steel Blade    ? Leather Robes                |  |
| |  ? Artifact: Lens                                 |  |
| +----------------------------------------------------+  |
|                                                        |
| Potency (collapsed by default, toggles open)            |
| +----------------------------------------------------+  |
| | [faction bars]                                     |  |
| +----------------------------------------------------+  |
|                                                        |
| [Inspect (ink button)]   [End Turn ? (GOLD BUTTON)]    |
+--------------------------------------------------------+
```

**Key styleguide compliance:**
- Panel background: `var(--parchment)` with `var(--shadow-stack)`
- Faction color appears only as a thin left-edge rule (2px) and the faction dot -- never a full fill
- Resource icons use the new SVG sprite icons from `/assets/icons/actions/`
- Equipment slots use `assets/icons/actions/i-attack.svg` and `assets/icons/actions/i-flee.svg` (or similar) as ink-colored monoline icons
- HP bar uses `var(--ink)` for the filled portion, `var(--vellum-2)` for the track -- no flat gray
- End Turn button uses `btn-gold` class (gold budget: 1 element in left panel)
- All text in `--ink` or `--ink-soft`; numbers use `--tnum`