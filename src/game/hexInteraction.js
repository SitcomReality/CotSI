/**
 * hexInteraction — All logic for what happens when a hex is clicked.
 * Lives in the `game/` domain. References `G` via live binding from
 * gameOrchestrator (circular import, used at runtime only).
 */
import { G, currentChamp, refreshAll } from './gameOrchestrator.js';
import { movementRange, moveChampion } from './movement.js';
import { addLog } from './log.js';
import { occupiedByMob, occupiedByChampion, occupiedByTrader } from './entityQueries.js';
import { parseKey, distance } from '../world/map.js';
import { startCombat, openTrader } from '../ui/combat/index.js';
import { toast, pulseEnd } from '../ui/hud.js';
import { FACTIONS } from '../core/factions.js';

/**
 * Called when the user clicks a hex on the map.
 * @param {string} key  Cubical co‑ordinate key (e.g. "0,0,0")
 */
export function onHexClick(key) {
  if (!G || G.reward || G.notice || G.winnerId) return;
  const ch = currentChamp();
  if (!ch || ch.controller !== 'human') return;

  const range = movementRange(G, ch);
  const tile = G.tiles[key];
  if (!tile) return;

  const mob = occupiedByMob(G, key);
  const other = occupiedByChampion(G, key);
  const trader = occupiedByTrader(G, key);
  const dist = distance(ch.pos, parseKey(key));

  // Adjacent enemy → combat
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

  // Move to highlighted hex
  if (range[key] !== undefined && range[key] > 0) {
    moveChampion(G, ch, key, range[key]);
    refreshAll();
    if (ch.moves <= 0) pulseEnd();
  }
}

/**
 * Handle interacting with a base (sanctuary or token purchase).
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
  } else {
    // Buy faction token
    const cost = ch.faction === 4 ? 14 : 18;
    if (ch.gold >= cost) {
      ch.gold -= cost;
      ch.tokens[tile.feature.faction]++;
      ch.moves = 0;
      addLog(G, `${ch.name} buys ${FACTIONS[tile.feature.faction].name} token.`);
    } else {
      toast('Not enough gold.');
    }
  }
}