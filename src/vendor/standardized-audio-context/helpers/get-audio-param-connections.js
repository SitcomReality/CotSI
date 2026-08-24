import { AUDIO_PARAM_CONNECTIONS_STORE } from '../globals.js';
import { getValueForKey } from './get-value-for-key.js';
export const getAudioParamConnections = (audioParam) => {
    return getValueForKey(AUDIO_PARAM_CONNECTIONS_STORE, audioParam);
};
