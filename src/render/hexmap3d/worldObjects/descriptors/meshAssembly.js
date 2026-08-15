/**
 * meshAssembly.js — Assembles descriptor instance records into InstancedMeshes.
 *
 * The final leg of the descriptor pipeline: descriptor + records →
 * one InstancedMesh per part geometry, exactly like the per-kind builders
 * (e.g. the procedural tree builders grouped records by geo key). Records carry numeric
 * colors; here they become THREE.Color instance colors.
 */
import * as THREE from '../../../../vendor/three.module.js';
import { buildInstanced } from '../meshBuilder.js';
import { geometryForShape, materialForPart } from './shapeFactories.js';

/**
 * Build one InstancedMesh per part geometry from collected records.
 *
 * @param {object} descriptor - normalized descriptor
 * @param {object[]} records  - instance records from recordsForDescriptor
 * @param {string} [meshPrefix] - prefix for mesh names (e.g. the object id)
 * @returns {THREE.InstancedMesh[]} one mesh per part with any instances
 */
export function buildDescriptorMeshes(descriptor, records, meshPrefix = 'descriptor') {
  const groups = {};
  for (const record of records) {
    (groups[record.partId] ?? (groups[record.partId] = [])).push(record);
  }

  const partById = new Map();
  // Walk the parts trees recursively — nested (grouped) leaves render through
  // the same pipeline and need their material/geometry lookup too. Groups
  // themselves never appear in records (no geometry), so they are skipped;
  // `alternatives` choice points are skipped too (they emit no record — their
  // option parts are the vocabulary, and ALL options' parts are collected so
  // the full partId lookup exists whichever option a tile draws). Motifs are
  // part of the walk (decorComposition.md §3.2 — motif parts must resolve to
  // geometry/material or they silently vanish).
  const collect = (node) => {
    if (Array.isArray(node.alternatives)) {
      for (const option of node.alternatives) {
        for (const child of option.parts ?? []) collect(child);
      }
      return;
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) collect(child);
      return;
    }
    partById.set(node.id, node);
  };
  for (const part of descriptor.parts ?? []) collect(part);
  for (const variant of descriptor.variants ?? []) {
    for (const part of variant.parts) collect(part);
  }
  for (const motif of descriptor.motifs ?? []) {
    for (const part of motif.parts) collect(part);
  }

  // Per-variant material (emissive) resolves per leaf part id, so a single
  // multi-variant descriptor (the mob barrel) can give one variant a glow
  // without applying it to the others. Descriptor-level material still
  // applies to every part; the variant's material merges over it.
  const variantMaterialByPartId = new Map();
  const collectVariantMaterial = (node, material) => {
    if (Array.isArray(node.alternatives)) {
      for (const option of node.alternatives) {
        for (const child of option.parts ?? []) collectVariantMaterial(child, material);
      }
      return;
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) collectVariantMaterial(child, material);
      return;
    }
    variantMaterialByPartId.set(node.id, material);
  };
  for (const variant of descriptor.variants ?? []) {
    if (variant.material === undefined) continue;
    for (const part of variant.parts) collectVariantMaterial(part, variant.material);
  }

  const results = [];
  for (const [partId, instances] of Object.entries(groups)) {
    const part = partById.get(partId);
    if (!part || instances.length === 0) continue;

    const geometry = geometryForShape(part.shape, part.params);
    const material = materialForPart(descriptor, part, variantMaterialByPartId.get(partId));
    const converted = instances.map((r) => (
      r.color !== undefined ? { ...r, color: new THREE.Color(r.color) } : r
    ));
    results.push(buildInstanced(geometry, material, converted, `${meshPrefix}-${partId}`));
  }
  return results;
}
