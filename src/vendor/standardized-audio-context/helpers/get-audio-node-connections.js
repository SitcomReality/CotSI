import { AUDIO_NODE_CONNECTIONS_STORE } from '../globals.js';
import { getValueForKey } from './get-value-for-key.js';
export const getAudioNodeConnections = (audioNode) => {
    return getValueForKey(AUDIO_NODE_CONNECTIONS_STORE, audioNode);
};
