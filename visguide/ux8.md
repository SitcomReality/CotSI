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