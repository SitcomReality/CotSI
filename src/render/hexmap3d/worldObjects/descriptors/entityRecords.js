/**
 * entityRecords.js — Entity-driven instance records from a descriptor.
 *
 * The entity record path (recordsForEntity): one entity per hex, placed at the
 * center, with variants and colors driven by the entity's own state (faction,
 * archetype, palette) rather than the tile hash — the seam the units/base
 * builders use to render entities through the same generic mesh pipeline
 * (meshAssembly.js). Root shape leaves go through recordForEntityPart, nested
 * leaves and groups through baked frame matrices. Pure — no THREE.
 */
import {
  mat4Identity,
  mat4Translation,
  mat4Scale,
  mat4RotationY,
  mat4RotationAxisAngle,
  mat4Multiply,
  mat4TranslationOf,
} from '../../../../engine/rules/mat4.js';
import { shapeBaseOffset } from './shapeTypes.js';
import { isGroupNode } from './partScale.js';
import { entityColorForPart } from './partColor.js';
import { frameLocalPos, groupFrameMatrix, parentRotationMatrix } from './partFrames.js';
import { variantForEntity } from './variantSelection.js';

/**
 * One instance record for an entity part. Mirrors recordForPart's conventions
 * (scale/lift/localPos scaled by item scale, transforms pass through) but with
 * no tile-hash draws: an entity is a single item at the hex center.
 */
function recordForEntityPart(part, entity, worldPos, itemScale) {
  const t = part.transform;
  // Same bottom-anchored grounding as the tile path (no stretch for entities):
  // the part's lowest vertex lands at worldPos.y + t.y + lift. Tilted parts
  // pivot at that base — `y` becomes the bottom height and the base offset
  // rides inside the rotation as lift (see recordForPart).
  const base = shapeBaseOffset(part.shape, part.params);
  const sy = itemScale * t.scaleY;
  const tilted = t.tiltAxis !== undefined && t.tilt !== undefined && t.tilt !== 0;
  const baseLift = base * sy;
  const record = {
    partId: part.id,
    x: worldPos.x,
    y: tilted ? worldPos.y + t.y : worldPos.y + t.y + baseLift,
    z: worldPos.z,
    scale: itemScale * t.scaleX,
    scaleY: sy,
  };
  if (t.scaleZ !== t.scaleX) record.scaleZ = itemScale * t.scaleZ;

  if (t.rotY) record.rotY = t.rotY;
  if (tilted) record.lift = baseLift + (t.lift ? t.lift * itemScale : 0);
  else if (t.lift) record.lift = t.lift * itemScale;
  if (t.localPos) {
    record.localPos = {
      x: t.localPos.x * itemScale,
      y: t.localPos.y * itemScale,
      z: t.localPos.z * itemScale,
    };
  }
  if (t.localAxis && t.localAngle !== undefined) {
    record.localAxis = t.localAxis;
    record.localAngle = t.localAngle;
  }
  if (t.tiltAxis && t.tilt !== undefined) {
    record.tiltAxis = t.tiltAxis;
    record.tilt = t.tilt;
  }
  const color = entityColorForPart(part, entity);
  if (color !== undefined) record.color = color;

  return record;
}

/**
 * A nested leaf's frame on the entity path — no tile hash draws: scale is
 * itemScale × transform scale only, localPos pre-scaled by itemScale. Same
 * bottom-anchored baking as the tile path (entities have no stretch): the
 * leaf's lowest vertex lands exactly at its localPos point.
 */
function entityLeafFrameMatrix(part, itemScale) {
  const t = part.transform;
  const { x, y, z } = frameLocalPos(t, itemScale, 1);
  const sy = itemScale * t.scaleY;
  const base = shapeBaseOffset(part.shape, part.params);
  let m = mat4Scale(itemScale * t.scaleX, sy, itemScale * t.scaleZ);
  m = mat4Multiply(mat4Translation(0, base * sy, 0), m);
  if (t.localAxis && t.localAngle !== undefined) {
    m = mat4Multiply(mat4RotationAxisAngle(t.localAxis, t.localAngle), m);
  }
  if (t.rotY) m = mat4Multiply(mat4RotationY(t.rotY), m);
  return mat4Multiply(mat4Translation(x, y, z), m);
}

/**
 * Recursively emit records for one node on the entity path (the tile-path
 * collectPart, without a tile hash: no stretch, no scatter, no biome). Root
 * shape leaves go through recordForEntityPart unchanged; groups compose a
 * frame; nested leaves get a baked world `matrix` record.
 */
function collectEntityPart(descriptor, part, entity, worldPos, itemScale, frame, isRoot, out, nodeFrames) {
  const worldBase = mat4Translation(worldPos.x, worldPos.y, worldPos.z);
  if (isGroupNode(part)) {
    const g = groupFrameMatrix(part.transform, itemScale, 1, 1);
    const nextFrame = mat4Multiply(frame, g);
    if (nodeFrames) {
      const { x, y, z } = frameLocalPos(part.transform, itemScale, 1);
      const originM = mat4Multiply(worldBase, mat4Multiply(frame, mat4Translation(x, y, z)));
      nodeFrames.set(part.id, { origin: mat4TranslationOf(originM), parentRot: parentRotationMatrix(worldBase, frame) });
    }
    for (const child of part.children) {
      collectEntityPart(descriptor, child, entity, worldPos, itemScale, nextFrame, false, out, nodeFrames);
    }
    return;
  }

  if (isRoot) {
    out.push(recordForEntityPart(part, entity, worldPos, itemScale));
    if (nodeFrames) {
      const r = out[out.length - 1];
      // Same as the tile path: the origin rides the lift/localPos.y vertical
      // slot so the gizmo sits at the part, not on the ground.
      const ly = (r.localPos?.y ?? 0) + (r.lift ?? 0);
      nodeFrames.set(part.id, { origin: { x: r.x, y: r.y + ly, z: r.z }, parentRot: parentRotationMatrix(worldBase, mat4Identity()) });
    }
    return;
  }

  const matrix = mat4Multiply(worldBase, mat4Multiply(frame, entityLeafFrameMatrix(part, itemScale)));
  const record = { partId: part.id, matrix };
  const color = entityColorForPart(part, entity);
  if (color !== undefined) record.color = color;
  out.push(record);
  if (nodeFrames) {
    nodeFrames.set(part.id, { origin: mat4TranslationOf(matrix), parentRot: parentRotationMatrix(worldBase, frame) });
  }
}

/**
 * Generate instance records for one entity (base / champion / mob / trader)
 * from a (normalized) descriptor — the entity-driven record path.
 *
 * An entity is a single item at the hex center: count is always 1, placement
 * is center, and every decision (variant, color) comes from the entity's state
 * rather than the tile hash. Callers pass world space position; the records
 * flow through the same meshAssembly.buildDescriptorMeshes pipeline as tile
 * records, so entities render as InstancedMeshes grouped per part.
 *
 * @param {object} descriptor - normalized descriptor
 * @param {object} entity     - { faction?, archetype?, scale?, color?, colors? }
 *                              where `colors` maps named-color tokens
 *                              (part.color strings) to color integers
 * @param {object} worldPos   - { x, y, z } hex center in world space (y = tile surface)
 * @param {object} [displacement] - { hidden? } — entities are occupants, not
 *                              displaced decor; only `hidden` applies today
 * @returns {object[]} instance records tagged with partId ([] when hidden)
 */
export function recordsForEntity(descriptor, entity, worldPos, displacement = {}) {
  if (displacement.hidden) return [];
  const variant = variantForEntity(descriptor, entity);
  const parts = (variant ?? descriptor).parts;
  const itemScale = (entity.scale ?? 1) * descriptor.scale;
  const records = [];
  for (const part of parts) {
    collectEntityPart(descriptor, part, entity, worldPos, itemScale, mat4Identity(), true, records, null);
  }
  return records;
}

/**
 * World frames for every node (leaves AND groups) on the entity path — the
 * entity-path counterpart of nodeWorldFrames, for the editor's gizmo.
 */
export function nodeWorldFramesForEntity(descriptor, entity, worldPos, displacement = {}) {
  const frames = new Map();
  if (displacement.hidden) return frames;
  const variant = variantForEntity(descriptor, entity);
  const parts = (variant ?? descriptor).parts;
  const itemScale = (entity.scale ?? 1) * descriptor.scale;
  for (const part of parts) {
    collectEntityPart(descriptor, part, entity, worldPos, itemScale, mat4Identity(), true, [], frames);
  }
  return frames;
}
