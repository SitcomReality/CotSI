/**
 * reportFormatter.js — Formatted string rendering of a CaptureReport.
 *
 * Layer: dev/ — depends on frameThresholds.js and worstFrames.js.
 */

import { WORST_FRAMES_COUNT } from '../../../params/devtools/performanceParams.js';
import { GOOD_THRESHOLD, BAD_THRESHOLD, HITCH_THRESHOLD, MAJOR_HITCH_THRESHOLD, round1, round2 } from './frameThresholds.js';
import { buildWorstFrames } from './worstFrames.js';

/**
 * Build the formatted string version of a report — summary-first, no raw timeline.
 * @param {import('../reportBuilder.js').CaptureReport} report
 * @returns {string}
 */
export function formatReport(report) {
  const { interval, summary, spanStats, contextBreakdown, ctxSlowSummary,
    slowClusters, timeBudget, phaseBudget, worstSpan, longTasks, warnings,
    jsOverhead, heapDeltaStats } = report;

  let s = `=== Performance Capture Report ===\n`;
  s += `Duration: ${round1(interval.durationMs / 1000)}s  Frames: ${interval.pollCount}\n`;

  // ── Summary ──
  s += `\n─── Summary ───\n`;
  if (summary.frameTime) {
    const ft = summary.frameTime;
    s += `Frame:  median=${round1(ft.median)}ms  avg=${round1(ft.avg)}ms  `;
    s += `p95=${round1(ft.p95)}ms  p99=${round1(ft.p99)}ms  max=${round1(ft.max)}ms\n`;

    const b = ft.buckets;
    s += `        good≤${round1(GOOD_THRESHOLD)}ms:${b.good}  `;
    s += `missed:${b.missed60}  bad>${round1(BAD_THRESHOLD)}ms:${b.bad}  `;
    s += `hitch>${round1(HITCH_THRESHOLD)}ms:${b.hitch}  major>${round1(MAJOR_HITCH_THRESHOLD)}ms:${b.majorHitch}\n`;
  }

  if (summary.fps) {
    const f = summary.fps;
    s += `FPS:    avg=${round1(f.avg)}  min=${round1(f.min)}  `;
    if (f.low1Pct > 0) s += `1% low=${round1(f.low1Pct)}  `;
    if (f.low01Pct > 0) s += `0.1% low=${round1(f.low01Pct)}  `;
    s += `max=${round1(f.max)}\n`;
  }

  if (summary.memory) {
    const m = summary.memory;
    s += `Memory: avg=${round1(m.avgHeap)}MB  max=${round1(m.maxHeap)}MB`;
    if (m.limitMB != null) s += `  limit=${round1(m.limitMB)}MB`;
    if (heapDeltaStats) {
      s += `  alloc=${round2(heapDeltaStats.avgMB)}MB/frame`;
    }
    s += '\n';
  }

  // JS invisible-overhead line
  if (jsOverhead) {
    s += `JS ovh: avg=${round2(jsOverhead.invisibleAvgPerFrame)}ms/frame (${round1(jsOverhead.invisibleRatio * 100)}% untimed)\n`;
  }

  // Surface the span with the worst max value as a one-liner
  if (worstSpan) {
    s += `Worst span: ${worstSpan.name} (max=${round1(worstSpan.max)}ms)\n`;
  }

  // ── Slow frames by context ──
  const ctxNames = Object.keys(ctxSlowSummary).sort();
  if (ctxNames.length > 0) {
    s += `\n─── Slow Frames by Context ───\n`;
    for (const phase of ctxNames) {
      const cs = ctxSlowSummary[phase];
      s += `  ${phase.padEnd(14)} ${cs.slow} slow, ${cs.hitches} hitches, worst=${round1(cs.worst)}ms\n`;
    }
  }

  // ── Slow clusters ──
  if (slowClusters.length > 0) {
    s += `\n─── Slow Clusters (${slowClusters.length}) ───\n`;
    for (let i = 0; i < slowClusters.length; i++) {
      const c = slowClusters[i];
      s += `  Cluster ${i + 1}: ${c.count} frames >${round1(BAD_THRESHOLD)}ms, worst=${round1(c.worstMs)}ms\n`;
      s += `    context: ${c.context}\n`;
    }
    s += '\n';
  }

  // ── Worst Frames Drill-Down ──
  const worstFrames = buildWorstFrames(report.timeline, WORST_FRAMES_COUNT);
  s += `\n─── Worst ${WORST_FRAMES_COUNT} Frames by frameTime ───\n`;
  if (worstFrames.length > 0) {
    for (const wf of worstFrames) {
      s += `  Frame #${wf.frameIndex}: ${round1(wf.frameTime)}ms  context: ${wf.context}\n`;
      for (const sp of wf.spans) {
        s += `    ${sp.name.padEnd(14)} ${round2(sp.ms).padStart(7)}ms  (${sp.count} calls)\n`;
      }
    }
  } else {
    s += `  (none — no frame time data)\n`;
  }

  // ── Measured spans (from per-frame deltas) ──
  const spanNames = Object.keys(spanStats).sort();
  if (spanNames.length > 0) {
    const namePad = Math.max(...spanNames.map(n => n.length), 10) + 1;
    s += `─── Measured Spans ───\n`;
    for (const name of spanNames) {
      const sp = spanStats[name];
      const pad = name.padEnd(namePad);
      const callsS = `calls=${sp.frameCallCount}`.padEnd(12);
      const totalS = `total=${round2(sp.totalMs)}ms`.padEnd(14);
      const avgS = `avg=${round2(sp.avgCall)}ms`.padEnd(12);
      const maxS = `max=${round2(sp.max)}ms`.padEnd(12);
      s += `  ${pad}${callsS}${totalS}${avgS}${maxS}\n`;
    }
  }

  // ── Time budget ──
  if (timeBudget && timeBudget.items.length > 0) {
    s += `\n─── Time Budget${timeBudget.hasNesting ? ' (exclusive times)' : ''} ───\n`;
    if (timeBudget.hasNesting) {
      s += `  (nested spans shown as self-time — children subtracted from parents)\n`;
    }
    for (const item of timeBudget.items) {
      const costMs = `cost=${round2(item.perFrameMs)}ms`.padEnd(16);
      const pct = `${round1(item.pctOfFrame)}%`.padEnd(8);
      s += `  ${item.name.padEnd(16)} ${costMs} ${pct} of frame`;
      if (item.avgCall > 0) s += `  avg=${round2(item.avgCall)}ms/call`;
      s += '\n';
    }
    s += `  ${'unaccounted'.padEnd(16)} cost=${round2(timeBudget.perFrameUnaccountedMs)}ms  ${round1(timeBudget.pctUnaccounted)}% of frame\n`;
  }

  // ── Per-phase time budget ──
  if (phaseBudget && phaseBudget.length > 1) {
    s += `\n─── Per-Phase Time Budget ───\n`;
    for (const pb of phaseBudget) {
      s += `  ${pb.phase.padEnd(14)} avg=${round1(pb.avgFrameMs)}ms  `;
      s += `unaccounted=${round1(pb.pctUnaccounted)}%  `;
      s += `(${pb.frameCount} frames)\n`;
    }
  }

  // ── Long tasks ──
  s += `\n─── Long Tasks ───\n`;
  if (longTasks && longTasks.count > 0) {
    s += `  Total duration: ${round1(longTasks.totalDuration)}ms\n`;
    for (const t of longTasks.tasks) {
      s += `  - ${t.name}: ${round1(t.duration)}ms at t=${round1(t.startTime)}\n`;
    }
  } else {
    s += `  none detected\n`;
  }

  // ── Warnings ──
  if (warnings.length > 0) {
    s += `\n─── Warnings (${warnings.length}) ───\n`;
    for (const w of warnings) {
      s += `  - ${w}\n`;
    }
  }

  s += `\n=== End Report ===`;
  return s;
}
