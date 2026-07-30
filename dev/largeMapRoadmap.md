# Large Map Roadmap — Meta-Plan

This document outlines the phased implementation plan for scaling CotSI's hex map
from the current radius-7 (169 tiles) toward large and potentially infinite worlds.
Each phase is a self-contained project that can be planned, implemented, and tested
independently before moving to the next.

This work has been completed (except for the unlikely infinite map).
This file has been kept for reference.

---

## ✅ Completed Foundations

### Phase 1 — Algorithmic Decoupling (Done)

All O(totalTiles) scans removed from per-turn and per-move code paths:

- **1a** — `fogOfWar.js` uses `hexesWithinRadius(sight)` for ring-based vision.
- **1b** — `championAI.js` uses `hexesWithinRadius(searchRadius)` for radius-limited bot targeting.
- **1c** — `worldSimulation.js` maintains `state._unripeTrees` Set for tree regrowth.
- **1d** — `spatialIndex.js` provides O(1) entity occupancy lookups via `Map<"q,r", {type, entity}>`.

### Phase 2 — Chunk Infrastructure (Done)

Core architectural change — the world is no longer a flat tile object but a collection
of fixed-size chunks:

- **2a** — `src/engine/rules/chunkGrid.js` defines chunk coordinate math (CHUNK_SIZE = 24).
- **2b** — `src/game/state/tileAccess.js` provides a Proxy-backed chunked tile store.
  `state.tiles` delegates reads/writes/iteration to `state.chunks` transparently.
- **2c** — `terrainGenerator.js` generates tiles per-chunk with noise-based local
  tagging (no global BFS passes). Seamless chunk boundaries via global-coordinate
  noise sampling.
- **2d** — Dirty/delta tracking on each chunk via `markChunkDirty`, `clearDirtyFlags`,
  `getDirtyChunks` in `tileAccess.js`.
- **2e** — All existing `state.tiles[key]` consumers work through the Proxy. Remaining
  full-map iterations (`Object.values/keys/entries`) go through `allTileKeys()` and
  will be addressed by Phase 3's rendering changes.

---

## Phase 3: Chunked Rendering

**Goal:** Replace the full-teardown-and-rebuild in `renderHexMap3D` with chunk-level
mesh management. Only rebuild chunks whose contents changed. Add frustum culling.

### 3a — Per-chunk terrain mesh
- **File:** `src/render/hexmap3d/terrain/terrainMesh.js`
- Split `buildTerrainMesh` into `buildChunkTerrainMesh(chunkData)` that builds a
  single merged BufferGeometry for one chunk's tiles.
- Each chunk mesh is a named `THREE.Group` or `THREE.Mesh` in the scene.
- When a chunk is marked dirty, dispose its old mesh and rebuild.
- **Risk:** Medium. Merged-geometry approach works but we need to handle chunk
  boundaries (tiles at the edge share side faces with neighbours in adjacent chunks
  — but since side faces drop below the top surface, visual seams are unlikely at
  the camera's fixed overhead-ish angle).
- **Note:** The setup screen already defaults to radius 21 (max 99), so the
  rendering bottleneck is real. Profile at R=21 before shipping Phase 3.

### 3b — Per-chunk feature meshes
- **File:** `src/render/hexmap3d/features/featureMeshes.js`
- Each chunk owns its own set of InstancedMesh objects (trees, mountains, knots, bases,
  debris). When a chunk is rebuilt, dispose and recreate only that chunk's features.
- **Risk:** Higher. InstancedMesh per chunk means many draw calls (N chunks × M feature
  types). Mitigate with reasonable chunk size so typical view has ~20-50 chunks visible.
  At 50 chunks × 6 feature types = 300 draw calls — fine for WebGL.

### 3c — Frustum culling
- Three.js automatically frustum-culls objects. As long as each chunk mesh has a
  bounding sphere that covers its tiles, the GPU skips off-screen chunks for free.
- Set `mesh.frustumCulled = true` (default) and ensure bounding spheres are computed.
- For the fixed camera angle (tilted, never rotates), this is especially effective
  since the view cone is predictable.

### 3d — Dirty-driven rebuild dispatch
- **File:** `src/render/hexmap3d/hexMapRenderer.js`
- `renderHexMap3D` no longer tears everything down. Instead it:
  1. Iterates chunks, checks `chunk.dirty`.
  2. For dirty chunks: rebuild terrain + feature meshes, clear dirty flag.
  3. For new chunks (just came into view after generation): build meshes.
  4. For chunks that left view: optionally dispose (or keep cached).
- On a typical move (champion moves 1 hex), 0-1 chunks become dirty (only if a feature
  was interacted with). Full rebuild only on world-turn effects.

### 3e — Fog and minimap adaptation
- Fog overlay (`fogMaskGenerator.js`): currently iterates all tiles via
  `Object.entries(state.tiles)`. Must be chunk-aware — render fog per-chunk or
  switch to full-screen dark overlay with chunk-sized holes.
- Minimap: at large sizes the minimap becomes too small to be useful. Consider a
  scalable minimap (fixed pixel size, shows only local area) or defer to later phase.

---

## Phase 4: Scale Up

**Goal:** Actually increase the map size. Test, profile, fix whatever breaks.

### 4a — Increase default radius
- Bump the setup-screen default from 21 to R=30 (2,791 tiles) as an initial target.
  Then R=50 (7,651).
- The setup screen already has a radius slider (min=3, max=99, default=21) and the
  `createGame` function passes it through. No UI changes needed here.

### 4b — Profile and optimise
- Extend the existing `dev/devPerformance.js` instrumentation to provide output in a
  format that the user can easily copy to share with agents.
- Measure: time to generate all chunks at startup, time per `refreshAll`, time per
  world turn, memory usage.
- Fix any hotspots that the earlier phases missed. Likely candidates: the rendering
  full-teardown in `renderHexMap3D`, and the tile-iteration in `fogMaskGenerator.js`.

### 4c — Spawn placement at scale
- `nearestOpenKey` and `nearestOpenMultiRing` (in `tileQueries.js`) do expensive
  distance-based scans. At startup with large maps, these need to be more efficient
  or replaced with chunk-local placement.
- Currently used by `championFactory.js` and `basePlacer.js`.

### 4d — Bot AI adaptation
- With larger maps, bots need some directionality. A simple "bias toward unexplored
  or toward nearest God's Knot, or enemy" prevents them from wandering in circles.
- This is a design task as much as a performance one. The current `botChooseTarget`
  already radius-limits its search, so bots won't scan the whole map — but they have
  no global strategy. This is a very simple addition to the current basic bot logic.
  Bots will maintain very basic, trivial behaviors for testing during dev, for now.

---

## Phase 5: Infinite World -- not to be implemented. Kept as reference.

**Hypothetical Goal:** The map has no fixed boundary. Chunks are generated on demand as entities
move, and evicted when all entities have left the area.

This has been kept as a reference in case we find any of the below features useful. The current game design (the actual goal/purpose of the game) isn't mechanically or conceptually compatible with truly infinite maps.

### 5a — Chunk manager (load / generate / evict)
- New module: `src/game/state/chunkManager.js`
- On entity movement: check if neighbouring chunks need generation. Pre-generate a
  buffer radius (e.g., 3 chunks ahead in all directions).
- Eviction: when no entity has been within N chunks of a chunk for M turns, serialize
  its deltas and drop it from memory.
- Regeneration: if an entity returns, re-generate from seed, re-apply deltas.

### 5b — Persistence (save/load)
- Save format: seed + list of dirty tiles with their deltas. Everything else
  regenerates.
- Avoid saving the entire map — only the diff from procedural generation.

### 5c — Streaming
- Background generation: pre-compute upcoming chunks during idle frames using the
  clock scheduler (`'bot'` speed group).
- Smoothly add chunk meshes to the scene as they enter view.

### 5d — Infinite-appropriate AI
- Bots have no concept of "the whole map." They explore locally, biased toward
  resource gradients (smell more trees that way) and away from recently visited
  areas.
- Victory conditions may need rethinking for an infinite world (unlikely to be
  relevant soon).

---

## Phase Ordering Rationale

Phases are ordered by dependency:

- **Phase 1** — no dependencies. ✅ Done.
- **Phase 2** — depends on Phase 1 only for the spatial index. ✅ Done.
- **Phase 3** — depends on Phase 2 (needs chunks to exist before rendering them).
- **Phase 4** — depends on Phases 1-3 (can't scale up until algorithms and rendering
  can handle it).
- **Phase 5** — depends on a completely different game design, probably.

Each phase produces a working, playable game. No phase leaves the game in a broken
state. This means we can ship (or test) after any phase, and we can pause between
phases to work on other features.

---

## What NOT to Do (Yet)

- **Don't premature-optimise the minimap.** It works for now; chunk-based rendering
  will naturally limit what it needs to draw.
- **Don't add worker threads for generation.** Single-threaded JS with clock-scheduled
  chunk generation (a few ms per chunk, spread across idle frames) is sufficient for
  maps up to R=200.
- **Don't implement LOD in phase 3.** InstancedMesh + frustum culling handles R=100
  comfortably. Add LOD only if profiling shows it's needed.
- **NO ACTUAL INFINITY!** The game map might be massive, but the fundamental design of "there's 6 other players to interact with" probably precludes infinite maps. Maybe there'll be maps so large that games are played over extended time periods, but players have to find each other probably.

---

## Observations & potential issues

1. The setup screen already defaults to radius 21 (max 99) That's ~1,327 tiles on the default, and the relic target is 25 instead of 7. This means gameFactory.js is already passing larger radii through the chunk-aware pipeline. But the renderer (renderHexMap3D) still does a full teardown-and-rebuild every frame — so anyone who clicks "Begin Game" with the default settings is getting a full rebuild of 1,327 hexes every refresh. It might work at R=21, but it will be slow, and the max of 99 (30,403 tiles) would be unusable. This is the highest-priority problem to address.

2. fogMaskGenerator.js:76 iterates all tiles every frame It uses Object.entries(state.tiles) which goes through the Proxy's allTileKeys() generator — a full map iteration. For each tile it projects corners and draws to a canvas. At R=21 that's over a thousand hexes projected per frame. This needs to become chunk-aware as part of Phase 3 (listed under 3e now).

3. Trader base selection in worldSimulation.js:161 The trader route logic uses Object.entries(state.tiles) to find all bases when a trader arrives at its target, then picks one at random. On a large map this filters thousands of tiles. Worth adding a base index (e.g. state.baseKeys) as part of Phase 3 or even before — it's a cheap win independent of the rendering work.

4. Initial tree ripeness is correct for the _unripeTrees Set Tracks are all generated with ripe: true and nextFruitDay: 1. The _unripeTrees Set starts empty and only gets populated on harvest (in arrivalInteractions.js). This is working as designed.

5. Chunk boundary visual seams The roadmap's risk note for 3a is reasonable — at the camera's fixed overhead-ish angle, side faces between chunks likely won't produce visible seams. But this should be validated early in Phase 3 with a quick visual test rather than assumed all the way through.

6. Spawn placement (nearestOpenKey / nearestOpenMultiRing) will bite at scale These do radial distance searches from origin that scale with map size. At R=21 they're fine; at R=50+ they'd become startup bottlenecks. Phase 4c will need to address them, but worth noting early.