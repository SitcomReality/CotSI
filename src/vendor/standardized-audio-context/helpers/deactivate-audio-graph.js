import { deactivateActiveAudioNodeInputConnections } from './deactivate-active-audio-node-input-connections.js';
export const deactivateAudioGraph = (context) => {
    deactivateActiveAudioNodeInputConnections(context.destination, []);
};
