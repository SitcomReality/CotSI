# Champions of the Supernal Interregnum — Aesthetic Conventions (v4)

> **This is an aspirational design reference.** The game is early in development and
> visual direction will continue to evolve. Use this as guidance, not as a strict
> specification. Many details described here are not yet fully implemented in the
> actual stylesheets.

## Thematic Core

> _"A vibrant tabletop diorama — painted miniatures on a dark felt board."_
> _But the felt is a stage curtain. The board is a shadow-puppet theater. The miniatures are vivid, cartoon-bright puppets dancing over a pit of absolute dark._

The player's screen is a **pop-up storybook from a haunted library** — a dark carnival of ink lines, painted gouache color, and velvet shadow. Every element has a bold, black **ink outline** like a comic-book panel come to life, filled with unnaturally bright color that shouldn't feel this cheerful given what's actually happening in the game.

The visual voice is: **irreverent and playful facade over a brooding, epic darkness.**

Like a thematically dark comic with vivid color and bold, distinctive outlines. Like a kid's cartoon from the late 90s when people were really starting to push boundaries — beautiful and colorful but with an unnerving grimness underneath. Like Memphis Design meets gory noir horror visual novel, with the flavor of spectacular cyberpunk detritus and epic high-fantasy cosmic mysticism.

The UI should appeal to toddlers and almost-blind old men because it's bold enough to draw the eye with clear graphics and a screamingly legible visual flow. It should also appeal to angsty adolescents because it has an overtly menacing undertone and a distinctive darkness to it.

---

## 1. The Two-Layer Rule

The interface is exactly two visual layers. They have different jobs and different intensities.

| Layer | What it is | What it looks like |
|-------|------------|-------------------|
| **Proscenium** (the stage + frame) | Panels, cards, text, buttons, borders, modals | Deep dark velvety blacks and charcoals. Thin, precise ink creases. The dark theater around a puppet show. |
| **Puppet** (the painted show) | Hex map, terrain, units, faction glyphs, knots, effects | Vivid, saturated color inside bold black outlines. Hand-painted gouache brightness. Comic-book pop. |

- The **Proscenium** stays dark and quiet. It frames the action, never competes with it.
- The **Puppet** layer is where color lives. Everything on this layer gets a bold ink outline.

---

## 2. Principles (ranked — use as tie-breakers)

1. **Legibility first.** High contrast, bold shapes, clear hierarchy. The game should be readable on a phone screen in sunlight or on a 12-year-old's CRT monitor.

2. **Ink before color.** Every Puppet element reads correctly as a silhouette. Color is the flourish, not the structure. If it doesn't work in black and white, it doesn't work.

3. **Coherence over novelty.** One line weight, one icon hand, one type system, one shadow language, **one outline convention** for everything on the Puppet layer.

4. **Playful surface, sinister depth.** Use color and shape that feel inviting, even cute. The menace comes from the content, the darkness of the proscenium, and the subtle wrongness of the compositions — never from making the UI ugly or hard to use.

5. **Restraint reads as craft.** The Proscenium is a disciplined, quiet frame. Spectacle (color, animation, flourish) is **earned** — it belongs to the Puppet layer, combat, the Augur's Dispatch, and victory.

6. **Icons speak first.** Critical game information should be graspable from icons + numbers alone. Text is the fallback for detail.

---

## 3. The Ink Outline Convention

**This replaces the old `:has()` outline-on-interaction system, which created kaleidoscope confusion (especially in the header and heptagram, where square outlines around circular elements fought the visual rhythm).**

### Core rule

Every element on the **Puppet layer** has a **permanent, built-in ink outline** — a bold, dark stroke that defines its silhouette, like a comic-book inker's line. This is part of the element's structural rendering, not an interaction state.

- **Shapes get a dark stroke on their own geometry** (SVG `stroke`, Canvas `strokeStyle`, 3D model toon outlines)
- **CSS-styled elements** use `border` with a matching `border-radius` — not CSS `outline`, which ignores border-radius and creates the square-on-circle problem
- **Ink color:** `--ink-line` (a deep, dark black-brown, not pure black)
- **Default weight:** `--ink-weight` (3px on UI elements, proportionally scaled on 3D meshes)
- **Weight variants:** `--ink-weight-thin` (1.5px — small text/glyph outlines) and `--ink-weight-bold` (5px — emphasis, like the selected champion in the header)

### What this means for interaction states

**State is NEVER shown via CSS `outline`.** The old pattern of using `outline: 2px solid var(--st-ally)` on hover is dead. Instead, state is conveyed through:

| State | Visual treatment | How it avoids outline clashes |
|-------|-----------------|------------------------------|
| **Ally** | Colored **backlight glow** (a `box-shadow` with the state color) + optional shield icon | Glow sits _behind_ the element, doesn't fight its ink border |
| **Hostile** | Colored **backlight glow** (amber/orange `box-shadow`) + optional crosshair icon | Same — glow is behind the shape |
| **Selected** | Gold **backlight glow** + subtle scale pulse animation | Glow + animation, no extra border |
| **Neutral** | No glow, standard ink border | Default state |
| **Current turn** | Left-edge accent bar (in faction color) + gold dot indicator | Edge accent, not full outline |
| **Played/waiting** | Opacity reduction (`.played = 0.45`, `.waiting = 0.75`) | No additional borders needed |
| **Dead** | Desaturated + hidden | No interaction state needed |

### The heptagram

The heptagram already does this mostly right — **colored line strokes** show relationships (green/red lines between nodes). This is the correct pattern. Extend it:

- Nodes (circles) have a **permanent ink stroke** of `--ink-weight-thin` in `--ink-line` color
- Hovered nodes **enlarge and get a gold backlight glow** (`filter: drop-shadow(...)`) instead of a gold outline
- Relationship lines use colored strokes — this works because lines are thin strokes, not shapes with outlines

### The header champion bar

Currently a kaleidoscope problem when hovering because every faction's `:has()` triggers across all `.paley-item` elements in the header. Fix:

- Header champions do **not** carry the `.paley-item` class at all
- Each header champion gets: a **left-edge accent bar** in its faction base color, a **faction-color dot**, and text
- Current champion: gold dot indicator below
- Hover: slight background wash, cursor change — no outline

---

## 4. Color Architecture

### The fundamental shift

In v3, the 7 faction colors spanned the full spectrum (red, purple, green, blue, yellow, pink, gray). This consumed every available hue and left the pigment/semantic palette with nothing but leftovers.

**New architecture: Factions occupy a tight warm/muted band. The full spectrum belongs to the pigment palette.**

### Why this works

- Faction miniatures look like a **cohesive painted set** — they share a visual family, not a rainbow
- Faction identity comes from: silhouette + glyph + accent color + secondary markings — not from screaming "I'm red"
- The pigment palette (now vivid, full-spectrum) provides **max-contrast semantic color**: HP, gold, state borders (shown as glow), weather, magic effects

### 4.1 Chrome / Proscenium Palette

The theater frame. Deep, dark, velvety. All neutral tones.

| Token | Value | Use |
|-------|-------|-----|
| `--abyss` | `#0c0e12` | Deepest background / stage void |
| `--shadow` | `#14171e` | Recessed panel / stage wings |
| `--board` | `#1c202a` | Card / panel surface |
| `--board-hi` | `#242a38` | Raised card / modal surface |
| `--ink` | `#e8e4dc` | Body text / primary content |
| `--ink-mid` | `#a8a4b0` | Secondary text / captions |
| `--ink-faint` | `#6a6e7a` | Tertiary / placeholders |
| `--ink-line` | `#121418` | Ink outline color (dark black-brown, not pure black) |
| `--crease` | `#2a3040` | Hairline divider |
| `--crease-bold` | `#3a4460` | Stronger divider |
| `--board-glass` | `#242a38cc` | Semi-transparent overlay (play slots, reward box) |

### 4.2 Faction Palette — Two-Color System

Each faction is identified by a **pair of colors**: a muted **base** (the body/silhouette fill on the miniature) and a more distinct **accent** (the glyph, the trim, the glow). Both live in a **warm, earthy band** — think of well-worn painted wooden game pieces.

All base colors share similar lightness (L ~30-38%) so no faction dominates the visual hierarchy by brightness alone.

| Faction | Base | Accent | Base Hex | Accent Hex | Role |
|---------|------|--------|----------|------------|------|
| CRU | Burnt umber | Rust | `#6e2e22` | `#b84530` | Aggressive, fiery foundation |
| REV | Dusty plum | Violet | `#5a3a5a` | `#8a5aaa` | Dreamy, mysterious |
| VER | Deep moss | Olive | `#3a5a3a` | `#5a8a4a` | Earthy, natural |
| ARC | Slate | Weathered blue | `#3a4a5a` | `#5a7a9a` | Ancient knowledge |
| HRT | Aged bronze | Tarnished gold | `#5a4a22` | `#9a8a3a` | Warmth, home, trade |
| MSK | Faded madder | Dusty rose | `#5a3a4a` | `#8a5a7a` | Performance, masks |
| HOL | Warm charcoal | Cool steel | `#3a3a44` | `#5a5a7a` | Void, absence |

CSS variable naming:

```css
--f-cru:        #6e2e22;  /* base */
--f-cru-accent: #b84530;  /* accent */
--f-cru-glow:   #e87a6a;  /* glow / pale highlight (kept from v3 for glow effects) */

--f-rev:        #5a3a5a;
--f-rev-accent: #8a5aaa;
--f-rev-glow:   #b388f0;

--f-ver:        #3a5a3a;
--f-ver-accent: #5a8a4a;
--f-ver-glow:   #88d888;

--f-arc:        #3a4a5a;
--f-arc-accent: #5a7a9a;
--f-arc-glow:   #8ab8f0;

--f-hrt:        #5a4a22;
--f-hrt-accent: #9a8a3a;
--f-hrt-glow:   #efc86b;

--f-msk:        #5a3a4a;
--f-msk-accent: #8a5a7a;
--f-msk-glow:   #e488c0;

--f-hol:        #3a3a44;
--f-hol-accent: #5a5a7a;
--f-hol-glow:   #a0a8c0;
```

The `factionData.js` `color` / `glow` / `pale` fields should continue to map to `--f-N`, `--f-N-glow`, and `--f-N-accent` respectively.

### 4.3 Pigment Palette — Full Spectrum, Max Saturation

Free to be vivid because factions no longer consume the spectrum. These are the "gouache paints" that fill the ink-outlined shapes.

| Token | Value | Role |
|-------|-------|------|
| `--crimson` | `#e82020` | Fire / damage / blood |
| `--cinnabar` | `#ff6600` | Heat / danger / hostile accent |
| `--gold` | `#ffbf00` | **RARE** — primary CTA, selection glow, drop caps |
| `--gold-hi` | `#ffe060` | Burnished highlight (animation peak) |
| `--verdigris` | `#00cc88` | Growth / ally accent / healing |
| `--cerulean` | `#00aaff` | Water / sky / arcane |
| `--indigo` | `#5555ff` | Deep magic / covenant |
| `--magenta` | `#ff00aa` | Reverie / dream / Masque magic |

### 4.4 State Palette — Drawn from Pigments, Applied as Glow

State is shown through **backlight glow** (`box-shadow` + `filter: drop-shadow`) and optional icon changes — never through CSS `outline`.

| Token | Value | Maps to pigment | Visual |
|-------|-------|-----------------|--------|
| `--st-hostile` | `#ff6600` | `--cinnabar` | Amber/orange glow — not red (that's CRU's accent) |
| `--st-ally` | `#00cc88` | `--verdigris` | Teal-green glow — not green (that's VER's accent) |
| `--st-neutral` | `#5a6070` | (separate gray) | Neutral gray, no glow |
| `--st-selected` | `#ffbf00` | `--gold` | Gold glow — same as gold token |
| `--st-reveal` | `#44bb66` | (derived from verdigris) | Combat reveal glow |
| `--st-move` | `color-mix(in srgb, #00cc88 15%, transparent)` | Verdigris wash | Movement highlight overlay |
| `--st-danger` | `color-mix(in srgb, #ff6600 15%, transparent)` | Cinnabar wash | Danger zone overlay |
| `--st-fog-seen` | `color-mix(in srgb, #1c202a 55%, transparent)` | Board color wash | Fog overlay on seen tiles |

### 4.5 The Two-Color Interaction System

Because factions now have a **base** and an **accent**, champion UI can use both to create richer identification:

- **In the header**: `--faction-color` is the accent. The dot is the accent color. The left-edge bar is the base color.
- **On the map**: The miniature body/base is the base color. The glyph/pennant is the accent color. The glow is the glow color.
- **In the heptagram**: The circle fill is the accent color. The circle stroke (ink line) is `--ink-line`. Hover glow is gold.
- **In setup screen**: Selected faction shows its accent border, with a background wash of the base.

---

## 5. Typography

Complete replacement of the v3 font stack (previously Cinzel, EB Garamond, UnifrakturCook). The new stack balances bold cartoon readability with a dark-carnival flavor.

### Font stack

| Role | Font | Weight | Fallback | Use |
|------|------|--------|----------|-----|
| Display | **Rubik** | 700–900 | `sans-serif` | Headings, champion names, prominent text, buttons |
| Body | **Outfit** | 400–700 | `sans-serif` | Panels, tooltips, log text, labels, numbers |
| Hand | **Caveat** | 500–700 | `cursive` | Augur's Dispatch lore, flavor text, handwritten notes |
| Title | **Rubik Gloss** or **Rubik Black** | 900 | `sans-serif` | Game wordmark "CotSI", chapter titles, very large headings |

### Rationale

- **Rubik**: Geometric, slightly quirky (rounded joins on straight stems). Bold weight reads as playful and approachable — the "facade". At black weight it becomes chunky and imposing — the "darkness". Excellent range.
- **Outfit**: Clean, modern, ultra-legible at 12–14px for game UI. The subtle geometric quality echoes Rubik's shapes without competing.
- **Caveat**: Hand-drawn, approachable, slightly rough. Gives the Dispatch and lore a "written in an ancient journal" feel. The roughness adds to the handcrafted darkness.
- **Rubik Gloss** (optional): A variable version with glossy/distortion effects for the main title only. Falls back to Rubik Black.

### Sizes

```css
--fs-xs:  11px;  /* captions, labels */
--fs-sm:  13px;  /* body text, panels */
--fs-md:  15px;  /* default text */
--fs-lg:  20px;  /* subheadings */
--fs-xl:  28px;  /* section headings */
--fs-2xl: 36px;  /* modal titles */
--fs-3xl: 52px;  /* display / hero text */
```

### Line height & letter spacing

```css
--lh:         1.45;
--lh-tight:   1.15;
--ls-cap:     .06em;   /* small-caps / uppercase labels */
--ls-display: -.01em;  /* display headings at large sizes — tighter for impact */
```

---

## 6. Shapes & Lines

### Outline weights (for the ink-line convention)

```css
--ink-weight:       3px;    /* standard ink outline on Puppet elements */
--ink-weight-thin:  1.5px;  /* small elements, glyph strokes, text outlines */
--ink-weight-bold:  5px;    /* heavy emphasis, selected champion, key CTA */
```

### Border radii

Rounded to reinforce the cartoon / playful facade. No sharp right angles on interactive elements.

```css
--r-sm:   8px;
--r:      12px;
--r-lg:   20px;
--r-pill: 999px;
```

### Edge / divider weights (for the Proscenium layer — no ink outlines here)

```css
--crease:       1px;
--crease-bd:    2px;
--crease-bd-hi: 3px;
```

---

## 7. Shadows

Hard, comic-book shadows. No soft paper-stack shadows. The offset creates the illusion of chunky physical game pieces on a dark stage.

```css
--shadow-card:   0 4px 0 #07080b,
                 0 6px 12px rgba(0,0,0,.5);
--shadow-stack:  0 2px 0 #07080b,
                 0 6px 0 #07080b,
                 0 8px 16px rgba(0,0,0,.55);
--shadow-seal:   0 3px 0 #07080b,
                 inset 0 1px 0 rgba(255,255,255,.08);
--shadow-panel:  0 2px 0 #07080b;
--shadow-glow:   0 0 12px var(--gold);        /* selection glow */
--shadow-state:  0 0 16px 2px;                 /* state glow — color set per state */
```

The shadow base (`#07080b`) is slightly darker than `--abyss` to create a true hard-shadow step beneath every chunky element.

---

## 8. Motion & Easing

Bouncy, playful pacing that respects the cartoon facade. But not *too* bouncy — the darkness underneath means some motions should feel heavy, weighted.

```css
--ease-pop:     cubic-bezier(.34,1.56,.64,1);   /* playful — for reveals, rewards, good moments */
--ease-snap:    cubic-bezier(.22,.61,.36,1);    /* standard — snappy but smooth */
--ease-slide:   cubic-bezier(.16,.4,.34,1);     /* heavy — modals opening, dark reveals */
--ease-drone:   cubic-bezier(.55,.06,.68,.19);  /* ominous — for damage, bad events */

--dur-fast:  120ms;   /* micro-interactions */
--dur:       200ms;   /* standard transitions */
--dur-slow:  350ms;   /* reveal animations */
--dur-xslow: 500ms;   /* modal entrances, dramatic moments */
--dur-epic:  800ms;   /* Augur's Dispatch, combat resolution, victory */
```

### What gets which easing

| Interaction | Easing | Rationale |
|-------------|--------|-----------|
| Button hover, item select | `--ease-snap` | Snappy, responsive |
| Reward reveal, gold counter | `--ease-pop` | Playful — you earned this! |
| Modal open, panel slide | `--ease-slide` | Heavy — like a stage curtain drawing closed |
| HP loss, damage flash | `--ease-drone` | Ominous — something bad happened |
| Combat score count-up | `--ease-pop` | Playful competition |
| Death, elimination | `--ease-slide` | Heavy, final |

---

## 9. Icon & Glyph Language

### Principles

- **One stroke weight** across all icons: `--ink-weight-thin` (1.5px)
- **One visual hand**: all icons look like they were drawn by the same inker. Consistent cap styles, corner radii, and line endings.
- **Rounded linecaps and joins** — the cartoon hand
- **Filled shapes prefer ink-outlined silhouettes** rather than thin line art
- **Icons are always the ink-line color** by default (on dark backgrounds) or white (on colorful backgrounds)
- **Faction glyphs** are the faction accent color inside an ink-outlined circle

### Existing SVG sprite

The sprite sheet at `assets/icons/sprite.svg` uses the `--ink-line` color for default icons and `--f-N-accent` for faction glyphs. All new icons follow the same pattern.

---

## 10. How State Is Now Applied (Replacing the Old Outline System)

### Before (v3 — broken)

```css
/* v3: CSS outline on EVERYTHING — causes kaleidoscope clashes */
.paley-item:hover {
  outline: 2px solid var(--gold);  /* clashes with borders, square on circles */
}
html:has(.paley-item--f0:hover) :is(.paley-item--f1, .paley-item--f2, ...) {
  outline-color: var(--st-ally);  /* triggers across header, heptagram, etc. = chaos */
}
```

### After (v4 — glow + icon)

```css
/* v4: Backlight glow + icon change — no outline clashes */
.entity.ally {
  box-shadow: 0 0 12px 2px var(--st-ally);
  /* optional: ::before shield icon */
}
.entity.hostile {
  box-shadow: 0 0 12px 2px var(--st-hostile);
}
.entity.neutral {
  /* no glow — default ink border only */
}
.entity.selected {
  box-shadow: var(--shadow-glow);
  animation: selectedPulse 2s ease-in-out infinite;
}

@keyframes selectedPulse {
  0%, 100% { box-shadow: 0 0 12px 2px var(--gold); }
  50%      { box-shadow: 0 0 18px 4px var(--gold); }
}
```

### Header champion state (no more outlines or `:has()` on header items)

```css
.header__champion.current {
  border-left: 3px solid var(--faction-color);  /* accent bar */
}
.header__champion.current::after {
  content: '';
  background: var(--gold);  /* gold dot indicator */
}
.header__champion.played {
  opacity: 0.45;
}
.header__champion.waiting {
  opacity: 0.75;
}
```

### Heptagram state (stays mostly right — colored line strokes, no node outlines)

```css
/* Heptagram nodes: permanent ink stroke, no interaction outline */
.rt-heptagram-node {
  stroke: var(--ink-line);
  stroke-width: var(--ink-weight-thin);
}

/* Hovered node: enlarge + gold drop-shadow (not outline) */
html:has(.paley-item--f0:hover) .rt-heptagram-node[data-index="0"] {
  r: 18;
  filter: drop-shadow(0 0 6px var(--gold));
}
```

### Cross-highlight (for faction list items not in the header)

`.paley-item` elements that trigger cross-highlighting should only exist in **one place at a time** — either the heptagram or a dedicated faction-reference widget — not on every champion representation throughout the UI.

---

## 11. The 3D Map — Low Poly Cartoon

The three-dimensional map follows the same artistic rules as the 2D UI: **low-poly models with bold ink outlines.**

### Toon shader convention

- Models use a **three-tone toon shader** (lit, midtone, shadow) with hard transitions between bands — like the flat shading of a cel-animated cartoon
- **Outlines**: An inverted-hull outline pass on all miniature/puppet-layer geometry, matching `--ink-line` color
- Outline thickness: proportional to `--ink-weight` (scaled by the model's visual size)

### Miniature scale (cartoon proportions, not realistic)

Same as v3 — stylized piece scale, not real-world fidelity. A champion and a mountain are both "game pieces on a stage" and can share similar heights.

---

## 12. The Dark Carnival Light

The lighting model across both 2D and 3D should feel like a **stage show in a dark room**:

- **Top-down / spotlight feel**: Primary illumination comes from above, like a theater spotlight
- **Deep, warm shadows**: Shadow areas lean warm-black, not cool-gray
- **Colored backlight**: Occasional colored rim light from below (faction color, or the eerie glow of a magic effect) for dramatic moments
- **Proscenium is unlit**: The chrome/UI layer has no 3D lighting — it's flat, dark, and receded

---

## 13. Hard Rules (do not violate)

### 13.1 State and faction are separate visual channels

- **Faction color = entity identity.** The fill of a unit, glyph, or token tells you *who* they are.
- **State = glow + icon treatment.** Ally/hostile/neutral/selected are shown through backlight glow (`box-shadow`, `filter: drop-shadow`), optional state icons, and opacity changes.
- This means a CRU champion (burnt umber fill, rust accent) that is yours wears a **verdigris backlight glow**. A CRU champion that is your enemy wears a **cinnabar backlight glow**.

### 13.2 No CSS `outline` for interaction state

CSS `outline` is banned for interaction states. It does not respect `border-radius`, it stacks on top of borders, and when combined with `:has()` selectors it creates cascade chaos. Use `box-shadow` for state glows and `border` (with matching `border-radius`) for structural styling.

### 13.3 The ink line is structural, not interactive

The `--ink-weight` outline is a **permanent visual style** on Puppet-layer elements, not an interaction effect. It is present at rest and does not change on hover or selection. State is expressed through glow + icons.

### 13.4 Faction hex values are fixed (per the token sheet)

Don't "improve" a faction color; tune the chrome around it instead.

### 13.5 State glow colors are fixed

- **Ally state**: `--verdigris` (`#00cc88`) — never generic green (that's VER's accent domain)
- **Hostile state**: `--cinnabar` (`#ff6600`) — never red (that's CRU's accent domain)
- **Neutral state**: `--st-neutral` (`#5a6070` cool gray) — no glow
- **Selected state**: `--gold` (`#ffbf00`) — gold glow

### 13.6 Gold is intentionally rare

Gold (`--gold`) is for the primary CTA (Begin Interregnum, Confirm), selection halos, drop caps, and the current-champion indicator dot. Do not add gold elsewhere without review.

### 13.7 One ink-to-edge rule

No borderless elements on the Puppet layer. If it's a painted game piece (a faction glyph, a unit icon, a terrain tile), it has an ink outline. The only exceptions: background washes, fog overlays, and backlight glow effects (which sit visually *behind* the element).

---

## 14. Decision Checklist

Before shipping any new component, screen, or asset, ask in order:

1. **Layer?** Proscenium or Puppet? (If unsure, it's Proscenium — keep it dark and quiet.)
2. **Does it have its ink outline?** If it's a Puppet element, does it have the standard `--ink-weight` dark stroke? How is it rendered — SVG stroke, CSS border, or 3D outline pass?
3. **Does it already exist?** Can an existing token, icon, or component do the job?
4. **Hierarchy?** What should the eye land on first? Make one thing dominant; demote the rest.
5. **State glow, not outline?** Am I showing state via `box-shadow` glow + icon, or am I reaching for `outline`? (Don't.)
6. **Squint test.** Is the eye being drawn intentionally? Is the most important thing the most prominent thing? Does it work as a silhouette?
7. **Tactility test.** Does it feel like a painted game piece on a dark stage? Chunky, physical, deliberate?
8. **Duality check.** Is there a playful surface AND a sinister undertone? Or does it land on just one note?
9. **Comic book test.** Would this look out of place in a boldly-inked, vividly-colored graphic novel? If yes, redesign.

---

## 15. Drift Detectors (red flags)

Stop and reconsider if you see any of these:

- An element using CSS `outline` for anything other than debugging
- A panel that's more colourful than the map
- State expressed by changing an entity's fill color instead of adding a backlight glow
- A faction color that strays out of the warm/muted band into full-spectrum territory
- Icons of mismatched stroke weight or corner radius
- A big soft drop shadow on a card (use hard offset shadows)
- A component that needed its own one-off colour or radius
- Two different outline conventions on the same page
- The `:has()` selector triggering across the entire page when hovering any `.paley-item`
- Gold used for anything other than CTA / selection / current-turn indicator

---

## 16. Old-to-New Variable Name Migration

When implementing this redesign, rename CSS custom properties as follows:

### Chrome renames

| Old name | New name | Reason |
|----------|----------|--------|
| `--vellum` | `--abyss` | "Vellum" evokes medieval manuscripts — wrong metaphor |
| `--vellum-2` | `--shadow` | "Shadow" is the theater darkness |
| `--parchment` | `--board` | "Parchment" is ancient paper — wrong metaphor |
| `--ivory` | `--board-hi` | "Ivory" evokes pale bone — wrong for dark theme |
| `--ink` | `--ink` | Keep — ink is timeless |
| `--ink-soft` | `--ink-mid` | More descriptive: it's mid-weight ink |
| `--ink-faint` | `--ink-faint` | Keep — still means what it says |
| `--rule` | `--crease` | "Crease" fits the paper-theater metaphor |
| `--rule-strong` | `--crease-bold` | Consistency with crease naming |
| `--parchment-glass` | `--board-glass` | Consistent with board naming |

### Faction renames

| Old name | New name | Notes |
|----------|----------|-------|
| `--f0` through `--f6` | `--f-cru` through `--f-hol` | Short faction names more readable than indices |
| `--f0-glow` / `--f0-pale` | `--f-cru-glow` / `--f-cru-accent` | "Accent" replaces "pale" — more descriptive |

### State renames

| Old name | New name | Notes |
|----------|----------|-------|
| `--st-hostile` | `--st-hostile` | Keep — value changes to `--cinnabar` |
| `--st-ally` | `--st-ally` | Keep — value changes to `--verdigris` |
| `--st-neutral` | `--st-neutral` | Keep |
| `--st-selected` | `--st-selected` | Keep — value points to `--gold` |
| `--st-reveal` | `--st-reveal` | Keep |
| `--st-move` | `--st-move` | Keep |
| `--st-danger` | `--st-danger` | Keep |
| `--st-fog-seen` | `--st-fog-seen` | Keep |

### New variables

| New name | Value | Purpose |
|----------|-------|---------|
| `--ink-line` | `#121418` | Ink outline color for Puppet elements |
| `--ink-weight` | `3px` | Standard ink outline width |
| `--ink-weight-thin` | `1.5px` | Thin ink outline (small elements, glyph strokes) |
| `--ink-weight-bold` | `5px` | Bold ink outline (emphasis) |
| `--shadow-glow` | `0 0 12px var(--gold)` | Selection glow shadow |
| `--shadow-state` | `0 0 16px 2px` | State glow shadow (color set by each state var) |

---

## 17. Visual Reference — What It Should Feel Like

- **Puppet layer:** A cross between a boldly-inked comic book (Scott Pilgrim, The Umbrella Academy), a late-90s Cartoon Network show with teeth (Courage the Cowardly Dog, Cow and Chicken), and a hand-painted wooden board game piece
- **Proscenium layer:** Dark theater velvet. The stage frame. A pop-up book cover in deep shadow.
- **Typography:** Bold, slightly playful headlines (Rubik) in white or faction colors. Clean body text (Outfit). Handwritten journal entries (Caveat).
- **Overall:** A game that looks like it *could* be for kids — bright colors, bold outlines, chunky friendly shapes — but something about the darkness of the frame, the content of the text, and the weight of the shadows tells you it's not. It's for *you*.
