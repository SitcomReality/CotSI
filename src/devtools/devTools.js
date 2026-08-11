/**
 * devTools.js — Barrel re-export.
 *
 * This file is kept as a thin pass-through for backward compatibility.
 * All implementation now lives in src/devtools/panel/.
 */
export { handleTeleportClick } from './panel/teleport.js';
export { initDevTools } from './panel/init.js';
