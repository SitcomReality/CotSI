import { NODE_TO_PROCESSOR_MAPS } from '../globals.js';
import { getNativeAudioNode } from './get-native-audio-node.js';
import { getValueForKey } from './get-value-for-key.js';
export const getAudioWorkletProcessor = (nativeOfflineAudioContext, proxy) => {
    const nodeToProcessorMap = getValueForKey(NODE_TO_PROCESSOR_MAPS, nativeOfflineAudioContext);
    const nativeAudioWorkletNode = getNativeAudioNode(proxy);
    return getValueForKey(nodeToProcessorMap, nativeAudioWorkletNode);
};
