/**
 * descriptorMotif.test.js — The v6 decor composition pipeline
 * (src/render/hexmap3d/worldObjects/descriptors/motifDraw.js + tileRecords.js
 * + meshAssembly.js), per decorComposition.md §3.4. Exercises the §4 desert
 * model on a hand-written v6 fixture: per-slot motif draws (stable-id CDF,
 * biomeWeight shifts/exclusions, repeatPenalty), per-item alternatives
 * (authored seeds, default/first-non-empty, nested nodes), pin/force
 * precedence, Show-all canonical, seed-channel independence, and the
 * frames ≡ records partId invariant.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeDescriptor,
  denormalizeDescriptor,
  validateDescriptor,
  SCHEMA_VERSION,
  MOTIF_SEED,
} from '../../../src/render/hexmap3d/worldObjects/descriptors/schema.js';
import {
  recordsForDescriptor,
  nodeWorldFrames,
} from '../../../src/render/hexmap3d/worldObjects/descriptors/recordBuilder.js';
import { buildDescriptorMeshes } from '../../../src/render/hexmap3d/worldObjects/descriptors/meshAssembly.js';
import { itemHash } from '../../../src/render/hexmap3d/worldObjects/tileHash.js';

const POS = { x: 0, y: 0, z: 0 };

/** The §4 desert skeleton — three table motifs + an alternatives-bearing
 *  cactus, tuned for per-tile variety assertions. */
const DESERT = normalizeDescriptor({
  schemaVersion: 6,
  id: 'test-desert',
  kind: 'decor',
  displayName: 'Test Desert',
  cluster: { min: 4, max: 7 },
  size: { min: 0.9, max: 1.2 },
  placement: { mode: 'scatter', offsetMin: 0.15, offsetMax: 0.45, separation: 0.42 },
  emphasis: { behavior: 'dispersed' },
  motifs: [
    { id: 'cactus', weight: 0.4,
      biomeWeight: { biome_tundra: 0.05, biome_mourning_marsh: 0.1 },
      parts: [
        { id: 'cactus-trunk', shape: 'cylinder', params: { bottomR: 0.1, topR: 0.085, height: 0.55, segments: 6 } },
        { id: 'cactus-arms', seed: 101, default: 'two-straight',
          alternatives: [
            { id: 'none', weight: 0.25, parts: [] },
            { id: 'one-straight', weight: 0.3, parts: [{ id: 'arm-one', shape: 'cylinder', params: { bottomR: 0.04, topR: 0.03, height: 0.2, segments: 5 } }] },
            { id: 'two-straight', weight: 0.3, parts: [{ id: 'arm-two-a', shape: 'cylinder' }, { id: 'arm-two-b', shape: 'cylinder' }] },
            { id: 'elbow', weight: 0.15, parts: [{ id: 'elbow-base', shape: 'cylinder' }, { id: 'elbow-rise', shape: 'cylinder' }] },
          ],
        },
      ] },
    { id: 'rock', weight: 0.45, parts: [{ id: 'rock-a', shape: 'dodecahedron', params: { radius: 0.13 } }] },
    { id: 'shrub', weight: 0.2, parts: [{ id: 'shrub-a', shape: 'cone', params: { bottomR: 0.16, height: 0.18 } }] },
  ],
});

const TILE = (q = 3, biomeId = null) => ({ q, r: -2, terrain: 'desert', ...(biomeId ? { biomeId } : {}) });

/** Per-motif item counts on a tile. */
function motifCounts(records) {
  const counts = { cactus: 0, rock: 0, shrub: 0 };
  for (const r of records) {
    if (r.partId === 'cactus-trunk') counts.cactus++;
    else if (r.partId === 'rock-a') counts.rock++;
    else if (r.partId === 'shrub-a') counts.shrub++;
  }
  return counts;
}

/** The arm config of ONE cactus's records (its items are trunk + arm parts). */
function armChoice(records) {
  const arms = records.filter((r) => r.partId.startsWith('arm-') || r.partId.startsWith('elbow-'));
  if (arms.length === 0) return 'none';
  if (arms.some((r) => r.partId.startsWith('elbow'))) return 'elbow';
  if (arms.some((r) => r.partId === 'arm-two-a') && arms.some((r) => r.partId === 'arm-two-b')) return 'two-straight';
  return 'one-straight';
}

/** Per-cactus arm configs on a tile, in item order. */
function cactusChoices(records) {
  const choices = [];
  let current = [];
  for (const r of records) {
    if (r.partId === 'cactus-trunk') {
      if (current.length) choices.push(armChoice(current));
      current = [r];
    } else {
      current.push(r);
    }
  }
  if (current.length) choices.push(armChoice(current));
  return choices;
}

/** Total items on a tile (cluster slots all draw one motif). */
function totalItems(records) {
  const c = motifCounts(records);
  return c.cactus + c.rock + c.shrub;
}

// ── Happy path ─────────────────────────────────────────────────────────────

test('motif draws are deterministic per tile and slot', () => {
  for (const q of [1, 7, 42]) {
    const tile = TILE(q);
    assert.deepEqual(
      recordsForDescriptor(DESERT, tile, POS),
      recordsForDescriptor(DESERT, tile, POS),
      `q=${q} non-deterministic`,
    );
  }
});

test('every slot draws one motif: item count stays in the cluster range', () => {
  for (let q = 0; q < 60; q++) {
    const records = recordsForDescriptor(DESERT, TILE(q), POS);
    const total = totalItems(records);
    assert.ok(total >= 4 && total <= 7, `q=${q} item count ${total} out of [4,7]`);
    // Cactus items = one trunk record each (the arms choice point emits none).
    assert.equal(records.filter((r) => r.partId === 'cactus-trunk').length, motifCounts(records).cactus);
  }
});

test('lone tiles draw their motif from the dedicated MOTIF_SEED lane', () => {
  const lone = normalizeDescriptor({
    ...DESERT,
    cluster: { min: 1, max: 1 },
    placement: { mode: 'center' },
  });
  for (let q = 0; q < 40; q++) {
    const tile = TILE(q);
    const records = recordsForDescriptor(lone, tile, POS);
    const chosen = motifCounts(records);
    assert.equal(totalItems(records), 1, `q=${q} lone tile has ${totalItems(records)} items`);
    // The draw is itemHash(tileH, 0 + MOTIF_SEED) — deterministic and
    // independent of the size lane (itemHash(tileH, 0 + 3)).
    const tileH = ((q * 7 + -2 * 13) * 31) % 17;
    const draw = itemHash(tileH, 0 + MOTIF_SEED);
    const table = [
      { id: 'cactus', w: 0.4 }, { id: 'rock', w: 0.45 }, { id: 'shrub', w: 0.2 },
    ].sort((a, b) => (a.id < b.id ? -1 : 1));
    const totalW = table.reduce((s, t) => s + t.w, 0);
    let cum = 0;
    let expected = null;
    for (let i = 0; i < table.length; i++) {
      cum += table[i].w / totalW;
      if (draw < cum || i === table.length - 1) { expected = table[i].id; break; }
    }
    const got = chosen.cactus === 1 ? 'cactus' : chosen.rock === 1 ? 'rock' : 'shrub';
    assert.equal(got, expected, `q=${q} motif draw mismatch`);
  }
});

test('biomeWeight shifts the realized share and weight-0 excludes', () => {
  // Cactus is ×0.05 in tundra — its share must drop far below the base share.
  let baseCactus = 0, tundraCactus = 0, totalBase = 0, totalTundra = 0;
  for (let q = 0; q < 120; q++) {
    const b = motifCounts(recordsForDescriptor(DESERT, TILE(q), POS));
    totalBase += b.cactus + b.rock + b.shrub;
    baseCactus += b.cactus;
    const t = motifCounts(recordsForDescriptor(DESERT, TILE(q, 'biome_tundra'), POS));
    totalTundra += t.cactus + t.rock + t.shrub;
    tundraCactus += t.cactus;
  }
  const baseShare = baseCactus / totalBase;
  const tundraShare = tundraCactus / totalTundra;
  assert.ok(baseShare > 0.2, `base cactus share ${baseShare}`);
  assert.ok(tundraShare < baseShare * 0.5, `tundra cactus share ${tundraShare} not suppressed (base ${baseShare})`);

  // Absolute exclusion: a zeroed biomeWeight entry never draws in that biome.
  const excluded = normalizeDescriptor({
    ...DESERT,
    motifs: DESERT.motifs.map((m) => (
      m.id === 'rock' ? { ...m, biomeWeight: { biome_scorch: 0 } } : m
    )),
  });
  for (let q = 0; q < 80; q++) {
    const counts = motifCounts(recordsForDescriptor(excluded, TILE(q, 'biome_scorch'), POS));
    assert.equal(counts.rock, 0, `q=${q} rock drew despite biomeWeight 0`);
  }
});

test('repeatPenalty: 0 = without replacement, 1 = independent; both deterministic', () => {
  // Exactly 3 slots on a 3-motif table: penalty 0 draws each motif once.
  const noReplacement = normalizeDescriptor({
    ...DESERT,
    cluster: { min: 3, max: 3 },
    repeatPenalty: 0,
  });
  for (let q = 0; q < 60; q++) {
    const c = motifCounts(recordsForDescriptor(noReplacement, TILE(q), POS));
    const n = c.cactus + c.rock + c.shrub;
    assert.equal(n, 3, `q=${q} without-replacement tile lost slots (${n})`);
    assert.equal(Math.max(c.cactus, c.rock, c.shrub), 1, `q=${q} without-replacement stacked a motif`);
    // Each motif appears exactly once per tile.
    assert.equal(c.cactus, 1);
    assert.equal(c.rock, 1);
    assert.equal(c.shrub, 1);
  }

  // Independent draws (penalty 1, the inert default) DO stack sometimes.
  const independent = normalizeDescriptor({
    ...DESERT,
    cluster: { min: 4, max: 7 },
    repeatPenalty: 1,
  });
  let stacked = 0;
  const tiles = 120;
  for (let q = 0; q < tiles; q++) {
    const c = motifCounts(recordsForDescriptor(independent, TILE(q), POS));
    if (Math.max(c.cactus, c.rock, c.shrub) > 1) stacked++;
  }
  assert.ok(stacked > tiles * 0.3, `independent draws should stack sometimes (${stacked}/${tiles})`);

  // Deterministic under the knob.
  assert.deepEqual(
    recordsForDescriptor(noReplacement, TILE(5), POS),
    recordsForDescriptor(noReplacement, TILE(5), POS),
  );
});

test('a trailing weight-0 motif does not change existing slot draws', () => {
  const withDead = normalizeDescriptor({
    ...DESERT,
    motifs: [...DESERT.motifs, { id: 'dead-cactus', weight: 0, parts: [{ id: 'dead-a', shape: 'cylinder' }] }],
  });
  for (let q = 0; q < 40; q++) {
    const tile = TILE(q);
    assert.deepEqual(
      motifCounts(recordsForDescriptor(withDead, tile, POS)),
      motifCounts(recordsForDescriptor(DESERT, tile, POS)),
      `q=${q} zeroed trailing motif shifted the table`,
    );
    assert.equal(motifCounts(recordsForDescriptor(withDead, tile, POS)).cactus, motifCounts(recordsForDescriptor(DESERT, tile, POS)).cactus);
  }
});

test('reordering motifs does not change draws (stable-id CDF)', () => {
  const shuffled = normalizeDescriptor({
    ...DESERT,
    motifs: [...DESERT.motifs].reverse(),
  });
  for (let q = 0; q < 40; q++) {
    const tile = TILE(q);
    assert.deepEqual(
      motifCounts(recordsForDescriptor(shuffled, tile, POS)),
      motifCounts(recordsForDescriptor(DESERT, tile, POS)),
      `q=${q} array order changed the draws`,
    );
  }
});

// ── All-excluded fallback ──────────────────────────────────────────────────

test('all-excluded biome falls back to base weights — never empty, never all-ones', () => {
  const allExcluded = normalizeDescriptor({
    ...DESERT,
    motifs: DESERT.motifs.map((m) => ({ ...m, biomeWeight: { biome_frigid_silence: 0 } })),
  });
  const counts = { cactus: 0, rock: 0, shrub: 0 };
  let total = 0;
  for (let q = 0; q < 80; q++) {
    const c = motifCounts(recordsForDescriptor(allExcluded, TILE(q, 'biome_frigid_silence'), POS));
    counts.cactus += c.cactus; counts.rock += c.rock; counts.shrub += c.shrub;
    total += c.cactus + c.rock + c.shrub;
  }
  assert.ok(total > 0, 'all-excluded biome still renders tiles');
  // The fallback honors the BASE weights (cactus 0.4 vs rock 0.45 vs shrub
  // 0.2) — not all-ones: shrub must stay rarer than rock.
  assert.ok(counts.shrub < counts.rock, `fallback made shrub as common as rock (${counts.shrub} vs ${counts.rock})`);
  assert.ok(counts.cactus > 0 && counts.rock > 0 && counts.shrub > 0, 'all motifs draw under the base-weight fallback');
});

// ── Alternatives ───────────────────────────────────────────────────────────

test('alternatives: per-item resolution — two items on one tile may differ; all options appear over tiles', () => {
  const seen = new Set();
  let sawDifferingTile = false;
  for (let q = 0; q < 150; q++) {
    const choices = cactusChoices(recordsForDescriptor(DESERT, TILE(q), POS));
    choices.forEach((ch) => seen.add(ch));
    if (new Set(choices).size > 1) sawDifferingTile = true;
  }
  assert.ok(sawDifferingTile, 'no tile showed two different arm configs');
  assert.deepEqual([...seen].sort(), ['elbow', 'none', 'one-straight', 'two-straight']);
});

test('all-zero alternatives resolve to default, else first non-empty', () => {
  const zeroed = normalizeDescriptor({
    ...DESERT,
    motifs: [{
      id: 'cactus', weight: 1,
      parts: [
        { id: 'cactus-trunk', shape: 'cylinder' },
        { id: 'cactus-arms', seed: 102, default: 'one-straight',
          alternatives: [
            { id: 'none', weight: 0, parts: [] },
            { id: 'one-straight', weight: 0, parts: [{ id: 'arm-one', shape: 'cylinder' }] },
          ] },
      ],
    }],
  });
  for (let q = 0; q < 30; q++) {
    const records = recordsForDescriptor(zeroed, TILE(q), POS);
    assert.ok(records.some((r) => r.partId === 'arm-one'), `q=${q} default option not resolved`);
    assert.ok(!records.some((r) => r.partId === 'cactus-arms'), 'choice point emits no record');
  }
  // No default → first non-empty option (a `none` must never be the catalog).
  const noDefault = normalizeDescriptor({
    ...zeroed,
    motifs: [{
      id: 'cactus', weight: 1,
      parts: [
        { id: 'cactus-trunk', shape: 'cylinder' },
        { id: 'cactus-arms', seed: 103,
          alternatives: [
            { id: 'none', weight: 0.5, parts: [] },
            { id: 'one-straight', weight: 0.5, parts: [{ id: 'arm-one', shape: 'cylinder' }] },
          ] },
      ],
    }],
  });
  const records = recordsForDescriptor(noDefault, TILE(1), POS);
  assert.ok(records.some((r) => r.partId === 'arm-one'), 'first non-empty option is the fallback');
});

test('per-biome alternatives bias: biomeWeight skews the option draw per biome', () => {
  // Option A is excluded in tundra (weight 0) and option B is boosted in
  // tundra (×3); elsewhere both are weight 1. So tundra tiles ALWAYS draw B,
  // while null-biome tiles spread across A and B.
  const biased = normalizeDescriptor({
    ...DESERT,
    cluster: { min: 1, max: 3 },
    placement: { mode: 'center' },
    motifs: [{
      id: 'cactus', weight: 1,
      parts: [
        { id: 'cactus-trunk', shape: 'cylinder' },
        { id: 'arms', seed: 130, alternatives: [
          { id: 'a', weight: 1, biomeWeight: { biome_tundra: 0 }, parts: [{ id: 'arm-a', shape: 'cylinder' }] },
          { id: 'b', weight: 1, biomeWeight: { biome_tundra: 3 }, parts: [{ id: 'arm-b', shape: 'cylinder' }] },
        ] },
      ],
    }],
  });
  // In tundra, A is excluded and B dominates — every item must be a `b`.
  for (let q = 0; q < 30; q++) {
    const records = recordsForDescriptor(biased, TILE(q, 'biome_tundra'), POS);
    assert.ok(records.length >= 1, `q=${q} empty tundra tile`);
    assert.ok(!records.some((r) => r.partId === 'arm-a'), `q=${q} excluded option A drew in tundra`);
  }
  // In a neutral biome both A and B appear across tiles (B not forced).
  const seen = new Set();
  for (let q = 0; q < 120; q++) {
    for (const r of recordsForDescriptor(biased, TILE(q), POS)) {
      if (r.partId === 'arm-a' || r.partId === 'arm-b') seen.add(r.partId);
    }
  }
  assert.ok(seen.has('arm-a') && seen.has('arm-b'), 'neutral biome should draw both options');
  // Canonical (Show all) ignores biome bias and resolves to default/first.
  const canon = recordsForDescriptor(biased, TILE(1, 'biome_tundra'), POS, undefined, {}, null, null, true);
  assert.ok(canon.some((r) => r.partId === 'arm-a'), 'Show all ignores biomeWeight (A is the first non-empty)');
});

test('nested alternatives resolve independently (each node rolls its own lane)', () => {
  const nested = normalizeDescriptor({
    ...DESERT,
    cluster: { min: 1, max: 1 },
    placement: { mode: 'center' },
    motifs: [{
      id: 'double', weight: 1,
      parts: [
        { id: 'outer', seed: 110, alternatives: [
          { id: 'o-a', weight: 1, parts: [
            { id: 'inner', seed: 111, alternatives: [
              { id: 'i-a', weight: 1, parts: [{ id: 'leaf-a', shape: 'sphere' }] },
              { id: 'i-b', weight: 1, parts: [{ id: 'leaf-b', shape: 'sphere' }] },
            ] },
          ] },
          { id: 'o-b', weight: 1, parts: [{ id: 'leaf-c', shape: 'sphere' }] },
        ] },
      ],
    }],
  });
  const seen = new Set();
  for (let q = 0; q < 60; q++) {
    const records = recordsForDescriptor(nested, TILE(q), POS);
    assert.equal(records.length, 1, 'nested choice points emit exactly one leaf');
    seen.add(records[0].partId);
  }
  assert.ok(seen.has('leaf-a') && seen.has('leaf-b') && seen.has('leaf-c'),
    `nested nodes did not roll independently (${[...seen].join(',')})`);
});

test('reordering options with an authored seed does not change rolls', () => {
  const arms = { id: 'arms', seed: 120, default: 'two', alternatives: [
    { id: 'one', weight: 0.3, parts: [{ id: 'arm-one', shape: 'cylinder' }] },
    { id: 'two', weight: 0.3, parts: [{ id: 'arm-two', shape: 'cylinder' }] },
    { id: 'three', weight: 0.4, parts: [{ id: 'arm-three', shape: 'cylinder' }] },
  ] };
  const d = normalizeDescriptor({
    ...DESERT,
    motifs: [{ id: 'm', weight: 1, parts: [{ id: 'trunk', shape: 'cylinder' }, { ...arms }] }],
  });
  const reordered = normalizeDescriptor({
    ...DESERT,
    motifs: [{ id: 'm', weight: 1, parts: [{ id: 'trunk', shape: 'cylinder' }, { ...arms, alternatives: [...arms.alternatives].reverse() }] }],
  });
  for (let q = 0; q < 30; q++) {
    const tile = TILE(q);
    const a = recordsForDescriptor(d, tile, POS).map((r) => r.partId).join(',');
    const b = recordsForDescriptor(reordered, tile, POS).map((r) => r.partId).join(',');
    assert.equal(b, a, `q=${q} option reorder changed the roll`);
  }
});

test('seed-channel independence: alternatives, motif, size, and placement lanes never correlate', () => {
  const tileH = ((3 * 7 + -2 * 13) * 31) % 17;
  const altDraw = itemHash(tileH, 0 + 101);
  const motifDraw = itemHash(tileH, 0 + MOTIF_SEED);
  const sizeDraw = itemHash(tileH, 0 + 3);
  const placeDraw = itemHash(tileH, 0 + 13);
  assert.equal(new Set([altDraw, motifDraw, sizeDraw, placeDraw]).size, 4, 'lanes collided on this tile');
  assert.notEqual(itemHash(tileH, 0 + 101), itemHash(tileH, 0 + 102), 'two alternatives seeds on one item correlate');
});

// ── Pins and force ─────────────────────────────────────────────────────────

test('pin precedence: biomeVariants pin > force > weights; pinned biome forces every slot', () => {
  const pinned = normalizeDescriptor({
    ...DESERT,
    biomeVariants: { biome_scorch: 'rock' },
  });
  for (let q = 0; q < 30; q++) {
    const c = motifCounts(recordsForDescriptor(pinned, TILE(q, 'biome_scorch'), POS));
    assert.equal(c.cactus, 0, `q=${q} pinned biome rendered a non-pinned motif`);
    assert.equal(c.rock, c.cactus + c.rock + c.shrub, `q=${q} pinned biome not all-rock`);
  }
  // Force (editor): forces one motif everywhere, loses to a pin.
  const forcedOnPinned = recordsForDescriptor(pinned, TILE(1, 'biome_scorch'), POS, undefined, {}, null, 'cactus');
  assert.equal(motifCounts(forcedOnPinned).cactus, 0, 'pin still wins over force');
  const forced = recordsForDescriptor(DESERT, TILE(1), POS, undefined, {}, null, 'cactus');
  const c = motifCounts(forced);
  assert.equal(c.cactus, c.cactus + c.rock + c.shrub, 'force makes every slot the forced motif');
  // A stale force id falls through to weights rather than vanishing.
  const stale = recordsForDescriptor(DESERT, TILE(1), POS, undefined, {}, null, 'nope');
  assert.ok(stale.length > 0, 'stale force id still renders');
});

// ── Show all (canonical) ───────────────────────────────────────────────────

test('Show all: every motif once, authored scale, alternatives → default, no jitter', () => {
  const records = recordsForDescriptor(DESERT, TILE(1), POS, undefined, {}, null, null, true);
  const partIds = records.map((r) => r.partId);
  // Every motif present exactly once.
  assert.equal(records.filter((r) => r.partId === 'cactus-trunk').length, 1);
  assert.equal(records.filter((r) => r.partId === 'rock-a').length, 1);
  assert.equal(records.filter((r) => r.partId === 'shrub-a').length, 1);
  // Alternatives resolve to `default` ('two-straight') — not none/one/elbow.
  assert.ok(partIds.includes('arm-two-a') && partIds.includes('arm-two-b'), 'default option rendered');
  assert.ok(!partIds.includes('arm-one') && !partIds.includes('elbow-base'), 'non-default options skipped');
  // No stretch/size jitter: scale is exactly descriptor.scale.
  assert.equal(records.find((r) => r.partId === 'cactus-trunk').scale, 1);
  // Deterministic across tiles (the piece inventory must not roll).
  assert.deepEqual(
    recordsForDescriptor(DESERT, TILE(2), POS, undefined, {}, null, null, true),
    records,
  );
});

// ── Frames ≡ records + assembler ──────────────────────────────────────────

test('frames ≡ records partId sets on the motif path', () => {
  for (let q = 0; q < 20; q++) {
    const tile = TILE(q);
    const records = recordsForDescriptor(DESERT, tile, POS);
    const frames = nodeWorldFrames(DESERT, tile, POS);
    assert.deepEqual(new Set(frames.keys()), new Set(records.map((r) => r.partId)), `q=${q} frame/record divergence`);
  }
});

test('assembler resolves motif + alternative part geometry (one mesh per partId)', () => {
  // Accumulate records until the full vocabulary has been drawn (every motif
  // and every alternative option), then check each part resolves to real
  // geometry — the partById walk covers motifs and ALL alternative options.
  const collected = [];
  const vocab = new Set(['cactus-trunk', 'arm-one', 'arm-two-a', 'arm-two-b', 'elbow-base', 'rock-a', 'shrub-a']);
  const drawn = new Set();
  for (let q = 0; q < 120 && drawn.size < vocab.size; q++) {
    const records = recordsForDescriptor(DESERT, TILE(q), POS);
    for (const r of records) if (vocab.has(r.partId)) drawn.add(r.partId);
    collected.push(...records);
  }
  assert.equal(drawn.size, vocab.size, `full vocabulary not drawn in 120 tiles (${[...drawn].join(', ')})`);
  const meshes = buildDescriptorMeshes(DESERT, collected, 'test-desert');
  const names = new Set(meshes.map((m) => m.name));
  for (const id of vocab) {
    assert.ok(names.has(`test-desert-${id}`), `missing mesh for ${id}`);
  }
});

// ── Round-trip ─────────────────────────────────────────────────────────────

test('the v6 fixture round-trips through denormalize and validates', () => {
  const minimal = denormalizeDescriptor(DESERT);
  assert.deepEqual(normalizeDescriptor(minimal), DESERT, 'denormalize broke the motif decor');
  assert.deepEqual(validateDescriptor(minimal), []);
});

// ── v5 → v6 migration shim (decorComposition.md §3.3) ───────────────────────

/** A small v5 decor with the forest.js shape: `trunk` reused across variants,
 *  a fallback `parts` stub, and per-biome pins. */
const V5_WOODS = {
  schemaVersion: 5,
  id: 'legacy-woods',
  kind: 'decor',
  displayName: 'Legacy Woods',
  biomeVariants: { biome_painforest: 'painforest' },
  cluster: { min: 2, max: 2 },
  placement: { mode: 'ring' },
  parts: [{ id: 'trunk', shape: 'cylinder' }],
  variants: [
    { id: 'round', parts: [{ id: 'trunk', shape: 'cylinder' }, { id: 'canopy-round', shape: 'sphere' }] },
    { id: 'painforest', parts: [{ id: 'trunk', shape: 'cylinder' }, { id: 'canopy-gnarled', shape: 'sphere' }] },
  ],
};

test('v5 decor migrates in memory: variants → motifs, ids uniquified, pins preserved', () => {
  const d = normalizeDescriptor(V5_WOODS);
  assert.equal(d.schemaVersion, SCHEMA_VERSION, 'migrated descriptor is v6');
  assert.deepEqual(d.motifs.map((m) => m.id), ['round', 'painforest'], 'each variant becomes a motif');
  assert.deepEqual(d.motifs.map((m) => m.weight), [1, 1], 'migrated motifs weigh 1');
  assert.equal(d.variants, undefined, 'variants dropped after migration');
  assert.equal(d.parts, undefined, 'fallback parts stub dropped');
  assert.equal(d.biomeVariants.biome_painforest, 'painforest', 'pins preserved as-is');

  // The `trunk` collision (forest.js repeats it across variants) is uniquified.
  const ids = d.motifs.flatMap((m) => m.parts.map((p) => p.id));
  assert.equal(new Set(ids).size, ids.length, 'no duplicate part ids after migration');
  assert.ok(ids.includes('round-trunk') && ids.includes('painforest-trunk'), 'ids prefixed by variant id');

  // The migrated descriptor validates and round-trips (never written back —
  // the RAW file stays v5).
  assert.deepEqual(validateDescriptor(d), []);
  assert.deepEqual(normalizeDescriptor(d), d, 'migration is idempotent');
  assert.equal(V5_WOODS.schemaVersion, 5, 'the raw input is untouched (in-memory only)');
  assert.deepEqual(normalizeDescriptor(denormalizeDescriptor(d)), d, 'denormalize round-trips the migrated form');
});

test('migration fidelity gate: a pinned biome forces the v5 look on every slot', () => {
  const d = normalizeDescriptor(V5_WOODS);
  // biome_painforest is pinned to 'painforest' — every slot renders that
  // motif's FULL composite (v5's exclusivity guarantee, not a weight lift).
  const records = recordsForDescriptor(d, { q: 3, r: -2, terrain: 'forest', biomeId: 'biome_painforest' }, POS);
  const itemRoots = records.filter((r) => r.partId === 'painforest-trunk').length;
  assert.equal(itemRoots, 2, 'two slots, both the painforest motif');
  assert.equal(records.length, 4, 'each slot renders the full 2-part composite');
  assert.ok(records.every((r) => r.partId.startsWith('painforest-')), 'no non-pinned motif slipped in');

  // The migrated file's pins must NOT have become ×3–×5 lifts: the unpinned
  // (no biome) tile draws from the flat weight-1 table instead of forcing one.
  const unpinned = recordsForDescriptor(d, { q: 3, r: -2, terrain: 'forest' }, POS);
  const seenMotifs = new Set(unpinned.map((r) => (r.partId.startsWith('round-') ? 'round' : 'painforest')));
  assert.equal(seenMotifs.size, 2, 'unpinned tiles draw the mixed table (the hand-rewrite opens the mix)');
});

test('alternatives `default` references are rewritten by the migration', () => {
  const v5 = {
    schemaVersion: 5,
    id: 'legacy-arms',
    kind: 'decor',
    displayName: 'Legacy Arms',
    variants: [{
      id: 'cactus',
      parts: [
        { id: 'trunk', shape: 'cylinder' },
        { id: 'arms', seed: 101, default: 'two', alternatives: [
          { id: 'one', weight: 0.5, parts: [{ id: 'arm-one', shape: 'cylinder' }] },
          { id: 'two', weight: 0.5, parts: [{ id: 'arm-two', shape: 'cylinder' }] },
        ] },
      ],
    }],
  };
  const d = normalizeDescriptor(v5);
  const arms = d.motifs[0].parts.find((p) => p.id === 'cactus-arms');
  assert.ok(arms, 'alternatives node id prefixed');
  assert.equal(arms.default, 'cactus-two', 'default rewritten to the prefixed option id');
  assert.deepEqual(validateDescriptor(d), []);
});

// ── Editor preview-option forcing (decorComposition.md §6.2) ────────────────

test('previewOptions forces a specific alternative per node (editor preview radio)', () => {
  // Force the 'none' option — a tile that would normally draw arms shows none.
  const forcedNone = new Map([['cactus-arms', 'none']]);
  for (let q = 0; q < 20; q++) {
    const records = recordsForDescriptor(DESERT, TILE(q), POS, undefined, {}, null, null, false, undefined, forcedNone);
    assert.ok(!records.some((r) => r.partId.startsWith('arm-') || r.partId.startsWith('elbow-')), `q=${q} forced none still drew arms`);
  }
  // Force the elbow option.
  const forcedElbow = new Map([['cactus-arms', 'elbow']]);
  const records = recordsForDescriptor(DESERT, TILE(3), POS, undefined, {}, null, null, false, undefined, forcedElbow);
  assert.ok(records.some((r) => r.partId === 'elbow-base'), 'forced elbow renders the elbow config');
  // A stale forced id falls back to the defaulted resolution, never vanishes.
  const stale = new Map([['cactus-arms', 'nope']]);
  const staleRecords = recordsForDescriptor(DESERT, TILE(3), POS, undefined, {}, null, null, false, undefined, stale);
  assert.ok(staleRecords.length > 0, 'stale preview option still renders');
});
