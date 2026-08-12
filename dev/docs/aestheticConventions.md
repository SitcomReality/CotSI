# Champions of the Supernal Interregnum — Aesthetic Conventions (v5 — Remnant Cosmos)

> **This is a living design reference.** The game is early in development and
> visual direction will continue to evolve. Use this as guidance, not as a strict
> specification. Many details described here are not yet fully implemented in the
> actual stylesheets.

> **v5 change of direction (2025):** v4's "dark carnival theater" chrome — near-black
> rectangles, thin gold, functional pills — read as a generic dark-mode HUD bolted
> onto a colourful low-poly world. v5 re-frames the chrome as **remnant-cosmos
> geometry**: deep indigo-violet dusk, faceted chamfered shards, prismatic
> Rainbow-Aftermath accents, and faction chroma used as *living material* so the
> UI never forgets whose turn it is. The world layer keeps the v4 cartoon-puppet
> language (ink outlines, gouache saturation) — that half of the system was working.

## Thematic Core

> _"The gods died and left a beautiful, slightly broken toy box."_

The screen is a **dusk after a divine war**: deep indigo-violet atmosphere, faint
star-dust motes, and salvaged geometry that still glows with leftover supernal
light. The map stays the vibrant, cartoony heart; the chrome recedes into
coloured dusk and only flares when it needs attention — a turn change, a choice,
a reward.

The visual voice is: **playful low-poly toy box, cosmic melancholy frame.**

---

## 1. The Two-Layer Rule

The interface is exactly two visual layers. They have different jobs and different intensities.

| Layer | What it is | What it looks like |
|-------|------------|-------------------|
| **Chrome / Remnant** (the frame) | Panels, cards, text, buttons, borders, modals, headers | Deep indigo-violet dusk with a violet breath (never pure black), faceted chamfered shards, faint star-dust texture, thin iridescent glints. Recedes so the world stays the star. |
| **Puppet / Painted** (the show) | Hex map, terrain, units, faction glyphs, knots, effects | Vivid, saturated colour inside bold ink outlines. Hand-painted gouache brightness. Comic-book pop. |

- The **Chrome** stays dusk-quiet and geometric. It frames the action, never competes with it.
- The **Puppet** layer is where the world's colour lives. Everything on this layer gets a bold ink outline.
- The one deliberate chrome flare is **faction chroma as material** — the current
  turn's colour may tint borders, glows, and frame edges (see §4.6 Turn Identity).

---

## 2. Principles (ranked — use as tie-breakers)

1. **Legibility first.** High contrast, bold shapes, clear hierarchy. Readable on a phone in sunlight or a 12-year-old's CRT monitor.
2. **Whose turn is it?** At every moment, the active champion/faction must be unambiguous: turn-tinted chrome on the persistent frame and on every player-affiliated modal.
3. **Ink before colour.** Every Puppet element reads correctly as a silhouette. Colour is the flourish, not the structure.
4. **Coherence over novelty.** One line weight, one icon hand, one type system, one shadow language, one outline convention on the Puppet layer; one chamfer/facet language on the Chrome layer.
5. **Playful surface, cosmic depth.** The menace comes from the content and the dusk frame, never from making the UI ugly or hard to use.
6. **Restraint reads as craft.** Spectacle (iridescence, glints, motion) is **earned** — it belongs to combat, the Augur's Dispatch, rewards, and the heptagram keystone.
7. **Icons speak first.** Critical game information should be graspable from icons + numbers alone.

---

## 3. The Ink Outline Convention (Puppet layer only)

### Core rule

Every element on the **Puppet layer** has a **permanent, built-in ink outline** — a bold, dark stroke that defines its silhouette, like a comic-book inker's line. This is part of the element's structural rendering, not an interaction state.

- **Shapes get a dark stroke on their own geometry** (SVG `stroke`, Canvas `strokeStyle`, 3D model toon outlines)
- **CSS-styled elements** use `border` with a matching `border-radius` — not CSS `outline`, which ignores border-radius
- **Ink color:** `--ink-line` (deep dusk black-brown, never pure black)
- **Default weight:** `--ink-weight` (3px on UI elements, proportionally scaled on 3D meshes)

**State is NEVER shown via CSS `outline`.** State is conveyed through:

| State | Visual treatment |
|-------|------------------|
| **Ally** | Colored **backlight glow** (`box-shadow` with the state color) + optional shield icon |
| **Hostile** | Colored **backlight glow** (amber/orange `box-shadow`) + optional crosshair icon |
| **Selected** | Gold **backlight glow** + subtle scale pulse animation |
| **Neutral** | No glow, standard ink border |
| **Current turn** | Turn-tinted ring + glow (see §4.6) |
| **Played/waiting** | Opacity reduction (`.played = 0.45`, `.waiting = 0.75`) |
| **Dead** | Desaturated + hidden |

### The heptagram

Nodes are ink-stroked circles filled with the faction accent. Hover uses gold glow + enlargement (JS-driven `data-cross-highlight` on `<html>`).

### The header champion bar

Pills show HP + potency per champion. The **current** pill gets a turn-coloured ring + soft glow (see §4.6). Played pills dim, waiting pills sit at 0.75, dead pills desaturate.

---

## 4. Color Architecture

### 4.1 Chrome / Remnant Palette — Indigo-Violet Dusk

The theater frame is **coloured dusk, never near-black or flat charcoal**. Every
surface has a violet breath so panels read as atmosphere, not app skin.

| Token | Value | Use |
|-------|-------|-----|
| `--abyss` | `#141024` | Deepest dusk void / page ground |
| `--shadow` | `#1d1731` | Recessed panel / stage wings |
| `--board` | `#272040` | Card / panel surface |
| `--board-hi` | `#322a52` | Raised card / modal surface |
| `--ink` | `#f2ead9` | Warm cream body text (never sterile white) |
| `--ink-mid` | `#aea4c4` | Secondary text / captions (lavender-mauve) |
| `--ink-faint` | `#7a6f8f` | Tertiary / placeholders |
| `--ink-line` | `#12101e` | Ink outline color (Puppet layer) |
| `--crease` | `#352c4e` | Hairline divider (violet charcoal) |
| `--crease-bold` | `#463a66` | Stronger divider |
| `--board-glass` | `#272040cc` | Semi-transparent overlay (play slots, reward box) |
| `--nebula` | `url('/assets/icons/patterns/star-dust.svg')` | Faint star-dust texture on panels/cards |
| `--iridescent` | `linear-gradient(115deg, #ff9a5a, #cf6ff0, #5ab8ff)` | Rainbow-Aftermath rim / glint |

### 4.2 Faction Palette — Two-Color System (world) + Luminous UI Variants

The world keeps the v4 **two-color system**: each faction has a muted **base**
(the miniature body) and a more distinct **accent** (the glyph/trim). Both live in
a warm, earthy band so the painted set looks cohesive.

| Faction | Base | Accent | Base Hex | Accent Hex |
|---------|------|--------|----------|------------|
| CRU | Burnt umber | Rust | `#6e2e22` | `#b84530` |
| REV | Dusty plum | Violet | `#5a3a5a` | `#8a5aaa` |
| VER | Deep moss | Olive | `#3a5a3a` | `#5a8a4a` |
| ARC | Slate | Weathered blue | `#3a4a5a` | `#5a7a9a` |
| HRT | Aged bronze | Tarnished gold | `#5a4a22` | `#9a8a3a` |
| MSK | Faded madder | Dusty rose | `#5a3a4a` | `#8a5a7a` |
| HOL | Warm charcoal | Cool steel | `#3a3a44` | `#5a5a7a` |

For the **chrome layer**, each faction also has a **luminous UI variant** —
brighter and more saturated, for borders, glows, and the turn tint — so faction
identity pops against dusk without the world's palette changing:

| Token (CSS) | Example | Chrome use |
|-------------|---------|------------|
| `--f-cru-ui` / `--f-cru-ui-glow` | `#e0604a` / `#ff9d8a` | turn tint, frame glows |
| `--f-rev-ui` / `--f-rev-ui-glow` | `#b06ae0` / `#d4a0ff` | turn tint, frame glows |
| `--f-ver-ui` / `--f-ver-ui-glow` | `#6ad06a` / `#a8f0a8` | turn tint, frame glows |
| `--f-arc-ui` / `--f-arc-ui-glow` | `#5aa8e0` / `#9cc8ff` | turn tint, frame glows |
| `--f-hrt-ui` / `--f-hrt-ui-glow` | `#d8b048` / `#ffe08a` | turn tint, frame glows |
| `--f-msk-ui` / `--f-msk-ui-glow` | `#d060a8` / `#f0a8d8` | turn tint, frame glows |
| `--f-hol-ui` / `--f-hol-ui-glow` | `#8080b0` / `#b8b8e0` | turn tint, frame glows |

These are mirrored in `src/game/rules/factionData.js` as `uiColor` / `uiGlow` so
JS (e.g. `src/ui/turnTint.js`) can drive them. **The world's muted
base/accent/glow values are fixed** — never "improve" them; tune the chrome
around them instead.

### 4.3 Pigment Palette — Full Spectrum, Max Saturation

Vivid semantic colour for the Puppet layer and semantic accents (HP, gold, damage, magic).

| Token | Value | Role |
|-------|-------|------|
| `--crimson` | `#e82020` | Fire / damage / blood |
| `--cinnabar` | `#ff6600` | Heat / danger / hostile accent |
| `--gold` | `#ffc94d` | **RARE** — warm orichalcum. Primary CTA, selection glow, drop caps, current-turn dot |
| `--gold-hi` | `#ffe38f` | Burnished highlight (animation peak) |
| `--verdigris` | `#00cc88` | Growth / ally accent / healing |
| `--cerulean` | `#00aaff` | Water / sky / arcane |
| `--indigo` | `#5555ff` | Deep magic / covenant |
| `--magenta` | `#ff00aa` | Reverie / dream / Masque magic |

### 4.4 State Palette — Drawn from Pigments, Applied as Glow

| Token | Value | Visual |
|-------|-------|--------|
| `--st-hostile` | `--cinnabar` | Amber/orange glow — not red (CRU's accent) |
| `--st-ally` | `--verdigris` | Teal-green glow — not green (VER's accent) |
| `--st-neutral` | `#66608a` | Mauve-gray, no glow |
| `--st-selected` | `--gold` | Gold glow — same as gold token |

### 4.5 The Two-Color Interaction System (world)

- **In the header**: `--faction-color` is the accent. The dot is the accent color. The left-edge bar is the base color.
- **On the map**: The miniature body/base is the base color. The glyph/pennant is the accent color. The glow is the glow color.
- **In the heptagram**: The circle fill is the accent color. The circle stroke is `--ink-line`. Hover glow is gold.
- **In setup screen**: Selected faction shows its accent border, with a background wash of the base.

### 4.6 Turn Identity — The `--turn-*` System (v5)

`src/ui/turnTint.js` (`applyTurnTint`, called on every `refreshAll`) reads the
active champion and sets root custom properties on `<html>`:

```
--turn-color   → the active faction's uiColor   (vivid chrome hue)
--turn-glow    → the active faction's uiGlow    (luminous halo hue)
--turn-base    → the active faction's base      (deep world hue)
data-turn-faction="cru|rev|ver|arc|hrt|msk|hol"
turn-owner--human | turn-owner--bot
```

**Consumption rules (hard):**

1. **Persistent chrome** — header bottom edge + glow, current champion pill ring,
   left champion card frame, right ledger border, heptagram card, map vignette,
   toast edge — reads `--turn-*` (§ `turnChrome.css`).
2. **Player-affiliated modals** — Augur's Dispatch, reward/artifact choice,
   confirm, combat (tinted by the attacking champion; each combatant card keeps
   its own faction colour), victory — carry the turn tint via backdrop wash,
   card glow, and faction rules (§ `turnChrome.css`).
3. **Herald's Prognosis is ALWAYS neutral.** It is a global/universal message —
   it never consumes `--turn-*` (backdrop class `modal--neutral`, card guarded
   back to plain shadows).
4. **The death announcement is ALWAYS neutral** (sombre) — it never consumes `--turn-*`.
5. **Gold stays the CTA colour.** Turn identity lives in borders, glows, and
   kickers — not in the primary action buttons.
6. **Bot turns must stay visible ≥ 500 ms** (`MIN_BOT_TURN_MS` in
   `src/params/ui/uiParams.js`; pacing in `src/runtime/turnPacing.js` +
   `botTurnRunner.js`) so the turn order never strobes. The bot indicator and
   the turn tint carry the colour during the dwell.

---

## 5. Typography

The stack is unchanged from v4 and fits the remnant direction: geometric display,
clean body, handwritten lore.

| Role | Font | Weight | Use |
|------|------|--------|-----|
| Display | **Rubik** | 700–900 | Headings, champion names, prominent text, buttons |
| Body | **Outfit** | 400–700 | Panels, tooltips, log text, labels, numbers |
| Hand | **Caveat** | 500–700 | Augur's Dispatch lore, flavor text |

Hierarchy through size, colour, and glow — **not** extra boxes. Sizes:
`--fs-xs 11px`, `--fs-sm 13px`, `--fs-md 15px`, `--fs-lg 20px`, `--fs-xl 28px`,
`--fs-2xl 36px`, `--fs-3xl 52px`. Small-caps kickers (`--ls-cap .06em`) for
labels; `--tnum` for numbers.

---

## 6. Shapes & Lines

### Outline weights (Puppet layer)

```
--ink-weight:       3px;    /* standard ink outline */
--ink-weight-thin:  1.5px;  /* small elements, glyph strokes */
--ink-weight-bold:  5px;    /* heavy emphasis, selected champion, key CTA */
```

### Border radii + facets (Chrome layer)

The chrome mixes **sharp structural frames** with **faceted chamfers**:

```
--r-sm:   8px;
--r:      12px;
--r-lg:   20px;
--r-pill: 999px;
--r-panel: 4px;   /* structural chrome — sharp, theatrical frame */
```

- **`.chamfer`** (`styles/components/facet.css`): 45° corner cuts via
  `clip-path` on the important cards — reward, victory, confirm, champion
  reliquary, heptagram keystone. Shape-following shadows via
  `filter: drop-shadow` (clip-path would swallow box-shadows). **Do not chamfer
  large continuously-animated surfaces** (combat arena, dispatch weather) —
  filter rasterises the subtree.
- **`.glint`** (`styles/components/modalShell.css`): a thin iridescent bar
  (`--iridescent`) at the top of an important frame — the Rainbow Aftermath
  leaking through the chrome.
- **Bevels**: `inset 0 1px 0 rgba(255,255,255,.05–.35)` catch-lights on buttons
  and faceted cards suggest carved-crystal edges.

### Edge / divider weights (Chrome layer)

```
--hair:       1px;
--edge:       2px;     /* standard border */
--edge-bold:  3px;     /* emphasis border */
--edge-heavy: 4px;     /* heavy accent */
```

---

## 7. Shadows

Hard, comic-book shadows with an **inked-dusk base** (`#0b0814`), not pure black:

```
--shadow-card:   0 4px 0 #0b0814, 0 6px 12px rgba(0,0,0,.5);
--shadow-stack:  0 2px 0 #0b0814, 0 6px 0 #0b0814, 0 8px 16px rgba(0,0,0,.55);
--shadow-seal:   0 3px 0 #0b0814, inset 0 1px 0 rgba(255,255,255,.08);
--shadow-panel:  0 2px 0 #0b0814;
--shadow-glow:   0 0 12px var(--gold);        /* selection glow */
--shadow-state:  0 0 16px 2px;                 /* state glow — color set per state */
```

Chamfered cards replace box-shadows with `filter: drop-shadow` (see §6).

---

## 8. Motion & Easing

Unchanged pacing tokens; all motion **must** respect `prefers-reduced-motion`
(drop soft shadows, pulses, and glint animations under it).

```
--ease:         cubic-bezier(.22,.61,.36,1);
--ease-in:      cubic-bezier(.55,.06,.68,.19);  /* ominous — damage, death */
--ease-out:     cubic-bezier(.22,.61,.36,1);
--ease-bounce:  cubic-bezier(.34,1.56,.64,1);   /* reveals, rewards */

--dur-fast:  150ms;  --dur: 250ms;  --dur-slow: 420ms;  --dur-xslow: 600ms;
```

| Interaction | Easing |
|-------------|--------|
| Button hover, item select | `--ease` |
| Reward reveal, gold counter | `--ease-bounce` |
| Modal open, panel slide | `--ease` |
| HP loss, damage flash | `--ease-in` |
| Combat score count-up | `--ease-bounce` |
| Death, elimination | `--ease-in` |

Micro-motion allowed: prismatic glints, faint star-dust motes, hover
squash/glow. Keep particles CSS-only and restrained.

---

## 9. Icon & Glyph Language

Unchanged from v4 — one stroke weight (`--ink-weight-thin`), one visual hand,
rounded linecaps, ink-outlined silhouettes, faction glyphs in accent colour
inside ink-outlined circles. Sprite sheets in `assets/icons/`.

---

## 10. State Applied Through Glow + Icon

Unchanged from v4: state via `box-shadow` backlight glow + icon changes, never
CSS `outline`. Cross-highlight between `.paley-item` elements and the heptagram
is driven by `html[data-cross-highlight]` (see `paleyCrossHighlight.css` /
`heptagramWidget.css`) — not `:has()`.

---

## 11. The 3D Map — Low Poly Cartoon

Unchanged from v4 (this layer was working): three-tone toon shader
(`MeshToonMaterial` + shared gradient map), inverted-hull ink outline pass on
units/features (`--ink-line`), terrain tiles deliberately not outlined,
stylized piece scale, grove/cluster decoration rules, `fruitTree` regrowth
cycles. See the section in the v4 doc for full detail (kept verbatim in
`dev/docs/aestheticConventions.v4.md` if needed — otherwise this bullet list is
the summary).

---

## 12. The Dark Carnival Light

Unchanged: top-down spotlight feel, deep warm shadows, occasional coloured rim
light for dramatic moments. The chrome is unlit flat colour — the map's lighting
never touches the UI. Panels may be translucent so the map's light bleeds
through the dusk.

---

## 13. Responsive & Modal Overflow Rules (v5)

1. **Every modal's accept action must always be reachable.** Modal backdrops
   scroll (`overflow-y: auto` + safe-area padding); cards cap at
   `calc(100dvh - 2*var(--s4))` with internal scroll; primary actions live in a
   sticky `.modal-footer`. A modal that can soft-lock the game is a release
   blocker.
2. **≤ 900 px**: single-column stack — compact header (scrollable champion pill
   strip), map (champion card docked over it), ledger below. Map keeps
   `min-height: clamp(300px, 55dvh, 560px)`.
3. **Touch targets ≥ 40 px** on touch-sized screens (map buttons, actions, pills).
4. `viewport-fit=cover` + `env(safe-area-inset-*)` padding on fixed overlays;
   `100dvh` (with `100vh` fallback) for viewport-relative sizing;
   `text-size-adjust: 100%`.

---

## 14. Hard Rules (do not violate)

### 14.1 State and faction are separate visual channels

Faction colour = identity; state = glow + icon. A CRU champion that is yours
wears a verdigris glow; one that is your enemy wears a cinnabar glow.

### 14.2 No CSS `outline` for interaction state

Use `box-shadow` glows and `border` (with matching radius) for state/structure.

### 14.3 The ink line is structural, not interactive (Puppet layer)

### 14.4 Faction world hex values are fixed

The muted base/accent/glow values never change. Use the luminous `ui*` variants
for chrome work.

### 14.5 State glow colors are fixed

Ally `--verdigris`, hostile `--cinnabar`, neutral `--st-neutral`, selected `--gold`.

### 14.6 Gold is intentionally rare

`--gold` = primary CTAs, selection halos, drop caps, current-turn dot. Nothing else.

### 14.7 Turn identity rules

- Herald's Prognosis and the death announcement are **never** turn-tinted.
- Every other modal and the persistent chrome **must** show the current turn's colour.
- Bot turns are visible ≥ 500 ms (no strobe).

### 14.8 One ink-to-edge rule (Puppet layer)

Unchanged from v4 — painted game pieces have ink outlines; terrain tiles are the exception.

---

## 15. Decision Checklist

Before shipping any new component, screen, or asset, ask in order:

1. **Layer?** Chrome or Puppet? (Chrome = dusk, quiet, faceted; Puppet = ink + gouache.)
2. **Whose turn?** If this is chrome or a player modal, does it read the `--turn-*`
   tint — or is it a herald/death (neutral) surface?
3. **Does it have its ink outline?** (Puppet elements only.)
4. **Does it already exist?** Can an existing token, icon, or component do the job?
5. **Hierarchy?** One dominant thing; demote the rest.
6. **State glow, not outline?**
7. **Squint test.** Works as a silhouette?
8. **Tactility test.** Does it feel like a faceted shard / painted piece on the dusk stage?
9. **Duality check.** Playful surface AND cosmic undertone?
10. **Overflow test.** If it's a modal, is the accept action reachable at 320×568?

---

## 16. Drift Detectors (red flags)

Stop and reconsider if you see any of these:

- An element using CSS `outline` for anything other than debugging
- A chrome surface that is more colourful than the map (except turn-tinted frames)
- State expressed by changing an entity's fill colour instead of a backlight glow
- A faction colour that strays out of the warm/muted band (world layer)
- A hardcoded hex in `styles/components/` that duplicates a token
- A big soft drop shadow where a hard offset or chamfered drop-shadow should be
- A herald/death modal that picks up a turn tint, or a player modal that doesn't
- Bot turns flashing by faster than 500 ms each
- A modal whose accept button can scroll out of reach
- Gold used for anything other than CTA / selection / current-turn indicator
- A cross-highlight mechanism not driven by `html[data-cross-highlight]`

---

## 17. Visual Reference — What It Should Feel Like

- **Puppet layer:** A boldly-inked comic book / late-90s Cartoon Network show with teeth; hand-painted wooden game pieces. (Unchanged from v4.)
- **Chrome layer:** The indigo-violet dusk after the gods died — faceted shards of salvaged divine geometry, faint star-dust, thin prismatic glints where the Rainbow Aftermath still leaks through. Warm cream text, orichalcum gold CTAs, and the current player's faction colour breathing through the frame.
- **Typography:** Bold geometric headlines (Rubik), clean body (Outfit), handwritten journal lore (Caveat).
- **Overall:** A colourful, slightly melancholy playground left after the gods died. The world is the toy box; the UI is the beautiful, broken frame around it — never a spreadsheet, never a crypt.
