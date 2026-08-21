/**
 * worstFrames.js — Worst-frame drill-down for the performance report.
 *
 * Layer: dev/ — depends on performanceParams only.
 */

import { WORST_FRAMES_COUNT, SPAN_FILTER_MIN_MS } from '../../../params/devtools/performanceParams.js';

/**
 * Find the N worst frames by frameTime and return their span breakdown.
 * Used in the formatted report to show what caused the biggest spikes.
 *
 * @param {import('../frameProfiler.js').FrameEntry[]} frames
 * @param {number} [n=5]
 * @returns {Array<{ frameIndex: number, frameTime: number, context: string, spans: Array<{ name: string, ms: number, count: number }> }>}
 */
export function buildWorstFrames(frames, n = WORST_FRAMES_COUNT) {
  const indexed = frames
    .map((entry, i) => ({ index: i, entry }))
    .filter(({ entry }) => entry.frameTime > 0)
    .sort((a, b) => b.entry.frameTime - a.entry.frameTime)
    .slice(0, n);

  return indexed.map(({ index, entry }) => {
    // Collect non-trivial spans for this frame
    const spans = (entry.spans || [])
      .filter(s => s.ms > SPAN_FILTER_MIN_MS)
      .sort((a, b) => b.ms - a.ms);
    return {
      frameIndex: index,
      frameTime: entry.frameTime,
      context: entry.context
        ? `${entry.context.phase || 'unknown'}${entry.context.championName ? ' ' + entry.context.championName : ''}${entry.context.action ? ' (' + entry.context.action + ')' : ''}`
        : 'unknown',
      spans,
    };
  });
}
