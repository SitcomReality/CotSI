**Plan: Convert Left Champion Card to a Floating HUD Element**

---

### 1. HTML changes (`index.html`)

**Remove**
```html
<!-- Left sidebar: renamed id, same class for now -->
<aside class="leftbar" id="leftPanel">
  <!-- JS inject -->
</aside>
```

**Add** inside `<section class="mapwrap">` → `<div id="mapMount">`:
```html
<div id="championHud" class="champion-hud">
  <!-- JS will inject the left champion card here -->
</div>
```

---

### 2. CSS changes

#### a) `styles/layout/game-grid.css`

- Remove the `left` grid area and the full `.leftbar` style block.
- Update `grid-template-areas` to two columns (header, map, right, log).
- Update `grid-template-columns` to remove the 280px column.

**New code:**
```css
#game {
  display: grid;
  grid-template-areas:
    "header  header"
    "map     right"
    "log     log";
  grid-template-columns: 1fr 300px;   /* map expands to fill left space */
  grid-template-rows: 48px 1fr auto;
  min-height: 100vh;
  background: var(--vellum);
}

/* Leftbar and its styles are removed entirely */
```

#### b) `styles/components/left-champion-card.css`

Add a small wrapper rule for the floating container, and convert the card itself to an absolutely‑positioned overlay:

```css
/* New: floating HUD wrapper */
.champion-hud {
  position: absolute;
  bottom: var(--s4);
  left: var(--s4);
  z-index: 10;
  pointer-events: none;  /* allow clicks to pass through the wrapper */
}

.left-champion-card {
  pointer-events: auto;  /* the card itself is interactive */
  width: 280px;          /* same width as the old sidebar panel */
  background: var(--parchment);
  border: var(--edge) solid var(--rule);
  border-radius: var(--r);
  box-shadow: var(--shadow-panel);   /* slightly larger shadow to float above map */
  padding: var(--space-sm);
  border-left: 2px solid var(--faction-color, var(--ink));
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: var(--fs-sm);
  color: var(--ink);
  font-variant-numeric: var(--tnum);
  /* Remove any flex‑context width that assumed sidebar */
}
```

(No other changes needed to the existing `.left-champion-card` sub‑classes.)

#### c) `styles/ui/responsive.css`

Update the mobile layout: since there is no leftbar, the grid areas become:

```css
body.is-mobile #game {
  grid-template-areas:
    "header"
    "map"
    "right"
    "log";
  grid-template-columns: 1fr;
  grid-template-rows: 48px 1fr auto auto auto;
}
```

The floating `#championHud` will sit inside the map area on mobile as well; its absolute position will keep it in the bottom‑left of the map view.

---

### 3. JavaScript changes (`src/game/gameOrchestrator.js`)

In `refreshAll()`, change the target for the left champion card from `document.getElementById('leftPanel')` to `document.getElementById('championHud')`:

```javascript
// Before:
document.getElementById('leftPanel').innerHTML = renderLeftPanel(G, ch);

// After:
document.getElementById('championHud').innerHTML = renderLeftPanel(G, ch);
```

No other JS file needs to change; `renderLeftPanel` still returns the same HTML string. The `panels-index.js` barrel export remains unchanged.

---

### 4. Map controls – no conflict

Current CSS shows `.map-controls` positioned `bottom: var(--s4); right: var(--s4);` (bottom‑right corner). Our floating card is bottom‑left, so there is no overlap. The buttons will remain visible in the bottom‑right.

---

### 5. Summary of files to touch

| File | Change |
|---|---|
| `index.html` | Remove `<aside class="leftbar"/>`, add `<div id="championHud"/>` inside `#mapMount` |
| `styles/layout/game-grid.css` | Remove `left` area, re‑grid to two columns |
| `styles/components/left-champion-card.css` | Add `.champion-hud` absolute‑position wrapper; adjust `.left-champion-card` width & pointer‑events |
| `styles/ui/responsive.css` | Remove `leftbar` from mobile layout |
| `src/game/gameOrchestrator.js` | Replace `document.getElementById('leftPanel')` with `document.getElementById('championHud')` |