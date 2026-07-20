/**
 * hexBridge.js — Resolves what happens when a hex is clicked.
 * Bridges render input → game/state mutations → UI (combat, trader, toasts).
 * References `G` via live binding (circular import, used at runtime only).
 */
import { G, currentChamp } from '../game/state/liveGame.js';
import { refreshAll } from './refreshAll.js';
import { movementRange, moveChampion, adjacentPassable } from '../game/state/championMovement.js';
import { addLog } from '../game/state/gameLog.js';
import { recordLedgerEntry } from '../game/state/dispatchLedger.js';
import { occupiedByMob, occupiedByChampion, occupiedByTrader } from '../game/state/entityQueries.js';
import { parseKey, distance } from '../engine/rules/hexGrid.js';
import { startCombat, openTrader } from '../ui/combat/combatModal.js';
import { toast, pulseEnd } from '../ui/hud.js';
import { FACTIONS } from '../game/rules/factionData.js';

/**
 * Called when the user clicks a hex on the map.
 * @param {string} key  Cubical co‑ordinate key (e.g. "0,0,0")
 */
export function onHexClick(key) {

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
    moveChampion(G, ch, key, 1);
    refreshAll();
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