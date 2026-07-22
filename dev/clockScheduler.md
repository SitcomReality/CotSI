# Clock Scheduler API Reference

Every timer in the codebase routes through the centralized **Clock** in `src/shared/clockScheduler.js`. Never use raw `setTimeout`, `setInterval`, or `requestAnimationFrame`.

The clock owns the `requestAnimationFrame` loop (Three.js renders via `clock.onTick()`), and all timed operations respect pausing and speed multipliers.

---

## Speed Groups

| Group | Used by | Purpose |
|-------|---------|---------|
| `default` | General purpose | Fallback for ungrouped timers |
| `bot` | `refreshAll.js`, `turnPipeline.js` | Bot turn delays, bot AI pauses |
| `combat` | `combatFx.js`, `combatFlow.js` | Combat exchange waits, HP drain, cleanup |
| `animation` | *(reserved, currently unused)* | Reserved for score count-up, slot-flip timing |
| `ui` | `dispatchModal.js`, `hud.js`, `headerPanel.js` | Dispatch reveal, toast auto-hide, tooltip close |

---

## Pause Semantics

- `getClock().pause()` — freezes ALL groups (master pause)
- `getClock().resume()` — unfreezes all groups
- `getClock().pauseGroup('combat')` — freezes only that group
- `getClock().resumeGroup('combat')` — unfreezes that group
- Frame callbacks (`onTick`) always fire every real rAF frame regardless of pause state

---

## Speed Control

- `getClock().setSpeed('bot', 2)` — bot turns run at 2× speed (620ms nominal → 310ms real)
- `getClock().setSpeed('combat', 0.5)` — combat animations at half speed
- `getClock().getSpeed('bot')` — returns current multiplier (default `1.0`)

---

## API

```js
import { getClock } from '../shared/clockScheduler.js';

// One-shot delay
const taskId = getClock().setTimeout(() => doSomething(), 500, 'combat');
getClock().clearTimeout(taskId); // cancel

// Repeating
const intervalId = getClock().setInterval(() => poll(), 1000, 'bot');
getClock().clearInterval(intervalId);

// Async/await
await getClock().wait(300, 'ui');

// Per-frame callback (returns deregistration function)
const stop = getClock().onTick((timestamp) => {
  updateAnim(timestamp);
});
stop(); // deregister later

// Pause / resume
getClock().pauseGroup('combat');
getClock().resumeGroup('combat');
getClock().pause();          // master pause
getClock().resume();         // master resume
```

---

## Rules

1. **No raw browser timers** anywhere outside `clockScheduler.js`
2. **Always specify a group** for gameplay-related tasks; use `'default'` only for generic one-offs
3. **`onTick` is for per-frame work** (rendering, animation), not delayed logic (use `setTimeout`/`wait`)
4. **`dispose()` on game restart** — `hexMapRenderer.initHexMap3D()` calls `getClock().dispose()`, which stops the rAF loop and clears all pending tasks
5. **Group names are sticky** — unrecognized names auto-create with speed `1.0` and unpaused. Stick to the 5 defined groups (`default`, `bot`, `combat`, `animation` (reserved), `ui`)
