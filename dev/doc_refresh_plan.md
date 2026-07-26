# Plan: Documentation Refresh — Audit, Restructure, and Fill Gaps
## Problem Summary
The current documentation (`dev/*.md`) has several issues:
1. **No single authoritative system-reference doc** — The file tree and subsystem descriptions are buried inside `srcConventions.md` alongside naming conventions, principles, and other content. There's no quick-reference for "what does every file in `src/` do and where does it belong."
2. **`srcConventions.md` is misnamed and overloaded** — It mixes architecture, naming rules, boundary debt, and tooling. The name suggests "conventions about `src/`" when most of its value is system architecture.
3. **Documented file listings are incomplete** — `game/state/` lists ~10 files (actual: ~25), `runtime/` lists ~8 (actual: ~18), `shared/` misses `speedGroup.js` and `timerQueue.js`. Many files exist in the codebase with no documentation coverage.
4. **Stale path references** — `gameMechanics.md` refers to `src/game/rules/archetypeData.js` which was refactored into a directory (`archetypeData/biomes.js`).  
5. **Duplication** — `commonTasks.md` §3 "Decide Where New Code Goes" is an exact duplicate of `srcConventions.md` §5.
6. **AGENTS.md** references stale doc names and misses files in `shared/`.
---
## Phase 1 — Create `dev/systemArchitecture.md` (the "City" document)
This is a **new** file that becomes the single authoritative reference for the full source tree. Every file gets a one-line purpose statement.
### Structure:
```
# System Architecture Reference
## Principles
(from srcConventions.md §1)
## Layer Overview
(from srcConventions.md §2 — condensed)
## Complete File Tree
Organized by layer/directory with every file listed and described:
src/engine/rules/
  chunkGrid.js       — Chunk coordinate math (CHUNK_SIZE=24)
  hexGrid.js         — Hex math: neighbors, distance, coordinates, ring queries
  pathfinding.js     — A* pathfinding on hex grid
  seededRng.js       — Deterministic PRNG with seed
  shuffle.js         — Fisher-Yates shuffle
src/game/rules/
  archetypes.js      — Archetype registry with inheritance (biomes, features, mobs)
  archetypeData/biomes.js     — Biome archetype definitions
  archetypeData/features.js   — Feature archetype definitions
  archetypeData/mobs.js       — Mob creature definitions
  archetypeData/index.js      — Barrel: triggers all archetype registrations
  ...
...and so on for every directory.
```
### Also includes:
- **Interaction pattern** (§4 from srcConventions — the 7-step pipeline)
- **Decision guide** (§5 — where new code goes)
- **Boundary debt** (§6)
- **Tooling** (§7 — `check_imports.py`)
- **Cross-references** to every "suburb" doc (namingConventions, cssConventions, clockScheduler, gameMechanics, etc.)
---
## Phase 2 — Rename `srcConventions.md` → `namingConventions.md`
`srcConventions.md` gets renamed and trimmed to **only** naming/style rules:
- File naming conventions
- Banned words
- Directory naming patterns
- Code identifier conventions (camelCase, PascalCase, etc.)
- Interaction pattern (kept here since it's a convention)
Everything else (principles, layer taxonomy, file tree, decision guide, boundary debt, tooling) moves to `systemArchitecture.md`.
The file is **deleted** and replaced by:
- `dev/namingConventions.md` (new file with stripped-down content)
- Content absorbed into `dev/systemArchitecture.md` (Phase 1)
---
## Phase 3 — Update `AGENTS.md`
Changes:
1. **Detailed Docs table** — Replace `srcConventions.md` with `systemArchitecture.md` and `namingConventions.md`
2. **shared/ description** — Add `speedGroup.js` and `timerQueue.js` to the parenthetical example
3. **Source Layout table** — Add the missing shared/ entries
4. **Link to `systemArchitecture.md`** as the primary reference for new devs/agents
---
## Phase 4 — Fix `gameMechanics.md`
Line 51: Change `archetypeData.js` → `archetypeData/biomes.js` (it's now a barrel directory)
---
## Phase 5 — Fix `commonTasks.md`
Remove the duplicate "Decide Where New Code Goes" section (lines 46-55). Replace with a one-liner: "See `dev/systemArchitecture.md` → Decision Guide."
---
## Phase 6 — Final verification
- Run `python3 dev/check_imports.py` to ensure nothing is broken
- Read back `systemArchitecture.md` to confirm completeness
- Verify every path and file reference across all edited docs
---
## Files changed / created
| Action | File | Reason |
|--------|------|--------|
| CREATE | `dev/systemArchitecture.md` | New master reference with full file tree |
| DELETE | `dev/srcConventions.md` | Split into `systemArchitecture.md` + `namingConventions.md` |
| CREATE | `dev/namingConventions.md` | Naming rules extracted from srcConventions |
| EDIT | `AGENTS.md` | Fix shared/ entries, update doc references |
| EDIT | `dev/gameMechanics.md` | Fix stale archetypeData path |
| EDIT | `dev/commonTasks.md` | Remove duplicate decision guide |
---
## Files NOT changed (assessed and OK)
| File | Status |
|------|--------|
| `dev/clockScheduler.md` | Accurately reflects the codebase |
| `dev/cssConventions.md` | Accurate; no stale references |
| `dev/largeMapRoadmap.md` | Accurate meta-plan doc |
| `dev/aestheticConventions.md` | User asked to skip |
| `dev/ideas.txt` | Free-form notes, not documentation |

Thinking