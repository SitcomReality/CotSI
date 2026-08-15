/**
 * descriptorNormalize.js — Descriptor normalization.
 *
 * `normalizeDescriptor` fills every optional field with its default, resolves
 * legacy inputs (v3 `materialColor`, the pre-v3 center-height grounding, the
 * combined `stretchXZ`/`scaleXZ` axes, legacy shape names, v3 object-level
 * material color), and deep-copies the result so it is JSON-safe. Idempotent.
 * `normalizePart` is the per-node recursion (shape leaves and groups).
 */
import { SHAPE_TYPES, shapeBaseOffset } from './shapeTypes.js';
import {
  OBJECT_DEFAULTS,
  PORTRAIT_DEFAULTS,
  PART_TRANSFORM_DEFAULTS,
  NESTED_PART_TRANSFORM_DEFAULTS,
  ENTITY_DRIVEN_KINDS,
  SCHEMA_VERSION,
} from './descriptorDefaults.js';
import { isPlainObject, cloneJson } from './typeChecks.js';

/**
 * Legacy shape names accepted from older descriptor JSON. `knot` always
 * rendered as an octahedron (knotGeometries.js) and the snowperson lathe is
 * now simply `lathe`; remapping lets old downloads keep loading through
 * normalizeDescriptor.
 */
const LEGACY_SHAPE_NAMES = Object.freeze({
  knot: 'octahedron',
  snowperson: 'lathe',
});

/**
 * Normalize one node of a parts tree (a shape leaf or a group). `nested` marks
 * nodes below the root: they get the nested transform defaults (no `y`/`lift`)
 * and skip the legacy grounding migration. Groups keep no shape/params and
 * their `children` recurse. `legacyGrounding` migrates pre-v3 vertical
 * placement (see normalizeDescriptor): files authored before the
 * bottom-anchored convention encoded `transform.y` as the part's CENTER height.
 * The record path bakes the shape's base offset × Y scale into `y`
 * (recordBuilder), which compensates a matching `base × scaleY` subtraction
 * from `transform.y` exactly at scale 1 — so the migration pulls the base out
 * of the authored center height and the part renders at the same height (its
 * lowest vertex lands at the old center height, and stretch grows it upward
 * from there instead of from its center). `lift` / `localPos.y` are pure
 * offsets and stay as authored. Idempotent: only schemaVersion < SCHEMA_VERSION
 * triggers it.
 */
function normalizePart(part, legacyGrounding = false, nested = false) {
  if (!isPlainObject(part)) return part;
  const out = { ...part };
  const isAlternatives = Array.isArray(out.alternatives);
  const isGroup = Array.isArray(out.children);

  // Alternatives choice points carry no geometry and no transform — they only
  // need their option parts normalized (with the same root/nested context as
  // the node's siblings, so option parts ground like any sibling).
  if (isAlternatives) {
    delete out.shape;
    delete out.params;
    delete out.transform;
    out.alternatives = out.alternatives.map((option) => {
      const o = { ...option };
      o.parts = (Array.isArray(option.parts) ? option.parts : []).map((p) => normalizePart(p, legacyGrounding, nested));
      return o;
    });
    return out;
  }

  // Shape leaves resolve params + legacy shape names; groups carry neither.
  if (!isGroup) {
    const shapeName = LEGACY_SHAPE_NAMES[out.shape] ?? out.shape;
    const shape = SHAPE_TYPES[shapeName];
    const params = isPlainObject(out.params) ? out.params : {};
    out.shape = shapeName;
    out.params = shape ? { ...shape.defaults, ...params } : { ...params };
  } else {
    delete out.shape;
    delete out.params;
  }

  // v3 → v4: `materialColor` merges into the single per-part `color`. A literal
  // `color` wins when both are present — the old instance-color path already
  // overrode the material color visually. Idempotent: v4 parts carry neither.
  if (out.materialColor !== undefined) {
    if (!isGroup && out.color === undefined) out.color = out.materialColor;
    delete out.materialColor;
  }

  // Resolve the legacy combined XZ scale into independent scaleX/scaleZ
  // (an explicit per-axis scale wins over the legacy value).
  const defaults = isGroup || nested ? NESTED_PART_TRANSFORM_DEFAULTS : PART_TRANSFORM_DEFAULTS;
  const transform = isPlainObject(out.transform) ? out.transform : {};
  const merged = { ...defaults, ...transform };
  if (transform.scaleXZ !== undefined) {
    if (!('scaleX' in transform)) merged.scaleX = transform.scaleXZ;
    if (!('scaleZ' in transform)) merged.scaleZ = transform.scaleXZ;
  }
  delete merged.scaleXZ;
  out.transform = merged;

  // Root-only grounding fields (y / lift) and the world-space lean
  // (tiltAxis / tilt) never appear on groups or nested nodes — the schema
  // rejects them and the render ignores them. Fold the vertical offsets into
  // localPos.y (the same convention as the editor's rootToNestedTransform, so
  // a bottom-anchored root leaf keeps its height when wrapped) and drop the
  // lean (no nested expression). Idempotent: canonical nodes carry none of
  // these fields.
  if (isGroup || nested) {
    const yFold = (merged.y ?? 0) + (merged.lift ?? 0);
    if (yFold !== 0) {
      merged.localPos = {
        x: merged.localPos?.x ?? 0,
        y: (merged.localPos?.y ?? 0) + yFold,
        z: merged.localPos?.z ?? 0,
      };
    }
    delete merged.y;
    delete merged.lift;
    delete merged.liftRange;
    delete merged.tiltAxis;
    delete merged.tilt;
  }

  // Resolve the legacy combined stretch axis `xz` into x + z (false pins both).
  if (isPlainObject(out.stretch) && out.stretch.xz !== undefined) {
    const stretch = { ...out.stretch };
    if (stretch.x === undefined) stretch.x = stretch.xz;
    if (stretch.z === undefined) stretch.z = stretch.xz;
    delete stretch.xz;
    out.stretch = stretch;
  }

  // Legacy (pre-v3) grounding migration — root shape leaves only. Groups have
  // no geometry and nested nodes have no grounding to migrate.
  if (!isGroup && !nested && legacyGrounding) {
    const base = shapeBaseOffset(out.shape, out.params);
    out.transform.y -= base * (out.transform.scaleY ?? 1);
  }

  // Children recurse as nested nodes (nested defaults, no grounding).
  if (isGroup) {
    out.children = out.children.map((child) => normalizePart(child, legacyGrounding, true));
  }
  return out;
}

/**
 * Fill every optional field with its default, deep-copying the input.
 * Idempotent: normalizeDescriptor(normalizeDescriptor(x)) equals
 * normalizeDescriptor(x). The result is JSON-safe.
 *
 * `placement` sub-fields are filled per mode: scatter gets offset
 * min/max, ring gets ring radii + lean ranges; the other fields stay
 * absent. `cluster`/`size` halves are filled from the defaults pair.
 *
 * @param {object} def - raw descriptor
 * @returns {object} normalized descriptor
 */
export function normalizeDescriptor(def) {
  const out = cloneJson(isPlainObject(def) ? def : {});

  // v3 → v4: object-level material color moves onto each part that has no
  // color of its own (the material color was the render fallback for those
  // parts). Captured from the RAW material before the defaults merge below.
  const legacyMaterialColor = isPlainObject(out.material) ? out.material.color : undefined;

  // Files older than v3 encoded `transform.y` as the part's CENTER height; the
  // bottom-anchored convention reads it as bottom height, so only pre-v3 files
  // are migrated per part (see normalizePart). This floor is a constant on
  // purpose: bumping SCHEMA_VERSION (e.g. v4's color migration) must not
  // re-apply the grounding migration to v3+ files.
  const legacyGrounding = (out.schemaVersion ?? 1) < 3;
  out.schemaVersion = SCHEMA_VERSION;
  out.scale = out.scale ?? OBJECT_DEFAULTS.scale;
  out.variantRule = out.variantRule ?? 'hash';

  // Legacy v5 'cluster' rule — it conflated terrain (denseForest→'tall',
  // else→'round') with biome (via biomeVariants). Different terrains are now
  // separate descriptors, so the rule simply retires to the 'hash' default.
  // Idempotent: a migrated file carries variantRule 'hash', so a second pass
  // no-ops. (A `terrainVariants` field left over from an interim schema is
  // dropped too — the concept is gone.)
  if (out.variantRule === 'cluster') {
    out.variantRule = 'hash';
  }
  delete out.terrainVariants;

  out.cluster = { ...OBJECT_DEFAULTS.cluster, ...(isPlainObject(out.cluster) ? out.cluster : {}) };
  if (out.cluster.rule === 'moisture') {
    out.cluster.countsByTerrain = isPlainObject(out.cluster.countsByTerrain)
      ? out.cluster.countsByTerrain
      : { forest: [3, 5], denseForest: [4, 7] };
    out.cluster.densityRange = out.cluster.densityRange ?? [0.55, 0.85];
    out.cluster.jitter = out.cluster.jitter ?? 1;
  }
  out.size = { ...OBJECT_DEFAULTS.size, ...(isPlainObject(out.size) ? out.size : {}) };
  const rawVariation = isPlainObject(out.variation) ? out.variation : {};
  // Resolve the legacy combined stretchXZ into independent stretchX/stretchZ
  // before the defaults merge (an explicit per-axis range wins).
  if (rawVariation.stretchXZ !== undefined) {
    if (rawVariation.stretchX === undefined) rawVariation.stretchX = rawVariation.stretchXZ;
    if (rawVariation.stretchZ === undefined) rawVariation.stretchZ = rawVariation.stretchXZ;
    delete rawVariation.stretchXZ;
  }
  out.variation = { ...OBJECT_DEFAULTS.variation, ...rawVariation };
  out.placement = { ...OBJECT_DEFAULTS.placement, ...(isPlainObject(out.placement) ? out.placement : {}) };
  if (out.placement.mode === 'scatter') {
    out.placement.offsetMin = out.placement.offsetMin ?? 0.15;
    out.placement.offsetMax = out.placement.offsetMax ?? 0.3;
  } else if (out.placement.mode === 'ring') {
    out.placement.ringMin = out.placement.ringMin ?? 0.18;
    out.placement.ringMax = out.placement.ringMax ?? 0.55;
    out.placement.leanMin = out.placement.leanMin ?? 0.045;
    out.placement.leanMax = out.placement.leanMax ?? 0.12;
  } else if (out.placement.mode === 'jitter') {
    out.placement.offset = out.placement.offset ?? 0.08;
    out.placement.tiltMin = out.placement.tiltMin ?? 0;
    out.placement.tiltMax = out.placement.tiltMax ?? 0;
    out.placement.tiltSeed = out.placement.tiltSeed ?? 1;
  }
  out.emphasis = { ...OBJECT_DEFAULTS.emphasis, ...(isPlainObject(out.emphasis) ? out.emphasis : {}) };
  out.material = { ...OBJECT_DEFAULTS.material, ...(isPlainObject(out.material) ? out.material : {}) };

  // Optional portrait framing — fill any authored sub-fields with the shared
  // defaults (camera angle / frame pad / raise). Absent `portrait` stays
  // absent so denormalize can strip it and the framing resolver falls back to
  // the auto-frame defaults (see descriptorDefaults.js PORTRAIT_DEFAULTS).
  if (isPlainObject(out.portrait)) {
    out.portrait = { ...PORTRAIT_DEFAULTS, ...out.portrait };
  }

  out.parts = (Array.isArray(out.parts) ? out.parts : []).map((p) => normalizePart(p, legacyGrounding));
  if (Array.isArray(out.variants)) {
    out.variants = out.variants.map((variant) => {
      const v = { ...variant };
      v.parts = (Array.isArray(variant.parts) ? variant.parts : []).map((p) => normalizePart(p, legacyGrounding));
      v.material = { ...OBJECT_DEFAULTS.material, ...(isPlainObject(variant.material) ? variant.material : {}) };
      return v;
    });
  }
  // v5 → v6 decor migration (in-memory compatibility shim — decorComposition.md
  // §3.3). A v5 decor carries `variants` (one per biome look) + a fallback
  // `parts` stub; v6 expresses the same content as a weighted `motifs` table.
  // The shim: every variant becomes a motif (weight 1, same id), the fallback
  // `parts` stub is dropped, part ids are UNIQUIFIED across the converted
  // table (`<variantId>-<partId>` — mandatory: forest.js repeats `trunk` in 9
  // variant trees, a last-write-wins hazard in meshAssembly's partById), and
  // `biomeVariants` pins are PRESERVED as-is (a pinned biome forces that
  // motif on every slot — exactly v5's exclusivity guarantee; the shim must
  // render the old look, never convert pins into ×3–×5 weight lifts).
  // Idempotent: a migrated decor carries `motifs` and no `variants`, so a
  // second pass no-ops. In-memory only — files stay v5 until hand-rewritten.
  if (out.kind === 'decor' && Array.isArray(out.variants) && out.variants.length > 0 && !Array.isArray(out.motifs)) {
    const taken = new Set();
    const rename = (node, variantId) => {
      if (!isPlainObject(node)) return;
      const newId = `${variantId}-${node.id}`;
      let unique = newId;
      let n = 2;
      while (taken.has(unique)) unique = `${newId}-${n++}`;
      taken.add(unique);
      node.id = unique;
      if (Array.isArray(node.alternatives)) {
        const oldToNew = new Map();
        for (const option of node.alternatives) {
          if (isPlainObject(option)) {
            const oId = `${variantId}-${option.id}`;
            let oUnique = oId;
            let m = 2;
            while (taken.has(oUnique)) oUnique = `${oId}-${m++}`;
            taken.add(oUnique);
            oldToNew.set(option.id, oUnique);
            option.id = oUnique;
            (Array.isArray(option.parts) ? option.parts : []).forEach((child) => rename(child, variantId));
          }
        }
        // Rewrite the node's `default` to the renamed option id.
        if (typeof node.default === 'string' && oldToNew.has(node.default)) {
          node.default = oldToNew.get(node.default);
        }
      }
      if (Array.isArray(node.children)) {
        node.children.forEach((child) => rename(child, variantId));
      }
    };
    out.motifs = out.variants.map((variant) => {
      const parts = (Array.isArray(variant.parts) ? variant.parts : []).map((p) => normalizePart(p, legacyGrounding));
      parts.forEach((p) => rename(p, variant.id));
      return { id: variant.id, weight: 1, biomeWeight: {}, parts };
    });
    delete out.variants;
    delete out.parts;
  }

  // v6 motifs — the decor slot table. Defaults are filled per motif (weight 1,
  // biomeWeight {} — the only strip-able values; `weight: 0` and a present-0
  // biomeWeight entry are meaningful exclusions and stay). Per-motif
  // `size`/`placement` are overrides that inherit decor-level values at draw
  // time (motifDraw.js merges), so they are NOT filled here.
  if (Array.isArray(out.motifs)) {
    out.motifs = out.motifs.map((motif) => {
      const m = { ...motif };
      m.weight = motif.weight ?? 1;
      m.biomeWeight = isPlainObject(motif.biomeWeight) ? { ...motif.biomeWeight } : {};
      m.parts = (Array.isArray(motif.parts) ? motif.parts : []).map((p) => normalizePart(p, legacyGrounding));
      return m;
    });
  }
  out.repeatPenalty = out.repeatPenalty ?? 1;
  if (Array.isArray(out.optionalGroups)) {
    out.optionalGroups = out.optionalGroups.map((group) => {
      const g = { ...group };
      g.chance = group.chance ?? 0.5;
      g.parts = (Array.isArray(group.parts) ? group.parts : []).map((p) => normalizePart(p, legacyGrounding));
      return g;
    });
  }

  // v3 → v4 color migration: push the object's material color into every part
  // that lacks an explicit color, then drop it from the material. Entity parts
  // are skipped for the push — their instance color comes from the entity
  // (token or the entity.color fallback), so the material color never rendered
  // for them — but material.color is removed for every kind. The push walks the
  // parts trees recursively and touches shape leaves only (groups have no
  // color). Idempotent: a v4 file has no material.color, so the push no-ops.
  if (legacyMaterialColor !== undefined) {
    if (!ENTITY_DRIVEN_KINDS.has(out.kind)) {
      const push = (node) => {
        if (Array.isArray(node.children)) {
          for (const child of node.children) push(child);
          return;
        }
        if (node.color === undefined) node.color = legacyMaterialColor;
      };
      for (const part of out.parts ?? []) push(part);
      for (const variant of out.variants ?? []) {
        for (const part of variant.parts) push(part);
      }
    }
    if (isPlainObject(out.material)) delete out.material.color;
  }

  // A decor with motifs carries no fallback `parts` (v6 — the motif table IS
  // the content; decorComposition.md §2.3). Normalize fills `parts` from the
  // raw input, so an absent/empty list must end up ABSENT — the migration and
  // the round-trip both depend on it (parts: [] would break idempotency).
  if (out.kind === 'decor' && Array.isArray(out.motifs) && Array.isArray(out.parts) && out.parts.length === 0) {
    delete out.parts;
  }

  return out;
}
