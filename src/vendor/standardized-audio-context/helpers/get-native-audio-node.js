import { AUDIO_NODE_STORE } from '../globals.js';
import { getValueForKey } from './get-value-for-key.js';
export const getNativeAudioNode = (audioNode) => {
    return getValueForKey(AUDIO_NODE_STORE, audioNode);
};
