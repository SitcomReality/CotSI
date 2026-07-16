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