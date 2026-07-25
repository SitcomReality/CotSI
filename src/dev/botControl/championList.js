/**
 * botControl/championList.js — Champion list DOM rendering and controller toggle.
 *
 * Layer: dev/ — imports game/state, game/rules.
 */

import { G } from '../../game/state/liveGame.js';
import { FACTIONS } from '../../game/rules/factionData.js';
import { toast } from '../../ui/hud.js';

/**
 * Rebuild the champion list in the Bot Control tab.
 * Shows each champion with a controller toggle button.
 */
export function renderChampionList() {
  const container = document.querySelector('.devtools__champ-list');
  if (!container || !G) return;

  container.replaceChildren();
  for (const ch of G.champions) {
    if (!ch.alive) continue;
    const fac = FACTIONS[ch.faction];
    const row = document.createElement('div');
    row.className = 'devtools__champ-row';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'devtools__champ-name';
    const dot = document.createElement('span');
    dot.className = 'devtools__champ-dot';
    dot.style.background = fac.color;
    nameSpan.appendChild(dot);
    nameSpan.append(` ${ch.name}`);

    const btn = document.createElement('button');
    btn.className = 'devtools__champ-ctrl-btn';
    btn.textContent = ch.controller === 'human' ? 'Human' : 'Bot';
    btn.dataset.champId = ch.id;
    btn.addEventListener('click', () => _toggleController(ch.id));

    row.appendChild(nameSpan);
    row.appendChild(btn);
    container.appendChild(row);
  }
}

function _toggleController(champId) {
  if (!G) return;
  const ch = G.champions.find(c => c.id === champId);
  if (!ch) return;
  ch.controller = ch.controller === 'human' ? 'bot' : 'human';
  toast(`${ch.name} is now ${ch.controller}`);
  renderChampionList();
  // The next refreshAll() will pick up the new controller
}
