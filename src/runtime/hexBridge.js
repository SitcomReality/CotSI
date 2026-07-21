/**
 * hexBridge.js — Resolves what happens when a hex is clicked.
 * Bridges render input → game/state mutations → UI (combat, trader, toasts).
 * References `G` via live binding (circular import, used at runtime only).
 */
import { G, currentChamp } from '../game/state/liveGame.js';
import { refreshAll } from './refreshAll.js';
import { movementRange, moveChampion, adjacentPassable } from '../game/state/championMovement.js';
import { getSceneContext, animateCenterOnHex, tileTopY } from '../render/hexmap3d/hexMapRenderer.js';
import { hexCenter3D } from '../render/hexmap3d/hexWorldSpace.js';
import { queueOrStart as queueMovement, MOVE_DURATION } from '../render/hexmap3d/units/movementAnimator.js';
import { addLog } from '../game/state/gameLog.js';
import { recordLedgerEntry } from '../game/state/dispatchLedger.js';
import { occupiedByMob, occupiedByChampion, occupiedByTrader } from '../game/state/entityQueries.js';
import { parseKey, distance, coordKey } from '../engine/rules/hexGrid.js';
import { startCombat, openTrader } from '../ui/combat/combatModal.js';
import { toast, pulseEnd } from '../ui/hud.js';
import { FACTIONS } from '../game/rules/factionData.js';
import { handleTeleportClick } from '../dev/devTools.js';

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

  if (!G || G.dispatch || G.reward || G.notice || G.winnerId) return;
  const ch = currentChamp();
  if (!ch || ch.controller !== 'human' || ch.moves <= 0) return;

  const tile = G.tiles[key];
  if (!tile) return;

  const mob = occupiedByMob(G, key);
  const other = occupiedByChampion(G, key);
  const trader = occupiedByTrader(G, key);
  const dist = distance(ch.pos, parseKey(key));

  // Adjacent enemy → combat (allowed even if hex is blocked for movement)
  if ((mob || other) && dist === 1) {
    startCombat(ch, mob || other);
    return;
  }

  // Adjacent trader → trade
  if (trader && dist === 1) {
    openTrader(trader);
    return;
  }

  // Adjacent base → interact
  if (tile.feature?.kind === 'base' && dist === 1) {
    interactBase(ch, tile);
    refreshAll();
    return;
  }

  // Movement: only adjacent and passable hexes (cost always 1)
  const allowed = adjacentPassable(G, ch);
  if (allowed.includes(key)) {
    // Capture world-space origin before the state mutation
    const fromTile = G.tiles[coordKey(ch.pos)];
    const fromY = fromTile ? tileTopY(fromTile.terrain) + 0.15 : 0.15;
    const fromWorld = hexCenter3D(ch.pos.q, ch.pos.r, fromY);
    moveChampion(G, ch, key, 1);
    // Capture world-space destination after mutation
    const toTile = G.tiles[key];
    const toY = toTile ? tileTopY(toTile.terrain) + 0.15 : 0.15;
    const toWorld = hexCenter3D(ch.pos.q, ch.pos.r, toY);
    const fac = FACTIONS[ch.faction];
    if (fac) {
      queueMovement(ch.id, fromWorld, toWorld, fac.base, MOVE_DURATION);
    }
    refreshAll();
    // Recenter camera on the champion's new position
    const ctx3d = getSceneContext();
    if (ctx3d) {
      // Match camera pan duration to unit movement animation so both land together.
      animateCenterOnHex(ctx3d.getCameraState(), ctx3d.applyCamera, ch.pos.q, ch.pos.r, MOVE_DURATION);
    }
    if (ch.moves <= 0) pulseEnd();
  }
}

/**
 * Handle interacting with a base (sanctuary or potency purchase).
 * @param {object} ch
 * @param {object} tile
 */
function interactBase(ch, tile) {
  if (tile.feature.faction === ch.faction) {
    // Sanctuary — heal 50% max HP
    const healed = Math.ceil(ch.maxHp * 0.5);
    ch.hp = Math.min(ch.maxHp, ch.hp + healed);
    ch.moves = 0;
    addLog(G, `${ch.name} receives sanctuary (+${healed} HP).`);
    recordLedgerEntry(ch, `+${healed} HP — sanctuary`, 'gain', 'hp');
  } else {
    // Buy faction potency
    const cost = ch.faction === 4 ? 14 : 18;
    if (ch.gold >= cost) {
      ch.gold -= cost;
      ch.potencies[tile.feature.faction]++;
      ch.moves = 0;
      addLog(G, `${ch.name} buys ${FACTIONS[tile.feature.faction].name} potency.`);
      recordLedgerEntry(
        ch,
        `-${cost} gold, +1 ${FACTIONS[tile.feature.faction].name} potency — base purchase`,
        'neutral',
        'gold'
      );
    } else {
      toast('Not enough gold.');
    }
  }
}