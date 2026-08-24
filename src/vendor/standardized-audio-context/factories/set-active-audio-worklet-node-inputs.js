export const createSetActiveAudioWorkletNodeInputs = (activeAudioWorkletNodeInputsStore) => {
    return (nativeAudioWorkletNode, activeInputs) => {
        activeAudioWorkletNodeInputsStore.set(nativeAudioWorkletNode, activeInputs);
    };
};
