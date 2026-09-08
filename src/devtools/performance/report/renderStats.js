/**
 * renderStats.js — Draw-call / triangle aggregation for the capture report.
 *
 * Layer: dev/ — pure aggregation over FrameEntry.renderStats.
 */

import { computeStats } from '../stats.js';

/**
 * Aggregate per-frame renderer.info samples across the capture.
 * @param {import('../frameProfiler.js').FrameEntry[]} timeline
 * @returns {{ frames: number, calls: object, triangles: object, geometries: object, textures: object }|null}
 */
export function aggregateRenderStats(timeline) {
  const calls = [];
  const triangles = [];
  const geometries = [];
  const textures = [];

  for (const entry of timeline) {
    const rs = entry.renderStats;
    if (!rs) continue;
    calls.push(rs.calls);
    triangles.push(rs.triangles);
    geometries.push(rs.geometries);
    textures.push(rs.textures);
  }

  if (calls.length === 0) return null;

  return {
    frames: calls.length,
    calls: computeStats(calls),
    triangles: computeStats(triangles),
    geometries: computeStats(geometries),
    textures: computeStats(textures),
  };
}
