/**
 * descriptorDenormalize.js — Descriptor denormalization.
 *
 * `denormalizeDescriptor` strips every optional field equal to its default —
 * the inverse of normalizeDescriptor — producing the minimal hand-authored
 * form used by the data files (only non-default fields). Saving an edited
 * descriptor through denormalizeDescriptor keeps the diff small instead of
 * writing every default back into the file. Pure, idempotent, JSON-safe.
 */
import { SHAPE_TYPES } from './shapeTypes.js';
import { OBJECT_DEFAULTS, PORTRAIT_DEFAULTS, PART_TRANSFORM_DEFAULTS, NESTED_PART_TRANSFORM_DEFAULTS } from './descriptorDefaults.js';
import { isPlainObject, cloneJson } from './typeChecks.js';
import { sharedPartsFor } from './descriptorNormalize.js';

/** Recursive deep-equality for JSON-safe values (objects, arrays, primitives). */
function sameValue(a, b) {
  if (a === b) return true;
  if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every((v, i) => sameValue(v, b[i]));
  }
  if (isPlainObject(a)) {
    const aKeys = Object.keys(a);
    const bKeys = isPlainObject(b) ? Object.keys(b) : null;
    return !!bKeys && aKeys.length === bKeys.length && aKeys.every((k) => sameValue(a[k], b[k]));
  }
  return false;
}

/** Strip the fields normalizeDescriptor fills for moisture-rule clusters. */
const MOISTURE_COUNTS_DEFAULT = Object.freeze({ forest: [3, 5], deepWood: [4, 7] });

/**
 * Strip every optional field equal to its default — the inverse of
 * normalizeDescriptor — producing the minimal hand-authored form used by the
 * data files (only non-default fields). Saving an edited descriptor through
 * denormalizeDescriptor keeps the diff small instead of writing every default
 * back into the file. Pure, idempotent, JSON-safe.
 *
 * `schemaVersion` is deliberately retained: its absence would make a later
 * normalizeDescriptor run treat the file as pre-v3 and re-apply the legacy
 * grounding migration (transform.y -= base × scaleY), corrupting values.
 *
 * Round-trip invariant: normalizeDescriptor(denormalizeDescriptor(d))
 * deep-equals normalizeDescriptor(d) for every valid descriptor. The split
 * migration and the descriptor round-trip tests enforce it.
 *
 * @param {object} def - normalized descriptor
 * @returns {object} minimal descriptor
 */
export function denormalizeDescriptor(def) {
  const out = cloneJson(isPlainObject(def) ? def : {});

  if (out.scale === OBJECT_DEFAULTS.scale) delete out.scale;
  if (out.variantRule === 'hash') delete out.variantRule;

  if (isPlainObject(out.cluster)) {
    const cluster = out.cluster;
    const rule = cluster.rule ?? 'uniform';
    if (rule === 'uniform') {
      // min/max only — moisture fields left over from a rule switch are inert.
      delete cluster.countsByTerrain;
      delete cluster.densityRange;
      delete cluster.jitter;
      if (cluster.min === OBJECT_DEFAULTS.cluster.min) delete cluster.min;
      if (cluster.max === OBJECT_DEFAULTS.cluster.max) delete cluster.max;
      delete cluster.rule; // 'uniform' is the default
    } else {
      // moisture — counts come from countsByTerrain; min/max are uniform-only.
      delete cluster.min;
      delete cluster.max;
      if (sameValue(cluster.countsByTerrain, MOISTURE_COUNTS_DEFAULT)) delete cluster.countsByTerrain;
      if (sameValue(cluster.densityRange, [0.55, 0.85])) delete cluster.densityRange;
      if (cluster.jitter === 1) delete cluster.jitter;
    }
    if (Object.keys(cluster).length === 0) delete out.cluster;
  }

  if (isPlainObject(out.size)) {
    if (out.size.min === OBJECT_DEFAULTS.size.min) delete out.size.min;
    if (out.size.max === OBJECT_DEFAULTS.size.max) delete out.size.max;
    if (Object.keys(out.size).length === 0) delete out.size;
  }

  if (isPlainObject(out.variation)) {
    const variation = out.variation;
    for (const [key, defValue] of Object.entries(OBJECT_DEFAULTS.variation)) {
      if (sameValue(variation[key], defValue)) delete variation[key];
    }
    if (Object.keys(variation).length === 0) delete out.variation;
  }

  if (isPlainObject(out.placement)) {
    const placement = out.placement;
    const mode = placement.mode ?? 'center';
    // Each placement mode owns a fixed sub-field set; fields left over from
    // other modes (editor mode switches) are inert and stripped on emit.
    const MODE_FIELDS = {
      scatter: ['offsetMin', 'offsetMax', 'separation'],
      ring: ['ringMin', 'ringMax', 'leanMin', 'leanMax'],
      jitter: ['offset', 'tiltMin', 'tiltMax', 'tiltSeed', 'separation'],
      center: [],
    };
    const own = new Set(MODE_FIELDS[mode] ?? []);
    for (const key of Object.keys(placement)) {
      if (key !== 'mode' && !own.has(key)) delete placement[key];
    }
    if (mode === 'scatter') {
      if (placement.offsetMin === 0.15) delete placement.offsetMin;
      if (placement.offsetMax === 0.3) delete placement.offsetMax;
    } else if (mode === 'ring') {
      if (placement.ringMin === 0.18) delete placement.ringMin;
      if (placement.ringMax === 0.55) delete placement.ringMax;
      if (placement.leanMin === 0.045) delete placement.leanMin;
      if (placement.leanMax === 0.12) delete placement.leanMax;
    } else if (mode === 'jitter') {
      if (placement.offset === 0.08) delete placement.offset;
      if (placement.tiltMin === 0) delete placement.tiltMin;
      if (placement.tiltMax === 0) delete placement.tiltMax;
      if (placement.tiltSeed === 1) delete placement.tiltSeed;
    } else {
      delete placement.mode; // 'center' is the default
    }
    if (placement.separation === 0) delete placement.separation;
    if (Object.keys(placement).length === 0) delete out.placement;
  }

  if (isPlainObject(out.emphasis) && out.emphasis.behavior === 'none') delete out.emphasis;
  if (isPlainObject(out.material) && sameValue(out.material, OBJECT_DEFAULTS.material)) delete out.material;

  // Portrait framing — strip sub-fields equal to their defaults, then drop the
  // field entirely when nothing non-default remains (an all-default portrait
  // reads as the auto-frame fallback and should not be written to the file).
  if (isPlainObject(out.portrait)) {
    const portrait = out.portrait;
    for (const [key, defValue] of Object.entries(PORTRAIT_DEFAULTS)) {
      if (sameValue(portrait[key], defValue)) delete portrait[key];
    }
    if (Object.keys(portrait).length === 0) delete out.portrait;
  }

  const denormPart = (part, nested = false) => {
    if (!isPlainObject(part)) return part;
    const p = cloneJson(part);
    const isAlternatives = Array.isArray(p.alternatives);
    const isGroup = Array.isArray(p.children);
    if (isAlternatives) {
      delete p.shape;
      delete p.params;
      delete p.transform;
      p.alternatives = p.alternatives.map((option) => {
        const o = cloneJson(option);
        // Only `weight: 1` may be stripped — a 0 is a meaningful exclusion.
        if (o.weight === 1) delete o.weight;
        o.parts = (Array.isArray(option.parts) ? option.parts : []).map((child) => denormPart(child, nested));
        return o;
      });
      return p;
    }
    const shape = SHAPE_TYPES[p.shape];
    if (!isGroup && shape && isPlainObject(p.params)) {
      const params = {};
      for (const [key, value] of Object.entries(p.params)) {
        if (!(key in shape.defaults) || !Object.is(value, shape.defaults[key])) params[key] = value;
      }
      if (Object.keys(params).length === 0) delete p.params;
      else p.params = params;
    }
    if (isPlainObject(p.transform)) {
      const defaults = isGroup || nested ? NESTED_PART_TRANSFORM_DEFAULTS : PART_TRANSFORM_DEFAULTS;
      const transform = {};
      for (const [key, value] of Object.entries(p.transform)) {
        if (!(key in defaults) || !Object.is(value, defaults[key])) transform[key] = value;
      }
      if (Object.keys(transform).length === 0) delete p.transform;
      else p.transform = transform;
    }
    if (isGroup) {
      p.children = p.children.map((child) => denormPart(child, true));
    }
    return p;
  };

  out.parts = (Array.isArray(out.parts) ? out.parts : []).map(denormPart);
  // Empty `parts` is only meaningful as absent (a decor with motifs carries no
  // fallback) — never emit `parts: []`.
  if (Array.isArray(out.parts) && out.parts.length === 0) delete out.parts;
  if (Array.isArray(out.variants)) {
    out.variants = out.variants.map((variant) => {
      const v = { ...variant };
      v.parts = (Array.isArray(variant.parts) ? variant.parts : []).map(denormPart);
      if (isPlainObject(v.material) && sameValue(v.material, OBJECT_DEFAULTS.material)) delete v.material;
      return v;
    });
  }
  if (Array.isArray(out.motifs)) {
    out.motifs = out.motifs.map((motif) => {
      const m = { ...motif };
      // Only `weight: 1` and an EMPTY `biomeWeight` may be stripped — `weight:
      // 0` and `biomeWeight: { biome_x: 0 }` are meaningful exclusions and must
      // survive the round-trip (decorComposition.md §3.3).
      if (m.weight === 1) delete m.weight;
      if (isPlainObject(m.biomeWeight) && Object.keys(m.biomeWeight).length === 0) delete m.biomeWeight;
      // Shared-motif reference: a ref whose materialized parts still equal the
      // library collapses back to `{ motif, weight?, biomeWeight?, size?,
      // placement? }` (no id, no parts, library-inherited size/placement
      // stripped) — the dedupe the reference model exists for. A ref whose
      // geometry differs is a LOCAL OVERRIDE and keeps its denormed parts
      // (still tagged `motif` so its origin is known). Inline motifs are
      // unchanged.
      if (typeof m.motif === 'string') {
        const shared = sharedPartsFor(m.motif);
        if (shared && sameValue(m.parts, shared.parts)) {
          delete m.parts;
          if (shared.size && sameValue(m.size, shared.size)) delete m.size;
          if (shared.placement && sameValue(m.placement, shared.placement)) delete m.placement;
        } else {
          // Local override / unresolvable id — keep authored parts.
          if (Array.isArray(m.parts)) m.parts = m.parts.map(denormPart);
          if (shared) {
            if (shared.size && sameValue(m.size, shared.size)) delete m.size;
            if (shared.placement && sameValue(m.placement, shared.placement)) delete m.placement;
          }
        }
        delete m.id;
      } else {
        m.parts = (Array.isArray(motif.parts) ? motif.parts : []).map(denormPart);
      }
      return m;
    });
  }
  if (out.repeatPenalty === 1) delete out.repeatPenalty;
  if (Array.isArray(out.optionalGroups)) {
    out.optionalGroups = out.optionalGroups.map((group) => {
      const g = { ...group };
      g.parts = (Array.isArray(group.parts) ? group.parts : []).map(denormPart);
      if (g.chance === 0.5) delete g.chance;
      return g;
    });
  }

  return out;
}
