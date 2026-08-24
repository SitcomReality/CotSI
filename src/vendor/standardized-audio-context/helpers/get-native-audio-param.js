import { AUDIO_PARAM_STORE } from '../globals.js';
import { getValueForKey } from './get-value-for-key.js';
export const getNativeAudioParam = (audioParam) => {
    return getValueForKey(AUDIO_PARAM_STORE, audioParam);
};
