* Top bar (Remove all branding etc. and make this purely HUD. No more game title, version number, etc.):
    * Day #, Week #
    * Weather
    * Champion ledger
        * Players listed from left-to-right in turn order (the list changes whenever turn order changes)
        * Players that haven't had their turn on this day are washed out in grey
        * Players that have had their turn already are darkened grey
        * The player who is currently taking their turn will be vibrant with a bit of a highlight
        * Each player always shows in the header
            * Current HP value, eg "85"
            * Relics
            * Sum total potency of all the player's tokens/relics
        * When a player icon is hovered over in the header, and/or for the player whose turn it is:
            * Extra details extends downwards out of the header in its own little element
                * HP in "x/y" format (eg. 85/100)
                * The complete potency tally, showing the potency of each power
                * Gold
                * God's Knots
            * The dropdown details should be thin enough, and the player panel should be wide enough, that all 7 could be open at the same time without overlapping
    * Inspect
    * One day we will go to more effort to make this more responsive and playable in portrait on mobile, so while this design isn't ideal for that, let's try to design the DOM so that it won't be too difficult to make this content adapt to a layout where it might be in a sidebar or menu instead of a header

* (current player)
    * Name (eg. "Crucible")
    * Moves (reamining)/(total) eg. 2/5
    * List of active buffs / effects

    * Collectibles/resources:
        * Relics
        * Gold
        * God's Knot

    * Buffs/stats:
        * Equipment
            * Weapon
            * Armor
        * Artifact

        * Sight?
    
* Heptagram
* End turn



### Key improvements over the original brainstorm

1. **Two‑layer separation on the header**  
   - The top bar is pure chrome: low contrast, ink‑colored text, only faction dots for identity.  
   - The bottom bar is the player panel; it can have slightly more saturation (faction‑tinted left edge) but still stays in the chrome layer.

2. **Player header reorganisation**  
   - Instead of showing *all* player stats in the bar (which would clutter), only the current‑turn player’s details are expanded by default. Others show a minimal dot/circle with HP and total potency count.  
   - On hover or click, a thin dropdown appears (as in the original idea), but all dropdowns are now positioned to the side of the bar (or below) to avoid overlapping.  

3. **Turn order and state**  
   - Player icons in the top bar:  
     - **Current turn** → colored faction glyph + bright indicator (gold ring? – but that uses one of the gold budget). Better use a small gold dot (2px) or a pale underline.  
     - **Already played** → desaturated (use `--ink-faint` tint).  
     - **Not yet played** → lighter (use `--parchment` background with faction dot).  

4. **Resources that matter**  
   - The original brainstorm listed HP, Relics, Potency, Gold, God's Knots, Equipment, etc. Keep only the most actionable items visible in the bottom bar; the rest (e.g. exact potency breakdown) can be in a modal or tooltip.  
   - **Sight** is a stat I’d move to a modal or the map itself (via fog of war overlay).  

5. **Gold placement**  
   - The only gold element on the HUD should be the primary CTA: **End Turn** button. The Heptagram (if interactive) could have a gold outline on hover, but not static gold.  

6. **Responsive consideration**  
   - The DOM should be built so that the top bar can become a left sidebar on portrait/mobile. The bottom bar slides to below the map or becomes a collapsible panel. A class on `<body>` (e.g. `:is-mobile`) would reflow with CSS grid.