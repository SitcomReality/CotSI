# Layout Overhaul -- Implementation Plan

## Design Intent (synthesized from layoutidea.md, filtered through the styleguide)

**What we're building:** A three-zone chrome frame (top header bar, left/right sidebars, bottom log) that recedes into warm vellum and ink, leaving the hex-map miniature as the only saturated, vivid region on screen. The top bar becomes a pure gameplay HUD -- no branding, no version strings -- with a turn-order champion bar as its centerpiece. The sidebars get card-stock panels with crisp hierarchy. Map controls become marginalia. Everything obeys the Two-Layer Rule and the gold budget.

**Ideas from layoutidea.md we're adopting:**
- Header as pure HUD (Day/Week/Weather, champion turn-order bar, End Turn)
- Current-turn champion highlighted; already-played dimmed; yet-to-play light
- Dropdown detail card on current-turn hover/click with expanded stats
- Gold reserved for End Turn button and current-turn indicator only
- Responsive-grid class placeholder for future mobile reflow

**Ideas we're deliberately not adopting:**
- "Bottom bar as player panel" -- we're keeping the left sidebar for current-player detail; the bottom bar stays the log
- "Sight moved to modal" -- sight stays in the left panel; it's a frequent strategic read
- Showing all 7 expanded dropdowns simultaneously -- we'll show one at a time (current turn or hovered)

---

## Step 1 -- Audit & snapshot the current injection points

**Goal:** Confirm every DOM ID and JS function that touches the layout, so we don't miss a wire when renaming or restyling.

**Files to read (no edits):**
- `index.html` -- note every `id=` in `#game`, modals, and toasts
- `src/game/gameOrchestrator.js` -- the `refreshUI()` or equivalent function that calls `renderLeftPanel`, `renderRightPanel`, `renderLog`
- `src/render/panelComponents.js` -- the three render functions
- `src/ui/gameUIBindings.js` -- all `getElementById` calls and event bindings
- `src/ui/hud.js` -- toast, pulseEnd, showVictory (note any hardcoded element IDs)
- `styles/pages/game.css` -- the full grid and all selector chains
- `styles/components/hud.css` -- map-hud and map-controls rules

**Output:** A checklist of every `#id` and `.class` that will be renamed, removed, or added. This guards against orphaned event listeners or `getElementById` returning `null`.

---

## Step 2 -- Refactor the HTML shell (`index.html`)

**Goal:** Replace the current `#game` structure with a clean, semantic grid that maps to the new layout zones and uses the new token classes from day one.

**What changes:**
- Remove the old `.game-header` block entirely (branding, title, version string)
- Replace with new `<header id="gameHeader">` containing three slots:
  - `.header__world` -- Day/Week/Weather (JS-injected)
  - `.header__champions` -- turn-order champion bar (JS-injected)
  - `.header__actions` -- End Turn button (static) + Inspect icon button (static)
- Rename `#leftMount` -> `#leftPanel` (semantic)
- Rename `#rightMount` -> `#rightPanel` (semantic)
- Move map controls into `#mapMount` container as child elements (so they scroll/pan with the map conceptually, but are position-fixed within the mapwrap via CSS)
- Remove the standalone `.map-hud` div (moves/sight/position/zoom strip) -- this info moves into the left panel and marginalia
- Keep `#logMount` in the log bar; add a collapsible toggle button
- Add a `<div id="championDetail">` in the header area for the expandable detail dropdown (single element, repositioned by JS)
- Add CSS class `layout-root` to `#game` for the new grid system

**File modified:**
- `index.html`

---

## Step 3 -- Create the new header bar stylesheet

**Goal:** A thin (~44-48px) chrome header that feels like a vellum strip with ink text and one carefully placed gold element.

**New file:** `styles/components/header.css`

**Key rules:**
```css
/* styles/components/header.css */

.game-header {
  grid-area: header;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 var(--space-md);
  background: var(--vellum);
  border-bottom: var(--hair) solid var(--rule);
  box-shadow: var(--shadow-panel);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: var(--fs-sm);
  font-variant-numeric: var(--tnum);
  gap: var(--space-md);
}

/* World info (day, week, weather) */
.header__world {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  white-space: nowrap;
  color: var(--ink-soft);
  font-size: var(--fs-xs);
  letter-spacing: var(--ls-cap);
  text-transform: uppercase;
}

/* Champion turn-order bar (center) */
.header__champions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
  justify-content: center;
  list-style: none;
  margin: 0;
  padding: 0;
}

.header__champion {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: var(--r-sm);
  font-size: var(--fs-xs);
  font-variant-numeric: var(--tnum);
  cursor: pointer;
  transition: opacity var(--dur-fast) var(--ease-out);
  position: relative;
}

/* State variants (applied via JS as data attributes or classes) */
.header__champion[data-state="current"] {
  /* faction tint left-edge + gold indicator dot */
  border-left: 2px solid var(--faction-color, var(--ink));
  /* Gold dot via pseudo-element; counts against gold budget */
}
.header__champion[data-state="current"]::after {
  content: '';
  position: absolute;
  bottom: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--gold);
}
.header__champion[data-state="played"] {
  opacity: 0.45;
}
.header__champion[data-state="waiting"] {
  opacity: 0.75;
}

/* Actions zone (right) */
.header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}
```

Also add the champion detail dropdown styles:
```css
/* Champion detail dropdown -- thin card that extends below header */
.champion-detail {
  position: absolute;
  top: 100%;
  /* left positioned by JS to align with the champion slot */
  width: 180px;
  background: var(--parchment);
  border: var(--edge) solid var(--rule);
  border-radius: var(--r);
  box-shadow: var(--shadow-stack);
  padding: var(--space-sm);
  font-size: var(--fs-xs);
  color: var(--ink);
  z-index: 20;
  display: none;
}
.champion-detail.is-open { display: block; }
```

**File created:**
- `styles/components/header.css`

**File modified (import):**
- `styles/codex.css` -- add `@import "./components/header.css";` after hud.css

---

## Step 4 -- Create the header JS renderer

**New file:** `src/ui/headerRenderer.js`

**Responsibilities:**
- Export `renderHeader(G)` -- returns HTML string for the header world-info and champion bar
- Export `renderChampionDetail(champion)` -- returns HTML for the dropdown detail card
- Export `bindHeaderEvents()` -- attaches hover/click listeners to champion slots to show/hide the detail dropdown, and positions it correctly

**Data each champion slot displays:**
- Faction dot (colored circle, 8px, from `--faction-{name}` token)
- HP (current only, e.g. "85")
- Total potency sum (single number)

**Detail dropdown displays:**
- HP in "x/y" format (e.g., "85/100")
- Potency breakdown per faction (compact bars or colored numbers)
- Gold
- God's Knot count

**Gold budget note:** The current-turn indicator dot (4px, `::after`) is the **only** gold in the header besides the End Turn button. The dropdown card uses zero gold.

**Design constraint:** Each champion slot is narrow enough (~80-100px) that all 7 fit in the header on a 1280px screen. The dropdown is max 180px wide, so 7 could theoretically be open without overlap (though we only open one at a time).

**File created:**
- `src/ui/headerRenderer.js`

---

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

---

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

---

## Step 7 -- Restyle the log bar

**Files modified:**
- `src/render/panelComponents.js` -- `renderLog` function
- `styles/components/note.css` -- update or add log-specific rules

**New log design:**
- Collapsible bar at bottom of `#game` (can toggle height between 40px collapsed and ~160px expanded)
- Background: `var(--vellum)` with top border `var(--hair) solid var(--rule)`
- Log entries use `var(--ink-soft)` for standard lines, `var(--vermilion)` for combat damage/death lines, `var(--malachite)` for healing/gain lines
- Use the cloud-band pattern from `/assets/icons/patterns/fog-clouds.svg` as a faint `::before` decorative element if the log is empty or collapsed (a small "scroll unrolled" hint)
- Collapse toggle is an ink icon button (small chevron or scroll icon)

**Styleguide compliance:**
- No flat gray anywhere -- empty state uses vellum-dark wash
- Semantic state colors for log line types
- Pattern use reserved for empty/collapsed state (tactile scroll metaphor)

---

## Step 8 -- Restyle map controls as marginalia

**Files modified:**
- `styles/components/hud.css` -- completely rewrite map-controls section
- `index.html` -- move map control buttons into `#mapMount` container
- `src/ui/gameUIBindings.js` -- update IDs if changed

**New design:**
- Zoom in/out, reset view, center-on-champion -> four small circular buttons (28-30px diameter)
- Positioned bottom-right of the map area, stacked vertically with 4px gap
- Background: `var(--parchment)` with `var(--shadow-card)`
- Icons: monoline SVG icons from the sprite sheet -- use `i-zoomin.svg`, `i-zoomout.svg`, `i-center.svg`, and a new crosshair or target icon for "center on champion"
- Border: `var(--hair) solid var(--rule)`
- No text labels -- pure icon buttons with `title` attributes for tooltips
- Remove the old text-based `.map-hud` overlay entirely (moves/sight/position are now in the left panel; zoom percentage can be a tiny label under the zoom buttons or dropped)

**Styleguide compliance:**
- These are chrome marginalia -- quiet, small, ink icons on vellum
- No gold; no color fills; no glow
- One ink line language: icons match the shared stroke weight

---

## Step 9 -- Rewrite the game layout CSS with the token system

**Files modified:**
- `styles/pages/game.css` -- complete rewrite

**New grid:**
```css
/* styles/pages/game.css */
#game {
  display: grid;
  grid-template-areas:
    "header  header  header"
    "left    map     right"
    "log     log     log";
  grid-template-columns: 280px 1fr 300px;
  grid-template-rows: 48px 1fr auto;
  min-height: 100vh;
  background: var(--vellum);  /* table felt behind everything */
}

/* Mobile-responsive future-proof: class toggle on <body> */
body.is-mobile #game {
  grid-template-areas:
    "header"
    "map"
    "left"
    "right"
    "log";
  grid-template-columns: 1fr;
  grid-template-rows: 48px 1fr auto auto auto;
}
```

- All hardcoded colors (`#ead6a8cc`, `#c5a36a66`, etc.) replaced with tokens
- Sidebar backgrounds: `var(--vellum)` with a subtle rule-right border on leftbar, rule-left on rightbar
- Map area: `background: var(--vellum-2)` (the recessed board area)
- Log bar: `background: var(--vellum)`, `border-top: var(--hair) solid var(--rule)`

**File modified:**
- `styles/pages/game.css`

---

## Step 10 -- Wire the game orchestrator to refresh new DOM IDs

**Files modified:**
- `src/game/gameOrchestrator.js` -- update the refresh function
- `src/ui/gameUIBindings.js` -- update element ID references

**Changes:**
- `document.getElementById('leftMount')` -> `document.getElementById('leftPanel')`
- `document.getElementById('rightMount')` -> `document.getElementById('rightPanel')`
- Add call to `renderHeader(G)` injection into `#gameHeader`
- Add call to `bindHeaderEvents()` after each UI refresh (or once on init, using event delegation)
- Ensure `refreshUI()` (or equivalent) calls all four render functions: header, left panel, right panel, log
- Update `btnEndTurn` reference if its parent container changes
- Add `btnEndTurn` to the header actions zone (it moves out of the left panel into the top-right header)

**Note on the End Turn button:** It moves from the left panel to the header's `.header__actions` slot. This is the primary CTA and is always visible regardless of which panel the player is looking at. It remains the sole gold button on screen.

---

## Step 11 -- Create a component CSS file for the champion detail dropdown

**New file:** `styles/components/champion-detail.css`

Isolates the dropdown card styles that are currently sketched in header.css (Step 3). If the detail card grows in complexity, it has its own home.

**File created:**
- `styles/components/champion-detail.css`

**File modified (import):**
- `styles/codex.css` -- add import

---

## Step 12 -- Final sweep: styleguide compliance audit

**Goal:** Walk through every screen element and verify the Decision Checklist from the styleguide.

**Files to review (no expected changes unless drift is found):**
- All CSS in `styles/components/` and `styles/pages/`
- `src/render/panelComponents.js` -- final output HTML
- `src/ui/headerRenderer.js` -- final output HTML

**Checklist to run:**
1. **Layer?** Is anything in the chrome using saturated pigment fills? -> Should be only the map.
2. **Gold budget?** Count gold elements per screen: End Turn button (1), current-turn indicator dot (2), Heptagram hover ring (3, and only on hover). Any fourth? Demote it.
3. **No flat gray?** Search for `#888`, `#999`, `#aaa`, `gray`, `grey` in all stylesheets. Replace with `--ink-faint`, `--vellum-2`, or cloud-band pattern.
4. **No blackletter in UI?** Confirm `--font-accent` (UnifrakturCook) appears only in the wordmark (which we removed from the header -- it should now appear only on the setup screen title or nowhere in-game).
5. **One ink line language?** Check icon stroke weights in the sprite sheet vs any CSS borders -- should all be `--hair` or `--edge` consistently.
6. **Shadow audit?** No `box-shadow` with large blur radius (>20px) and no `rgba(0,0,0,...)` -- only the tokenized shadows.
7. **Squint test.** The center map area should be the only colorful region. Chrome should recede to warm neutrals.

**Files potentially modified during this step:**
- Any CSS file that fails the audit
- `assets/icons/sprite.svg` -- if any icon stroke widths are inconsistent

---

## Summary: file manifest

| Step | Action | Files |
|------|--------|-------|
| 1 | Audit | Read-only: `index.html`, `gameOrchestrator.js`, `panelComponents.js`, `gameUIBindings.js`, `hud.js`, `game.css`, `hud.css` |
| 2 | Refactor HTML | **Modify:** `index.html` |
| 3 | Header styles | **Create:** `styles/components/header.css` -- **Modify:** `styles/codex.css` |
| 4 | Header JS | **Create:** `src/ui/headerRenderer.js` |
| 5 | Left panel rewrite | **Modify:** `src/render/panelComponents.js`, `styles/components/panels.css` |
| 6 | Right panel rewrite | **Modify:** `src/render/panelComponents.js` |
| 7 | Log bar restyle | **Modify:** `src/render/panelComponents.js`, `styles/components/note.css` |
| 8 | Map controls restyle | **Modify:** `styles/components/hud.css`, `index.html`, `src/ui/gameUIBindings.js` |
| 9 | Game grid CSS | **Modify:** `styles/pages/game.css` |
| 10 | Wire orchestrator | **Modify:** `src/game/gameOrchestrator.js`, `src/ui/gameUIBindings.js` |
| 11 | Detail dropdown CSS | **Create:** `styles/components/champion-detail.css` -- **Modify:** `styles/codex.css` |
| 12 | Styleguide audit | **Modify:** any files that fail compliance checks |

**Total new files:** 3 (`header.css`, `headerRenderer.js`, `champion-detail.css`)  
**Total modified files:** 9-12 depending on audit findings

---

## Order of execution

The steps are designed to be followed in order, with each step producing a testable intermediate state:

1. **Audit** (confirm you know every wire)
2. **HTML shell** (new structure exists but looks broken until CSS/JS catch up)
3. **Header CSS** (header looks correct, sidebars still old)
4. **Header JS** (header is functional with champion bar)
5. **Left panel** (current player card is styled)
6. **Right panel** (Heptagram/weather/ledger styled)
7. **Log bar** (footer restyled)
8. **Map controls** (marginalia buttons)
9. **Game grid CSS** (entire layout snaps into final form)
10. **Orchestrator wiring** (all refresh paths work)
11. **Detail dropdown** (polish pass)
12. **Audit** (merge gate)

---