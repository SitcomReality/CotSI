# Scene & Rendering Conventions — Context Reference

**Champions of the Supernal Interregnum** — the world's physical scale, how
colors reach geometry, and what every terrain's decor looks like. Written for
contributors (human or LLM) who have not seen the game and want their authored
objects to *fit*: right size, right color source, right density. Complements
`dev/docs/descriptorSchema.md` (the descriptor schema itself; entry point: `descriptorAuthoring.md`) and
`dev/docs/context/biomesAndTerrain.md` (biome/terrain colors) and
`dev/docs/context/factions.md` (faction colors).

---

## 1. World scale (units)

- **Hex radius = 1.0** — all authored lengths are in world units where the hex
  is 2.0 across. A hex tile is a flat-topped board-game piece:
  `HEX_RADIUS 1.0`, top face at **y = 0**, edge thickness `HEX_THICKNESS 1.25`.
- **Champions** are tabletop miniatures ~0.5–0.8 tall, standing on a shared
  dark pedestal disc (radius 0.23, height 0.06, color `#2a2628`). Their parts
  are small primitives: robes ~0.14 radius cones, gems ~0.045 radius
  octahedra. Everything about a champion must read at a glance from above.
- **Bases** (faction structures) and **mobs** follow the same language —
  entity scale is `entity.scale × descriptor.scale`.
- **Terrain decor** per hex: item counts come from each decor's `cluster`
  block (roughly 3–7 per hex), and `size` blocks give an absolute
  per-instance scale range, not a jitter factor of the authored size.
- **Mountain** decor is special: one hex-pyramid per tile, sized edge-to-edge
  (base radius 1.0, tiling), height driven by the tile's mountain type
  (peak/slope/normal).
- Terrain **elevation offsets** (Y of the tile surface): plains/desert 0,
  forest +0.15, deepWood +0.20, hill +0.25, marsh/beach −0.05, plateau
  +0.70, mountain +0.85, water −0.15, ice −0.12. Decor sits on the surface
  (hill mounds use `terrain` tint + `sunk` behavior; see §3).

---

## 2. How color reaches geometry (two pipelines)

**Tile path** (`feature`, `decor`, `mountain` — placed on every eligible tile):

1. Authored color → growth-state lerp (`states`) → per-instance brightness
   jitter (`variation.colorJitter`, ±~5–8%) → **biome tint**.
2. The biome tint mixes the part toward the tile's neighbor-blended biome
   color via `biomeColor: { source, influence }`:
   - `source: 'foliage' | 'wood' | 'soil' | 'stone' | 'bloom' | 'exotic'` —
     the biome's material-class color swatches (see biomesAndTerrain §7.2);
     pick the swatch matching the material the part depicts. Every biome
     swatch-tints; tiles with no known biome colors keep the authored colors.
   - `source: 'terrain'` — the tile's own ground color (biome palette entry
     for its terrain, neighbor-blended) — ground matching, applies everywhere.
   - `influence` 0…1, and the tint requires a **numeric literal** part color.

**Entity path** (`base`, `champion`, `mob`, `trader` — one per entity):

1. No jitter, no biome tint. Colors resolve from the **entity's palette**:
   string token → `entity.colors[token]` (`factionBase`, `factionAccent`,
   `factionBody`), numeric → literal, absent → `entity.color`.
2. See `context/factions.md` §3 for the faction hex values behind those tokens.

---

## 3. Terrain decor registry

One decor descriptor per decor-producing terrain (id = terrain key). These are
the objects an LLM is most likely to be asked to restyle or extend:

| Terrain | Decor id | Display name | Look | Cluster |
|---------|----------|--------------|------|---------|
| `plains` | `plains` | Plains decor | grass blades | 3–7 |
| `forest` | `forest` | Forest decor | round trees | 3–5 |
| `deepWood` | `deepWood` | Deep Wood decor | conical pines | 4–7 |
| `desert` | `desert` | Desert decor | scrub clusters | 3–6 |
| `marsh` | `marsh` | Marsh decor | reed clusters | 4–6 |
| `hill` | `hill` | Hill decor | single raised mound (sinks when displaced) | 1 |
| `plateau` | `plateau` | Plateau decor | boulder + scrub-tuft scatter | 3–7 |
| `beach` | `beach` | Beach decor | log + tuft/stone/pile wrack | 3–6 |
| `mountain` | `mountain` | Mountain decor | hex-pyramid peak, edge-to-edge | per tile |
| `water` / `ice` / `river` | — | — | no decor (own water mesh) | — |

**Supernatural looks** are not standalone override decors — they're shared
motifs folded into each base decorator's `motifs` table and gated to one biome
by a `biomeWeight` of 0 everywhere else (see biomesAndTerrain §6). Titanstain
tiles pick the titan motifs (`titanSpire`, `titanBoil`);
Unfinished Lands picks the yet-fragment motifs (`yetFragmentCube`,
`yetFragmentShard`). Water/ice/river stay bare on natural
biomes (the water mesh handles their look) and gain only the `pool` motif under
the supernatural biomes.

**De-emphasis rules** (how decor coexists with occupants/features): a hex's
center is claimed in priority order **occupant > feature > terrain decor**.
Everything below the top claim is pushed aside instead of removed:
`dispersed` (shrunk + moved to the hex edge; single items land at a fixed
upper-left anchor), `sunk` (shrunk + dropped below the surface — hill mounds),
or `hidden` (behind a feature + occupant both present).

**Per-biome variation**: decor variety comes from `biomeWeight` skews on a
decorator's `motifs` table — a 0 excludes a motif reference (that is how the
supernatural looks above are gated), and relative weights retune the mix.
Decor descriptors do not pin whole alternate variants per biome; `biomeVariants: { biomeId: variantId }`
is a features/entities mechanism for selecting a whole alternate descriptor.
The design doctrine is "biome identity = tints and weights, not restated
geometry" — prefer tinting/shaping the shared shapes over duplicating them per
biome (see `descriptorSchema.md` §5.7).

---

## 4. Feature registry (quick reference)

Tile features are one descriptor per kind (`src/render/hexmap3d/worldObjects/descriptors/data/features/`),
spawned by per-biome rules (first match wins; `threshold`/`compare` vs. a tile
hash; `terrainOnly`/`terrainExclude` gate terrain). Kinds include: `blessedFont`
(heals), `knot` ("God's Knot" — the resource currency), `forge`, `dungeon`,
`treasureChest`, `bush`, `waxbloom`, `listenerLichen`, `screamroot`, `witnessStone`,
`palimpsestSlab`, `gildedInitial`, `vegetableLamb`, `saintsRib`,
`edenMushroom`/`edenShroomlet`, `snowperson`, `foolsFire`, `drownedCopyist`,
`scoriaRose`, `cinderbloom`, `censerSaint`, `volvelle`, `errataSlip`,
`nullLily`, `halfDrawnObelisk`, `ouroborosLoop`, `peridexionTree`, and more.
Each biome's `features` list in `src/game/rules/archetypeData/biomes/*.js`
names its signature kinds. Feature descriptors are the same tile-path pipeline:
hash-placed, jittered, biome-tinted (where applicable), de-emphasized by
occupants.

---

## 5. Files that define the look

| Concern | File |
|---------|------|
| Descriptor schema + validation | `src/render/hexmap3d/worldObjects/descriptors/schema.js`, `validateParts.js` |
| Color resolution (tile + entity) | `.../descriptors/partColor.js`, `.../partStates.js` |
| Biome tint computation | `src/render/hexmap3d/worldObjects/biomeTint.js` |
| Terrain surface colors | `src/params/render/terrainParams.js` (`TERRAIN_COLOR`) |
| Decor de-emphasis rules | `src/render/hexmap3d/worldObjects/decorEmphasis.js` |
| Decor descriptors | `.../descriptors/data/decor/*.js` |
| Feature descriptors | `.../descriptors/data/features/*.js` |
| Champion/base/mob descriptors | `.../descriptors/data/champions\|bases\|mobs/*.js` |
| Faction colors | `src/game/rules/factionData.js` |
| Geometry editor (authoring UI) | `dev/tools/geometryEditor.html` (+ `saveServer.sh`) |
