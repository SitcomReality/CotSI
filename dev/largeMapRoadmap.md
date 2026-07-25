# Large Map Roadmap — Meta-Plan

This document outlines the phased implementation plan for scaling CotSI's hex map
from the current radius-7 (169 tiles) toward large and potentially infinite worlds.
Each phase is a self-contained project that can be planned, implemented, and tested
independently before moving to the next.

---

## Phase 1: Algorithmic Decoupling

**Goal:** Remove all O(totalTiles) scans from per-turn and per-move code paths so
the game logic no longer cares how large the map is. Can be done entirely on the
current small map — no rendering or storage changes.

### 1a — Vision: ring-based instead of filter-all
- **File:** `src/game/state/fogOfWar.js`
- **Current:** `visibleKeysFor` filters all `Object.keys(state.tiles)` by distance.
- **Target:** Generate the hex ring for `sight` distance, check each key against
  `state.tiles`. From O(C×N) to O(C×sight²), where sight² ≈ 91 hexes.
- **Risk:** Low. Pure algorithm swap, same output.
- **Verification:** All fog-of-war behaviour unchanged on current map.

### 1b — Bot target: radius-limited search
- **File:** `src/game/state/championAI.js` — `botChooseTarget`
- **Current:** Scores every explored tile on the entire map.
- **Target:** Only score tiles within `sight + maxMoves + margin` (≈20 hex radius).
  Generate rings or filter from candidate hexes.
- **Risk:** Low. Bots already can only pathfind a limited distance; scoring distant
  tiles was always wasted work.
- **Verification:** Bot behaviour on current map unchanged (all tiles are within 14
  of centre anyway at R=7).

### 1c — Tree regrowth: maintain unripe-tree index
- **Files:** `src/game/state/worldSimulation.js`, possibly a new small module
- **Current:** `runWorldTurn` iterates all tiles checking `feature.kind === 'tree'`.
- **Target:** Maintain a `Set<string>` of tile keys that have trees with `ripe === false`
  (or `nextFruitDay > day`). Populate on tree harvest, clear on regrowth.
- **Risk:** Low. Just changes how we find the trees, not what happens to them.
- **Verification:** Trees regrow on the same schedule as before.

### 1d — Entity spatial index
- **Files:** New module in `src/game/state/`, plus `entityQueries.js`
- **Current:** `occupiedByChampion`/`occupiedByMob`/`occupiedByTrader` do linear
  scans of arrays (~22 entities).
- **Target:** A `Map<"q,r", { type, entity }>` rebuilt on entity move/death/spawn.
  Lookups become O(1).
- **Risk:** Low. Entities are few; the map just makes them correct. Must rebuild
  index on every position change.
- **Verification:** All entity interactions (combat, trade, movement blocking) unchanged.

---

## Phase 2: Chunk Infrastructure

**Goal:** Introduce the chunk concept — the world is no longer a flat `{ "q,r": tile }`
object but a collection of fixed-size chunks. Tiles are generated per-chunk on demand.
This is the core architectural change that everything else builds on.

### 2a — Define chunk coordinate system
- **New module:** `src/engine/rules/chunkGrid.js`
- Define chunk size (recommendation: 24×24 hex region = 576 tiles, or a hexagonal
  chunk matching the game's hex-grid aesthetic).
- `chunkKey({ q, r })` → `"cQ,cR"`, `tileToChunk(tileQ, tileR)` → `{ cQ, cR }`,
  `localCoord(chunkQ, chunkR, tileQ, tileR)` → `{ lQ, lR }`.
- Chunk neighbors for generation continuity.

### 2b — Chunked tile storage
- **Files:** `src/game/state/` — replace flat `state.tiles` object
- Storage: `Map<chunkKey, { tiles: Map<localKey, tile>, dirty: boolean, generated: boolean }>`
- Provide a unified accessor: `getTile(state, q, r)` → tile or undefined.
- Keep a `tileCount` or `allTileKeys()` for code that genuinely needs to iterate
  everything (spawn placement, victory checks). Minimise these consumers.
- During this phase, still generate all chunks at startup (no on-demand yet).

### 2c — Per-chunk terrain generation
- **File:** `src/game/rules/terrainGenerator.js`
- Each chunk generates from `seededNoise(seed, chunkQ, chunkR, localQ, localR, salt)`
  — deterministic and idempotent.
- **Drop global BFS passes:**
  - *Contiguous land check:* Replace with noise-based landmass shaping. Domain-warped
    noise produces natural continents without post-processing. Islands are acceptable
    (they become interesting exploration targets, not bugs).
  - *Mountain grouping:* Use noise octaves to produce ridge-like structures. A tile is
    "peak" if it's a local maximum of the mountain noise field.
  - *Water clustering:* Lake vs ocean determined by local context (e.g., a water tile
    surrounded by land within 3 hexes = lake, otherwise ocean).
- Edge continuity: chunks sample noise at their boundaries identically, so terrain
  types match across chunk borders without communication.

### 2d — Delta / dirty tracking
- When a tile is modified (tree harvested, knot mined, base built), mark its chunk
  as `dirty`. The chunk stores the delta.
- Unmodified tiles are regenerated from seed — they consume no persistent storage
  beyond the chunk's existence.
- This is the foundation for save/load and for the rendering dirty-tracking in Phase 3.

### 2e — Adapt all tile consumers
- Audit every `state.tiles[key]`, `Object.keys(state.tiles)`, `Object.values(state.tiles)`,
  `Object.entries(state.tiles)` in the codebase.
- Convert to chunk-aware accessors where possible. Document the few that must remain
  global (minimap, victory conditions, spawn placement).
- **Verification:** Game plays identically on current R=7 map with chunked storage.

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
- Fog overlay: either render per-chunk or switch to a 3D fog approach (dark quads over
  unexplored chunks — simpler at scale).
- Minimap: at large sizes the minimap becomes too small to be useful. Consider a
  scalable minimap (fixed pixel size, shows only local area) or defer to later phase.

---

## Phase 4: Scale Up

**Goal:** Actually increase the map size. Test, profile, fix whatever breaks.

### 4a — Increase default radius
- Bump from R=7 to R=30 (2,791 tiles) as an initial target. Then R=50 (7,651).
- Add a radius slider or dropdown to the setup screen with reasonable presets.

### 4b — Profile and optimise
- Use the existing `dev/devPerformance.js` instrumentation.
- Measure: time to generate all chunks at startup, time per `refreshAll`, time per
  world turn, memory usage.
- Fix any hotspots that the earlier phases missed.

### 4c — Spawn placement at scale
- `nearestOpenKey` and `nearestOpenMultiRing` (in `tileQueries.js`) do expensive
  distance-based scans. At startup with large maps, these need to be more efficient
  or replaced with chunk-local placement.

### 4d — Bot AI adaptation
- With larger maps, bots need some directionality. A simple "bias toward unexplored
  or toward nearest enemy" prevents them from wandering in circles.
- This is a design task as much as a performance one.

---

## Phase 5: Infinite World

**Goal:** The map has no fixed boundary. Chunks are generated on demand as entities
move, and evicted when all entities have left the area.

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

- **Phase 1** has no dependencies — pure algorithmic fixes on existing code.
- **Phase 2** depends on Phase 1 only for the spatial index; the rest is independent.
- **Phase 3** depends on Phase 2 (needs chunks to exist before rendering them).
- **Phase 4** depends on Phases 1-3 (can't scale up until algorithms and rendering
  can handle it).
- **Phase 5** depends on Phase 4 (streaming is pointless without a large-enough map
  to justify it).

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
- **Don't change the public API of state.tiles until Phase 2b.** Phase 1 works with
  the existing flat-object storage.
