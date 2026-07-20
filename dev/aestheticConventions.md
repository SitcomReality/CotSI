# Champions of the Supernal Interregnum — Style Guide (v2)

A short, opinionated reference for keeping the visual language consistent. This replaces v1's
"illuminated codex" metaphor entirely.

---

## 0. North Star

> _"A vibrant tabletop diorama — painted miniatures on a dark felt board."_

The player is looking at a richly colored board game come to life. Every element reads as a
physical game piece: chunky cards on a dark table, boldly painted miniatures, inked edges,
brightly colored tokens. Not a manuscript page, not a web UI, not a video game HUD.

If a choice makes it feel more like a web app or a glossy screen, reject it. If it makes it
feel like a physical game piece — a card, a miniature, a token, a die — accept it.

---

## 1. The Two-Layer Rule (unchanged structure, new colors)

The interface is exactly two visual layers. They have different jobs and different intensities.

| Layer | What it is | Intensity | Value |
|-------|------------|-----------|-------|
| **Chrome** (the table + frame) | Panels, cards, text, buttons, borders, modals | Restrained, dark, recedes | Deep charcoal-navy base. Medium-dark panels. White/off-white text. No faction colors in the chrome except as small accents (a dot, a left rule). |
| **Miniature** (the painted board) | Hex map, terrain, units, faction glyphs, knots, effects | Vivid, saturated, "sings" | Full faction hues, bright jewel pigments, gold. These are the painted miniatures on the table. |

**Squint test:** The center (the board) should be the only area that stays colorful; the
frame should recede into deep, warm shadow. If a panel is brighter than the map, you've
broken the layer rule.

---

## 2. Principles (ranked — use as tie-breakers)

When two good options conflict, the higher principle wins.

1. **Legibility first.** A strategy game is read, not admired. High contrast is non-negotiable.
   Dark chrome backgrounds, white text, bold icons. If ornament reduces scan-ability, cut it.

2. **Coherence over novelty.** One line weight, one icon hand, one type system, one shadow
   language. A new element should look like it was already in the box.

3. **Tabletop tactility.** Chunky cards, painted miniatures, hard shadows, inked edges —
   physical game materials. Not wood grain, not cloth texture, not paper fiber.

4. **Restraint reads as craft.** Fewer, calmer chrome elements feel more expensive than busy
   ones. The table is clean; the spectacle is on the board.

5. **Flavour is the reward, not the default.** Vivid color is earned by factions, terrain,
   and key moments (combat, Augur's Dispatch, victory). The everyday chrome stays quiet so
   those moments land.

---

## 3. Hard Rules (do not violate)

### 3.1 State and faction are separate visual channels

- **Faction color = entity identity.** The fill of a unit, glyph, or token tells you *who*
  they are. Never override an entity's fill color with a state color.
- **State = border + icon treatment.** Ally/hostile/neutral/selected are shown through
  border color, border weight, and a state icon. They never replace the entity's faction fill.
- This means a CRU champion (red fill) that is yours wears a **teal ally border**.
  A CRU champion that is your enemy wears an **amber hostile border**.
  A VER champion (green fill) that is yours also wears a **teal ally border**.
  The fill tells you who; the border tells you what they are to you.

### 3.2 Gold is rare — budget of ~3 per screen

Gold appears only on: the single primary CTA, the selection halo/mandorla, and drop caps.
Against dark surfaces, gold actually shines — so enforce the budget more strictly, not less.
Never on borders, dividers, body text, or as a general "premium" tint.

### 3.3 No blackletter in body or UI

The blackletter face (`--font-accent`) is for the wordmark only. Headings = Cinzel small-caps;
everything else = EB Garamond.

### 3.4 No flat gray

Fog, disabled states, and backdrops use dark washes, hatching, or the cloud-band pattern —
never neutral `#888`-style gray.

### 3.5 One ink line language

2D chrome and 3D miniatures share the same inked edge weight and `currentColor` iconography.
That shared line is what makes them one object.

### 3.6 Faction hex values are fixed (per the token sheet)

Don't "improve" a faction color; tune the chrome around it instead.

### 3.7 State border colors are fixed

- **Ally state**: `--st-ally` (#00ddcc teal) — never green (that's VER's domain).
- **Hostile state**: `--st-hostile` (#ff7700 amber) — never red (that's CRU's domain).
- **Neutral state**: `--st-neutral` (#5a6070 gray)
- **Selected state**: `--st-selected` (#ffd700 gold)

---

## 4. Quick Do / Don't

| Do | Don't |
|----|-------|
| Dark table base, light text, dark panels | Light/parchment backgrounds, dark text |
| Chunky hard-offset shadows (comic-book style) | Soft paper-stack shadows, glassmorphism, neon glows |
| Jewel pigments on the board and glyphs | Saturated fills in the chrome / sidebars |
| Gilded primary token + primary button only | Gold borders, gold text, gold "everywhere" |
| Cinzel headings + Garamond body + tabular nums | Blackletter body text, sans-serif UI |
| State as border/icon (teal, amber, gray, gold) | State as entity fill (conflicts with faction) |
| Monoline icon set, one stroke weight | Mixing icon packs / stroke weights |
| Thick inked borders (2px+) | Hairline 1px borders that disappear on dark |
| Cloud-band / hatch fog on dark base | Solid semi-transparent gray fog |
| Compact equipment row with icon wells | Hiding equipment entirely |
| Drop cap on log + modal titles | Drop caps in body paragraphs |

---

## 5. Decision Checklist — when adding a new element

Before shipping any new component, screen, or asset, ask in order:

1. **Layer?** Is it chrome or miniature? (If unsure, it's chrome — keep it dark and quiet.)
2. **Does it already exist?** Can an existing token, icon, or component do the job?
3. **Hierarchy?** What should the eye land on first? Make one thing dominant; demote the rest.
4. **Gold budget?** Am I adding gold? Is there room, or do I demote something?
5. **State colors?** Am I using border/icon treatments for state, or am I accidentally
   recoloring an entity's fill? State goes on the **border**, not the fill.
6. **Squint test.** Does the center still win? Does the chrome recede into the dark table?
7. **Tactility test.** Does it feel like a physical game piece on a table? If it feels like
   a web widget, restyle.

---

## 6. Colour Palette Reference

### Chrome palette (table + frame)

| Token | Value | Use |
|-------|-------|-----|
| `--vellum` | #161a24 | Table surface / page ground |
| `--vellum-2` | #1e2433 | Recessed panel, map mount |
| `--parchment` | #252d3d | Card / panel surface |
| `--ivory` | #2d3648 | Raised surface, modal card |
| `--ink` | #e8e4dc | Body text |
| `--ink-soft` | #a8a4b0 | Secondary text, captions |
| `--ink-faint` | #6a6e7a | Tertiary, placeholders |
| `--rule` | #3d4558 | Hairline divider |
| `--rule-strong` | #505a72 | Stronger divider |
| `--parchment-glass` | #2d3648cc | Semi-transparent overlay |

### Faction palette

| Faction | Base | Glow | Pale | Hex (for JS) |
|---------|------|------|------|-----|
| CRU | #cc3628 | #f07a6a | #e87a6a | #cc3628 |
| REV | #7d55cc | #b79aff | #b388f0 | #7d55cc |
| VER | #34a055 | #6de98a | #88d888 | #34a055 |
| ARC | #3a70c0 | #7cb8ff | #8ab8f0 | #3a70c0 |
| HRT | #d49a24 | #ffd86b | #efc86b | #d49a24 |
| MSK | #b04d88 | #ff8edb | #e488c0 | #b04d88 |
| HOL | #4a5570 | #8a9cff | #a0a8c0 | #4a5570 |

### Pigment palette (elemental / semantic)

| Token | Value | Role |
|-------|-------|------|
| `--ultramarine` | #2a50dd | Water, sky, lapis accents |
| `--vermilion` | #ff5533 | Fire, rubric, hostile accent |
| `--malachite` | #22bb66 | Forest, positive growth |
| `--emerald` | #0f9d55 | Deep forest / Verdant shadow |
| `--tyrian` | #9a2a7a | Masque / dream accents |
| `--gold` | #ffd700 | **RARE** — primary CTA, selection halo, drop caps |
| `--gold-hi` | #ffe880 | Burnished highlight (animation peak) |

### State palette (border + icon treatments only)

| Token | Value | Visual |
|-------|-------|--------|
| `--st-hostile` | #ff7700 | Thick amber border (not red — that's CRU) |
| `--st-ally` | #00ddcc | Thick teal border (not green — that's VER) |
| `--st-neutral` | #5a6070 | Normal gray border |
| `--st-selected` | #ffd700 | Gold pulsing border (same as gold token) |
| `--st-reveal` | #5fbf7a | Combat reveal glow |
| `--st-move` | #00ddcc 15% mix | Movement highlight overlay |
| `--st-danger` | #ff7700 15% mix | Danger zone highlight |
| `--st-fog-seen` | #252d3d 55% mix | Fog overlay on seen tiles |

---

## 7. Fixed vs. Flexible

**Fixed** (don't change without a group decision): the metaphor (§0), the two-layer split (§1),
faction hex triplets, the pigment palette names, the gold budget, the state-vs-fill rule,
the type roles, the icon stroke weight, the shadow language.

**Flexible** (tune freely within the rules): spacing, exact panel widths, copy, individual
glyph/icon shapes (as long as they stay in the one monoline hand), animation timings,
which corners get knotwork.

---

## 8. Drift Detectors (red flags)

Stop and reconsider if you see any of these:

- A panel that's more colourful than the map.
- State expressed by changing an entity's fill color instead of its border.
- A second gold border appearing "because it looks nice on dark."
- A new sans-serif or a second serif creeping in.
- Icons of mismatched stroke weight or corner radius.
- A big soft drop shadow on a card (use hard offset shadows instead).
- Gray fog or gray disabled buttons.
- Body text set in Cinzel or blackletter.
- A component that needed its own one-off colour or radius.
- Hairline borders that disappear against the dark chrome.

---

## 9. Playful Whimsy & Icon-First Language

The game's visual voice is bold, playful, and whimsical — like a delightfully charming board
game.

### Principles

**Symbols speak first.** Icons are a primary communication channel, not decoration. Players
should grasp critical state changes (gold gained, HP lost, potency shifted) from icons +
numbers alone — text is the fallback for detail.

This applies especially to ritual moments: the Augur's Dispatch, combat results, discovery
rewards. These are the game's "big picture" beats.

**Spectacle pops against dark.** Against a dark chrome base, vivid spectacle moments land
harder. The Dispatch's weather display (big tinted panel with fog pattern and corner knots)
is the model — bold colour fields, symbolic representation, minimal text — but now it sits
on a dark backdrop instead of parchment.

**Chroma is permission, not a requirement.** "Playful" means expressive use of existing
iconography and colour accents, not garish palettes. The faction colours, weather tints,
and monoline icon set give enough range. When in doubt, add an icon before adding a sentence.

**The two-layer rule still holds.** Chrome stays dark and restrained in panels, sidebars,
and navigation. The playfulness lives in the content areas — the painted board, the modal
cards, the weather, the icons that tell you what happened.

---

## 10. State Border Application Guide

Use these CSS patterns when applying state to any entity (champion, mob, hex, card):

```css
/* State = border treatment. Entity fill is always the faction/pigment color. */

.entity.ally {
  border: var(--edge-bold) solid var(--st-ally);
  /* also applies a shield icon via ::before or data-attribute */
}

.entity.hostile {
  border: var(--edge-bold) solid var(--st-hostile);
}

.entity.neutral {
  border: var(--edge) solid var(--st-neutral);
}

.entity.selected {
  border: var(--edge-bold) solid var(--st-selected);
  box-shadow: 0 0 12px var(--st-selected);
}
```

State background washes (for hex highlights, map overlay areas) use the 15% mix tokens:
```css
.hex.ally-zone {
  background: var(--st-move);
}
.hex.danger-zone {
  background: var(--st-danger);
}
```

These are overlays — they sit on top of the entity, not replacing it.
