## 🧠 Architecture & Nomenclature Audit

### Layer map (simplified import graph)

```
src/core/               Domain-agnostic math & data
  factions.js           Faction list, beats, potencyWithPrimary, artifacts
  paley.js              scorePower (3 lines) + re-exports beats
  weather.js, prng.js, rng.js

src/render/             Pure DOM/SVG canvas output
  paley.js              paleySVG() — heptagram SVG
  hexmap3d/             3D scene (scene, terrain, units, interaction)
  panels/               leftPanel, rightPanel, logBar
  effects/              fog, selection ring, movement highlights

src/ui/                 Event binding, widget lifecycle, DOM patching
  paleyWidget.js        Interactive behaviour: highlight, select, hover
  combat/paleySync.js   Bridge widget ↔ combat token hover
  headerRenderer, hud, mapView, modal, setup, gameUIBindings

src/game/               Game logic (turn, combat, movement, AI)
src/world/map.js        Hex coordinate utilities
src/entrypoint.js       Side-effect bootstrap + duplicate potencyWithPrimary
```

### Ambiguities found

| Problematic term | Appears as (JS) | Appears as (CSS) |
|---|---|---|
| **`tokens`** | `champ.tokens` — an array of 7 numeric potency values per faction | `styles/abstracts/tokens/` — directory of CSS custom property files |
| **`paley`** | `src/core/paley.js`, `src/render/paley.js`, `src/ui/paleyWidget.js` | N/A — but three files share the same short stem across different layers |
| **`potencyWithPrimary`** | Defined in `src/core/factions.js` | Duplicated verbatim in `src/entrypoint.js` as a window global |

---

## 🏷️ Rename Plan (Clarity > Brevity)

### 1. `src/core/paley.js` → `src/core/scorePowerPaleyMath.js`

**Impact:** Only `src/game/combat.js` imports `{ scorePower }` from `'../core/paley.js'`. Simple import path update.

---

### 2. `src/render/paley.js` → `src/render/heptagramSVG.js`

**Impact:** Imported by `src/render/panels/rightPanel.js` and `src/ui/paleyWidget.js`. Update two imports.

---

### 3. `src/ui/paleyWidget.js` → `src/ui/heptagramWidget.js`

**Impact:** Imported by `src/game/gameOrchestrator.js` and indirectly via `window.*` assignments. Update import in orchestra and any references in HTML test pages (if any). The `window.setPaleyHighlight` etc. function names should also be renamed for consistency (see §4).

---

### 4. Window-level API names

The current window globals set by `paleyWidget.js`:
```
window.setPaleyHighlight
window.getPaleyHighlight
window.initPaleyWidget
```

These are consumed by other modules (e.g. `combat/renderer.js` calls `setPaleyHighlight`). To maintain coherence with the new filenames, rename these to:
```
window.setHeptagramHighlight
window.getHeptagramHighlight
window.initHeptagramWidget
```

This is a **breaking change** — every callsite must update. Callsites:
- `src/ui/combat/renderer.js` (imports `setPaleyHighlight` from `paleyWidget`)
- `src/ui/combat/paleySync.js` (references `window._onPaleyHover` — this one is fine because it uses a different function name)
- Any external scripts referencing the old names.

---

### 5. The `tokens` collision — which side moves?

**Current state:**
- **CSS directory:** `styles/abstracts/tokens/` — design tokens (chrome, factions, motion, pigments, etc.)
- **JS model:** `champ.tokens` — an array of 7 numbers representing faction-oriented potency counters

**The collision hurts readability:** When you see `tokens` in CSS, you think design variables. When you see `champ.tokens` in JS, you think "oh, those are the potency values." But there's also a concept of "potency token" in the UI (`class="rt-potency-token"`). So the JS field is actually called `tokens` but the UI renders it as "potency tokens."

**Recommendation:** Rename the JS field from `tokens` to `potencies` (or `potencyArray`). This makes the following changes:
- `src/core/factions.js` — `potencyWithPrimary` function and any champ construction site in `gameFactory`
- `src/render/panels/rightPanel.js` — rendering code currently reads `champ.tokens` (rename to `champ.potencies`)
- `src/entrypoint.js` — duplicated `potencyWithPrimary` uses `ch.tokens`

**Why not rename the CSS directory?** Because the styleguide (v1) explicitly refers to "Token Sheet" and the design token concept is well-established in frontend architecture. Renaming the directory would require a styleguide update, but more importantly, there is no ambiguity within CSS files: `styles/abstracts/tokens/` only contains CSS custom property files. The collision only occurs when reading a JS file and seeing `tokens` and wondering which domain is being referenced.

**Verdict:** Move the JS field. The game mechanic is "potency" (or "potency counters"), not "tokens." The UI already calls them potency tokens — let the model follow. This also aligns with `scorePower`, `potencyWithPrimary`, and `w.name.potency` (weather potency array) which already use the word "potency."

---

### 6. `src/entrypoint.js` — remove duplicate `potencyWithPrimary`

The window global `window.__SUPERNAL__.potencyWithPrimary` is an exact inline copy of the code in `src/core/factions.js`. Replace with a re-export:

```javascript
// src/entrypoint.js
import { potencyWithPrimary } from './core/factions.js';
window.__SUPERNAL__ = { potencyWithPrimary };
```

Or just remove it if nothing external depends on it. But given it's declared as "Global helper for computing Paley&#8209;weave potency", it's probably used by debugging tools or HTML pages. Keep it, but import rather than duplicate.

---

### 7. Minor: `src/render/hexmap3d/scene/scene.js` — path redundancy

The nested directory/file naming `scene/scene.js` could be `scene/setupScene.js` or `scene/sceneManager.js`. This is a lower priority, but I'd flag it as an inconsistency. The rest of the hexmap3d submodules use descriptive names like `interaction/click.js`, `features/mountains.js`, etc. Only `scene/` repeats the parent dir name. Rename file to `manager.js` or `sceneSetup.js`.

---

## 📋 Summary of Proposed Changes

| File(s) | Change | Impact level |
|---|---|---|
| `src/core/paley.js` → `src/core/heptagramMath.js` | Rename file + update import in `src/game/combat.js` | Low (1 import) |
| `src/render/paley.js` → `src/render/heptagramSVG.js` | Rename file + update imports (2 files) | Low |
| `src/ui/paleyWidget.js` → `src/ui/heptagramWidget.js` | Rename file + update imports + update window API names | Medium (3-4 callsites) |
| `champ.tokens` → `champ.potencies` | Model field rename across `factions.js`, `rightPanel.js`, `entrypoint.js`, `gameFactory.js` | Medium (model change requires verifying all reads) |
| `styles/abstracts/tokens/` | No change (CSS tokens are a different conception) | None |
| `src/entrypoint.js` duplicate | Import from factions instead of inline copy | Low |
| `src/render/hexmap3d/scene/scene.js` → `scene/setupScene.js` | Rename file only (no export changes) | Very low |

---

## 🛠 Recommended Execution Order

1. **Rename the field `tokens` → `potencies` first** (most impactful for clarity, and it's a mechanical find/replace across JS files). Requires careful grep to ensure no unrelated `tokens` are caught.
2. **Rename `src/core/paley.js` → `heptagramMath.js`** — isolated, low risk.
3. **Rename `src/render/paley.js` → `heptagramSVG.js`** — update two imports.
4. **Rename `src/ui/paleyWidget.js` → `heptagramWidget.js`** + update window API names and all callsites.
5. **Clean up entrypoint duplicate**.
6. **Optional:** Rename `scene/scene.js`.

---

## 📐 Styleguide Alignment Check

- **Two-Layer Rule:** The separation between `render/` (canvas/SVG output) and `ui/` (interactive behaviour) parallels the chrome vs. miniature split. The rename reinforces this boundary by making modules self-describing.
- **Coherence over novelty:** Using "heptagram" as a consistent prefix for all **heptagram-domain** files (`heptagramMath`, `heptagramSVG`, `heptagramWidget`) makes it obvious they belong together.
- **Legibility first:** A developer reading the codebase for the first time will immediately understand what `heptagramMath.potencies` refers to vs. `tokens/chrome.css`.