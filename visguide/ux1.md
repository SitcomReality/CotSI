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