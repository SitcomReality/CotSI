# Clock Scheduler API Reference

Every timer in the codebase routes through the centralized **Clock** in `src/shared/clockScheduler.js`. Never use raw `setTimeout`, `setInterval`, or `requestAnimationFrame`.

The clock owns the `requestAnimationFrame` loop (Three.js renders via `clock.onTick()`), and all timed operations respect pausing and speed multipliers.

---

## Speed Groups

| Group | Used by | Purpose |
|-------|---------|---------|
| `default` | General purpose | Fallback for ungrouped timers |
| `bot` | `refreshAll.js` | Bot turn auto-advance delay |
| `combat` | `combatFx.js`, `combatState.js` | Combat waits, HP drain, cleanup |
| `animation` | `botTurnRunner.js` | Champion-movement pacing between hex steps |
| `ui` | `dispatchModal.js`, `hud.js`, `perfUI.js` | Dispatch reveal, end-turn pulse, perf-panel refresh |

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

// Start the rAF loop (idempotent). The clock is NOT running until start()
// is called — nothing fires before it.
getClock().start();

// Queries
getClock().now('bot');         // virtual time of a group
getClock().isPaused();         // master-paused?
getClock().isPaused('combat'); // master-paused OR that group paused?

// Frame marker: one start/end callback per tick (ctx = start's return value)
getClock().setFrameMarker((phase, ctx) => {
  if (phase === 'start') { /* e.g. begin a measurement */ }
  else { /* phase === 'end' */ }
});
getClock().setFrameMarker(null); // clear
```

`getFrameTickStart()` returns the `performance.now()` timestamp from the top of the
current tick (0 outside a tick) — the performance profiler uses it to compute per-frame
JS time.

---

## Rules

1. **No raw browser timers** anywhere outside `clockScheduler.js`
2. **Always specify a group** for gameplay-related tasks; use `'default'` only for generic one-offs
3. **`onTick` is for per-frame work** (rendering, animation), not delayed logic (use `setTimeout`/`wait`)
4. **`dispose()` on game restart** — `hexMapRenderer.initHexMap3D()` calls `getClock().dispose()`, which stops the rAF loop and clears all pending tasks
5. **Unrecognized groups are a silent-failure footgun.** Only the 5 defined groups
   (`default`, `bot`, `combat`, `animation`, `ui`) can be used for scheduling. Passing an
   unknown group to `setTimeout`/`setInterval`/`wait` computes the due time against
   `default` but stores the task under the unknown name — `popExpired` never matches it,
   so the timer **silently never fires**. Control calls (`pauseGroup`, `resumeGroup`,
   `setSpeed`, `getSpeed`, `now`, `isPaused`) DO auto-create unknown groups, so a typo
   there silently creates a dead group instead of erroring. If a timer never fires, check
   the group string first.
