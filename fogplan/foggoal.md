Unified screen-space fog overlay

The core concept is to replace per-hex 2D fog polygons with a single, full-screen canvas overlay that uses vision masks and compositing to render fog uniformly, eliminating the ugly elevation gaps in the current fogMist, and making the game feel more consistent and mysterious by using a fog that extends beyond the tile boundaries and transcends the traversable world.

    Instead of drawing separate fog polygons per hex, draw a full-canvas rectangle (dark, semi-transparent) and then "punch holes" for visible areas. Because it's a single layer, there are no gaps between hexes, regardless of terrain height differences. This directly solves the "slivers of gaps and bits of overlap" caused by elevation.

    Vision masks with soft edges

        Draw visible hexes as white shapes onto an offscreen canvas.

        Apply a blur (e.g., ctx.filter = 'blur(8px)') to the mask.

        Use destination-out compositing to cut holes in the fog with that blurred mask.
        This creates soft, organic fog boundaries--not harsh hex edges--and the blur size can be tuned for aesthetics.

    Distinguishing "explored but not visible" from "unexplored / outside map"

        One mask for visible tiles (punched fully, fog alpha -> 0).

        A second mask for explored tiles (punched with partial alpha, leaving a thinner fog that lets terrain peek through).

        Unexplored and outside-the-map receive no punching -> opaque fog, so they look identical. This fulfills the requirement that a player cannot tell where the map edges are.

    No distinction between unexplored and off-map
    By making the base fog opaque (or nearly so) and never punching it in those regions, both unseen territory and empty canvas space get the same dark veil. The 3D unexplored mesh (fogOfWar.js) could even be removed, saving geometry.

    Performance-conscious design

        Uses 2D canvas operations, which are GPU-accelerated in modern browsers (especially filter: blur()).

        Only processes visible/explored hexes (typically a small set).

        Reuses offscreen canvases to avoid allocation each frame.

        No custom WebGL shaders required, lowering complexity.

    Handling the 3D terrain / camera angle
    The contemplation correctly notes that the fog is applied in screen space, so tall features (trees, mountains) in explored-but-not-visible areas are fogged uniformly--conceptually correct for fog of war. It also recognizes the need to project 3D hex corners to 2D screen coordinates (using existing worldToScreen), which preserves the mask alignment with the camera's orthographic/isometric view.

Things like getting the right "explored mist" transparency can be fine-tuned once the two successive destination-out punches (explored mask with partial alpha, then visible mask) are implemented. In other words, we don't need to try and figure out the perfect values for every parameter - we will tweak everything based on how it looks when testing.