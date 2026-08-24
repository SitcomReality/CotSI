import { assignNativeAudioNodeAudioParamValue } from '../helpers/assign-native-audio-node-audio-param-value.js';
import { assignNativeAudioNodeOptions } from '../helpers/assign-native-audio-node-options.js';
export const createNativeGainNode = (nativeContext, options) => {
    const nativeGainNode = nativeContext.createGain();
    assignNativeAudioNodeOptions(nativeGainNode, options);
    assignNativeAudioNodeAudioParamValue(nativeGainNode, options, 'gain');
    return nativeGainNode;
};
