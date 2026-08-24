import { ACTIVE_AUDIO_NODE_STORE } from '../globals.js';
import { getEventListenersOfAudioNode } from './get-event-listeners-of-audio-node.js';
export const setInternalStateToActive = (audioNode) => {
    if (ACTIVE_AUDIO_NODE_STORE.has(audioNode)) {
        throw new Error('The AudioNode is already stored.');
    }
    ACTIVE_AUDIO_NODE_STORE.add(audioNode);
    getEventListenersOfAudioNode(audioNode).forEach((eventListener) => eventListener(true));
};
