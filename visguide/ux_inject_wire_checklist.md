Injection Points & Wire Checklist

### A. HTML Shell — IDs in `index.html`

| ID / Element | Purpose | Status |
|---|---|---|
| `#setup` | Setup screen container | Keep |
| `#game` | Game container (`display:grid`) | Keep (class change? No) |
| `.game-header` | Top bar (3-column span) | ✦ **Will be overhauled** — new HUD structure |
| `#dayLabel` | "Day 1 • Rainbow Aftermath" | Move into new .game-header |
| `.game-title` | Branding text (currently shown) | ✦ **Remove per spec** — no branding in HUD |
| `#leftMount` | Left sidebar injection point | Keep (but content will change) |
| `.mapwrap` | Map wrapper | Keep |
| `.map-hud` | Moves/Sight/Pos/Zoom overlay | ✦ **Remove** — becomes marginalia? Spec says map controls become marginalia |
| `#hudMoves` | Moves display | Repurpose or remove |
| `#hudSight` | Sight display | Remove |
| `#hudPos` | Position display | Remove |
| `#hudZoom` | Zoom display | Keep for marginalia |
| `.map-controls` | Zoom buttons container | Reposition as marginalia |
| `#zoomIn` | Zoom in button | Keep |
| `#zoomOut` | Zoom out button | Keep |
| `#zoomReset` | Reset view button | Keep |
| `#centerChampion` | Center button | Keep |
| `#mapMount` | Hex map mount point | Keep |
| `#rightMount` | Right sidebar injection | Keep |
| `.rightbar` | Right sidebar container | Keep (but restyle) |
| `.log-bar` | Log bar container | Keep (restyle) |
| `#logMount` | Log content injection | Keep |
| `#combatModal` | Combat modal | Keep |
| `#rewardModal` | Reward modal | Keep |
| `#victoryModal` | Victory modal | Keep |
| `#toast` | Toast notification | Keep |
| `#tooltip` | Tooltip | Keep |

### B. Orchestrator — `src/game/gameOrchestrator.js`

| Function/Line | ID/Element Accessed | Action |
|---|---|---|
| `__beginGame` | `document.getElementById('setup')` | Keep |
| `__beginGame` | `document.getElementById('game')` | Keep |
| `refreshAll()` | `document.getElementById('leftMount')` | Keep injection target |
| `refreshAll()` | `document.getElementById('rightMount')` | Keep injection target |
| `refreshAll()` | `document.getElementById('mapMount')` | Keep |
| `refreshAll()` | `document.getElementById('hudMoves')` | ✦ **Will be removed** |
| `refreshAll()` | `document.getElementById('hudPos')` | ✦ **Will be removed** |
| `refreshAll()` | `document.getElementById('hudSight')` | ✦ **Will be removed** |
| `refreshAll()` | `document.getElementById('dayLabel')` | Move to new header |
| `refreshAll()` | `initPaleyWidget('paleyMount')` | Keep |
| `refreshAll()` | `document.getElementById('logMount')` | Keep |

### C. Panel Components — `src/render/panelComponents.js`

| Template String | Classes/IDs Generated | Action |
|---|---|---|
| `renderLeftPanel` | `.panel.brand-panel`, `.turn-who`, `.turn-avatar`, `.turn-name`, `.turn-meta` | ✦ **Restyle** into card-stock panel |
| `renderLeftPanel` | `.panel.stat-grid`, `.sbox`, `.sl`, `.sv` | ✦ **Restyle** hierarchy |
| `renderLeftPanel` | `.panel.actions`, `#btnInspect`, `#btnEndTurn` | Keep (restyle) |
| `renderRightPanel` | `.panel`, `#paleyMount`, `.hint` | Keep (restyle) |
| `renderRightPanel` | `.panel.score-panel`, `.score-entry` | Keep (restyle) |
| `renderLog` | `.log`, `.logline` | Keep (restyle) |

### D. UI Bindings — `src/ui/gameUIBindings.js`

| `getElementById` / Listener Target | Action |
|---|---|
| `#btnEndTurn` | Keep |
| `#zoomIn` | Keep |
| `#zoomOut` | Keep |
| `#zoomReset` | Keep |
| `#centerChampion` | Keep |
| `#btnInspect` (delegated click) | Keep |
| Keyboard: `c`, `r`, `+`, `-`, `space` | Keep |

### E. HUD — `src/ui/hud.js`

| `getElementById` | Action |
|---|---|
| `#toast` | Keep |
| `#btnEndTurn` (pulseEnd) | Keep |
| `#victoryText` | Keep |
| `#victoryModal` | Keep |

### F. CSS — `styles/pages/game.css`

| Selector Chain | Action |
|---|---|
| `#game` (grid: `320px 1fr 340px` / `auto 1fr`) | ✦ **Will change** — new 3-zone chrome |
| `.game-header` | ✦ **Replace entirely** — new top bar with champion bar |
| `.leftbar`, `.rightbar` | Keep containers, restyle backgrounds |
| `.mapwrap` | Keep, restyle borders |
| `#mapMount` | Keep |
| `.turn-who`, `.turn-avatar`, `.turn-name`, `.turn-meta` | Keep classes (may rename) |
| `.actions` | Keep |
| `.wtag` | Keep |
| `.score-entry` | Keep |
| `.log` | Keep |
| `.log-bar` | Keep (restyle) |

### G. CSS — `styles/components/hud.css`

| Selector Chain | Action |
|---|---|
| `.map-hud` | ✦ **Remove** — repositioned as marginalia |
| `.moves-pill` | ✦ **Remove** or repurpose |
| `.map-controls` | Reposition to marginalia area |

### H. CSS — `styles/components/panels.css`

| Selector Chain | Action |
|---|---|
| `.panel` | Keep (restyle to card-stock) |
| `.panel h4` | Keep |

### I. Chrome Tokens — `styles/abstracts/tokens/chrome.css`

| CSS Custom Property | Value | Usage |
|---|---|---|
| `--vellum` | `#efe4c8` | Page ground |
| `--vellum-2` | `#e6d6b0` | Recessed panels |
| `--parchment` | `#f6eed8` | Card/sheet fill |
| `--ivory` | `#fbf6e9` | Raised card |
| `--ink` | `#221c14` | Body text |
| `--ink-soft` | `#5a4f3e` | Secondary text |
| `--ink-faint` | `#8a7d66` | Placeholders |
| `--rule` | `#c9b48a` | Hairlines |
| `--rule-strong` | `#b39a6a` | Dividers |

---

## Summary: Key Wires That Must Be Touched

| # | Wire | Risk | Action |
|---|---|---|---|
| 1 | `.game-title` text node (`index.html` + CSS) | Stale branding text in DOM | Remove element |
| 2 | `.map-hud` + `#hudMoves`, `#hudSight`, `#hudPos` | Orphaned event listeners? No — only styled, no JS references except `refreshAll()` | Remove from HTML + CSS + JS |
| 3 | `.game-header` CSS grid span (`1 / -1`) | Layout breaks if removed | Replace with new header HTML |
| 4 | `#dayLabel` | Referenced in `refreshAll()` | Move into new top-bar structure |
| 5 | `.leftbar` / `.rightbar` CSS `padding`/`background` | Visual inconsistency | Restyle with vellum + card-stock |
| 6 | `.map-controls` position | Needs repositioning | Move to marginalia |
| 7 | `.panel` border-radius/shadow | Needs card-stock refinement | Adjust |

**No orphaned event listeners detected** — all `getElementById` calls in JS currently resolve to elements that exist in the HTML. The audit confirms a safe state to begin the transformation.