/**
 * Bootstrap — DOM-ready startup wiring.
 * Owns only the "when the page is ready, kick things off" concern.
 *
 * Preloads all critical UI templates and injects them into the DOM
 * before any rendering begins. This preserves backward compatibility
 * with all existing JS that uses document.getElementById() — after
 * injection, the expected DOM nodes exist as before.
 *
 * Templates are appended to #game-root in order. CSS handles visibility:
 *   - #setup is displayed by default in CSS
 *   - #game is hidden (display: none) — shown on beginGame
 *   - .modal elements are hidden (display: none) — shown via showModal()
 */
import { registerAction, initModalActions } from '../shared/actionBus.js';
import { preloadTemplates, loadTemplate } from '../ui/templates/templateLoader.js';
import { onEndTurn } from './turnPipeline.js';
import { initCombatModal } from '../ui/combat/combatModal.js';
import { toast } from '../ui/hud.js';
import { refreshAll } from './refreshAll.js';
import './mapControlActions.js'; // side-effect: registers zoom/camera [data-action] handlers
import '../dev/devTools.js'; // side-effect: registers dev tools keyboard shortcut + panel

// Action-bus registrations migrated from the now-deleted gameUIBindings.js
const INSPECT_HINT =
  'Click a highlighted hex to move. Adjacent foes to duel. End turn on empty parchment to dig.';
registerAction('endTurn', () => onEndTurn());
registerAction('inspect', () => toast(INSPECT_HINT));
registerAction('restartToSetup', () => location.reload());

/** Names of templates to preload before any rendering. */
const CRITICAL_TEMPLATES = [
  'setupScreen',
  'gameLayout',
  'combatModal',
  'rewardModal',
  'dispatchModal',
  'heraldModal',
  'victoryModal',
  'toast',
  'confirmModal',
];

window.addEventListener('DOMContentLoaded', async () => {
  try {
    // Preload all critical templates in parallel (network fetch)
    await preloadTemplates(CRITICAL_TEMPLATES);

    // Remove loading indicator immediately — templates are fetched
    document.getElementById('initial-loader')?.remove();

    // Inject into the DOM in order. All are now available via getElementById.
    const root = document.getElementById('game-root');
    if (!root) throw new Error('#game-root not found in index.html');

    await loadTemplate('toast').then(({ frag }) => root.appendChild(frag));
    await loadTemplate('setupScreen').then(({ frag }) => root.appendChild(frag));
    await loadTemplate('gameLayout').then(({ frag }) => root.appendChild(frag));
    await loadTemplate('combatModal').then(({ frag }) => root.appendChild(frag));
    await loadTemplate('rewardModal').then(({ frag }) => root.appendChild(frag));
    await loadTemplate('dispatchModal').then(({ frag }) => root.appendChild(frag));
    await loadTemplate('heraldModal').then(({ frag }) => root.appendChild(frag));
    await loadTemplate('victoryModal').then(({ frag }) => root.appendChild(frag));
    await loadTemplate('confirmModal').then(({ frag }) => root.appendChild(frag));

    initModalActions(() => window.__gameState);
    initCombatModal({
      refreshAll,
      toast,
    });

    // Delay setup init so beginGame.js is fully evaluated
    // and window.__beginGame exists.
    import('../ui/setupScreen.js').then((m) => m.initSetup());

  } catch (err) {
    // Fatal error — templates didn't load. Show a clear message.
    document.getElementById('initial-loader')?.remove();
    const root = document.getElementById('game-root');
    if (root) {
      root.innerHTML = `
        <div style="padding:2rem;font-family:monospace;color:red;">
          <h2>Failed to load UI templates</h2>
          <p>${err.message}</p>
          <p>Check that the server is running and <code>src/ui/templates/</code> directory exists.</p>
          <p>If using a local file:// URL, you need a local HTTP server:</p>
          <pre>cd CotSI && python3 -m http.server 8080</pre>
        </div>`;
    }
    throw err; // Prevent the game from continuing in a broken state
  }
});