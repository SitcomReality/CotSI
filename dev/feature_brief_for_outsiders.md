# Feature Brief for Outsiders — Map Features in CotSI

This document is for people who haven't seen the game or code. It explains what a
"feature" is, what already exists, how features work technically, and what kinds of
suggestions would be useful.

---

## The Game in Two Sentences

Champions of the Supernal Interregnum is a turn-based strategy game on a hex grid map.
Seven faction champions explore a procedurally generated world, fight each other, dig up
relics, and claim territory.

---

## What Is a Feature?

A **feature** is a thing that sits on a single hex tile on the map. Trees, bushes,
glowing magical knots, fruit-bearing plants — anything that makes the hex visually
interesting and may have a gameplay effect. Features are placed during map generation
and persist for the whole game (unless removed by gameplay).

Features are **not**:
- **Buildings / bases** — those are separate entities placed by players mid-game.
- **Mobs / traders / champions** — those are mobile entities that move around.
- **Terrain** — the base material of the hex (grassland, desert, mountain, water, etc.).

A hex can have at most one feature. Many hexes have none.

---

## Existing Features

| Kind | What It Is | Gameplay | Renders As |
|------|-----------|----------|------------|
| **tree** | An ordinary tree | Blocks digging; purely decorative | 3D trunk + leafy canopy (3 variants) |
| **largeTree** | A bigger tree, same shape | Same as tree, just taller | Same tree mesh at 1.8× scale |
| **fruitTree** | A tree with edible fruit | Heals a champion who stops on it; fruit regrows after 4 days; blocks digging | Same tree mesh, no visual distinction |
| **knot** ("God's Knot") | A glowing purple crystalline orb | Champion mines it for 2-4 units of God's Knot currency; disappears when mined | 3D emissive purple orb |
| **bush** | A low scrub bush | Blocks digging; decorative | Small green tuft mesh |
| **vine** | A ground vine | Blocks digging; decorative (currently unused) | Same green tuft mesh as bush |

---

## How Features Are Placed

During map generation, every passable hex gets one chance to spawn a feature. The
process is:

1. A **noise roll** (a deterministic random number between 0 and 1) is generated for
   the hex.
2. The biome's **feature rule list** is checked in order. Each rule has:
   - a `kind` (what feature to spawn)
   - a `threshold` and comparison direction (`gt` = spawn if roll > threshold, or
     `lt` = spawn if roll < threshold)
   - optionally a `terrainExclude` list (don't spawn on these terrain types)
3. The **first** rule that matches wins. That feature is placed on the hex.
4. Some features also check **climate** (elevation, moisture) — fruit trees won't
   grow in deserts or above the tree line, for instance.
5. A **density** factor (0 to 1) derived from moisture and elevation modulates the
   thresholds, creating smooth transitions — there's no hard line between "forest
   with many trees" and "plain with a few."

---

## How Features Interact With Gameplay

- **Block digging**: A champion cannot dig on a hex that has a feature. The feature
  must be removed first (not yet implemented for trees/bushes; you can only dig on
  empty hexes).
- **Fruit trees**: When a champion steps onto a ripe fruit tree, they eat the fruit
  and heal. The tree goes unripe and regrows after 4 game days.
- **God's Knots**: When a champion steps onto an unmined knot, they automatically mine
  it and gain the knot currency. The knot disappears.
- **AI targeting**: Bot champions actively seek out fruit trees (when injured) and
  unmined knots.

---

## How Features Render

The game uses the browser's 3D (via Three.js) and instanced mesh rendering — every
feature of the same kind on a chunk shares the same geometry, just repositioned and
recolored. Each feature kind gets its own geometry and material.

New features can get:
- A **custom 3D geometry** (built from Three.js primitives: cylinders, spheres,
  cones, toruses, etc.)
- A **custom material** (colored, emissive/glowing, transparent, etc.)
- A **scale** hint to the renderer
- Multiple visual **variants** per kind (e.g., trees have round/tall/wide canopies)

We can also vary a feature's **color** or **scale** per-instance based on noise or
context.

---

## What Makes a Good Feature Suggestion 

**Things to keep in mind:**

- A feature lives on **one hex** (about the size of a small clearing). Think
  "what's in this one tile" rather than "what's in this whole region."
- The game's aesthetic is **weird manuscript marginalia meets cosmic horror** —
  think medieval bestiaries, occult diagrams, illuminated initials, gothic
  illuminated manuscripts, mixed with alien/eldritch elements. The world is a
  ruined cosmic library-universe.
- Features are **static** — they don't move, animate, or have AI. They just sit
  there and may have a simple one-time or repeating interaction when a champion
  steps on them.
- A feature should feel **thematically coherent** with the biome it lives in
  (see the biome list below).
- Simple interactions are better than complex ones — the engine supports:
  - **Harvest** (champion gains a resource when stepping on it, feature may
    disappear or regrow)
  - **Heal** (champion regains health)
  - **Block** (champion cannot dig here until feature is removed)
  - **Buff/debuff** (apply a temporary stat effect to the champion — this is
    new and would need wiring but is feasible)
  - **Reveal** (show nearby hidden tiles temporarily)
  - **Damage** (champion takes damage when stepping on it)
  - **Move/teleport**
  - **Terrain/hex changes**
  - **Other** (anything is possible)
- Features can have **state** (e.g., mined/unmined, ripe/unripe) to enable
  multi-turn interactions.
- Features are **reusable** across biomes — the same feature kind could appear
  in multiple biomes with different spawn probabilities.

**What NOT to suggest:**
- Animated or moving creatures (use the mob system for that)
- Multi-hex structures or formations (the engine is per-hex)
- Complex inventory, crafting, or dialog (not appropriate at this scale)
- Vehicles, mounts, or rideable things (not part of the feature system)

---

## Current Biomes (for thematic targeting)

| Biome | Character | Terrain Mix | Current Features |
|-------|-----------|-------------|-------------------|
| **Default** | Cosmopolitan, the baseline world — ordinary forested countryside with a tinge of the strange | forest, plains, hills | trees, fruit trees, knots |
| **Brass Grave** | Hot, volcanic — smoldering vents, brass-colored rock, acrid fumes. Industry/forge aesthetic | desert, hills | knots only |
| **Scorch** | Hot and dry — drought-resistant trees, fires that never cease, long sightlines, cracked earth | plains, desert | sparse trees, sparse fruit trees, knots |
| **Painforest** | Temperate rainforest — dense canopy, rich undergrowth, abundant life, hostile plants | forest, denseForest, marsh | many trees, fruit trees, bushes, knots |
| **Sere Wastes** | Barren, arid badlands — almost lifeless, eroded rock, dust | desert, plains | very sparse trees and fruit trees, knots |
| **The Frigid Silence** | Tundra — permafrost, pale sky, muffled sound, stark beauty | tundra, plains | knots only |
| **Mourning Marsh** | Swamp — standing water, peat, mist, rotting vegetation, melancholic | marsh, plains | knots only |
| **Unfinished Lands** | Fringe of reality — half-rendered geometry, impossible colors, flickering in and out of existence | varied, includes water | knots only |

---

## How to Submit a Suggestion

For each feature idea, include:

1. **Name** — a short, evocative name (e.g., "Cinderbloom", "Witness-Stone")
2. **Thematic description** — what it looks like and feels like, 2-4 sentences
3. **Gameplay effect** — what happens when a champion steps on it (e.g., heals,
   damages, grants a resource, blocks digging, reveals map, applies a buff)
4. **Suggested biome(s)** — which of the 8 biomes it fits best (one or more)
5. **Terrain affinity** — which terrain types it should prefer (forest, plains,
   desert, marsh, hill, tundra, or "any")
6. **Rarity intuition** — how common it should feel relative to other features:
   common (like trees), uncommon, rare, or very rare
7. **Visual notes** — any thoughts on what it looks like, colors, shape, glow,
   transparency, size relative to a hex

That's it. Don't worry about thresholds, noise channels, or code — we handle that.
The goal is to get fresh, novel, thematic ideas that feel like they belong in a
weird medieval-cosmic-horror library-universe.
