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