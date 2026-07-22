/**
 * timerQueue.js — Priority queue of timeout/interval tasks for the clock
 * scheduler.
 *
 * Tasks are stored as an unsorted array; sorting happens lazily inside
 * popExpired() before expiry dispatch. Each task carries its group name
 * so expiry can be checked against that group's virtual clock.
 *
 * Layer: shared/ — imports nothing project-local.
 */

// ─── Task factory ───────────────────────────────────────────────────────

export function createTask(id, fn, fireAt, interval, group) {
  return { id, fn, group, fireAt, interval, cancelled: false };
}

// ─── Queue operations ───────────────────────────────────────────────────

export function addTask(tasks, task) {
  tasks.push(task);
}

export function removeTask(tasks, id) {
  for (const task of tasks) {
    if (task.id === id) {
      task.cancelled = true;
      return;
    }
  }
}

/**
 * Return all tasks whose fireAt has passed their group's virtual clock.
 * Sorts the task list first to preserve chronological processing order.
 * Mutates `tasks` in place, leaving only non-expired entries.
 */
export function popExpired(tasks, groups) {
  tasks.sort((a, b) => a.fireAt - b.fireAt);
  const due = [];
  const remaining = [];
  for (const task of tasks) {
    if (task.cancelled) continue;
    const g = groups[task.group];
    if (g && g.virtualNow >= task.fireAt) {
      due.push(task);
    } else {
      remaining.push(task);
    }
  }
  tasks.length = 0;
  for (const t of remaining) tasks.push(t);
  return due;
}

/**
 * If the task has a positive interval, return a new task for the next
 * cycle with fireAt advanced by one interval. Returns null for
 * one-shot timeouts.
 */
export function reschedule(task) {
  if (task.interval > 0) {
    return createTask(
      task.id,
      task.fn,
      task.fireAt + task.interval,
      task.interval,
      task.group,
    );
  }
  return null;
}
