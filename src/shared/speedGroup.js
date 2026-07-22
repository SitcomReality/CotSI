/**
 * speedGroup.js — Speed group state and operations for the clock scheduler.
 *
 * Manages named speed groups, each with its own paused flag, speed
 * multiplier, and virtual clock. Used exclusively by clockScheduler.js.
 *
 * Layer: shared/ — imports nothing project-local.
 */

// ─── Factory ────────────────────────────────────────────────────────────

export function createGroups() {
  return {
    default:   { paused: false, speed: 1, virtualNow: 0 },
    bot:       { paused: false, speed: 1, virtualNow: 0 },
    combat:    { paused: false, speed: 1, virtualNow: 0 },
    animation: { paused: false, speed: 1, virtualNow: 0 },
    ui:        { paused: false, speed: 1, virtualNow: 0 },
  };
}

// ─── Internal helpers ───────────────────────────────────────────────────

function groupRef(groups, name) {
  if (!groups[name]) {
    groups[name] = { paused: false, speed: 1, virtualNow: 0 };
  }
  return groups[name];
}

// ─── Per-group operations ───────────────────────────────────────────────

export function pauseGroup(groups, name) {
  groupRef(groups, name).paused = true;
}

export function resumeGroup(groups, name) {
  groupRef(groups, name).paused = false;
}

export function setSpeed(groups, name, multiplier) {
  groupRef(groups, name).speed = multiplier;
}

export function getSpeed(groups, name) {
  return groupRef(groups, name).speed;
}

// ─── All-group operations ───────────────────────────────────────────────

export function pause(groups) {
  for (const key of Object.keys(groups)) {
    groups[key].paused = true;
  }
}

export function resume(groups) {
  for (const key of Object.keys(groups)) {
    groups[key].paused = false;
  }
}

// ─── Queries ────────────────────────────────────────────────────────────

export function now(groups, name) {
  return groupRef(groups, name).virtualNow;
}

export function isPaused(groups, name) {
  if (name !== undefined) {
    return groupRef(groups, name).paused;
  }
  for (const key of Object.keys(groups)) {
    if (groups[key].paused) return true;
  }
  return false;
}

// ─── Tick support ───────────────────────────────────────────────────────

export function advanceGroup(groups, name, realDelta) {
  const g = groupRef(groups, name);
  if (!g.paused) {
    g.virtualNow += realDelta * g.speed;
  }
}
