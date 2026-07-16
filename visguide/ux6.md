## Step 6 -- Rewrite the right panel (Heptagram + Weather + Ledger)

**Files modified:**
- `src/render/panelComponents.js` -- rewrite `renderRightPanel` function

**New right panel structure:**

```
+- Heptagram Card --------------------------------------+
|  Paley Heptagram                                       |
|  [interactive SVG widget -- gold ring on hover only]    |
|  i -> i+1,i+2,i+4   (hint in --ink-soft, small)        |
+-------------------------------------------------------+

+- Weather Card ----------------------------------------+
|  Divine Weather -- Rainbow Aftermath                    |
|  Weather description text                              |
|  [potency modifier tags as small ink pills]            |
|  Day length ×1.0                                       |
+-------------------------------------------------------+

+- Champion Ledger (flex:1, scrollable) ----------------+
|  [sorted by turn order for current day]                |
|  Each row:                                             |
|    [faction dot] Name  ·  Human/Bot                   |
|    HP xx  ·  Relics x  ·  Gold x                       |
|    [potency tokens as tiny colored numbers]            |
|  Current-turn row: subtle vellum-2 highlight           |
|  Dead champions: opacity 0.5, strikethrough or italic  |
+-------------------------------------------------------+
```

**Styleguide compliance:**
- All cards use `var(--parchment)` or `var(--ivory)` with `--shadow-card`
- Faction indicators are dots or left-edge rules only
- Heptagram widget: ink lines, gold only on hover (CSS `:hover` transition on stroke color)
- Weather tags use `var(--rule)` border, ink text -- no filled faction colors in chrome