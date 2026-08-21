/**
 * spanAnalysis.js — Per-measurement span aggregation, exclusive-time
 * computation, and JS invisible-overhead analysis for the performance report.
 *
 * Layer: dev/ — depends on stats.js.
 */

import { computeStats } from '../stats.js';

/**
 * Aggregate per-frame span data across the timeline.
 * Uses the `spans` array on each frame entry.
 *
 * @param {import('../frameProfiler.js').FrameEntry[]} frames
 */
export function aggregateSpans(frames) {
  const spanByName = {};

  for (const entry of frames) {
    if (!entry.spans) continue;
    for (const span of entry.spans) {
      if (!spanByName[span.name]) {
        spanByName[span.name] = { totalMs: 0, totalCount: 0, callCount: 0, durations: [] };
      }
      const acc = spanByName[span.name];
      acc.totalMs += span.ms;
      acc.totalCount += span.count;
      acc.callCount++;
      acc.durations.push(span.ms);
    }
  }

  const results = {};
  for (const [name, acc] of Object.entries(spanByName)) {
    const stats = computeStats(acc.durations);
    results[name] = {
      totalMs: acc.totalMs,
      totalCount: acc.totalCount,
      frameCallCount: acc.callCount,
      avgCall: acc.callCount > 0 ? acc.totalMs / acc.callCount : 0,
      min: stats ? stats.min : 0,
      max: stats ? stats.max : 0,
      median: stats ? stats.median : 0,
      p95: stats ? stats.p95 : 0,
    };
  }

  return results;
}

/**
 * Detect parent-child nesting among spans and compute exclusive (self) time
 * for each. Uses two strategies:
 *
 * 1. Naming convention: if span "foo" and span "foo:bar" share the same
 *    frameCallCount, "foo:bar" is a child of "foo".
 * 2. Known-parents table: explicit relationships not covered by naming
 *    (e.g., refreshAll → mapRefresh).
 *
 * @param {Object<string, { totalMs: number, frameCallCount: number }>} spanStats
 * @returns {Object<string, { exclusiveMs: number, childNames: string[] }>}
 */
export function computeExclusiveSpanTimes(spanStats) {
  // Known parent-child relationships not covered by naming convention
  const _KNOWN_PARENTS = {
    'refreshAll': ['mapRefresh', 'dom:header', 'dom:leftPanel', 'dom:rightPanel'],
    'mapRefresh': ['renderHexMap'],
    'renderHexMap': ['mesh:chunks', 'mesh:units'],
  };

  // Initialise every span as its own exclusive leaf
  /** @type {Object<string, { childNames: string[], exclusiveMs: number }>} */
  const exclusive = {};
  for (const name of Object.keys(spanStats)) {
    exclusive[name] = { childNames: [], exclusiveMs: spanStats[name].totalMs };
  }

  // Phase 1: naming convention — 'overlays' / 'overlay:fogOverlay'
  for (const [name, s] of Object.entries(spanStats)) {
    const prefix = name + ':';
    if (name.includes(':')) continue; // children never become parents via naming

    for (const [childName, cs] of Object.entries(spanStats)) {
      if (
        childName !== name &&
        childName.startsWith(prefix) &&
        s.frameCallCount === cs.frameCallCount
      ) {
        exclusive[name].childNames.push(childName);
      }
    }
  }

  // Phase 2: known-parents table
  for (const [parent, children] of Object.entries(_KNOWN_PARENTS)) {
    if (!spanStats[parent]) continue;
    for (const child of children) {
      if (
        spanStats[child] &&
        !exclusive[parent].childNames.includes(child)
      ) {
        exclusive[parent].childNames.push(child);
      }
    }
  }

  // Compute exclusive times bottom-up (children before parents).
  // A depth-first post-order walk ensures that when we subtract a child's
  // inclusive total, the child's own children have already been subtracted.
  const visited = new Set();

  function computeExclusive(name) {
    if (visited.has(name)) return exclusive[name].exclusiveMs;
    if (exclusive[name].childNames.length === 0) return exclusive[name].exclusiveMs;

    visited.add(name);
    let childrenTotal = 0;
    for (const cname of exclusive[name].childNames) {
      if (!spanStats[cname]) continue;
      const childExcl = computeExclusive(cname);
      // The child's inclusive total is what the parent includes.
      // We use the parent's raw total minus children's raw totals so that
      // children who are themselves parents have already had their own
      // children subtracted.
      childrenTotal += spanStats[cname].totalMs;
    }
    exclusive[name].exclusiveMs = Math.max(0, spanStats[name].totalMs - childrenTotal);
    return exclusive[name].exclusiveMs;
  }

  for (const name of Object.keys(exclusive)) {
    computeExclusive(name);
  }

  return exclusive;
}

/**
 * Compute the proportion of JS tick time that is not accounted for by any
 * named measurement. Uses frameJs (total tick time) vs the sum of exclusive
 * times of every other per-frame measurement.
 *
 * @param {Object<string, { totalMs: number, frameCallCount: number }>} spanStats
 * @param {Object<string, { exclusiveMs: number }>} exclusiveTimes
 * @returns {{ frameJsTotalMs: number, frameJsCalls: number,
 *   frameJsAvgPerFrame: number, measuredAvgPerFrame: number,
 *   invisibleAvgPerFrame: number, invisibleRatio: number }|null}
 */
export function computeJsOverhead(spanStats, exclusiveTimes) {
  const frameJs = spanStats['frameJs'];
  if (!frameJs || frameJs.frameCallCount === 0) return null;

  const tickCallCount = frameJs.frameCallCount;
  let totalMeasured = 0;

  // Sum exclusive times of all spans that run on every tick (same call count
  // as frameJs). This avoids double-counting and only includes work that
  // happens inside the tick.
  for (const [name, s] of Object.entries(spanStats)) {
    if (name === 'frameJs') continue;
    if (s.frameCallCount === tickCallCount) {
      const excl = exclusiveTimes[name];
      if (excl) totalMeasured += excl.exclusiveMs;
    }
  }

  // recordFrame is meta-overhead that lands inside the tick but after frameJs
  // is captured — don't count it in measured work.
  if (exclusiveTimes['recordFrame']) {
    totalMeasured -= exclusiveTimes['recordFrame'].exclusiveMs;
  }

  const frameJsAvg = frameJs.totalMs / frameJs.frameCallCount;
  const measuredAvg = totalMeasured / tickCallCount;
  const invisibleAvg = Math.max(0, frameJsAvg - measuredAvg);
  const invisibleRatio = frameJsAvg > 0 ? invisibleAvg / frameJsAvg : 0;

  return {
    frameJsTotalMs: frameJs.totalMs,
    frameJsCalls: frameJs.frameCallCount,
    frameJsAvgPerFrame: frameJsAvg,
    measuredAvgPerFrame: measuredAvg,
    invisibleAvgPerFrame: invisibleAvg,
    invisibleRatio,
  };
}
