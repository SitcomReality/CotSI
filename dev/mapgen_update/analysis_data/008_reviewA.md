Bugs (high confidence something is actually broken)
1. The chunk-seam invariant fails everywhere, and the failure has two distinct fingerprints

19 of 20 seed/radius combos fail. That's not flaky-test noise; the world is not deterministic as a function of generation order. But the really interesting part is that there are two different failure modes:

a) Map-edge field drift, concentrated at q = −radius (the west rim). Moisture deltas up to ~0.13 (e.g., stored 0.712 vs recomputed 0.586 at r=100) — that's not floating-point jitter, that's a different code path. And buried in the data is a smoking gun: for glut-4, recompute(r=50, (−50,0)) = 0.25087033 and stored(r=100, (−100,0)) = 0.25087033, to 8 decimals. The wrong values are deterministically wrong — reproducible across radii at the "same" normalized edge position. That smells like clamped coordinates, a stale config from a previous radius in the batch, or a normalized-vs-absolute coordinate mixup on the boundary path.

b) Interior seam terrain flips — and every single one is stored="plains". At r=21, 18 mismatches across 5 seeds, all plains → hill/forest/desert. Never the reverse. That's the signature of plains being the classifier's fallback branch, combined with a neighbor-dependent input (slope, almost certainly) being computed before the neighbors exist. Chunk-edge tile → slope ≈ 0 → can't qualify as hill → falls through to plains. On recompute with full context, it flips.

Consequences: terrain that depends on chunk load order, save/load divergence, replay desync, features spawning on tiles that later decide they're a different terrain. This is the one I'd fix first.
2. The trader hotspot and the seam bug are the same tiles

You said ignore the trader issue, but this is why you shouldn't, diagnostically: the trader heatmap tops out at (−6,0..6), (−21,0..4), (−50,0..4), (−100,0..3) — literally the same coordinates as the moisture mismatches. If trader placement scores on moisture, water proximity, or anything derived from those fields, the inflated west-rim moisture creates a spurious attractor. These may be one bug with two symptoms, and the trader distribution might fix itself when #1 does.
Systemic tuning problems
3. The frequency verification is telling you the targets are pure fiction

    Region bias: target says "4–6 biome regions on radius-50." Config freq is 0.0008; you'd need roughly 0.03–0.04. That's ~40× too low. Measured λ=100 on a diameter-100 map → you get 1–2 regions, and the biome distribution confirms it (one biome at 29–40% everywhere).
    The same target strings are copy-pasted across all four radii, which means they're wrong by construction for at least three of them.
    At r=7, every field has λ ≥ the map diameter. A small map is a single gradient: one

---------

...aaand the rest accidentally got cut off. This fragment was kept in case anything useful or novel was mentioned.