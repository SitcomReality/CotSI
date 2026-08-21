/**
 * slowClusters.js — Group adjacent slow frames into clusters for the
 * performance report.
 *
 * Layer: dev/ — depends on frameThresholds and performanceParams.
 */

import { CLUSTER_SKIP_TOLERANCE, CLUSTER_MIN_SIZE } from '../../../params/devtools/performanceParams.js';
import { BAD_THRESHOLD, contextLabel } from './frameThresholds.js';

/**
 * Group adjacent slow frames into clusters. A cluster tolerates up to 2
 * consecutive non-slow frames before breaking.
 *
 * @param {import('../frameProfiler.js').FrameEntry[]} frames
 * @returns {Array<{ startTs: number, endTs: number, count: number,
 *   worstMs: number, worstEntry: FrameEntry, context: string,
 *   entries: FrameEntry[] }>}
 */
export function buildSlowClusters(frames) {
  const clusters = [];
  let current = null;

  for (let i = 0; i < frames.length; i++) {
    const entry = frames[i];
    const isSlow = entry.frameTime > BAD_THRESHOLD;

    if (isSlow) {
      if (!current) {
        current = { startTs: entry.timestamp, entries: [], skipCount: 0 };
      }
      current.entries.push(entry);
      current.skipCount = 0;
    } else if (current) {
      current.skipCount++;
      // Tolerate up to CLUSTER_SKIP_TOLERANCE non-slow frames between slow ones
      if (current.skipCount > CLUSTER_SKIP_TOLERANCE) {
        // Flush if the cluster has at least CLUSTER_MIN_SIZE slow frames
        if (current.entries.length >= CLUSTER_MIN_SIZE) {
          clusters.push(current);
        }
        current = null;
      }
    }
  }

  // Flush trailing cluster
  if (current && current.entries.length >= CLUSTER_MIN_SIZE) {
    clusters.push(current);
  }

  // Convert to summary form
  return clusters.map(c => {
    const worst = c.entries.reduce((a, b) => a.frameTime > b.frameTime ? a : b);
    return {
      startTs: c.startTs,
      endTs: c.entries[c.entries.length - 1].timestamp,
      count: c.entries.length,
      worstMs: worst.frameTime,
      worstEntry: worst,
      context: contextLabel(worst),
      entries: c.entries,
    };
  });
}
