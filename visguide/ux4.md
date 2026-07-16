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

**Gold budget note:** The current-turn indicator dot (4px, `::after`) is the only gold in the header besides the End Turn button. The dropdown card uses zero gold.

**Design constraint:** Each champion slot is narrow enough (~80-100px) that all 7 fit in the header on a 1280px screen. The dropdown is max 180px wide, so 7 could theoretically be open without overlap (though we only open one at a time).