import { isAudioNode } from '../guards/audio-node.js';
import { isDelayNode } from '../guards/delay-node.js';
export const createDetectCycles = (audioParamAudioNodeStore, getAudioNodeConnections, getValueForKey) => {
    return function detectCycles(chain, nextLink) {
        const audioNode = isAudioNode(nextLink) ? nextLink : getValueForKey(audioParamAudioNodeStore, nextLink);
        if (isDelayNode(audioNode)) {
            return [];
        }
        if (chain[0] === audioNode) {
            return [chain];
        }
        if (chain.includes(audioNode)) {
            return [];
        }
        const { outputs } = getAudioNodeConnections(audioNode);
        return Array.from(outputs)
            .map((outputConnection) => detectCycles([...chain, audioNode], outputConnection[0]))
            .reduce((mergedCycles, nestedCycles) => mergedCycles.concat(nestedCycles), []);
    };
};
