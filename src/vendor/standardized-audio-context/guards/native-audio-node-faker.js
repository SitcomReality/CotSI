export const isNativeAudioNodeFaker = (nativeAudioNodeOrNativeAudioNodeFaker) => {
    return 'inputs' in nativeAudioNodeOrNativeAudioNodeFaker;
};
