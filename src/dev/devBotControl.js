/**
 * devBotControl.js — Barrel re-export.
 *
 * This file is kept as a thin pass-through for backward compatibility.
 * All implementation now lives in src/dev/botControl/.
 */
export {
  botDevState,
  renderChampionList,
  toggleStepMode,
  stepOnce,
  autoPlay,
  autoStop,
} from './botControl/index.js';
