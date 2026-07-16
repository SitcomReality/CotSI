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