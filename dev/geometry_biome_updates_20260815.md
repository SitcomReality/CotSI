# Geometry, decor, biome, feature and terrain updates

This document is following on from the recent update that was implemented in the below commits:

| # | Commit | What |
|---|--------|------|
| 1 | 7efc977 | Unified regrowth/replenishment into featureRegrowth.js |
| 2 | f3501e0 | Blessed Font replaces Moonberry Tree + rainy-day refill |
| 3 | 508acdd | Removed the tree feature — trees are pure decor |
| 4 | 80cb2c9 | Supernatural terrain supersede + Titanstain rename |
| 5 | 2a4bf97 78de369 | Plateau mesa height + hill stacking (objects on the peak) |
| 6 | 3c1977c a0f8319 fc07491 | Per-biome decor (biomeVariants), optionalGroups, canonical editor view |
| 7 | 17c77be 1dfc94a | Reorganized descriptors/data and game/state into granular subfolders |

## Biomes
* All instances of 'biomeTitanstain', 'biome_titanstain' etc. should be changed to titanstain, including biomeTitanstain.js.
* Titanstain and Unfinished Lands terrain don't look any different to the surrounding terrain. Do they need to be actual distinct terrain types, with entries in src/game/rules/terrainTypes.js? Titanflesh/Titanblood and the Unfinished terrain should have their own distinctive and unnatural colors. Part of the reason that 'titanstain' was changed is because there's already a lot of warm earthy colors (browns, oranges) for the kind of vibrant supernatural aesthic we want for these corrupted areas of the map. So these biomes should look quite unnatural, more like Edenfall's terrain in terms of its alien vibrancy. The map analysis tool needs to be updated to show these terrains (and appropriate colors for the biomes).
* Titanstain and Unfinished Lands terrains need their own decor entries (add placeholder objects so that they appear listed in the Decor items in the geometryEditor).

## Geometry:
add undo button to geometry editor?

We need to better support different geometry for things like the Blessed Font showing its full vs empty state. Currently the Blessed Font always looks empty when it's the sole occupant of a hex, but it always looks full when it's been dispersed to the edge of the hex. There should be a separate flag/state for 'ripe' compared to 'depleted' (or some better nomenclature). Obviously the geometry editor needs to support showing/editing the distinct states. Perhaps individual parts can be hidden when the thing is empty? 
Or, actually, would it be better if the part wasn't hidden, but instead has an altered property that can change dynamically?
For example, when the blessed font is empty, the 'water' part could be tiny and very low in the bowl with a dull color, and when the font is full, the water could be large and vertically elevated with a vibrant color to make it look like the font is filled to the brim with potent liquid. That way, a transition could be easily conveyed automatically over the time that it regrows/replenishes/refills: each day, the object would automatically 'tween' a step between its exhausted vs fully grown state. So a peridexion tree could have tiny green fruit that grow over larger and gain more vivid colors as they ripen, and a blessed font could have a drop of water in the bottom that slowly fills.

### Tree grove & per-biome decor (& feature?) changes:

"Per-biome decor — the mechanism is data-driven (biomeVariants); Scorch/Edenfall/etc. will need their own tree variants authored in the editor to actually *look* different."

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

* Hill stacking
    Champions/bases/features sit at the mound peak; the per-tile peak height correctly varies with the stretch hash and objects always sit at the correct height in the center of a hill.
    Off-center surface-normal orientation was intentionally deferred (needs in-game tuning).