import { registerAction } from '../shared/actionBus.js';
import { beats } from '../game/rules/factionData.js';
import { BALANCED_3P } from './setupConstants.js';
import { toast } from './hud.js';
import { refreshSetup } from './setupHeptagram.js';
import { gameMode, roster, setGameMode } from './setupScreen.js';

registerAction('toggleFaction', (el) => {
  const idx = parseInt(el.dataset.idx, 10);
  if (isNaN(idx)) return;

  if (gameMode === 7) {
    // 7P mode: toggle between bot and human (no inactive state)
    roster[idx].human = !roster[idx].human;
  } else {
    // 3P mode: cycle bot → human → inactive → bot
    if (!roster[idx].enabled) {
      // Currently inactive — try to activate
      const activeIds = roster.filter(r => r.enabled).map(r => r.id);
      if (activeIds.length >= 2) {
        // Check balance: can this faction be the balanced third?
        const [a, b] = activeIds;
        const key = a < b ? a * 7 + b : b * 7 + a;
        if (!BALANCED_3P[key]?.includes(idx)) {
          toast('This faction would unbalance the RPS triple.', true);
          return;
        }
      }
      // Activate as bot
      roster[idx].enabled = true;
      roster[idx].human = false;
    } else if (!roster[idx].human) {
      // Currently bot → switch to human
      roster[idx].human = true;
    } else {
      // Currently human → deactivate
      roster[idx].enabled = false;
    }
  }

  refreshSetup();
});

registerAction('toggleController', (el) => {
  const idx = parseInt(el.dataset.idx, 10);
  if (isNaN(idx)) return;
  // In 3P mode, only toggle controller for active (in-game) factions
  if (gameMode === 3 && !roster[idx].enabled) return;
  roster[idx].human = !roster[idx].human;
  refreshSetup();
});

registerAction('randomizeSeed', () => {
  const seedInput = document.getElementById('seedInput');
  if (seedInput) {
    seedInput.value = 'glut-' + Math.floor(Math.random() * 9999);
  }
});

registerAction('setGameMode', (el) => {
  const mode = parseInt(el.dataset.mode, 10);
  if (mode !== 7 && mode !== 3) return;
  setGameMode(mode);

  // Update toggle button state
  document.querySelectorAll('.setup-mode-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');

  // Reset roster for new mode
  roster.forEach((r, i) => {
    r.enabled = (mode === 7);
    r.human = (i === 0); // only first faction is human by default
  });

  refreshSetup();
});

registerAction('beginGame', () => {
  const chosen = roster.filter(r => r.enabled);
  if (chosen.length < (gameMode === 3 ? 3 : 2)) {
    toast(gameMode === 3 ? 'Select 3 champions for balanced play.' : 'Choose at least 2 champions', true);
    return;
  }

  if (gameMode === 3 && chosen.length !== 3) {
    toast('In 3 Champion mode, exactly 3 factions must be selected.', true);
    return;
  }

  // In 3P mode, verify balance
  if (gameMode === 3 && chosen.length === 3) {
    const ids = chosen.map(c => c.id);
    const [a, b, c] = ids;
    const winsA = (beats(a, b) ? 1 : 0) + (beats(a, c) ? 1 : 0);
    const winsB = (beats(b, a) ? 1 : 0) + (beats(b, c) ? 1 : 0);
    const winsC = (beats(c, a) ? 1 : 0) + (beats(c, b) ? 1 : 0);
    if (winsA !== 1 || winsB !== 1 || winsC !== 1) {
      toast('Selected factions do not form a balanced RPS triple.', true);
      return;
    }
  }

  const mapRadiusEl = document.getElementById('mapRadius');
  const radius = mapRadiusEl?.value
    ? parseInt(mapRadiusEl.value, 10)
    : 21;
  const relicTarget = parseInt(document.getElementById('relicTarget')?.value || '25', 10);
  const lastStanding = document.getElementById('optLast')?.checked ?? true;

  const biomeSelect = document.getElementById('biomeSelect');
  const biome = biomeSelect ? biomeSelect.value : 'biome_default';

  const hv = parseFloat(document.getElementById('hvSlider')?.value || '1.0');
  const wt = parseFloat(document.getElementById('wtSlider')?.value || '1.0');
  const mt = parseFloat(document.getElementById('mtSlider')?.value || '1.0');
  const mapSettings = { heightVariation: hv, wateriness: wt, mountainousness: mt };

  if (window.__beginGame) {
    window.__beginGame({
      seed: document.getElementById('seedInput')?.value || 'glut-' + Math.floor(Math.random() * 999),
      radius,
      champions: chosen.map(c => ({
        faction: c.id,
        controller: c.human ? 'human' : 'bot',
      })),
      objectives: { relicRace: true, relicTarget, lastStanding },
      biome,
      mapSettings,
    });
  }
});
