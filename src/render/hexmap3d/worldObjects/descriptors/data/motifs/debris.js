/**
 * data/motifs/debris.js — Shared ground-debris motifs.
 *
 * Hand-authored geometry source of truth (NOT editor-generated in the
 * descriptor sense): any decor's motif table can reference one of these by id
 * (`{ motif: 'log', weight, ... }`), and normalizeDescriptor materializes the
 * shared parts. Per-use presentation — `weight`, `biomeWeight`, and any `size`
 * / `placement` overrides — lives on the REFERENCING decor, not here; the
 * `size` / `placement` on a library motif are its defaults, inherited by a ref
 * that doesn't override them.
 *
 * Part ids are prefixed with the motif id so a decor mixing many shared motifs
 * keeps part ids unique (meshAssembly groups by partId).
 */
export const LOG_MOTIF = {
  id: 'log',
  size: { min: 0.95, max: 1.15 },
  placement: { leanMin: 0.06, leanMax: 0.2 },
  parts: [
    {
      id: 'log-body',
      shape: 'cylinder',
      params: { bottomR: 0.11, topR: 0.085, height: 0.55, segments: 7 },
      stretch: {
        y: { min: 0.85, max: 1.25, seed: 33 },
        x: false,
        z: false,
      },
      color: 0x6a5746,
      biomeColor: { source: 'wood', influence: 0.55 },
      transform: {
        y: 0.105,
        localPos: { x: 0.26484129245482146, y: -0.2487839029699837, z: 0.04078174227210436 },
        localAxis: { x: 0, y: 0, z: 1 },
        localAngle: 1.62,
      },
    },
    {
      id: 'log-stub',
      shape: 'cylinder',
      params: { bottomR: 0.032, topR: 0.02, height: 0.14, segments: 5 },
      stretch: {
        y: { min: 0.8, max: 1.2, seed: 31 },
        x: false,
        z: false,
      },
      color: 0x6a5746,
      biomeColor: { source: 'wood', influence: 0.55 },
      transform: {
        y: 0,
        lift: 0,
        localPos: { x: 0.08, y: 0.16, z: 0.03 },
        localAxis: { x: 1, y: 0, z: 0 },
        localAngle: 0.25,
      },
    },
    {
      id: 'log-moss',
      shape: 'sphere',
      params: { radius: 0.09 },
      stretch: {
        y: { min: 0.85, max: 1.15, seed: 32 },
        x: false,
        z: false,
      },
      color: 0x4f6b38,
      biomeColor: { source: 'foliage', influence: 0.75 },
      transform: {
        y: 0,
        lift: 0,
        scaleX: 1.3,
        scaleY: 0.45,
        scaleZ: 1.1,
        localPos: { x: -0.11638297282958757, y: -0.015871468208349997, z: 0.0704688616173255 },
      },
    },
    {
      id: 'log-fungus-a',
      shape: 'sphere',
      params: { radius: 0.045 },
      color: 0xb98a5e,
      biomeColor: { source: 'bloom', influence: 0.3 },
      transform: {
        y: 0,
        lift: 0,
        scaleY: 0.4,
        localPos: { x: 0.022841750442331218, y: -0.01603161715746917, z: -0.0660618605006247 },
      },
    },
    {
      id: 'log-fungus-b',
      shape: 'sphere',
      params: { radius: 0.035 },
      color: 0xb98a5e,
      biomeColor: { source: 'bloom', influence: 0.3 },
      transform: {
        y: 0,
        lift: 0,
        scaleY: 0.4,
        localPos: { x: -0.03795179263937237, y: 0.034746903636999914, z: 0.11725354654370354 },
      },
    },
  ],
};
