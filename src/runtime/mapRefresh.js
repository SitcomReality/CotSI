/**
 * mapRefresh — Derived data, per-refresh rendering, and minimap lifecycle.
 *
 * Owns the singleton `minimapInitialized` flag.
 * One-time 3D init lives in initMap3d.js; shared camera-focus in mapCamera.js.
 */
import { renderHexMap3D } from '../render/hexmap3d/hexMapRenderer.js';
import { G, currentChamp } from '../game/state/liveGame.js';
import { getHumanView } from '../game/state/fogOfWar.js';
import { adjacentPassable } from '../game/state/championMovement.js';
import { neighbors, coordKey, parseKey } from '../engine/rules/hexGrid.js';
import { occupiedByMob, occupiedByChampion, occupiedByTrader } from '../game/state/entityQueries.js';
import { initMinimap, renderMinimap, disposeMinimap } from '../render/minimap/minimap.js';
import { setDerivedState, setInteractionHighlights } from '../render/overlays/overlayStack.js';
import { startMeasure, endMeasure } from '../dev/performance/index.js';
import { initMap3D, resetInitFlags } from './initMap3d.js';
import { focusCameraOnHex, getLastCenteredChampionId, setLastCenteredChampionId, resetCameraFocus, updateCameraStartCenter } from './mapCamera.js';
import { clearDirtyFlags, markChunkDirty } from '../game/state/chunkDirtyTracking.js';
import { occupiedKeys } from '../render/hexmap3d/features/decorEmphasis.js';

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
    ? adjacentPassable(G, activeChamp)
    : [];
  setDerivedState(humanView, moveHighlights);

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
    initMinimap(mountEl, G.radius, getHumanView);
    minimapInitialized = true;
  }

  // Render minimap each refresh (caches internally)
  renderMinimap(G, humanView);

  // Center camera on human champion at turn start (only when champion changes).
  // Zooms to a fixed ~1200% zoom for an intimate, close-up view.
  const ch = currentChamp();
  if (ch && ch.controller === 'human' && ch.id !== getLastCenteredChampionId()) {
    focusCameraOnHex(ch.pos.q, ch.pos.r);
    setLastCenteredChampionId(ch.id);
  }

  // Update the zoom-dependent pan constraint anchor on every human turn start,
  // even when the champion hasn't changed (e.g. day rollover with same champ).
  if (ch && ch.controller === 'human') {
    updateCameraStartCenter(ch.pos.q, ch.pos.r);
  }

  endMeasure('mapRefresh');
}

/**
 * Reset flags used when disposing the scene for a new game.
 */
export function resetMapInitialized() {
  minimapInitialized = false;
  lastOccupantKeys = null;
  disposeMinimap();
  resetInitFlags();
  resetCameraFocus();
}
