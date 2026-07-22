import { registerAction } from '../shared/actionBus.js';
import { beats } from '../game/rules/factionData.js';
import { toast } from './hud.js';
import { refreshSetup, getBalancedThird } from './setupHeptagram.js';
import { gameMode, roster } from './setupScreen.js';

registerAction('toggleFaction', (el) => {
  const idx = parseInt(el.dataset.idx, 10);
  if (isNaN(idx)) return;

  // In 3-player mode, enforce RPS balance
  if (gameMode === 3) {
    const currentEnabled = roster.filter(r => r.enabled).map(r => r.id);

    if (roster[idx].enabled) {
      // Cannot deselect if only 3 are selected and we're in 3P mode
      if (currentEnabled.length <= 3) {
        toast('In 3 Champion mode, select 3 factions and begin.', true);
        return;
      }
      roster[idx].enabled = false;
    } else {
      // Adding: if we already have 2, the third is forced
      if (currentEnabled.length >= 2) {
        toast('Select 2 factions; the third is chosen for balance.', true);
        return;
      }
      roster[idx].enabled = true;

      // If we now have exactly 2, auto-select the balanced third
      const nowEnabled = roster.filter(r => r.enabled).map(r => r.id);
      if (nowEnabled.length === 2) {
        const third = getBalancedThird(nowEnabled[0], nowEnabled[1]);
        if (third >= 0) {
          roster[third].enabled = true;
        }
      }
    }
  } else {
    // 7-player mode: simple toggle
    roster[idx].enabled = !roster[idx].enabled;
  }

  refreshSetup();
});

registerAction('toggleController', (el) => {
  const idx = parseInt(el.dataset.idx, 10);
  if (isNaN(idx)) return;
  roster[idx].human = !roster[idx].human;
  refreshSetup();
});

registerAction('selectSize', (el) => {
  document.querySelectorAll('.size-pill').forEach(x => x.classList.remove('active'));
  el.classList.add('active');
});

registerAction('setGameMode', (el) => {
  const mode = parseInt(el.dataset.mode, 10);
  if (mode !== 7 && mode !== 3) return;
  gameMode = mode;

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

  const sizeEl = document.querySelector('.size-pill.active');
  const radius = sizeEl ? parseInt(sizeEl.dataset.r, 10) : 9;
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
