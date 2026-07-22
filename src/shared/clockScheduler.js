/**
 * clockScheduler.js — Centralized timing authority.
 *
 * Replaces all ad-hoc setTimeout/setInterval/requestAnimationFrame calls
 * with a single, pauseable, speed-controllable scheduler. Every timer in
 * the codebase must route through this clock.
 *
 * Provides named speed groups so different game systems (combat, bot AI,
 * UI animations) can be paused or sped up independently.
 *
 * Layer: shared/ — imports nothing project-local.
 */

// ─── Clock instance factory ─────────────────────────────────────────────

export function createClock() {
  let _running = false;
  let _rafId = null;
  let _lastTime = 0;
  let _masterPaused = false;
  let _idCounter = 1;
  let _timeoutTasks = [];
  let _frameCallbacks = [];
  let _frameCallbackIdCounter = 1;

  // Per-group state
  // The `animation` group is reserved for future use (score count-up, slot-flip timing)
  const _groups = {
    default:   { paused: false, speed: 1, virtualNow: 0 },
    bot:       { paused: false, speed: 1, virtualNow: 0 },
    combat:    { paused: false, speed: 1, virtualNow: 0 },
    animation: { paused: false, speed: 1, virtualNow: 0 },
    ui:        { paused: false, speed: 1, virtualNow: 0 },
  };

  // ── Internal helpers ────────────────────────────────────────────────

  function _groupRef(group) {
    if (!_groups[group]) {
      _groups[group] = { paused: false, speed: 1, virtualNow: 0 };
    }
    return _groups[group];
  }

  function _tick(timestamp) {
    if (!_running) return;
    _rafId = requestAnimationFrame(_tick);

    // Compute real delta; skip first frame (no reliable delta)
    if (_lastTime === 0) {
      _lastTime = timestamp;
      return;
    }
    const realDelta = timestamp - _lastTime;
    _lastTime = timestamp;

    // ── Advance group virtual clocks ──
    if (!_masterPaused) {
      for (const key of Object.keys(_groups)) {
        const g = _groups[key];
        if (!g.paused) {
          g.virtualNow += realDelta * g.speed;
        }
      }

      // ── Fire due timeout tasks ──
      // Sort so we process in chronological order
      _timeoutTasks.sort((a, b) => a.fireAt - b.fireAt);
      const due = [];
      const remaining = [];
      for (const task of _timeoutTasks) {
        if (task.cancelled) continue;
        const grp = _groupRef(task.group);
        if (grp.virtualNow >= task.fireAt) {
          due.push(task);
        } else {
          remaining.push(task);
        }
      }
      _timeoutTasks = remaining;

      for (const task of due) {
        if (!task.cancelled) {
          task.fn();
          // If interval task, re-schedule
          if (task.interval > 0) {
            const grp = _groupRef(task.group);
            _timeoutTasks.push({
              id: task.id,
              fn: task.fn,
              group: task.group,
              fireAt: grp.virtualNow + task.interval,
              interval: task.interval,
              cancelled: false,
            });
          }
        }
      }
    }

    // ── Frame callbacks fire every frame regardless of pause ──
    // Pass real timestamp for animation/rendering use
    const snapshot = _frameCallbacks.slice();
    for (const cb of snapshot) {
      if (!cb.cancelled) {
        try {
          cb.fn(timestamp);
        } catch (err) {
          console.error('[clockScheduler] onTick error:', err);
        }
      }
    }
  }

  // ── Public API ──────────────────────────────────────────────────────

  const api = {

    // ── Scheduling ──

    /**
     * Schedule a function to run after `ms` virtual milliseconds in the
     * given speed group. Returns a handle usable with clearTimeout.
     */
    setTimeout(fn, ms, group = 'default') {
      const grp = _groupRef(group);
      const id = _idCounter++;
      _timeoutTasks.push({
        id,
        fn,
        group,
        fireAt: grp.virtualNow + ms,
        interval: 0,
        cancelled: false,
      });
      return id;
    },

    /**
     * Cancel a previously scheduled timeout or interval.
     */
    clearTimeout(id) {
      for (const task of _timeoutTasks) {
        if (task.id === id) {
          task.cancelled = true;
          return;
        }
      }
    },

    /**
     * Schedule a function to run every `ms` virtual milliseconds.
     * Returns a handle usable with clearInterval / clearTimeout.
     */
    setInterval(fn, ms, group = 'default') {
      const grp = _groupRef(group);
      const id = _idCounter++;
      _timeoutTasks.push({
        id,
        fn,
        group,
        fireAt: grp.virtualNow + ms,
        interval: ms,
        cancelled: false,
      });
      return id;
    },

    /**
     * Cancel a previously scheduled interval.
     */
    clearInterval(id) {
      api.clearTimeout(id);
    },

    /**
     * Register a per-frame callback. The callback receives the real
     * performance.now() timestamp every rAF frame, regardless of pause.
     * Returns a deregistration function.
     */
    onTick(fn) {
      const id = _frameCallbackIdCounter++;
      _frameCallbacks.push({ id, fn, cancelled: false });
      return function deregister() {
        for (const cb of _frameCallbacks) {
          if (cb.id === id) {
            cb.cancelled = true;
            return;
          }
        }
      };
    },

    /**
     * Return a Promise that resolves after `ms` virtual milliseconds in
     * the given group. Resolves immediately if the group is paused until
     * the group is resumed (the clock respects the group's virtual time).
     */
    wait(ms, group = 'default') {
      return new Promise((resolve) => {
        api.setTimeout(resolve, ms, group);
      });
    },

    // ── Control ──

    /**
     * Start the clock's rAF loop. Safe to call multiple times.
     */
    start() {
      if (_running) return;
      _running = true;
      _lastTime = 0;
      _rafId = requestAnimationFrame(_tick);
    },

    /**
     * Pause ALL speed groups. No timeout tasks fire and group virtual
     * clocks stop advancing until `resume()` is called.
     * Frame callbacks (onTick) continue to fire.
     */
    pause() {
      _masterPaused = true;
    },

    /**
     * Resume all groups after a master pause.
     */
    resume() {
      _masterPaused = false;
    },

    /**
     * Pause a single speed group. Tasks in other groups continue
     * normally.
     */
    pauseGroup(group) {
      const grp = _groupRef(group);
      grp.paused = true;
    },

    /**
     * Resume a single speed group.
     */
    resumeGroup(group) {
      const grp = _groupRef(group);
      grp.paused = false;
    },

    /**
     * Set the speed multiplier for a group.
     * 1.0 = normal, 2.0 = double speed, 0.5 = half speed.
     */
    setSpeed(group, multiplier) {
      const grp = _groupRef(group);
      grp.speed = multiplier;
    },

    /**
     * Get the current speed multiplier for a group.
     */
    getSpeed(group = 'default') {
      return _groupRef(group).speed;
    },

    // ── Queries ──

    /**
     * Return the current virtual time for a group.
     * Virtual time advances at `realDelta * speed` per frame when the
     * group is not paused.
     */
    now(group = 'default') {
      return _groupRef(group).virtualNow;
    },

    /**
     * Check if the clock is paused. If a group is specified, checks if
     * either the master pause or that specific group is paused.
     */
    isPaused(group) {
      if (group !== undefined) {
        return _masterPaused || _groupRef(group).paused;
      }
      return _masterPaused;
    },

    // ── Lifecycle ──

    /**
     * Full cleanup: stop the rAF loop, cancel all pending tasks, and
     * reset all group clocks. Call when restarting or destroying the game.
     */
    dispose() {
      _running = false;
      if (_rafId !== null) {
        cancelAnimationFrame(_rafId);
        _rafId = null;
      }
      _timeoutTasks = [];
      _frameCallbacks = [];
      _lastTime = 0;
      _masterPaused = false;
      for (const key of Object.keys(_groups)) {
        const g = _groups[key];
        g.paused = false;
        g.speed = 1;
        g.virtualNow = 0;
      }
    },
  };

  return api;
}

// ─── Global singleton ─────────────────────────────────────────────────

let _singleton = null;

/**
 * Get (or lazily create) the global clock singleton.
 * The clock is NOT started by default — call `start()` on it once the
 * game has initialized.
 */
export function getClock() {
  if (!_singleton) {
    _singleton = createClock();
  }
  return _singleton;
}
