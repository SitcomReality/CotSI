export const isAudioNode = (audioNodeOrAudioParam) => {
    return 'context' in audioNodeOrAudioParam;
};
