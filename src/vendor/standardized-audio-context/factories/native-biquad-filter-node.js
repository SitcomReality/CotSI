import { assignNativeAudioNodeAudioParamValue } from '../helpers/assign-native-audio-node-audio-param-value.js';
import { assignNativeAudioNodeOption } from '../helpers/assign-native-audio-node-option.js';
import { assignNativeAudioNodeOptions } from '../helpers/assign-native-audio-node-options.js';
export const createNativeBiquadFilterNode = (nativeContext, options) => {
    const nativeBiquadFilterNode = nativeContext.createBiquadFilter();
    assignNativeAudioNodeOptions(nativeBiquadFilterNode, options);
    assignNativeAudioNodeAudioParamValue(nativeBiquadFilterNode, options, 'Q');
    assignNativeAudioNodeAudioParamValue(nativeBiquadFilterNode, options, 'detune');
    assignNativeAudioNodeAudioParamValue(nativeBiquadFilterNode, options, 'frequency');
    assignNativeAudioNodeAudioParamValue(nativeBiquadFilterNode, options, 'gain');
    assignNativeAudioNodeOption(nativeBiquadFilterNode, options, 'type');
    return nativeBiquadFilterNode;
};
