/**
 * timeBudget.js — Per-frame and per-phase time-budget computation for the
 * performance report.
 *
 * Layer: dev/ — depends on spanAnalysis.js.
 */

import { aggregateSpans, computeExclusiveSpanTimes, sumMeasuredExclusiveMs, META_SPANS } from './spanAnalysis.js';

/**
 * Compute per-frame time budget from per-frame measurement deltas.
 * Uses exclusive (self) times to avoid double-counting nested spans.
 *
 * Each item reports two different numbers, because they answer different
 * questions:
 * - `perFrameMs` amortizes the span's total exclusive time across every frame
 *   in the capture (its average contribution to the frame budget).
 * - `perOccurrenceMs` is the average cost of a frame in which the span ran.
 * A rare but expensive span has a small `perFrameMs` and a large
 * `perOccurrenceMs`.
 *
 * The unaccounted remainder is split into JS that ran inside the tick but
 * was not covered by any span (`perFrameUntimedJsMs`) and time outside the
 * JS tick entirely — GPU, paint, GC, idle (`perFrameOutsideJsMs`).
 *
 * @param {import('../frameProfiler.js').FrameEntry[]} frames
 * @param {number} avgFrameMs
 * @returns {{ items: Array<{ name: string, totalMs: number, exclusiveMs: number,
 *   perFrameMs: number, perOccurrenceMs: number, occurrences: number,
 *   pctOfFrame: number, callCount: number, totalCount: number,
 *   avgCall: number, maxCall: number }>, hasNesting: boolean,
 *   totalMeasuredMs: number, perFrameMeasuredMs: number,
 *   perFrameUnaccountedMs: number, pctUnaccounted: number,
 *   frameJsAvgPerFrame: number, perFrameUntimedJsMs: number,
 *   perFrameOutsideJsMs: number, pctUntimedJs: number, pctOutsideJs: number }}
 */
export function computeTimeBudgetFromSpans(frames, avgFrameMs) {
  const spanAgg = aggregateSpans(frames);
  const exclusiveTimes = computeExclusiveSpanTimes(spanAgg);
  const { totalMs: totalMeasured, hasNesting } = sumMeasuredExclusiveMs(spanAgg, exclusiveTimes);

  const frameCount = frames.length;
  const items = [];

  for (const [name, s] of Object.entries(spanAgg)) {
    if (META_SPANS.includes(name)) continue;
    const excl = exclusiveTimes[name];
    if (!excl) continue;

    const perFrameMs = frameCount > 0 ? excl.exclusiveMs / frameCount : 0;
    const pctOfFrame = avgFrameMs > 0 ? (perFrameMs / avgFrameMs) * 100 : 0;
    items.push({
      name,
      totalMs: s.totalMs,
      exclusiveMs: excl.exclusiveMs,
      perFrameMs,
      perOccurrenceMs: s.frameCallCount > 0 ? excl.exclusiveMs / s.frameCallCount : 0,
      occurrences: s.frameCallCount,
      pctOfFrame,
      callCount: s.frameCallCount,
      totalCount: s.totalCount,
      avgCall: s.avgCall,
      maxCall: s.max,
    });
  }

  items.sort((a, b) => b.perFrameMs - a.perFrameMs);

  const perFrameMeasured = frameCount > 0 ? totalMeasured / frameCount : 0;
  const perFrameUnaccounted = Math.max(0, avgFrameMs - perFrameMeasured);

  const frameJsSpan = spanAgg['frameJs'];
  const frameJsAvgPerFrame = frameJsSpan && frameJsSpan.frameCallCount > 0
    ? frameJsSpan.totalMs / frameJsSpan.frameCallCount
    : 0;
  const perFrameUntimedJs = Math.max(
    0,
    Math.min(perFrameUnaccounted, frameJsAvgPerFrame - perFrameMeasured)
  );
  const perFrameOutsideJs = Math.max(0, perFrameUnaccounted - perFrameUntimedJs);

  const pct = (v) => (avgFrameMs > 0 ? (v / avgFrameMs) * 100 : 0);

  return {
    items,
    hasNesting,
    totalMeasuredMs: totalMeasured,
    perFrameMeasuredMs: perFrameMeasured,
    perFrameUnaccountedMs: perFrameUnaccounted,
    pctUnaccounted: pct(perFrameUnaccounted),
    frameJsAvgPerFrame,
    perFrameUntimedJsMs: perFrameUntimedJs,
    perFrameOutsideJsMs: perFrameOutsideJs,
    pctUntimedJs: pct(perFrameUntimedJs),
    pctOutsideJs: pct(perFrameOutsideJs),
  };
}

/**
 * Compute time budget broken down by game phase (context.phase).
 * Groups frames by phase, then computes the per-phase budget the same
 * way computeTimeBudgetFromSpans works for the aggregate.
 *
 * @param {import('../frameProfiler.js').FrameEntry[]} frames
 * @returns {Array<{ phase: string, frameCount: number, avgFrameMs: number,
 *   pctUnaccounted: number, perFrameUnaccountedMs: number,
 *   pctUntimedJs: number, pctOutsideJs: number }>}
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
      pctUntimedJs: budget.pctUntimedJs,
      pctOutsideJs: budget.pctOutsideJs,
    });
  }

  // Sort by unaccounted percentage descending
  results.sort((a, b) => b.pctUnaccounted - a.pctUnaccounted);
  return results;
}
