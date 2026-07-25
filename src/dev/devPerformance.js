/**
 * devPerformance.js — Barrel re-export.
 *
 * This file is kept as a thin pass-through for backward compatibility.
 * All implementation now lives in src/dev/performance/.
 */
export {
  startMeasure,
  endMeasure,
  setMeasurementEnabled,
  getMeasurementStats,
  enableAllMeasurements,
  getFps,
  getLastFrameTime,
  ensureFrameTracking,
  setOverlayEnabled,
  getSnapshot,
  startCapture,
  stopCapture,
  getCaptureReport,
  isCaptureActive,
  disposePerformance,
} from './performance/index.js';
