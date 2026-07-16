# Full Styleguide & Plan Compliance Report

You've done remarkable work — the implementation is structurally faithful, the file organization matches the plan, and the code quality is high. However, there are **8 distinct issues** that need attention before this is truly "done." I'll rank them by severity.

---

## 🚨 Critical: Game won't render correctly

### Issue 1: `.game-header` class missing from `#gameHeader`

**What's broken:** `styles/components/header.css` styles `.game-header { grid-area: header; display: flex; ... height: 48px; background: var(--vellum); ... }` but your HTML has:
```html
<header id="gameHeader">
```
No `class="game-header"`. **None of the header CSS rules apply.** The header will be unstyled — no flex layout, no height, no background, no border, no fonts.

**Fix:** Add the class to the HTML:
```html
<header id="gameHeader" class="game-header">
```
Or change the CSS selector to `#gameHeader`. The class approach is better for reusability, matching the plan's BEM naming.

---

### Issue 2: `pulseEnd()` looks for a non-existent element ID

**File:** `src/ui/hud.js`, line 16
```js
const b = document.getElementById('btnEndTurn');
```
But your HTML has:
```html
<button class="btn-gold header__end-turn-btn" id="endTurnBtn">End Turn</button>
```
The ID is `endTurnBtn`, not `btnEndTurn`. Every time `pulseEnd()` is called (e.g., after a champion uses their last move in `hexInteraction.js`), it silently fails — `b` is `null`, the pulse never happens.

**Fix:** Change the JS to match:
```js
const b = document.getElementById('endTurnBtn');
```
Or add an `id="btnEndTurn"` as a fallback. I recommend the consistent approach: update the JS.

---

## 🔴 High Priority: Broken Design Intent

### Issue 3: Duplicate End Turn button (violates gold budget and plan)

**What the plan says (Step 10 note):**
> "The End Turn button moves from the left panel to the header's `.header__actions` slot. This is the primary CTA and is always visible regardless of which panel the player is looking at."

**What the plan also says (Step 5 left panel mockup):**
> The left panel's action row shows `[Inspect (ink button)] [End Turn ❖ (GOLD BUTTON)]` with an ❖ note in the plan text — but the **plan note explicitly says it moves to the header**. The Step 5 mockup is describing what *was* there before the move.

**What the code does:** Both exist:
- `src/render/panels/leftPanel.js` line 91 renders a `btn-gold left-endturn-btn`
- `index.html` has `<button class="btn-gold header__end-turn-btn" id="endTurnBtn">End Turn</button>` in the header

That's **two gold End Turn buttons** per screen. The styleguide says gold budget is ~3 per screen, and now you've used 2 for the same button. Worse, the left panel's button has no `id` and no click handler — it's decorative dead HTML.

**The left panel's End Turn button should be removed.** The left panel action row should show only Inspect (ink button). The header End Turn button is the single gold CTA.

**Also note:** The left panel's action buttons have no `id` or event binding — they're HTML without behavior. The header's `endTurnBtn` is properly wired in `gameUIBindings.js`.

---

### Issue 4: Heptagram gold-on-hover is green, not gold, and uses JS instead of CSS

**What the plan says (Step 6):**
> "Heptagram widget: ink lines, gold only on hover (CSS `:hover` transition on stroke color)"

**What the styleguide says:**
> "Gold is rare — budget of ~3 per screen"

**What the code does:** In `src/render/paley.js`:
```js
const isHi = highlight===i;
s += `<line ... stroke="${isHi ? '#5fbf7a':'#b99b6a'}" ... />`
```
The highlight color is `#5fbf7a` (mint green). Not gold. And it's driven by JS `mousemove` with debounce-less SVG re-rendering, not by CSS `:hover` transitions.

This has three problems:
1. **Wrong color** — should use `var(--gold)` or a gold token
2. **Wrong approach** — the plan explicitly says "CSS `:hover` transition", not JS mouse tracking with full SVG re-render
3. **Performance** — re-rendering the entire SVG on every pixel of mousemove is wasteful

**Fix:** The heptagram SVG should use CSS `:hover` on `<line>` elements with `transition: stroke 0.15s ease`. The JavaScript should only handle click selection (for the combat widget). Something like:
```css
.rt-heptagram-svg line { stroke: var(--ink-faint); transition: stroke var(--dur-fast) var(--ease-out); }
.rt-heptagram-svg line:hover { stroke: var(--gold); }
```
This moves the highlight to pure CSS, removes the JS mousemove listener, and uses the correct gold token.

---

## 🟡 Medium Priority: Visual & Consistency Issues

### Issue 5: Champion detail dropdown — CSS class mismatch

**What the CSS expects:**
```css
.champion-detail { position: absolute; top: 100%; width: 180px; ... }
.champion-detail.is-open { display: block; }
```

**What the HTML has:**
```html
<div id="championDetail">
```

**What the JS does:**
```js
detailEl.classList.remove('is-open');
detailEl.classList.add('is-open');
```

The element has `id="championDetail"` but no `class="champion-detail"`. The CSS selector `.champion-detail` won't match. The dropdown will never display — it's always `display: none` because the `is-open` class is added to an element whose base `display` is not `none` via CSS (since the CSS rules don't apply).

**Fix:** Add the class:
```html
<div id="championDetail" class="champion-detail">
```

---

### Issue 6: Map control buttons — conflicting border-radius

**What the plan says (Step 8):**
> "four small circular buttons (28-30px diameter)"

**What `styles/components/hud.css` has:**
```css
.map-btn { width: 30px; height: 30px; border-radius: 50%; }
```

**What `styles/pages/game.css` has:**
```css
.map-btn { width: 32px; height: 32px; border-radius: var(--r-sm); }
```

Since `game.css` is loaded after `hud.css` in `codex.css`, the `game.css` rules **win**. The buttons become 32px rounded squares, not 30px circles.

Additionally, `hud.css` has `stroke-width: 2` on SVGs, `game.css` has `stroke-width: 1.5`. The plan says "one ink line language" — pick one and stick with it.

**Fix:** Remove the conflicting rules in `hud.css` (the `.map-controls` and `.map-btn` blocks there, since `game.css` already has them, correctly placed), or ensure `game.css` uses the circular style:
```css
.map-btn { width: 30px; height: 30px; border-radius: 50%; stroke-width: 2; }
```
(Or 28px if you prefer.) The plan's 28-30px range is fine — just be consistent.

---

### Issue 7: Log bar empty state — text uses wrong scroll metaphor

**File:** `src/render/panels/logBar.js`, line 25:
```js
<span class="log-bar__hint">Scroll unrolled — no events yet</span>
```

**What the plan says (Step 7):**
> "Use the cloud-band pattern from `/assets/icons/patterns/fog-clouds.svg` as a faint `::before` decorative element if the log is empty or collapsed (a small 'scroll unrolled' hint)"

The "scroll unrolled" phrase appears in the plan as the *visual metaphor description* (the cloud band pattern), not as copy. The copy "Scroll unrolled — no events yet" is a bit confusing because it reads like an instruction. Consider changing it to just "No events yet" or using the cloud-band pattern as described. Minor, but the current text doesn't match the plan's intent.

---

## 🟢 Low Priority: Polish & Future-Proofing

### Issue 8: Styleguide audit — color token usage in paley.js

**The rule:** "No flat gray" and "token system only."

**In `src/render/paley.js`:**
```js
stroke-opacity="${isHi?0.95:0.48}"
```
Opacity values like this aren't tokenized. Token variables for opacity should exist (e.g., `--opacity-muted`), or these should be handled via CSS with alpha channels on token colors.

**Also:**
```js
fill="#fff8e8" ...
```
This is a hardcoded off-white that doesn't match any token. Should be `var(--ivory)` or `var(--parchment)`.

**Also:**
```js
font-family:Georgia,serif
```
Should use `var(--font-body)`.

These are in an SVG rendered via JS, so you'd need to pass the computed CSS variable value. You could inline the token values into the SVG string or use CSS custom properties in the SVG `<style>` block.

---

## Summary Checklist

| # | Issue | Location | Severity | Fix |
|---|-------|----------|----------|-----|
| 1 | Missing `.game-header` class on `#gameHeader` | `index.html` | 🚨 Critical | Add `class="game-header"` |
| 2 | `pulseEnd()` looks for wrong ID `btnEndTurn` | `src/ui/hud.js:16` | 🚨 Critical | Change to `'endTurnBtn'` |
| 3 | Duplicate End Turn button (left panel + header) | `src/render/panels/leftPanel.js:91` | 🔴 High | Remove from left panel |
| 4 | Heptagram uses green instead of gold on hover | `src/render/paley.js`, `src/ui/paleyWidget.js` | 🔴 High | Use CSS `:hover` with `var(--gold)` |
| 5 | Champion detail missing `.champion-detail` class | `index.html` | 🟡 Medium | Add `class="champion-detail"` |
| 6 | Map button conflict: circular vs square, size + stroke mismatch | `styles/components/hud.css` vs `styles/pages/game.css` | 🟡 Medium | Delete duplicate from `hud.css`, keep circular in `game.css` |
| 7 | Log hint text not matching plan's scroll metaphor | `src/render/panels/logBar.js:25` | 🟢 Low | Simplify to "No events yet" |
| 8 | Hardcoded colors/opacities in paley SVG | `src/render/paley.js` | 🟢 Low | Use CSS vars or token values |

---

## One Additional Observation: `game.css` vs `hud.css` Map Button Duplication

Looking at this more carefully — both files define `.map-controls` and `.map-btn` with different values. Since `game.css` is the authoritative layout file (Step 9 rewrite), the duplicate in `hud.css` should be **removed entirely** to prevent future maintenance confusion. The `hud.css` file could just keep its comment block about the legacy `.map-hud` but delete the active map-control/map-btn rules.