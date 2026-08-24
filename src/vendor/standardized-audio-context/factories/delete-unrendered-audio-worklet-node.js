export const createDeleteUnrenderedAudioWorkletNode = (getUnrenderedAudioWorkletNodes) => {
    return (nativeContext, audioWorkletNode) => {
        getUnrenderedAudioWorkletNodes(nativeContext).delete(audioWorkletNode);
    };
};
