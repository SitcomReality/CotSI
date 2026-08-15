# Geometry, decor, biome, feature and terrain updates

This document is following on from the recent update that was implemented in the below commits. For a full implementation map and the remaining work, see the **hand-off**: `dev/handoff_geometry_biome_updates_20260815.md`.

| # | Commit | What |
|---|--------|------|
| 1 | 7efc977 | Unified regrowth/replenishment into featureRegrowth.js |
| 2 | f3501e0 | Blessed Font replaces Moonberry Tree + rainy-day refill |
| 3 | 508acdd | Removed the tree feature — trees are pure decor |
| 4 | 80cb2c9 | Supernatural terrain supersede + Titanstain rename |
| 5 | 2a4bf97 78de369 | Plateau mesa height + hill stacking (objects on the peak) |
| 6 | 3c1977c a0f8319 fc07491 | Per-biome decor (biomeVariants), optionalGroups, canonical editor view |
| 7 | 17c77be 1dfc94a | Reorganized descriptors/data and game/state into granular subfolders |
| 8 | 0439447 | Renamed biome_brass_grave → biome_titanstain everywhere (file + id + tags) |
| 9 | 313a809 | Vivid supernatural palettes (titanflesh / ghost cyan) + biome decor override + 4 placeholder decor descriptors |
| 10 | de16ecd | Analysis tool biome colors + geometry editor undo (button + Ctrl/Cmd+Z) |

## Biomes
* ✅ DONE — The Brass Grave biome was fully renamed to Titanstain (file biomeBrassGrave.js → biomeTitanstain.js, id biome_brass_grave → biome_titanstain, tags brass_grave → titanstain).
* ✅ DONE — Titanstain and Unfinished Lands now look distinctly unnatural: they did NOT need to be new terrain types (`tile.terrain` is a mechanics value — movement cost, passability, feature terrain rules, river rules). The per-biome terrain palette is what colors the ground, so both biomes got vivid, alien palettes covering every terrain they produce: Titanstain = sickly titanflesh pinks + titanblood crimson; Unfinished Lands = cold electric ghost cyan. The map analysis tool's biome-view colors were updated too.
* ✅ DONE — Titanstain and Unfinished Lands have their own decor entries: four placeholder decor descriptors (`titanflesh`, `titanblood`, `yetlands`, `forespring`) listed in the geometry editor's Decor browser, wired to the map via a biome decor override (`terrainOverrides.decor` + `state.biomeDecorOverrides`). They still need real geometry from the designer.

## Geometry:
✅ DONE — undo button added to the geometry editor (button + Ctrl/Cmd+Z; `dev/tools/geometryEditor/history.js`).

✅ DONE — the growth-state system (design below, now implemented). Features
carry a continuous `growth` 0 → 1 (`featureRegrowth.js` steps it 1/regrowDays
per world turn); parts may carry a `states.empty` keyframe (scaleX/Y/Z, root
`y`, nested `localPos`, color) and the render lerps from the empty look to the
authored full look by growth — no hide/show, no real-time animation. The
Blessed Font's water and the Peridexion Tree's fruit use it, and the geometry
editor has a State toggle (full/empty) that previews and edits the two
keyframes (badge ◐ on keyframed parts). Authoring reference: `descriptorAuthoring.md` §4.6.

The original design note below is kept for reference.

We need to better support different geometry for things like the Blessed Font showing its full vs empty state. Currently the Blessed Font always looks empty when it's the sole occupant of a hex, but it always looks full when it's been dispersed to the edge of the hex. There should be a separate flag/state for 'ripe' compared to 'depleted' (or some better nomenclature). Obviously the geometry editor needs to support showing/editing the distinct states. Perhaps individual parts can be hidden when the thing is empty? 
Or, actually, would it be better if the part wasn't hidden, but instead has an altered property that can change dynamically?
For example, when the blessed font is empty, the 'water' part could be tiny and very low in the bowl with a dull color, and when the font is full, the water could be large and vertically elevated with a vibrant color to make it look like the font is filled to the brim with potent liquid. That way, a transition could be easily conveyed automatically over the time that it regrows/replenishes/refills: each day, the object would automatically 'tween' a step between its exhausted vs fully grown state. So a peridexion tree could have tiny green fruit that grow over larger and gain more vivid colors as they ripen, and a blessed font could have a drop of water in the bottom that slowly fills.

### Tree grove & per-biome decor (& feature?) changes:

✅ DONE — one decor per terrain, with per-biome variant pins in the editor.
The decor's id IS the terrain's id (`forest`, `denseForest`, `plains`, ...);
the grove split into `forest` + `denseForest` descriptors, each with its own
Painforest variant; `terrainVariants` was removed (different terrains are
separate decor objects, never variants). Full details in the hand-off item B.

"Per-biome decor — the mechanism is data-driven (biomeVariants); Scorch/Edenfall/etc. will need their own tree variants authored in the editor to actually *look* different."

The original note below is kept for reference.

Unfortunately, we still don't have the ability to easily have differences between terrain decor in different biomes, at least not through anything exposed in the geometryEditor interface.
The tree grove currently has a "Variant" option which is the only way to apply a distinction to a particular biome, and that's exclusively for Painforest. The whole tree grove object is a weird situation, with its per-painforest variation, and then it's two other variations that are based on terrain, not biome? In general, this tree grove situation might have railroaded our geometry designs in a weird way, leaving us with weirdly blended systems that effected how we designed all of this -- or at least, this has happened within the geometry editor interface, which still conveys this system as being that restrictive.

(To be clear, it's likely that a lot of what I'm describing does now apply exclusively to the geometry editor interface, that's just my main way of understanding and manipulating this system at the moment, especially since the massive changes to the codebase in this previous update!)

### Almost all of the decor will be redesigned

The tree grove, ironically, is the best looking decor, so it's a pity that the implementation seems so finicky and exclusive (in the geometry editor interface, at least). 

The intention is to get an external third-party to help provide some geometry using the improved new systems that were just implemented, and the only information about the game they will have will be featureDesign.md, so it needs to clearly describe how to effectively use all of the awesome features of this system to create variations and varieties and alternates and biome-specific changes, etc.

#### Some things that will be requested from the graphic designer who will contribute some geometry to our game:
* The desert cactus will be just one of several things that might or might not show on each desert decor instance.
* Plateau will lose its mesa geometry and will gain some generic flora and debris that varies per-biome.
* Titanflesh, Unfinished lands terrains will get their own crazy decor
* Marsh and Plains will get more interesting and distinctive geometry

## Was deferred, still to be implemented

* Hill stacking — the center/peak case is done (champions/bases/features sit
  at the mound peak; the per-tile peak height varies correctly with the
  stretch hash). The off-center surface-normal orientation for
  dispersed/scattered items on hill tiles is still deferred — it needs the
  mound's ellipsoid normal at the item's offset and in-game tuning.

✅ DONE — the featureDesign.md designer contract (§8 "Authoring geometry") and
the featureRewards split (featureRewardTable.js + featureRewards.js). The only
remaining work is the decor geometry itself, for the external graphic
designer, using the now-complete toolkit (one decor per terrain, biome
variants, optional groups, growth states).
