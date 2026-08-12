/**
 * hexBridge.js — Resolves what happens when a hex is clicked.
 * Bridges render input → game/state mutations → UI (combat, trader, toasts).
 * References `G` via live binding (circular import, used at runtime only).
 */
import { G, currentChamp } from '../game/state/liveGame.js';
import { refreshAll } from './refreshAll.js';
import { pathToward, moveChampion } from '../game/state/championMovement.js';
import { terrainCost } from '../game/rules/movementCosts.js';
import { tileSurfaceY } from '../render/hexmap3d/hexMapRenderer.js';
import { hexCenter3D } from '../render/hexmap3d/hexWorldSpace.js';
import { queuePath, isAnimating, MOVE_DURATION } from '../render/hexmap3d/units/movementAnimator.js';
import { setPathPreview } from '../render/overlays/overlayStack.js';
import { occupiedByMob, occupiedByChampion, occupiedByTrader } from '../game/state/entityQueries.js';
import { parseKey, distance, coordKey } from '../engine/rules/hexGrid.js';
import { startCombat } from './combat/index.js';
import { openTrader } from '../ui/combat/combatRewardUI.js';
import { pulseEnd, toast } from '../ui/hud.js';
import { FACTIONS } from '../game/rules/factionData.js';
import { interactBase } from '../game/state/baseInteraction.js';
import { setGameContext, clearGameContext } from '../devtools/performance/index.js';
import { handleTeleportClick } from '../devtools/devTools.js';
import { CHAMPION_HEIGHT_OFFSET } from '../params/render/animationParams.js';

// ─── Click-to-preview state (dev/docs/movementDesign.md §8) ────────────────
// Click-to-preview → click-to-confirm is the only move mode: the first click
// on a hex stores the path; the second click on the same hex commits the walk.
// Module state resets on commit, cancel, champion change, or champion move
// (end turn / teleport can leave the same champion at a new hex).
let pendingPreviewKey = null;
let pendingPreviewPath = null;
let pendingPreviewChampId = null;
let pendingPreviewStartKey = null; // champion hex when the preview was made

/**
 * Cancel any pending click-to-preview path (Esc, clicking the champion's own
 * hex, or ending the turn). Registered as the 'cancelMovePreview' action.
 */
export function cancelPendingPreview() {
  pendingPreviewKey = null;
  pendingPreviewPath = null;
  pendingPreviewChampId = null;
  pendingPreviewStartKey = null;
  setPathPreview(null);
}

/** Mutate + animate a committed path: one moveChampion + one hop per hex.
 *  Per-hop moveChampion fires interactOnArrival; this is safe only because
 *  feature hexes are destination-only in pathing (movementRange/pathToward),
 *  so the final hop is the only one that can land on a harvestable hex. */
function walkPath(ch, pathKeys) {
  const fac = FACTIONS[ch.faction];
  const hops = [];
  for (const key of pathKeys) {
    // Capture world-space origin before the state mutation
    const fromTile = G.tiles[coordKey(ch.pos)];
    const fromY = fromTile ? tileSurfaceY(fromTile) + CHAMPION_HEIGHT_OFFSET : CHAMPION_HEIGHT_OFFSET;
    const fromWorld = hexCenter3D(ch.pos.q, ch.pos.r, fromY);
    const cost = terrainCost(ch, G.tiles[key].terrain);
    moveChampion(G, ch, key, cost);
    // Capture world-space destination after mutation
    const toTile = G.tiles[key];
    const toY = toTile ? tileSurfaceY(toTile) + CHAMPION_HEIGHT_OFFSET : CHAMPION_HEIGHT_OFFSET;
    const toWorld = hexCenter3D(ch.pos.q, ch.pos.r, toY);
    hops.push({ from: fromWorld, to: toWorld });
  }
  setGameContext({
    phase: 'human_turn',
    championId: ch.id,
    championName: ch.name,
    action: 'moving',
  });
  if (fac && hops.length) {
    queuePath(ch.id, hops, fac, MOVE_DURATION);
  }
  clearGameContext();
  // Drop any hover/preview route overlay — the champion moved, so the old
  // path no longer starts at the champion. The next hover rebuilds it.
  setPathPreview(null);
  refreshAll();
  // Camera follow is handled inside refreshMap (damped chase toward the
  // champion's new hex); the pan-constraint anchor is updated there too.
  if (ch.actionPoints <= 0) pulseEnd();
}

/**
 * Called when the user clicks a hex on the map.
 * @param {string} key  Cubical co‑ordinate key (e.g. "0,0,0")
 */
export function onHexClick(key) {

  // Dev tools teleport mode: bypass all game checks
  if (window.__devTools && window.__devTools.teleportMode) {
    handleTeleportClick(parseKey(key));
    return;
  }

  if (!G || G.dispatch || G.reward || G.winnerId) return;
  const ch = currentChamp();
  if (!ch || ch.controller !== 'human' || ch.actionPoints <= 0) return;

  const tile = G.tiles[key];
  if (!tile) return;

  const mob = occupiedByMob(G, key);
  const other = occupiedByChampion(G, key);
  const trader = occupiedByTrader(G, key);
  const dist = distance(ch.pos, parseKey(key));
  const startKey = coordKey(ch.pos);

  // Adjacent enemy → combat (allowed even if hex is blocked for movement)
  if ((mob || other) && dist === 1) {
    cancelPendingPreview();
    startCombat(ch, mob || other);
    return;
  }

  // Adjacent trader → trade
  if (trader && dist === 1) {
    cancelPendingPreview();
    openTrader(trader);
    return;
  }

  // Adjacent base → interact
  if (tile.feature?.kind === 'base' && dist === 1) {
    cancelPendingPreview();
    const result = interactBase(ch, tile);
    if (!result.ok) toast(result.reason);
    refreshAll();
    return;
  }

  // Stale pending preview (champion changed) — drop it.
  if (pendingPreviewChampId !== null && pendingPreviewChampId !== ch.id) {
    cancelPendingPreview();
  }
  // Same champion, but moved since the preview was made (ended the turn,
  // teleported, won combat onto a new hex): the stored route no longer
  // starts at the champion — the next click previews instead of committing.
  if (
    pendingPreviewChampId === ch.id &&
    pendingPreviewStartKey !== null &&
    pendingPreviewStartKey !== startKey
  ) {
    cancelPendingPreview();
  }

  // One committed path per click (design §8.3): ignore clicks while the
  // champion's multi-hop walk animation is still playing. State is already
  // at the destination, so re-pathing mid-chain would skip the mesh ahead.
  if (isAnimating(ch.id)) return;

  // Click-to-preview → click-to-confirm is the only move mode (design §8):
  // the first click on a hex previews the route (persisting until cancelled),
  // the second click on the same hex commits the walk.
  if (key === startKey) {
    cancelPendingPreview();
    return;
  }
  if (pendingPreviewKey === key && pendingPreviewPath) {
    // Revalidate at commit time: the world may have moved since the preview
    // (occupants, features, AP grants) — recompute against fresh state.
    const targetKey = pendingPreviewKey;
    cancelPendingPreview();
    const fresh = pathToward(G, ch, targetKey);
    if (fresh && fresh.path.length) {
      walkPath(ch, fresh.path);
    } else {
      toast('That path is no longer clear — pick a new destination');
    }
    return;
  }
  const path = pathToward(G, ch, key);
  pendingPreviewKey = key;
  pendingPreviewPath = path ? path.path : null;
  pendingPreviewChampId = ch.id;
  pendingPreviewStartKey = startKey;
  setPathPreview(path ? { keys: path.path, cost: path.cost } : null);
}
