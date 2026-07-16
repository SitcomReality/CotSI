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