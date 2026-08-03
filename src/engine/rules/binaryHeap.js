/**
 * binaryHeap.js — Minimal min-binary-heap priority queue.
 *
 * Duplicate-entry friendly: callers may push the same key multiple times with
 * improving priorities. pop() returns entries in ascending priority order;
 * stale (superseded) entries are detected by comparing the popped priority
 * against the caller's current best-known value.
 *
 * Lower priority pops first.
 */

/**
 * Create a min-heap over { key, priority } entries.
 * @returns {{ size: number, isEmpty: () => boolean, push: (key: *, priority: number) => void, pop: () => ({ key: *, priority: number }|undefined) }}
 */
export function createMinHeap() {
  const items = [];
  return {
    get size() {
      return items.length;
    },
    isEmpty() {
      return items.length === 0;
    },
    /** Push an entry; lower priority pops first. */
    push(key, priority) {
      items.push({ key, priority });
      siftUp(items);
    },
    /** Pop the lowest-priority entry, or undefined when empty. */
    pop() {
      const top = items[0];
      const last = items.pop();
      if (items.length > 0) {
        items[0] = last;
        siftDown(items);
      }
      return top;
    },
  };
}

/** Bubble the last element up to restore heap order. */
function siftUp(items) {
  let i = items.length - 1;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (items[parent].priority <= items[i].priority) break;
    swap(items, parent, i);
    i = parent;
  }
}

/** Sink the root element down to restore heap order. */
function siftDown(items) {
  const n = items.length;
  let i = 0;
  while (true) {
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    let smallest = i;
    if (left < n && items[left].priority < items[smallest].priority) smallest = left;
    if (right < n && items[right].priority < items[smallest].priority) smallest = right;
    if (smallest === i) break;
    swap(items, i, smallest);
    i = smallest;
  }
}

function swap(items, a, b) {
  const tmp = items[a];
  items[a] = items[b];
  items[b] = tmp;
}
