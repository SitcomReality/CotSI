/**
 * snapshot.js — Performance data formatting and capture.
 *
 * Provides getSnapshot() for a one-shot instant capture of all active
 * measurements. Designed as the home for future enhanced capture APIs
 * such as startCapture() / stopCapture() / getCaptureReport() for
 * continuous performance logging over time.
 *
 * Layer: dev/ — depends on measurements and frameTracker.
 */

import { getFps, getLastFrameTime } from './frameTracker.js';
import { getRawMeasurements } from './measurements.js';

/**
 * Get a formatted performance snapshot string suitable for copy-paste.
 * Includes FPS, last frame time, and all named measurements (avg, EMA, count, total).
 * @returns {string}
 */
export function getSnapshot() {
  const fps = getFps();
  const frame = getLastFrameTime();
  const _measurements = getRawMeasurements();

  let s = `=== Performance Snapshot ===\n`;
  s += `FPS: ${fps.toFixed(1)}  Frame: ${frame.toFixed(1)}ms\n\n`;

  const entries = Object.entries(_measurements)
    .filter(([, m]) => m.enabled && m.count > 0)
    .map(([name, m]) => ({
      name,
      avg: m.total / m.count,
      ema: m.ema ?? 0,
      count: m.count,
      total: m.total,
    }));

  if (entries.length > 0) {
    const namePad = Math.max(...entries.map(e => e.name.length)) + 2;
    for (const e of entries) {
      const name = e.name.padEnd(namePad);
      const avgS = `avg=${e.avg.toFixed(2)}ms`.padEnd(14);
      const emaS = `ema=${e.ema.toFixed(2)}ms`.padEnd(14);
      const cntS = `count=${e.count}`.padEnd(10);
      s += `${name}${avgS}${emaS}${cntS}total=${e.total.toFixed(1)}ms\n`;
    }
  }

  s += `\n=== End Snapshot ===`;
  return s;
}

// ─── Future capture API placeholder ────────────────────────────────────────
// The following interface is reserved for the comprehensive performance
// capture feature mentioned in the dev tools roadmap:
//
//   export function startCapture(durationMs) { ... }
//   export function stopCapture() { ... }
//   export function getCaptureReport() { ... }
//
// startCapture() would collect periodic snapshots and aggregate metrics
// over an interval. stopCapture() returns a full log. getCaptureReport()
// returns the last completed report without stopping a running capture.
