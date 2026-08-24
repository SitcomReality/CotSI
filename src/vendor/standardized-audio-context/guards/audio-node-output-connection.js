import { isAudioNode } from './audio-node.js';
export const isAudioNodeOutputConnection = (outputConnection) => {
    return isAudioNode(outputConnection[0]);
};
