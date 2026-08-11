#!/usr/bin/env node
/**
 * regenerate_descriptor_snapshot.mjs — Rebuild the golden descriptor snapshot.
 *
 * Reconciles dev/tests/render/fixtures/descriptorData.snap.json with the
 * current descriptor data (and the current recordBuilder/schema code). The
 * geometry editor's save server does this automatically on every Save; run
 * this manually to re-sync after reverting an object or switching branches.
 *
 * Usage (from the repo root):
 *   /run/host/usr/bin/node dev/scripts/regenerate_descriptor_snapshot.mjs
 */
import { ALL_DESCRIPTORS } from '../../src/render/hexmap3d/worldObjects/descriptors/data/index.js';
import {
  generateDescriptorSnapshot,
  writeDescriptorSnapshot,
} from '../tests/render/descriptorSnapshot.js';

const snapshot = generateDescriptorSnapshot(ALL_DESCRIPTORS);
const changed = await writeDescriptorSnapshot(ALL_DESCRIPTORS);
console.log(
  `golden snapshot: ${Object.keys(snapshot).length} descriptor(s) — ` +
  (changed ? 'rewritten' : 'unchanged'),
);
