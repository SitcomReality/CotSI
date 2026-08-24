import { assignNativeAudioNodeOption } from './assign-native-audio-node-option.js';
export const assignNativeAudioNodeOptions = (nativeAudioNode, options) => {
    assignNativeAudioNodeOption(nativeAudioNode, options, 'channelCount');
    assignNativeAudioNodeOption(nativeAudioNode, options, 'channelCountMode');
    assignNativeAudioNodeOption(nativeAudioNode, options, 'channelInterpretation');
};
