Supernal Interregnum — Style Guide (v1)

A short, opinionated reference for keeping the visual language consistent. Pair this with the Token Sheet (v0.2): the token sheet is what the values are; this guide is how to decide when the values don't already answer the question.
0. North Star

    "A virtual tabletop holding an illuminated codex."

The player is sitting at a table with a painted book open, not reading a webpage and not staring at a video game HUD. Every decision should reinforce tactility (paper, wood, wax, ink, cloth) and reserve spectacle for the painted board.

If a choice makes it feel more like a web app, reject it. If it makes it feel more like a plastic strategy game, reject it. If it makes it feel like a hand-made object on a table, or the leaf of an ancient scroll, accept it.
1. The Two-Layer Rule (most important structural idea)

The interface is exactly two visual layers. They have different jobs and different intensities, and they must never borrow each other's vocabulary.
Layer	What it is	Intensity	Allowed colour
Chrome (table + page)	Panels, cards, text, buttons, borders, modals, marginalia	Restrained, quiet	Vellum / parchment / ivory / ink / neutral rule. Faction colour only as a small tint (a dot, a left rule).
Miniature (the painted board)	Hex map, terrain, units, faction glyphs, knots, effects	Vivid, saturated, "sings"	Full jewel pigments + full faction hues + the rare gold.

Test: squint at the screen. The centre should be the only place that stays colourful; the frame should recede into warm neutrals. If the chrome is competing with the board, you've broken the layer rule.
2. Principles (ranked — use as tie-breakers)

When two good options conflict, the higher principle wins.

    Legibility first. A strategy game is read, not admired. If ornament reduces scan-ability, cut the ornament. Tabular numbers, clear hierarchy, and obvious state colours are non-negotiable.
    Coherence over novelty. One line-weight, one icon hand, one type system, one shadow language. A new element should look like it was already in the box. If it needs its own new style, it's probably wrong.
    Tabletop tactility over manuscript ornament. Prefer stacked paper, wax seals, inked edges, painted miniatures, and cloth banners over flourishes, filigree, and blackletter. Ornament lives in corners and initials, not everywhere.
    Restraint reads as craft. Fewer, calmer elements feel more expensive than busy ones. When in doubt, remove.
    Flavour is the reward, not the default. The illuminated richness is earned by the board and by key moments (combat, victory). The everyday chrome stays quiet so those moments land.

3. Hard Rules (do not violate)

    Gold is rare — budget of ~3 per screen. Gold leaf appears only on: the single primary CTA, the selection halo/mandorla, the primary-faction token, and drop caps. Never on borders, dividers, body text, or as a general "premium" tint. If you're adding a fourth gold element, demote an existing one first.
    No blackletter in body or UI. The blackletter face (--font-accent) is for the wordmark only. Headings = Cinzel small-caps; everything else = EB Garamond.
    No flat gray. Fog, disabled states, and backdrops use vellum-dark washes, hatching, or the cloud-band pattern — never neutral #888-style gray.
    No blob shadows. Depth comes from the stacked-paper shadow tokens (--shadow-card, --shadow-stack, --shadow-seal), not large soft drop shadows.
    One ink line language. 2D chrome and 3D miniatures share the same inked edge weight and currentColor iconography. That shared line is what makes them one object.
    Faction hex values are fixed. Don't "improve" a faction colour; tune the chrome around it instead.

4. Quick Do / Don't
Do	Don't
Vellum panels, ink rules, paper-stack shadows	Glossy gradients, glassmorphism, neon glows
Jewel pigments on the board and glyphs	Saturated fills in the chrome / sidebars
Gilded primary token + primary button only	Gold borders, gold text, gold "everywhere"
Cinzel headings + Garamond body + tabular nums	Blackletter body text, sans-serif UI
Monoline icon set, one stroke weight	Mixing icon packs / stroke weights
Stacked cards, wax seals, inked edges	Floating cards with big soft shadows
Cloud-band / hatch fog	Solid semi-transparent gray fog
Compact equipment row with icon wells	Hiding equipment entirely
Drop cap on log + modal titles	Drop caps in body paragraphs
5. Decision Checklist — when adding a new element

Before shipping any new component, screen, or asset, ask in order:

    Layer? Is it chrome or miniature? (If unsure, it's chrome — keep it quiet.)
    Does it already exist? Can an existing token, icon, or component do the job? Reuse before inventing.
    Hierarchy? What should the eye land on first here? Make one thing dominant; demote the rest.
    Gold budget? Am I adding gold? Is there room, or do I demote something?
    State colours? Hostile = vermilion, ally = malachite, neutral = ink-soft, selected = gold. Am I using the right semantic colour?
    Tactility test? Does it feel like paper/wood/ink/wax/cloth on a table? If it feels like a web widget, restyle.
    Squint test. Does the centre still win? Does the chrome recede?

If any answer breaks a Hard Rule (§3), fix it before merge.
6. Fixed vs. Flexible

Fixed (don't change without a group decision): the metaphor (§0), the two-layer split (§1), faction hex triplets, the pigment palette names, the gold budget, the type roles, the icon stroke weight, the shadow tokens.

Flexible (tune freely within the rules): spacing, exact panel widths, copy, individual glyph/icon shapes (as long as they stay in the one monoline hand), animation timings (keep ≤ ~300ms), which corners get knotwork.
7. Drift Detectors (red flags)

Stop and reconsider if you see any of these:

    A panel that's more colourful than the map.
    A second gold border appearing "because it looks nice."
    A new sans-serif or a second serif creeping in.
    Icons of mismatched stroke weight or corner radius.
    A big soft drop shadow on a card.
    Gray fog or gray disabled buttons.
    Body text set in Cinzel or blackletter.
    A component that needed its own one-off colour or radius.

8. Playful Whimsy & Icon-First Language
    
    The game's visual voice is shifting toward a more playful, bold, and
    whimsical register — without breaking the tabletop-manuscript metaphor.
    
    Principles:
    
    Symbols speak first. Icons are a primary communication channel, not
    decoration. Players should grasp critical state changes (gold gained, HP
    lost, potency shifted) from icons + numbers alone — text is the fallback
    for detail, not the main carrier of meaning.
    This applies especially to ritual moments: the Augur's Dispatch, combat
    results, discovery rewards. These are the game's "big picture" beats.
    
    Spectacle has its place. The quiet-chrome rule (§1) applies to the
    everyday interface. Key moments — the Augur's Dispatch, combat resolution,
    victory — get deliberate visual energy. The Dispatch is an illuminated
    manuscript page, a diegetic object, not a UI panel. Its weather display
    (big tinted panel with fog pattern and corner knots) is the model for
    future spectacle moments: bold colour fields, symbolic representation,
    minimal text.
    
    Chroma is permission, not a requirement. "Playful" means expressive use
    of existing iconography and colour accents, not garish palettes. The
    faction colours, weather tints, and monoline icon set give enough range.
    When in doubt, add an icon before adding a sentence.
    
    The two-layer rule still holds for the frame. Chrome stays restrained in
    panels, sidebars, and navigation. The playfulness lives in the content
    areas — the painted board, the modal cards, the weather, the icons that
    tell you what happened while you weren't looking.
