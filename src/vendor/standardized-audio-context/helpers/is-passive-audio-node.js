import { ACTIVE_AUDIO_NODE_STORE } from '../globals.js';
export const isPassiveAudioNode = (audioNode) => {
    return !ACTIVE_AUDIO_NODE_STORE.has(audioNode);
};
