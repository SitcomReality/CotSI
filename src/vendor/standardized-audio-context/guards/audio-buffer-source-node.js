export const isAudioBufferSourceNode = (audioNode) => {
    return 'playbackRate' in audioNode;
};
