export const isNativeAudioNode = (nativeAudioNodeOrAudioParam) => {
    return 'context' in nativeAudioNodeOrAudioParam;
};
