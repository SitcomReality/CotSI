import test from 'node:test';
import assert from 'node:assert/strict';

import {
  aggregateSpans,
  computeExclusiveSpanTimes,
  computeJsOverhead,
} from '../../../src/devtools/performance/report/spanAnalysis.js';
import { computeTimeBudgetFromSpans } from '../../../src/devtools/performance/report/timeBudget.js';
import { collectWarnings } from '../../../src/devtools/performance/report/warnings.js';

function close(actual, expected, eps = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) < eps,
    `expected ${actual} ≈ ${expected}`
  );
}

function makeFrame({ frameTime = 20, phase = 'human_turn', spans = [] } = {}) {
  return {
    timestamp: 0,
    frameTime,
    fps: 1000 / frameTime,
    context: { phase },
    spans: spans.length > 0 ? spans : undefined,
    measurements: {},
  };
}

test('aggregateSpans: avgCall is per invocation, avgFrame is per frame', () => {
  const frames = [
    makeFrame({ spans: [{ name: 'work', ms: 6, count: 3 }] }),
    makeFrame({ spans: [{ name: 'work', ms: 4, count: 2 }] }),
  ];

  const agg = aggregateSpans(frames);

  assert.equal(agg.work.totalMs, 10);
  assert.equal(agg.work.frameCallCount, 2);
  assert.equal(agg.work.totalCount, 5);
  close(agg.work.avgCall, 2);
  close(agg.work.avgFrame, 5);
});

test('time budget: unaccounted splits into untimed JS and outside JS', () => {
  const frames = [];
  for (let i = 0; i < 4; i++) {
    frames.push(makeFrame({
      frameTime: 25,
      spans: [
        { name: 'work', ms: 2, count: 1 },
        { name: 'frameJs', ms: 10, count: 1 },
      ],
    }));
  }

  const budget = computeTimeBudgetFromSpans(frames, 25);

  close(budget.perFrameMeasuredMs, 2);
  close(budget.frameJsAvgPerFrame, 10);
  close(budget.perFrameUntimedJsMs, 8);
  close(budget.perFrameOutsideJsMs, 15);
  close(budget.perFrameUnaccountedMs, 23);
  close(budget.pctUntimedJs, 32);
  close(budget.pctOutsideJs, 60);
  close(
    budget.perFrameUntimedJsMs + budget.perFrameOutsideJsMs,
    budget.perFrameUnaccountedMs
  );
});

test('time budget: rare spans keep an amortized and a when-run cost', () => {
  const frames = [
    makeFrame({
      frameTime: 20,
      spans: [
        { name: 'mesh:chunks', ms: 12, count: 1 },
        { name: 'frameJs', ms: 10, count: 1 },
      ],
    }),
    makeFrame({ frameTime: 20, spans: [{ name: 'frameJs', ms: 10, count: 1 }] }),
  ];

  const budget = computeTimeBudgetFromSpans(frames, 20);
  const chunks = budget.items.find(i => i.name === 'mesh:chunks');

  close(chunks.perFrameMs, 6);
  close(chunks.perOccurrenceMs, 12);
  assert.equal(chunks.occurrences, 1);
  close(budget.frameJsAvgPerFrame, 10);
  close(budget.perFrameUntimedJsMs, 4);
  close(budget.perFrameOutsideJsMs, 10);
});

test('computeJsOverhead: spans that skip frames still count as measured', () => {
  const frames = [];
  for (let i = 0; i < 4; i++) {
    const spans = [
      { name: 'work', ms: 2, count: 1 },
      { name: 'frameJs', ms: 10, count: 1 },
    ];
    if (i === 0) spans.push({ name: 'fogMaskGen', ms: 4, count: 1 });
    frames.push(makeFrame({ spans }));
  }

  const agg = aggregateSpans(frames);
  const exclusive = computeExclusiveSpanTimes(agg);
  const overhead = computeJsOverhead(agg, exclusive);

  close(overhead.frameJsAvgPerFrame, 10);
  close(overhead.measuredAvgPerFrame, 3);
  close(overhead.invisibleAvgPerFrame, 7);
  close(overhead.invisibleRatio, 0.7);
});

test('computeExclusiveSpanTimes: plural parents and subset children nest', () => {
  const frames = [];
  for (let i = 0; i < 4; i++) {
    const spans = [
      { name: 'overlays', ms: 3, count: 1 },
      { name: 'overlay:fogOverlay', ms: 1, count: 1 },
    ];
    if (i < 2) spans.push({ name: 'fogMaskGen', ms: 0.5, count: 1 });
    frames.push(makeFrame({ spans }));
  }

  const agg = aggregateSpans(frames);
  const exclusive = computeExclusiveSpanTimes(agg);

  assert.deepEqual(exclusive.overlays.childNames, ['overlay:fogOverlay']);
  close(exclusive.overlays.exclusiveMs, 8);
  close(exclusive['overlay:fogOverlay'].exclusiveMs, 3);
  close(exclusive.fogMaskGen.exclusiveMs, 1);
});

test('collectWarnings: unaccounted warning names the outside-JS share', () => {
  const warnings = collectWarnings({
    ftStats: { avg: 40 },
    slowClusters: [],
    longFrames: { totalSlow: 0, hitch: 5, majorHitch: 0 },
    memStats: null,
    heapDeltaStats: null,
    jsOverhead: null,
    timeBudget: { pctUnaccounted: 80, pctOutsideJs: 80, perFrameOutsideJsMs: 32 },
    spanStats: {},
    renderStats: null,
  }, false);

  const outside = warnings.find(w => w.includes('outside the JS tick'));
  assert.ok(outside, `expected an outside-JS warning, got: ${warnings.join(' | ')}`);
  assert.ok(outside.includes('32.00ms/frame'));
});
