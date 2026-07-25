/**
 * performance/index.js — Barrel re-export for dev performance tools.
 *
 * Exposes the same public API that was previously in devPerformance.js,
 * now split across focused submodules. New exports from the refactored
 * capture system are also exposed here.
 */
export { startMeasure, endMeasure, setMeasurementEnabled, getMeasurementStats, enableAllMeasurements, disposeMeasurements } from './measurements.js';
export { getFps, getLastFrameTime, ensureFrameTracking, disposeFrameTracker, onFrame, getFrameHistory } from './frameTracker.js';
export { setOverlayEnabled, disposeOverlay, isOverlayEnabled } from './overlay.js';
export { getSnapshot } from './snapshot.js';
export { startCapture, stopCapture, getCaptureReport, isCaptureActive } from './captureLogger.js';
export { setGameContext, getGameContext, clearGameContext } from './gameContext.js';

// Composite cleanup for backward compatibility
import { disposeMeasurements } from './measurements.js';
import { disposeFrameTracker } from './frameTracker.js';
import { disposeOverlay } from './overlay.js';

export function disposePerformance() {
  disposeMeasurements();
  disposeFrameTracker();
  disposeOverlay();
}
