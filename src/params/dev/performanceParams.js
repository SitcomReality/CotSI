/**
 * performanceParams.js — Performance profiling thresholds, frame-rate targets, and buffer parameters.
 */

/** Target frames per second. */
export const TARGET_FPS = 60;
/** Number of frames sampled for smoothing FPS calculation. */
export const FPS_SAMPLE_WINDOW = 30;
/** Maximum frames for recording ring buffer (5 min @ 60fps). */
export const CAPTURE_MAX_FRAMES = 18000;
/** Ring buffer trim tolerance (allow buffer to exceed limit by this many before truncation). */
export const BUFFER_TRIM_TOLERANCE = 100;
/** FPS history max (FPS_SAMPLE_WINDOW * 2). */
export const FPS_HISTORY_MAX = 60;

/** EMA (Exponential Moving Average) alpha smoothing factor. */
export const EMA_ALPHA = 0.3;

/** Number of slowest measurements shown in overlay. */
export const OVERLAY_TOP_N = 5;

/** Good frame threshold: target frame time + margin (ms). */
export const FRAME_GOOD_MARGIN_MS = 2;
/** Bad frame threshold: missed 30fps threshold (ms). */
export const FRAME_BAD_THRESHOLD_MS = 33.3;
/** Hitch threshold: visibly stuttery frame (ms). */
export const FRAME_HITCH_THRESHOLD_MS = 50;
/** Major hitch threshold: freeze-level frame (ms). */
export const FRAME_MAJOR_HITCH_THRESHOLD_MS = 100;

/** Slow-frame clustering: contiguous non-slow frames allowed before breaking cluster. */
export const CLUSTER_SKIP_TOLERANCE = 2;
/** Slow-frame clustering: minimum slow frames to form a cluster. */
export const CLUSTER_MIN_SIZE = 2;
/** Number of worst frames to report. */
export const WORST_FRAMES_COUNT = 5;
/** Minimum span duration (ms) for worst-frame drill-down filter. */
export const SPAN_FILTER_MIN_MS = 0.1;

/** Memory near-limit warning threshold (fraction of limitMB). */
export const MEM_WARN_NEAR_LIMIT_RATIO = 0.9;
/** Persistent high-memory warning threshold (fraction of limitMB). */
export const MEM_WARN_HIGH_AVG_RATIO = 0.8;
/** High allocation rate warning minimum (MB/frame). */
export const ALLOC_RATE_WARN_MB = 1;
/** JS invisible overhead warning minimum ratio. */
export const JS_OVERHEAD_WARN_RATIO = 0.5;
/** Higher JS overhead warning with hitching ratio. */
export const JS_OVERHEAD_HIGH_WARN_RATIO = 0.7;
/** Unaccounted frame time warning minimum (percentage). */
export const UNACCOUNTED_FRAME_WARN_PCT = 70;
/** Variance ratio warning minimum call count. */
export const VARIANCE_WARN_MIN_CALLS = 5;
/** Variance ratio warning: max > avgCall * multiplier. */
export const VARIANCE_WARN_RATIO_MULTIPLIER = 5;

/** Performance stats UI refresh poll interval (ms). */
export const PERF_POLL_INTERVAL_MS = 500;
