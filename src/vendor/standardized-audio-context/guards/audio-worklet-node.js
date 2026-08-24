export const isAudioWorkletNode = (audioNode) => {
    return 'port' in audioNode;
};
