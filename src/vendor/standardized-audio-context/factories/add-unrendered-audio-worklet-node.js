export const createAddUnrenderedAudioWorkletNode = (getUnrenderedAudioWorkletNodes) => {
    return (nativeContext, audioWorkletNode) => {
        getUnrenderedAudioWorkletNodes(nativeContext).add(audioWorkletNode);
    };
};
