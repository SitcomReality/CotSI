/**
 * timeBudget.js — Per-frame and per-phase time-budget computation for the
 * performance report.
 *
 * Layer: dev/ — depends on spanAnalysis.js.
 */

import { aggregateSpans, computeExclusiveSpanTimes } from './spanAnalysis.js';

/**
 * Compute per-frame time budget from per-frame measurement deltas.
 * Uses exclusive (self) times to avoid double-counting nested spans.
 *
 * @param {import('../frameProfiler.js').FrameEntry[]} frames
 * @param {number} avgFrameMs
 * @returns {{ items: Array<{ name: string, totalMs: number, exclusiveMs: number,
 *   perFrameMs: number, pctOfFrame: number, callCount: number,
 *   avgCall: number, maxCall: number }>, hasNesting: boolean,
 *   totalMeasuredMs: number, perFrameMeasuredMs: number,
 *   perFrameUnaccountedMs: number, pctUnaccounted: number }}
 */
export function computeTimeBudgetFromSpans(frames, avgFrameMs) {
  const spanAgg = aggregateSpans(frames);
  const exclusiveTimes = computeExclusiveSpanTimes(spanAgg);

  const items = [];
  let totalMeasured = 0;
  let hasNesting = false;

  // Exclude meta-spans that overlap with per-frame measurements
  // or are profiler overhead rather than game work.
  const _metaSpans = ['frameJs', 'recordFrame', 'frame:tick'];
  for (const [name, s] of Object.entries(spanAgg)) {
    if (_metaSpans.includes(name)) continue;
    const excl = exclusiveTimes[name];
    if (!excl) continue;

    if (excl.childNames.length > 0) hasNesting = true;
    totalMeasured += excl.exclusiveMs;
    const perFrameMs = frames.length > 0 ? excl.exclusiveMs / frames.length : 0;
    const pctOfFrame = avgFrameMs > 0 ? (perFrameMs / avgFrameMs) * 100 : 0;
    items.push({
      name,
      totalMs: s.totalMs,
      exclusiveMs: excl.exclusiveMs,
      perFrameMs,
      pctOfFrame,
      callCount: s.frameCallCount,
      avgCall: s.avgCall,
      maxCall: s.max,
    });
  }

  items.sort((a, b) => b.perFrameMs - a.perFrameMs);

  const perFrameMeasured = frames.length > 0 ? totalMeasured / frames.length : 0;
  const perFrameUnaccounted = Math.max(0, avgFrameMs - perFrameMeasured);

  return {
    items,
    hasNesting,
    totalMeasuredMs: totalMeasured,
    perFrameMeasuredMs: perFrameMeasured,
    perFrameUnaccountedMs: perFrameUnaccounted,
    pctUnaccounted: avgFrameMs > 0 ? (perFrameUnaccounted / avgFrameMs) * 100 : 0,
  };
}

/**
 * Compute time budget broken down by game phase (context.phase).
 * Groups frames by phase, then computes the per-phase budget the same
 * way computeTimeBudgetFromSpans works for the aggregate.
 *
 * @param {import('../frameProfiler.js').FrameEntry[]} frames
 * @returns {Array<{ phase: string, frameCount: number, avgFrameMs: number,
 *   pctUnaccounted: number, perFrameUnaccountedMs: number }>}
 */
export function computeTimeBudgetByPhase(frames) {
  const byPhase = {};
  for (const entry of frames) {
    const phase = entry.context?.phase || 'unknown';
    if (!byPhase[phase]) byPhase[phase] = [];
    byPhase[phase].push(entry);
  }

  const results = [];
  for (const [phase, phaseFrames] of Object.entries(byPhase)) {
    const ftValues = phaseFrames.map(e => e.frameTime).filter(v => v > 0);
    if (ftValues.length === 0) continue;
    const avgMs = ftValues.reduce((s, v) => s + v, 0) / ftValues.length;
    const budget = computeTimeBudgetFromSpans(phaseFrames, avgMs);
    results.push({
      phase,
      frameCount: phaseFrames.length,
      avgFrameMs: avgMs,
      pctUnaccounted: budget.pctUnaccounted,
      perFrameUnaccountedMs: budget.perFrameUnaccountedMs,
    });
  }

  // Sort by unaccounted percentage descending
  results.sort((a, b) => b.pctUnaccounted - a.pctUnaccounted);
  return results;
}
