# Deferred Notes & Non-Feature Follow-ups

Consolidated here (2026-08-13) when `futureWork.md` was trimmed to feature
implementation only. This file holds deferred-by-decision content, design
guidance, and maintenance follow-ups — things that are **not** specific new
features to be implemented. Topical design/reference docs are cross-referenced
where they exist.

---

## 1. Large-map scale guidance

Chunked storage, lazy per-chunk generation, the background generation buffer
around the champion, eviction with delta extraction, and the fixed-pixel
champion-centered minimap are implemented; map sizes in the original roadmap
document are out of date.

### What NOT to do (yet)

- No worker threads for generation — single-threaded JS with
  clock-scheduled chunk generation is sufficient up to R=200.
- No LOD unless profiling shows it's needed — InstancedMesh + frustum
  culling handles R=100 comfortably.
- **NO ACTUAL INFINITY** — build systems with the perspective of "how would
  this need to work if the map were infinite?", not to actually have infinite
  maps. Players eventually finding each other and fighting is core to design.

### Still-open scale concerns

- **Camera caps + fog are tuned to current map scale** — zoom is capped
  (`ZOOM_MAX_FRUSTUM=20`, `DEFAULT_REFERENCE_FRUSTUM=40` in
  `src/params/render/cameraParams.js`), as are `CAMERA_FAR=200` and the
  scene fog (`src/render/hexmap3d/scene/sceneSetup.js`, 60–160); shadows are radius dependent. A
  conceptually infinite map still needs terrain-gen's radius semantics
  removed (`worldShape` falloff, noise scaled by 1/radius, latitude term,
  distance clamp) plus camera-driven chunk streaming (see persistence in
  `futureWork.md`).

---

## 2. Geometry — deferred by decision

- **fruitTree** — stays on the procedural builder
  (`src/render/hexmap3d/worldObjects/fruitTree/`); a simple trunk +
  grove-family canopy + 1–2 hanging fruit, ripe state reflecting the
  heal/regrow cycle. The descriptor model now supports part instancing
  (`meshAssembly` groups records by part id into one InstancedMesh), so the
  original migration blocker is gone — still deferred as not worth the churn
  while it reads well at game scale.

---

## 3. Feature reward balance

Rewards are functional but un-tuned — amounts, tier scaling, and the shared
`FEATURE_REGROW_DAYS` cadence need a design/balance pass. Edenfall mushrooms
heal on starting values (`FEATURE_EDEN_MUSHROOM_HEAL` /
`FEATURE_EDEN_SHROOMLET_HEAL` in `src/params/game/economyParams.js`).
Per-feature reward intent tracked in `dev/docs/featureDesign.md` §5.

---

## 4. Maintenance follow-ups (from techDebtAudit.md)

Consolidated here when the audit doc was retired (2026-08-11); the rest of that
document described completed work and now lives in git history. Only the open
items below remain.

### Out of scope (techDebtAudit §7)

- Root `styles/` (the game's CSS design system) — never audited at the same
  ~100-line level; a future pass could reuse the audit method.

### Conditional extracts (techDebtAudit §2 — only if these files grow)

- `src/devtools/performance/reportBuilder.js` (928) — extract `_formatReport`
  (~148 lines) → `reportFormatter.js` if it grows past ~1,000 lines
- `src/game/state/featureRewards.js` (557) — extract the `FEATURES` table +
  card builders → `featureRewardTable.js` if it grows past ~650 lines

---

## 5. Dungeon combat & reward balance

Dungeons shipped functional but deliberately un-tuned (2026-02): battles use
existing mob archetypes scaled by `DUNGEON_BATTLE_SCALE` in
`src/params/game/dungeonParams.js`, and the completion reward
(`DUNGEON_COMPLETION_*`) is a placeholder bundle. Mob power is still being
rebalanced, so dungeon fights and rewards get a design/balance pass at the same
time — not before. Also deferred with it: bot AI for dungeons (human-only for
now) and a dedicated dungeon-entrance descriptor (the map visual reuses the
obelisk descriptor).
