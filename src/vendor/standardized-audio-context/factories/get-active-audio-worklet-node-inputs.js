export const createGetActiveAudioWorkletNodeInputs = (activeAudioWorkletNodeInputsStore, getValueForKey) => {
    return (nativeAudioWorkletNode) => getValueForKey(activeAudioWorkletNodeInputsStore, nativeAudioWorkletNode);
};
