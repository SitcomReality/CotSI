/**
 * cheats/map.js — Map/fog-of-war cheat functions.
 *
 * Layer: dev/ — imports game/state.
 */

import { G } from '../../game/state/liveGame.js';
import { refreshVision, rebuildExploredCache } from '../../game/state/fogOfWar.js';
import { toast } from '../../ui/hud.js';
import { devState } from './state.js';

export function cheatRevealFog() {
  if (!G) return;

  devState.fogRevealed = !devState.fogRevealed;
  const btn = document.getElementById('devRevealFogBtn');

  if (devState.fogRevealed) {
    // Reveal all tiles to every champion
    const allKeys = Object.keys(G.tiles);
    for (const c of G.champions) {
      if (!c.alive) continue;
      c.visible = [...allKeys];
      c.explored = [...allKeys];
    }
    // Explored state changed outside refreshVision — resync the cached set
    rebuildExploredCache(G);
    if (btn) {
      btn.textContent = 'Reveal Map: ON';
      btn.classList.add('is-active');
    }
    toast('Fog of war revealed');
  } else {
    // Recalculate real vision from champion sight ranges
    refreshVision(G);
    if (btn) {
      btn.textContent = 'Reveal Map: OFF';
      btn.classList.remove('is-active');
    }
    toast('Fog of war restored');
  }

  G._fogRevision = (G._fogRevision || 0) + 1;
  G._minimapRevision = (G._minimapRevision || 0) + 1;
}
