import { EVENT_LISTENERS } from '../globals.js';
import { getValueForKey } from './get-value-for-key.js';
export const getEventListenersOfAudioNode = (audioNode) => {
    return getValueForKey(EVENT_LISTENERS, audioNode);
};
