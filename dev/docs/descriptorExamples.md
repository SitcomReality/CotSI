# Descriptor Examples

Worked descriptor examples and the adding-a-new-object recipe. Extracted from
[descriptorAuthoring.md](descriptorAuthoring.md).

---

## 7. Worked example: a decor with variable properties — the Forest

A terrain `decor` is scattered and varies per tile, and the forest decor is the
flagship example of the variable-properties vocabulary: count, size, part set,
stretch, and color all come from ranges and per-tile draws rather than fixed
values. One decor per terrain — `src/render/hexmap3d/worldObjects/descriptors/data/decor/forest.js`
is the `forest` terrain's decor, and `decor/deepWood.js` is a **separate**
descriptor (Deep Wood's conical pines) — never a variant of this one.

> **v7 (current):** the shipped forest is a `motifs` table (schemaVersion 7).
> Each tree species is a shared-library motif (its own file in `data/motifs/`),
> and the decor's `motifs` table folds them together with per-biome
> `biomeWeight` skews, `repeatPenalty` damping, and the two supernatural biomes'
> look expressed as present-0 `biomeWeight` refs ([§5.4](descriptorSchema.md)).
> The worked example
> below is the shipped `data/decor/forest.js` (supernatural refs abridged).

The forest is also the showcase of biome identity as weight rather than
geometry: every biome that can grow forest terrain skews which tree species
dominates, through each entry's `biomeWeight`. Titanstain and Unfinished Lands
render their own corruption instead — those refs are present-0 `biomeWeight`
motifs in the same table (Titanstain-only / Unfinished-Lands-only entries),
not a decor swap:

```js
export const FOREST_DESCRIPTOR = {
  schemaVersion: 7,
  id: 'forest',                          // the decor's id IS the terrain's id
  kind: 'decor',                         // terrain decoration, not a feature
  displayName: 'Forest decor',
  cluster: { rule: 'moisture', countsByTerrain: { forest: [3, 5] } }, // count scales with tile moisture
  size: { min: 1.3, max: 1.5 },          // trees vary 1.3–1.5× object scale
  variation: { colorJitter: 0.05 },      // slight brightness jitter per tree
  placement: { mode: 'ring', leanMin: 0.2, leanMax: 0.3 }, // ring around the hex center, slight per-tree lean
  emphasis: { behavior: 'dispersed' },   // shrink+step aside when the center is claimed
  repeatPenalty: 0.35,                   // soft damping so a tile rarely repeats a species
  motifs: [
    // Shared-library refs — each entry pulls one species' geometry from data/motifs/.
    { motif: 'roundTree', weight: 0.3,
      biomeWeight: { biome_tundra: 0.15, biome_frigid_silence: 0.15,
                     biome_scorch: 0.3, biome_sere_wastes: 0.1,
                     biome_mourning_marsh: 0.4, biome_dustbleed: 0.5,
                     biome_edenfall: 2, biome_titanstain: 0,
                     biome_unfinished_lands: 0 } },
    { motif: 'conifer', weight: 0.22,
      biomeWeight: { biome_tundra: 3, biome_frigid_silence: 3.2,  // Dominant in the cold biomes
                     biome_sere_wastes: 0.1, biome_scorch: 0.15,
                     biome_mourning_marsh: 0.7, biome_edenfall: 0.7,
                     biome_painforest: 0.05, biome_dustbleed: 0.4,
                     biome_titanstain: 0, biome_unfinished_lands: 0 } },
    { motif: 'gnarledTree', weight: 0.08,
      biomeWeight: { biome_painforest: 5, biome_tundra: 0.1, biome_frigid_silence: 0.2,
                     biome_dustbleed: 0, biome_edenfall: 0.2, biome_mourning_marsh: 0.2,
                     biome_scorch: 0.1, biome_sere_wastes: 0.05 } },
    { motif: 'deadTree', weight: 0.1, size: { min: 1.35, max: 1.6 }, // per-entry size override
      biomeWeight: { biome_sere_wastes: 5, biome_tundra: 0.4, biome_frigid_silence: 0.2,
                     biome_edenfall: 0.1, biome_dustbleed: 0.5, biome_mourning_marsh: 0.3,
                     biome_painforest: 0.05, biome_scorch: 2,
                     biome_titanstain: 0, biome_unfinished_lands: 0 } },
    { motif: 'log', weight: 0.06,
      biomeWeight: { biome_mourning_marsh: 1.5, biome_painforest: 1.2, biome_dustbleed: 1.2,
                     biome_scorch: 1, biome_frigid_silence: 1, biome_sere_wastes: 0.8,
                     biome_tundra: 0.8, biome_edenfall: 0.6 } },
    // Supernatural corruption: only present where every natural biome is 0 — e.g.
    // titanSpire renders ONLY under biome_titanstain (all other biomes 0):
    // … titanSpire (weight 0.4), titanBoil (Titanstain)
    //   and yetFragmentCube/Shard (Unfinished Lands) — same pattern, and
    //   together they live once in decor/supernatural.js as SUPERNATURAL_MOTIFS,
    //   folded into this table via ...SUPERNATURAL_MOTIFS …
  ],
};
```

The rest of the forest's table, each species a shared-library motif with a
home-biome `biomeWeight` lift (the same geometry concept as the old variant
looks, expressed as weights rather than whole part-set pins):

| Motif | Home look | Home biome | Why it dominates there |
|---|---|---|---|
| `roundTree` | lush puffball | default, Edenfall | base species; `biome_edenfall: 2` lifts it |
| `conifer` | conical pine | Tundra, Frigid Silence | `biome_tundra: 3`, `biome_frigid_silence: 3.2` |
| `gnarledTree` | gnarled bent trunk | Painforest | `biome_painforest: 5` |
| `deadTree` | dead tree, broken branches | Sere Wastes | `biome_sere_wastes: 5` |
| `log` | fallen timber | (minor across biomes) | low base weight 0.06, small lifts |
| `titanSpire` etc. | Titanstain corruption | computed Titanstain | present-0 for every other biome |
| `yetFragment…` | Unfinished Lands halves | Unfinished Lands | present-0 for every other biome |

What each mechanism contributes, at a glance:

- **One decor per terrain** — the decor's `id` is the terrain's id, and
  `gameBuilder` maps terrain → decor by it. Deep Wood's look is a separate
  descriptor (`deepWood.js`), not a variant.
- **`motifs` is the content** — each cluster slot draws one entry from the
  weighted table. `variants[0]`/`biomeVariants` are not used; per-biome variety
  is a `biomeWeight` skew, not a swap of whole part sets.
- **`biomeWeight` = presentation, not geometry** — absent key ≡ 1, `0`
  excludes, `>1` dominates. The supernatural look is folded in as present-0
  refs so Titanstain/Unfinished Lands tiles get their corruption from the same
  table, not a decor swap.
- **`repeatPenalty: 0.35`** — after each slot pick the chosen motif's weight is
  damped and the table renormalized, so a scattered cluster trends toward
  diverse species instead of one tree repeating.
- **Variable properties** — everything about a forest is a range, not a fixed
  value: count (moisture rule), size (1.3–1.5×), species (weighted draw),
  per-tree stretch, biome size/color, brightness jitter. The chest (§8)
  is the opposite: one fixed, centralized object.
- `cluster.rule: 'moisture'` — wetter forest tiles get more trees
  (`countsByTerrain.forest` → 3–5; the deepWood decor carries its own
  4–7 range). Sere Wastes and Scorch tiles are dry, so their forests are
  automatically sparse without any per-species count.
- `placement.ring` — members circle the hex center; `emphasis.dispersed`
  pushes them to the hex edge and shrinks them when the center is claimed.
- `stretch` — per-tree random trunk height and canopy puffiness (deterministic
  per tile, seeded hash draws); `x: false` / `z: false` pin the trunk's width.
- `liftRange` — the canopy base tracks the trunk's stretch draw (same seed) so
  a tall tree's canopy rides high and a short tree's rides low; the per-species
  ranges tuck each canopy shape into its trunk (a cone base overlaps less than
  a sphere, so a conifer's range hugs the trunk top while a round tree's
  swallows it).
- `biomeScale` — stunted species shrink in the cold biomes, and the
  `deadTree` entry's `size` override (1.35–1.6×) makes Sere Wastes trees
  stand taller.
- `biomeColor` — canopy green leans into the tile's blended biome color
  (`foliage` for round canopies, the biome's `terrain` surface color for
  ground-matching conifers, `exotic` for frost snow and crystal bits).
- `color` per part — trunk brown vs canopy green, jittered ±0.05 brightness;
  a dead tree's branches are darker than its trunk.

## 8. Worked example: a centralized feature — the Open Treasure Chest

The chest is the opposite of the forest decor (§7): one fixed, centralized
object with a moving sub-assembly. It shows schema v5 groups (the hinged lid),
root leaves with per-part transforms, non-uniform scale, and local rotations.
The closed-lid sibling `treasureChest.js` uses the same parts vocabulary
without the group.

`src/render/hexmap3d/worldObjects/descriptors/data/features/openTreasureChest.js` (annotated;
default-valued fields omitted for readability):

```js
export const OPEN_TREASURE_CHEST_DESCRIPTOR = {
  schemaVersion: 5,
  id: 'openTreasureChest',        // a feature kind — spawns one chest per tile
  kind: 'feature',
  displayName: 'Open Treasure Chest',
  scale: 1.2,                     // item-level size multiplier
  emphasis: { behavior: 'dispersed' },  // yield when an occupant claims the hex
  // No `placement`: defaults to { mode: 'center' } — one item at the hex center.
  parts: [
    { id: 'chest-base', shape: 'box', params: { width: 0.35, height: 0.15, depth: 0.25 },
      color: 0x5c4033 },
    { id: 'iron-strap-base-left', shape: 'box', params: { width: 0.03, height: 0.16, depth: 0.255 },
      transform: { localPos: { x: -0.12, y: 0, z: 0 } }, color: 0x222222 },
    { id: 'iron-strap-base-right', shape: 'box', params: { width: 0.03, height: 0.16, depth: 0.255 },
      transform: { localPos: { x: 0.12, y: 0, z: 0 } }, color: 0x222222 },
    { id: 'gold-hoard', shape: 'spheroid', params: { radius: 0.12 },
      transform: { y: -0.06, scaleX: 1.3, scaleY: 0.6, scaleZ: 0.9, localPos: { x: 0, y: 0.12, z: 0 } },
      color: 0xffd700 },
    { id: 'gem-ruby', shape: 'dodecahedron', params: { radius: 0.03 },
      transform: { y: -0.04, localPos: { x: 0.08, y: 0.16, z: 0.04 }, localAxis: { x: 1, y: 1, z: 0 }, localAngle: 0.5 },
      color: 0xe0115f },
    { id: 'gem-sapphire', shape: 'dodecahedron', params: { radius: 0.025 },
      transform: { y: -0.02, localPos: { x: -0.05, y: 0.18, z: -0.02 }, localAxis: { x: 0, y: 1, z: 1 }, localAngle: 0.8 },
      color: 0x0f52ba },
    {
      id: 'group-1',              // the hinged lid — a group, no shape/color
      transform: { localPos: { x: 0, y: 0.15, z: 0.125 },   // hinge: chest back-top
                  localAxis: { x: 1, y: 0, z: 0 }, localAngle: 1 },  // swing open
      children: [
        { id: 'chest-lid-open', shape: 'box', params: { width: 0.35, height: 0.08, depth: 0.25 },
          transform: { localPos: { x: 0, y: 0, z: -0.125 } }, color: 0x4a3022 },
        { id: 'iron-strap-lid-left', shape: 'box', params: { width: 0.031, height: 0.1, depth: 0.255 },
          transform: { localPos: { x: -0.1, y: 0, z: -0.125 } }, color: 0x222222 },
        { id: 'iron-strap-lid-right', shape: 'box', params: { width: 0.031, height: 0.1, depth: 0.255 },
          transform: { localPos: { x: 0.1, y: 0, z: -0.125 } }, color: 0x222222 },
      ],
    },
  ],
};
```

What each piece demonstrates:

- **Central placement** — no `placement` field, so the default `mode: 'center'`
  puts one item at the hex center. Contrast the scattered forest decor (§7).
- **Emphasis** — the chest *yields* rather than disappears: any occupant
  (champion, trader, mob) claims the hex center, so `dispersed` shrinks the
  chest and steps it aside instead of burying it. Use `behavior: 'hidden'` if
  you'd rather it vanish outright.
- **Root leaves** — `chest-base` and the iron straps are grounded at the
  surface; the straps' `localPos.x` (±0.12) sets their stance against the
  base. Each part is positioned independently, yet the straps read as wrapping
  the box.
- **Non-uniform scale** — `gold-hoard` squashes a 0.12-radius spheroid
  (`scaleY: 0.6`, `scaleX: 1.3`) into a coin pile, and `y: -0.06` +
  `localPos.y: 0.12` stack to sink it inside the chest body.
- **Local rotations** — the gems are dodecahedra posed with
  `localAxis`/`localAngle` so their facets catch the light at different angles.
- **The group** — `group-1` is the hinged lid: its `localPos` is the hinge
  point at the chest's back-top edge, and `localAxis`/`localAngle` swing the
  whole sub-assembly open. The children are authored in the closed-lid frame
  (`z: -0.125` puts their back edge on the hinge axis), so rotating the group
  swings lid + straps rigidly — no hand-duplicated offsets
  ([§4.5](descriptorSchema.md)).

## 9. Adding a new object — checklist

1. **Write the file** `src/render/hexmap3d/worldObjects/descriptors/data/<id>.js`
   with the `<ID>_DESCRIPTOR` export (id = feature kind for features).
2. **Register it** in `data/index.js`: add the import and push it into
   `ALL_DESCRIPTORS` (editor-display order).
3. **Validate + preview records** — Node recipe (Node may be off PATH on
   Flatpak; use `/run/host/usr/bin/node`):

   ```bash
   /run/host/usr/bin/node --input-type=module <<'EOF'
   import { normalizeDescriptor, validateDescriptor } from './src/render/hexmap3d/worldObjects/descriptors/schema.js';
   import { recordsForDescriptor } from './src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js';
   const { OPEN_TREASURE_CHEST_DESCRIPTOR } = await import('./src/render/hexmap3d/worldObjects/descriptors/data/features/openTreasureChest.js');
   const d = normalizeDescriptor(OPEN_TREASURE_CHEST_DESCRIPTOR);
   const errors = validateDescriptor(d);
   if (errors.length) { console.error(errors); process.exit(1); }
   console.log(recordsForDescriptor(d, { q: 3, r: -2, terrain: 'plains' }, { x: 0, y: 0, z: 0 }));
   EOF
   ```

4. **Regenerate the golden snapshot** so `dev/tests/run.sh` passes
   (`descriptorData.test.js` asserts every descriptor's records exactly match
   `dev/tests/render/fixtures/descriptorData.snap.json`):

   ```bash
   /run/host/usr/bin/node --input-type=module <<'EOF'
   import { writeFileSync } from 'node:fs';
   import { ALL_DESCRIPTORS } from './src/render/hexmap3d/worldObjects/descriptors/data/index.js';
   import { normalizeDescriptor } from './src/render/hexmap3d/worldObjects/descriptors/schema.js';
   import { recordsForDescriptor } from './src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js';
   const POS = { x: 1.732, y: 1.25, z: -3.0 };
   const TILES = {
     forest: { q: 3, r: -2, terrain: 'forest', moisture: 0.8 },
     deepWood: { q: 3, r: -2, terrain: 'deepWood', moisture: 0.8 },
     hill: { q: 3, r: -2, terrain: 'hill' },
     mountain: { q: 3, r: -2, terrain: 'mountain', mountainType: 'peak' },
   };
   const tileFor = (d) => TILES[d.id] ?? { q: 3, r: -2, terrain: 'plains' };
   const ENTITY_KINDS = new Set(['base', 'champion', 'mob', 'trader']);
   const out = {};
   for (const raw of ALL_DESCRIPTORS) {
     if (ENTITY_KINDS.has(raw.kind)) continue;
     const d = normalizeDescriptor(raw);
     out[raw.id] = { tile: tileFor(d), records: recordsForDescriptor(d, tileFor(d), POS) };
   }
   writeFileSync('dev/tests/render/fixtures/descriptorData.snap.json', JSON.stringify(out, null, 2) + '\n');
   console.log('wrote', Object.keys(out).length, 'snapshots');
   EOF
   ```

   A ready-made script does this for you:
   `dev/scripts/regenerate_descriptor_snapshot.sh` (wrapping
   `regenerate_descriptor_snapshot.mjs`, with the same Node resolution as
   `dev/tests/run.sh`). The geometry editor's save server also regenerates the
   snapshot on every Save.

5. **Run the checks**: `dev/tests/run.sh`, `python3 dev/scripts/check_imports.py`,
   `python3 dev/scripts/check_geometry_editor_imports.py`.
6. **Make it spawn in-game** (features): register a feature archetype in
   `src/game/rules/archetypeData/features.js`
   (`defineArchetype('feature_<kind>', { type: 'feature', name, tags, visual })`)
   and a spawn rule that references its kind (see the existing entries).
   Terrain decorations (decor/mountain) hook in via `gameBuilder.js`'s
   terrain tables instead.
7. Optionally **open the geometry editor** (`dev/tools/geometryEditor.html` via
   `dev/tools/geometryEditor/saveServer.sh`) to view/edit it — Save will rewrite the
   file in canonical form.

