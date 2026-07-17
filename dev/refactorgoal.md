We have a beautiful game emerging, but the UI layer is a tangle of hand‑crafted HTML strings, duplicated inline styles, and scattered event listeners. **Separation of concerns** is the cure. We want a single coherent architecture that fits this vanillajs game, is practical to adopt incrementally, and will let us update the interface without fear.

---

## The three rules

**1. CSS owns all presentation**  
Inline styles should only exist for genuinely dynamic values (HP‑bar width, faction accent colours). Everything else — hover states, typography, shadows, transitions — belongs in `.css` files, driven by CSS custom properties and utility classes.

**2. Render functions are pure and thin**  
They should not fetch DOM elements, attach listeners, or perform game logic. Their job is to produce a *view model* (a plain object) and a small HTML scaffold that maps to that data via CSS variables and `data‑*` attributes. DOM updates that aren’t full re‑renders (like HP changes) should be done by a separate binding step that only touches the specific nodes.

**3. One event bus rules them all**  
Replace `addEventListener` directly on individual elements with a single delegated handler that reads `data-action` attributes. This decouples the markup completely from the JavaScript wiring and makes adding new interactions trivial.

---

## Proposed architecture

```
┌─────────────────────────────────────────┐
│               GAME STATE (G)            │ ← we already have this
└──────────────────┬──────────────────────┘
                   │
      ┌────────────▼────────────┐
      │   VIEW‑MODEL FUNCTIONS  │ pure transformers
      │ (getHeaderVM, getChampVM)│ → plain objects
      └────────────┬────────────┘
                   │
      ┌────────────▼────────────┐
      │   RENDER / BIND STEP    │ updates static skeletons
      │ (apply CSS vars,        │ or returns small fragments
      │  textContent, etc.)     │ for dynamic lists
      └────────────┬────────────┘
                   │
      ┌────────────▼────────────┐
      │      DOM (index.html)   │ permanent data-ui hooks
      └────────────┬────────────┘
                   │
      ┌────────────▼────────────┐
      │  DELEGATION ACTION BUS  │ single listener at root
      │ reads [data-action],    │ calls appropriate handlers
      │ dispatches game actions │
      └─────────────────────────┘
```

* **Game state** (`G`) is the single source of truth, already global via `window.__gameState` and your `currentChamp` helpers.  
* **View‑model functions** (e.g., `getChampVM(state, champ)`) compute all derived values — HP percentage, max moves, potency arrays — and return a flat object.  
* **Binding / render** uses that view model to populate a **static HTML skeleton** that lives right in `index.html` (or inside `<template>` elements for repeatable molecules like champion pills). For one‑off panels, we just update the existing DOM elements; for dynamic lists (mobs, traders), we generate small HTML fragments using the view model but still no inline styles.  
* **The action bus** (in `uiEvents.js`) listens on the whole document, checks `e.target.closest('[data-action]')`, and calls the appropriate game logic. All buttons, clickable icons, etc., carry `data-action="endTurn"`, `data-action="zoomIn"`, etc.



* `src/ui/utils/dom.js` – the `h()` DOM builder:
      Create a real DOM element.
      usage: h('div', { class: 'foo', dataAction: 'clickMe' },
            h('span', {}, 'Hello'), ' World')



* `src/ui/actionBus.js` – the single delegated event listener
      Central dispatch for all [data-action] clicks.
      registerAction(action, fn)


## Why?

- **Zero breakage when restyling**: Change a class name in CSS, no JavaScript touches it.
- **Performance**: No wholesale `innerHTML` destruction; only targeted textContent/style updates.
- **Testability**: View‑model functions are pure and easy to unit test.
- **Onboarding new developers**: The architecture is standard, predictable, and documented.