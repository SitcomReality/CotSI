import { CYCLE_COUNTERS } from '../globals.js';
export const isPartOfACycle = (audioNode) => {
    return CYCLE_COUNTERS.has(audioNode);
};
