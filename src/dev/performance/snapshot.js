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

// ─── Continuous capture API ─────────────────────────────────────────────────
// Re-exported from captureLogger.js. See that module for implementation.
//
//   startCapture({ durationMs, intervalMs, keepTimeline }) — begin a capture
//   stopCapture() — stop active capture and return report
//   getCaptureReport() — retrieve last completed report
//   isCaptureActive() — check if a capture is in progress

export {
  startCapture,
  stopCapture,
  getCaptureReport,
  isCaptureActive,
} from './captureLogger.js';
