# AGENTS.md — Champions of the Supernal Interregnum

---

## Project

CotSI is a browser-based, single-player hex-crawl strategy game, early in development. Seven faction champions move, fight, trade, and dig for relics on a procedurally generated hex map. Combat uses a 7-node Paley tournament (each power beats 3, loses to 3).

**Stack:** Vanilla JS (ES modules) + plain CSS. No framework, no bundler, no build step. Three.js for 3D rendering (`src/vendor/`). Served as static files from any HTTP server (ES modules require an origin — opening `index.html` from disk fails).

**Test:** `python3 dev/check_imports.py` verifies all imports resolve and checks layer boundaries. No formal test runner. AI devs can't run the game; the user tests on request.

**The User Can Help:** If there's ambiguity or confusion, ask questions. If there are complicated bugs, add console logs or debug features and the user will report results to help narrow it down.

---

## Source Layout

| Directory | Purpose | May import |
|-----------|---------|------------|
| `src/engine/` | Reusable pure mechanics (hex math, RNG, noise) | `shared/`, itself |
| `src/game/rules/` | Pure game-specific logic (factions, combat, terrain) | `engine/`, `shared/`, itself |
| `src/game/state/` | Mutable state, queries, mutations | `engine/`, `game/rules/`, itself |
| `src/runtime/` | Cross-layer orchestration (startup, turns, refresh) | everything |
| `src/render/` | Three.js + Canvas2D (reads state, never mutates) | `shared/`, `engine/`; state via args |
| `src/ui/` | DOM: panels, modals, widgets, view-models | `shared/`, `ui/`; dispatches via actionBus |
| `src/shared/` | Leaf infrastructure (`actionBus.js`, `clockScheduler.js`) | nothing local |
| `src/vendor/` | Third-party Three.js builds | do not edit |

**Hard rules:**
- `game/` never imports `runtime/`, `render/`, or `ui/`
- `render/` and `ui/` never mutate game state
- `shared/` imports nothing project-local
- Circular deps only in `runtime/` + `game/state/liveGame.js`

```js
import { G, currentChamp } from './src/game/state/liveGame.js';
window.__gameState; // same object as G
```

---

## Key Conventions

**JavaScript:**
- ES modules, `const`/`let`, two-space indent
- File names: `camelCase.js`, self-explanatory without directory context
- Banned names: `utils`, `helpers`, `common`, `misc`, `controller`, `manager`, `logic`, `service`
- `index.js` only as a zero-logic barrel re-export
- Hex coords: `{ q, r }` objects, `"q,r"` string keys

**UI interactions:**
- `data-action="foo"` on elements, register via `registerAction('foo', handler)` from `src/shared/actionBus.js`
- Dynamic DOM with `h()` from `src/ui/domBuilder.js`, not `innerHTML`
- Derived UI data in `src/ui/viewModels/`

**Timers:** Always use `getClock()` from `src/shared/clockScheduler.js` — never raw `setTimeout`/`setInterval`/`rAF`. Specify a speed group: `'bot'`, `'combat'`, `'animation'`, `'ui'`, or `'default'`. Full API: `dev/clockScheduler.md`.

**Styling:** Tokens in `styles/abstracts/tokens/`, imported via `styles/abstracts/variables.css`. All `@import`s in `styles/codex.css`. Inline styles only for dynamic custom properties. See `dev/cssConventions.md` and `dev/aestheticConventions.md`.

---

## Detailed Docs

| Document | Covers |
|----------|--------|
| `dev/srcConventions.md` | Architecture principles, layer rules, naming, decision guide |
| `dev/cssConventions.md` | CSS structure, naming, spacing scale, barrel pattern |
| `dev/aestheticConventions.md` | Visual design system (aspirational, evolving) |
| `dev/clockScheduler.md` | Clock API reference — all timer/scheduling patterns |
| `dev/gameMechanics.md` | Combat round flow, turn order, biome system |
| `dev/commonTasks.md` | How-to recipes for common changes |

---

## The User

I'm SitcomReality, the creator. I read only English. I'm a competent coder but don't always remember every system detail — happy to clarify. For complex bugs, I prefer adding console logs to narrow things down; I'll test and report back. This is a collaborative process.

---

## Use Sub-Agents Liberally

Spawning agents to perform investigations deeper into subsystems is extremely useful to keep context limited to only what's needed.