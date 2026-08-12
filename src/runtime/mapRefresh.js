/**
 * mapRefresh — Derived data, per-refresh rendering, and minimap lifecycle.
 *
 * Owns the singleton `minimapInitialized` flag.
 * One-time 3D init lives in initMap3d.js; shared camera-focus in mapCamera.js.
 */
import { renderHexMap3D, getSceneContext, chaseCameraToHex } from '../render/hexmap3d/hexMapRenderer.js';
import { G, currentChamp } from '../game/state/liveGame.js';
import { getHumanView } from '../game/state/fogOfWar.js';
import { movementRange } from '../game/state/championMovement.js';
import { neighbors, coordKey, parseKey } from '../engine/rules/hexGrid.js';
import { occupiedByMob, occupiedByChampion, occupiedByTrader } from '../game/state/entityQueries.js';
import { initMinimap, renderMinimap, disposeMinimap } from '../render/minimap/minimap.js';
import { setDerivedState, setInteractionHighlights, setPathPreview } from '../render/overlays/overlayStack.js';
import { startMeasure, endMeasure } from '../devtools/performance/index.js';
import { initMap3D, resetInitFlags } from './initMap3d.js';
import { focusCameraOnHex, getLastCenteredChampionId, setLastCenteredChampionId, resetCameraFocus, updateCameraStartCenter } from './mapCamera.js';
import { clearDirtyFlags, markChunkDirty } from '../game/state/chunkDirtyTracking.js';
import { ensureChunk, missingChunksAround } from '../game/state/chunkManager.js';
import { occupiedKeys } from '../render/hexmap3d/worldObjects/decorEmphasis.js';
import { getClock } from '../shared/clockScheduler.js';
import { BACKGROUND_BUFFER_CHUNKS, BACKGROUND_GEN_SPREAD_MS } from '../params/game/chunkParams.js';

/** Whether the minimap has been initialized. */
let minimapInitialized = false;

/**
 * Last seen occupant-key set ("q,r"). Decoration de-emphasis is baked into
 * chunk meshes, so chunks must rebuild when an occupant enters or leaves a
 * tile — otherwise the dispersed/restored states would go stale. Diffing the
 * occupant set at refresh time catches every move, death, and spawn with
 * minimal rebuilds (only chunks whose occupancy actually changed).
 */
let lastOccupantKeys = null;

/**
 * Last followed champion hex ("q,r"). The camera is locked to the champion:
 * when the champion moves, the target chases smoothly to follow (zoom
 * preserved). Only the initial focus on a champion change uses the
 * fixed-duration pan.
 */
let lastFollowedChampKey = null;

/**
 * Last hex the background pre-generation buffer was scheduled for. The buffer
 * only needs refreshing when the champion's hex changes, so redundant task
 * queues aren't scheduled on every refresh.
 */
let lastScheduledChampKey = null;

/**
 * Last champion the click-to-preview overlay was built for ("id@q,r"). The
 * route is drawn from the active champion, so when the champion or its hex
 * changes (turn advance, death, teleport) the preview goes stale — refreshMap
 * clears it until the next click-to-preview. Previews intentionally persist
 * across hovers and AP changes.
 */
let lastPreviewChampKey = null;

function markOccupancyChunksDirty(state) {
  const current = occupiedKeys(state);
  if (lastOccupantKeys !== null) {
    for (const key of current) {
      if (!lastOccupantKeys.has(key)) {
        const { q, r } = parseKey(key);
        markChunkDirty(state, q, r);
      }
    }
    for (const key of lastOccupantKeys) {
      if (!current.has(key)) {
        const { q, r } = parseKey(key);
        markChunkDirty(state, q, r);
      }
    }
  }
  lastOccupantKeys = current;
}

/**
 * Initialize the 3D map scene (once) then render the current state.
 * Centers the camera on the human champion's position at turn start.
 */
export function refreshMap() {
  startMeasure('mapRefresh');

  if (!G) {
    console.warn('[refreshMap] G is null — bail');
    endMeasure('mapRefresh');
    return;
  }

  // Pre-compute derived data so render layers don't need to import game/state/
  const humanView = getHumanView(G);
  const activeChamp = currentChamp();
  const moveHighlights = activeChamp && activeChamp.alive && activeChamp.controller === 'human'
    ? [...movementRange(G, activeChamp).costs.keys()]
        .filter((k) => k !== coordKey(activeChamp.pos))
    : [];
  setDerivedState(humanView, moveHighlights);

  // A click-to-preview route is drawn from the active champion; when the
  // champion or its hex changes, the stored route no longer applies. Clear it
  // until the next click-to-preview.
  const previewChampKey = activeChamp ? `${activeChamp.id}@${coordKey(activeChamp.pos)}` : null;
  if (previewChampKey !== lastPreviewChampKey) {
    setPathPreview(null);
    lastPreviewChampKey = previewChampKey;
  }

  // Compute interaction-highlight data from ALL adjacent hexes (combat, trade, base)
  // — not just passable ones, since combat works on blocked hexes too.
  const interactionHighlights = new Map();
  if (activeChamp && activeChamp.alive && activeChamp.controller === 'human') {
    for (const n of neighbors(activeChamp.pos)) {
      const key = coordKey(n);
      const mob = occupiedByMob(G, key);
      if (mob) {
        interactionHighlights.set(key, { type: 'mob', entity: mob });
        continue;
      }
      const other = occupiedByChampion(G, key);
      if (other) {
        interactionHighlights.set(key, { type: 'champion', entity: other });
        continue;
      }
      const trader = occupiedByTrader(G, key);
      if (trader) {
        interactionHighlights.set(key, { type: 'trader', entity: trader });
        continue;
      }
      const tile = G.tiles[key];
      if (tile && tile.feature && tile.feature.kind === 'base') {
        interactionHighlights.set(key, { type: 'base', entity: tile.feature });
      }
    }
  }
  setInteractionHighlights(interactionHighlights);

  const mountEl = document.getElementById('mapMount');
  if (!mountEl) {
    console.warn('[refreshMap] #mapMount not found in DOM');
    endMeasure('mapRefresh');
    return;
  }

  // One-time 3D scene initialization
  initMap3D(mountEl, G);

  // De-emphasis toggle: rebuild chunks whose occupancy changed since the last
  // refresh, so decorations disperse/restore as units move on and off tiles.
  markOccupancyChunksDirty(G);

  try {
    renderHexMap3D(G, humanView);
    // Clear chunk dirty flags only on success — if rendering throws, the chunks
    // stay dirty so the next refresh retries the rebuild. Clearing unconditionally
    // would let a transient render error permanently poison those chunks
    // (stale/blank map with no recovery).
    clearDirtyFlags(G);
  } catch (err) {
    console.error('[refreshMap] renderHexMap3D threw:', err);
  }

  // Initialize minimap on first render after game state is ready
  if (!minimapInitialized) {
    initMinimap(mountEl);
    minimapInitialized = true;
  }

  // Render minimap each refresh (caches internally)
  renderMinimap(G, humanView);

  // Camera lock: the camera stays centered on the human champion. First time a
  // champion takes the stage, animate the pan; after that, follow position
  // changes with a damped chase (zoom preserved). The zoom-dependent pan
  // constraint (updateCameraStartCenter) additionally confines any manual pan
  // to the champion's sight disc, and max zoom-out is the disc itself — the
  // view can never leave the champion's area.
  const ch = currentChamp();
  if (ch && ch.controller === 'human') {
    if (ch.id !== getLastCenteredChampionId()) {
      focusCameraOnHex(ch.pos.q, ch.pos.r);
      setLastCenteredChampionId(ch.id);
      lastFollowedChampKey = `${ch.pos.q},${ch.pos.r}`;
    } else if (lastFollowedChampKey !== `${ch.pos.q},${ch.pos.r}`) {
      const ctx3d = getSceneContext();
      if (ctx3d) {
        chaseCameraToHex(ctx3d.getCameraState(), ctx3d.applyCamera, ch.pos.q, ch.pos.r);
        lastFollowedChampKey = `${ch.pos.q},${ch.pos.r}`;
      }
    }
    updateCameraStartCenter(ch.pos.q, ch.pos.r);

    // Background chunk pre-generation: keep a buffer of chunks around the
    // champion materialized so in-refresh reads rarely trigger synchronous
    // generation. Only re-scheduled when the champion's hex changes; tasks
    // are spread across frames on the 'bot' speed group.
    const chKey = `${ch.pos.q},${ch.pos.r}`;
    if (lastScheduledChampKey !== chKey) {
      lastScheduledChampKey = chKey;
      const missing = missingChunksAround(G, ch.pos.q, ch.pos.r, BACKGROUND_BUFFER_CHUNKS);
      const clock = getClock();
      missing.forEach(({ cq, cr }, i) => {
        clock.setTimeout(() => ensureChunk(G, cq, cr), i * BACKGROUND_GEN_SPREAD_MS, 'bot');
      });
    }
  }

  endMeasure('mapRefresh');
}

/**
 * Reset flags used when disposing the scene for a new game.
 */
export function resetMapInitialized() {
  minimapInitialized = false;
  lastOccupantKeys = null;
  lastFollowedChampKey = null;
  lastScheduledChampKey = null;
  lastPreviewChampKey = null;
  disposeMinimap();
  resetInitFlags();
  resetCameraFocus();
}
