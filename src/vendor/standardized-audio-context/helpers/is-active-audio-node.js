import { ACTIVE_AUDIO_NODE_STORE } from '../globals.js';
export const isActiveAudioNode = (audioNode) => ACTIVE_AUDIO_NODE_STORE.has(audioNode);
