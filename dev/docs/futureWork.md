# Future Work & Deferred Items

Forward-looking tracker. Contains only work that is deferred or still to be
implemented. Completed work lives in git history, not here; design notes and
reference material live in their own docs (`dev/docs/terrainGenNotes.md`,
`dev/docs/gameMechanics.md`, `dev/docs/descriptorAuthoring.md`).

Some things in this document may be based on out-of-date design ideas -- confirm
with the user before implementing specific features or making changes based on
this document.

---

## 1. Near-term features

### 1.1 Trading & traders

Traders already exist as entities — they wander between faction bases
(`src/game/state/traderMovement.js`) and carry generated stock
(`src/game/rules/traderStock.js`: heal, potency, weapon) with costs in
`src/params/game/economyParams.js` (`TRADER_*`). What's missing is the
purchase flow: interacting with an adjacent trader is highlighted on the map
and opens a toast (`openTrader` in `src/ui/combat/combatRewardUI.js`), but the
transaction itself is still pending. Known stub bug: the toast reads
`tr.offer`, while traders carry `stock` — it currently renders
`offers: undefined`.

- Build the buy interface + transaction (gold → item) for trader stock.
- Faction bases already support buying potencies
  (`src/game/state/baseInteraction.js`, `POTENCY_COST_STANDARD` /
  `POTENCY_COST_DISCOUNTED`) — reuse that pattern for traders.
- Decide stock refresh cadence (per day? per visit?) and whether any
  champion can trade at any adjacent trader.

### 1.2 Items / equipment

No equipment system exists yet — the only trace is the `equip` weapon entry
in trader stock (a `secondary` bonus, `TRADER_WEAPON_BONUS`).

- Design the champion inventory/slot model, and how a weapon's `secondary`
  bonus applies in combat scoring.
- Sources beyond traders: dungeon rewards, digs, bases.
- Stronger equipment is tied to God's Knots - either by purchase or upgrading.
- Settle stacking / durability / trading items back.

### 1.3 Dungeons

Consecutive-turn dungeon: enter a dungeon hex → the champion disappears from
the map and stays inside for 3 turns. Each turn while inside, combat starts
immediately at the beginning of the champion's turn instead of world-map
movement. After the final battle, a large reward.

- Turn flow (example):
  - Turn 1: move around the world map until you enter the dungeon, fight
    battle 1, then your turn ends.
  - Turn 2: fight battle 2.
  - Turn 3: fight battle 3 (final), receive rewards.
- Fleeing uses the normal rules (`dev/docs/gameMechanics.md` §7) — but fleeing
  ejects the champion from the dungeon and loses all progress.
- Needs: dungeon feature + placement rules, an "in-dungeon" champion state
  (hidden from the map, no movement), escalating battle generation, reward
  hook (`src/game/state/featureRewards.js` pattern).

### 1.4 Movement — multi-step & terrain costs

- **Multi-step moves** — clicking a tile beyond the champion's range should
  auto-path to the farthest reachable tile toward it. Currently human
  movement is one tile per click (`adjacentPassable` in
  `src/game/state/championMovement.js`); range is a uniform-cost BFS
  (`movementRange`).
- **Terrain-based movement costs** — stepping onto a hex should cost by
  terrain. Add per-terrain cost to `src/game/rules/terrainTypes.js`; the BFS
  and `moveChampion(state, champ, targetKey, cost)` already take a cost.

### 1.5 UI improvements

Open-ended polish bucket — panels, modals, combat UI, clearer affordances.
Add concrete items here as they get scoped.

### 1.6 Responsiveness / mobile play

The game must keep working when the window resizes or the screen rotates
(mid-play included). Layout and input currently assume a desktop viewport —
audit fixed-size layout in `styles/`, panels/overlays, and pointer handling
for narrow/tall aspect ratios.

### 1.7 Feature reward design & balance

Rewards are functional but un-tuned — amounts, tier scaling, and the shared
`FEATURE_REGROW_DAYS` cadence need a design/balance pass. Edenfall mushrooms
heal on starting values (`FEATURE_EDEN_MUSHROOM_HEAL` /
`FEATURE_EDEN_SHROOMLET_HEAL` in `src/params/game/economyParams.js`).
Per-feature reward intent tracked in `dev/docs/featureDesign.md` §5.

---

## 2. Bot AI

Bot decision-making is deliberately small today: map movement is a scored,
radius-limited target search with an exploration fallback
(`src/game/state/championAI.js` + `src/params/game/aiParams.js`), and combat
picks are a weighted heuristic over revealed intel
(`src/game/state/combat/combatBotAI.js`). A real AI pass is a big update when
it happens; the open design work:

- **Global strategy / directionality** — bots radius-limit their targeting
  but have no global strategy. A simple bias toward unexplored tiles /
  nearest God's Knot / enemy prevents circle-wandering. Design task as much
  as performance.
- **Large-map-appropriate exploration** — on the big maps (§3), local
  exploration should bias toward resource gradients and away from recently
  visited areas; victory conditions may need rethinking.

---

## 3. Large-map: reference & future scale

Chunked storage, lazy per-chunk generation, the background generation buffer
around the champion, eviction with delta extraction, and the fixed-pixel
champion-centered minimap are implemented; map sizes in the original roadmap
document are out of date. Remaining scale work:

### 3.1 Persistence

Save seed + list of dirty tiles with their deltas; everything else regenerates
(only the diff from procedural generation).

### 3.2 What NOT to do (yet)

- No worker threads for generation — single-threaded JS with
  clock-scheduled chunk generation is sufficient up to R=200.
- No LOD unless profiling shows it's needed — InstancedMesh + frustum
  culling handles R=100 comfortably.
- **NO ACTUAL INFINITY** — build systems with the perspective of "how would
  this need to work if the map were infinite?", not to actually have infinite
  maps. Players eventually finding each other and fighting is core to design.

### 3.3 Still-open scale concerns

- **Camera caps + fog are tuned to current map scale** — zoom is capped
  (`ZOOM_MAX_FRUSTUM=20`, `DEFAULT_REFERENCE_FRUSTUM=40` in
  `src/params/render/cameraParams.js`), as are `CAMERA_FAR=200` and the
  scene fog (`sceneSetup.js`, 60–160); shadows are radius dependent. A
  conceptually infinite map still needs terrain-gen's radius semantics
  removed (`worldShape` falloff, noise scaled by 1/radius, latitude term,
  distance clamp) plus camera-driven chunk streaming (see §3.1).

---

## 4. Geometry editor — remaining deferred content

All content is migrated to descriptor data except the fruit tree, which stays
on its legacy builder by decision. The descriptor model, the editor's
variant-scoped write-back, and the mob/trader geometry conventions are
documented in `dev/docs/descriptorAuthoring.md` and
`dev/docs/mobGeometryAndAnimation.md`.

- **fruitTree** — deferred by decision: stays on the procedural builder
  (`worldObjects/fruitTree/`); a simple trunk + grove-family canopy + 1–2
  hanging fruit, ripe state reflecting the heal/regrow cycle. The descriptor
  model now supports part instancing (`meshAssembly` groups records by part
  id into one InstancedMesh), so the original migration blocker is gone —
  still deferred as not worth the churn while it reads well at game scale.
- **Champion accents** — minimal per-faction placeholders; richer looks are
  authorable in the editor. Tier-2 mob accents were removed with the
  scorpelican/infernalpaca rework (no tier-2 mob variants remain).
- **Mob animation runtime** — deferred; see `dev/docs/mobGeometryAndAnimation.md`
  §4–5 for the worked approach (declarative clip spec, per-render-pass hook).

---

## 5. Maintenance follow-ups (from techDebtAudit.md)

Consolidated here when the audit doc was retired (2026-08-11); the rest of that
document described completed work and now lives in git history. Only the open
items below remain.

### 5.4 Out of scope (techDebtAudit §7)

- Root `styles/` (the game's CSS design system) — never audited at the same
  ~100-line level; a future pass could reuse the audit method.

### 5.5 Conditional extracts (techDebtAudit §2 — only if these files grow)

- `src/devtools/performance/reportBuilder.js` (928) — extract `_formatReport`
  (~148 lines) → `reportFormatter.js` if it grows past ~1,000 lines
- `src/game/state/featureRewards.js` (557) — extract the `FEATURES` table +
  card builders → `featureRewardTable.js` if it grows past ~650 lines
- `src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js` (1047) —
  extract the entity path → `entityRecords.js` if it grows past ~1,100 lines
